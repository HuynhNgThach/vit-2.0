const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageSelectMenu, MessageActionRow } = require('discord.js');
const Player = require('../../models/Player');
const Youtube = require('youtube-sr').default;
const createGuildData = require('../../models/GuildData');
const yts = require('yt-search');
const url = require('url');
const { AudioPlayerStatus, joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const { setData } = require('../../keyv');

let {
	PLAY_LIVE_STREAM, PLAY_VIDEO_LONGER_THAN_1_HOUR, MAX_QUEUE_LENGTH, AUTO_SHUFFLE_YOUTUBE_PLAYLIST, LEAVE_TIMEOUT, MAX_RESPONSE_TIME, DELETE_OLD_PLAY_MESSAGE,
} = require('../../config');

// check valid option
if (typeof PLAY_LIVE_STREAM !== 'boolean') PLAY_LIVE_STREAM = true;

if (typeof MAX_QUEUE_LENGTH !== 'number' || MAX_QUEUE_LENGTH < 1) MAX_QUEUE_LENGTH = 1000;

if (typeof LEAVE_TIMEOUT !== 'number') LEAVE_TIMEOUT = 90;

if (typeof MAX_RESPONSE_TIME !== 'number') MAX_RESPONSE_TIME = 30;

if (typeof AUTO_SHUFFLE_YOUTUBE_PLAYLIST !== 'boolean') AUTO_SHUFFLE_YOUTUBE_PLAYLIST = false;

if (typeof PLAY_VIDEO_LONGER_THAN_1_HOUR !== 'boolean') PLAY_VIDEO_LONGER_THAN_1_HOUR = true;

if (typeof DELETE_OLD_PLAY_MESSAGE !== 'boolean') DELETE_OLD_PLAY_MESSAGE = false;

// slash command for play
module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Vịt hát một bài (Youtube )')
		.addStringOption(option =>
			option
				.setName('query')
				.setDescription(':notes: bài gì lẹ lên nào!')
				.setRequired(true)),
	async execute(interaction) {
		try {
			if (!interaction.client.guildData.get(interaction.guildId)) {
				interaction.client.guildData.set(interaction.guildId, createGuildData());
			}
			await interaction.deferReply({
				fetchReply: true,
			});
			// make sure only user in the voice channel can order
			if (!interaction.member.voice.channel) {
				interaction.followUp(':duck: vào voice chưa?');
				return;
			}

			const query = interaction.options.get('query').value;
			const splitQuery = query.split(' ');
			const search = splitQuery[splitQuery.length - 1] === '-s';
			let song = query;
			if (search) {
				splitQuery.pop();
				song = splitQuery.join(' ');
			}

			let player = interaction.client.playerManager.get(interaction.guildId);
			if (!player) {
				player = new Player();
				interaction.client.playerManager.set(interaction.guildId, player);
			}

			player.commandLock = true;


			if (isYouTubeVideoURL(query)) {
				const q = url.parse(query, true)?.query;
				song = q.v;

			}
			await searchYoutube(song,
				interaction,
				player,
				interaction.member.voice.channel, search);
		}
		catch (error) {
			console.log('ERROR||', error);
		}

	},
};

const isYouTubeVideoURL = arg =>
	arg.match(
		/^(http(s)?:\/\/)?(m.)?((w){3}.)?(music.)?youtu(be|.be)?(\.com)?\/.+/,
	);
const searchYoutube = async (
	song,
	interaction,
	player,
	voiceChannel,
	searchFlag,
) => {

	const res = await yts(song);
	const videos = res?.videos;
	if (!videos) {
		player.commandLock = false;
		return interaction.followUp(
			':x: :duck: :x: 301',
		);
	}
	if (searchFlag && videos.length < 5) {
		player.commandLock = false;
		return interaction.followUp(
			':x: :duck: :x: 301',
		);
	}
	if (false) {
		const vidNameArr = [];
		for (let i = 0; i < videos.length; i++) {
			vidNameArr.push(videos[i].title.slice(0, 99));
		}
		vidNameArr.push('cancel');
		const row = createSelectMenu(vidNameArr);
		const playOptions = await interaction.channel.send({
			content: 'Tao tìm được nhiêu đây, chọn 1 bài đi nào',
			components: [row],
		});
		const playOptionsCollector = playOptions.createMessageComponentCollector({
			componentType: 'SELECT_MENU',
			time: MAX_RESPONSE_TIME * 1000,
		});
		playOptionsCollector.on('end', async () => {
			if (playOptions) {
				await playOptions.delete().catch(console.error);
			}
			return interaction.followUp({
				content: ':duck:',
				ephemeral: true,
			});
		});

		playOptionsCollector.on('collect', async i => {
			if (i.user.id !== interaction.user.id) {
				i.reply({
					content: 'This element is not for you!',
					ephemeral: true,
				});
			}
			else {
				playOptionsCollector.stop();
				const value = i.values[0];
				if (value === 'cancel_option') {
					if (playOptions) {
						interaction.followUp('Search canceled');
						player.commandLock = false;
						return;
					}
				}
				const videoIndex = parseInt(value);

				Youtube.getVideo(
					`https://www.youtube.com/watch?v=${videos[videoIndex - 1].id}`,
				)
					.then(function(video) {
						if (video.live && !PLAY_LIVE_STREAM) {
							if (playOptions) {
								playOptions.delete().catch(console.error);
								return;
							}
							player.commandLock = false;
							return interaction.followUp(
								'Live streams are disabled in this server! Contact the owner',
							);
						}

						if (video.duration.hours !== 0 && !PLAY_VIDEO_LONGER_THAN_1_HOUR) {
							if (playOptions) {
								playOptions.delete().catch(console.error);
								return;
							}
							player.commandLock = false;
							return interaction.followUp(
								'Videos longer than 1 hour are disabled in this server! Contact the owner',
							);
						}

						if (
							interaction.client.playerManager.get(interaction.guildId).queue
								.length > MAX_QUEUE_LENGTH
						) {
							if (playOptions) {
								playOptions.delete().catch(console.error);
								return;
							}
							player.commandLock = false;
							return interaction.followUp(
								'Farm đông đúc quá rồi, k thể add thêm đâu!',
							);
						}


						interaction.client.playerManager
							.get(interaction.guildId)
							.queue.push(
								constructSongObj(video, voiceChannel, interaction.member.user),
							);

						if (
							interaction.client.playerManager.get(interaction.guildId)
								.audioPlayer.state.status !== AudioPlayerStatus.Playing
						) {
							handleSubscription(player.queue, interaction, player);
						}
						else if (
							interaction.client.playerManager.get(interaction.guildId)
								.audioPlayer.state.status === AudioPlayerStatus.Playing
						) {
							player.commandLock = false;
							return interaction.followUp(`Added **${video.title}** to farm`);
						}
						return;
					})
					.catch(error => {
						player.commandLock = false;
						deletePlayerIfNeeded(interaction);
						if (playOptions) playOptions.delete().catch(console.error);
						console.error(error);
						return interaction.followUp(
							':x: :duck: :x: 300',
						);
					});
			}
		});
	}
	else if (videos) {

		if (
			interaction.client.playerManager.get(interaction.guildId).queue
				.length > MAX_QUEUE_LENGTH
		) {

			player.commandLock = false;
			return interaction.followUp(
				`The queue hit its limit of ${MAX_QUEUE_LENGTH}, please wait a bit before attempting to add more songs`,
			);
		}

		const songModel = await constructSongObj(videos[0], voiceChannel, interaction.member.user);
		interaction.client.playerManager
			.get(interaction.guildId)
			.queue.push(
				songModel,
			);

		if (
			interaction.client.playerManager.get(interaction.guildId)
				.audioPlayer.state.status !== AudioPlayerStatus.Playing
		) {
			handleSubscription(player.queue, interaction, player);
		}
		else if (
			interaction.client.playerManager.get(interaction.guildId)
				.audioPlayer.state.status === AudioPlayerStatus.Playing
		) {
			player.commandLock = false;
			return interaction.followUp(`Added **${videos[0].title}** to farm`);
		}
		return;

	}
	else {
		console.log('ERROR || ', videos);
	}

};
const handleSubscription = async (queue, interaction, player) => {
	let voiceChannel = queue[0].voiceChannel;
	if (!voiceChannel) {
		// happens when loading a saved playlist
		voiceChannel = interaction.member.voice.channel;
	}
	console.log(player.queue);
	const title = player.queue[0].title;
	let connection = player.connection;
	if (!connection) {
		connection = joinVoiceChannel({
			channelId: voiceChannel.id,
			guildId: interaction.guild.id,
			adapterCreator: interaction.guild.voiceAdapterCreator,
		});
		connection.on('error', console.error);
	}
	player.textChannel = interaction.channel;
	player.passConnection(connection);

	try {
		await entersState(player.connection, VoiceConnectionStatus.Ready, 10000);
	}
	catch (err) {
		player.commandLock = false;
		// deletePlayerIfNeeded(interaction);
		console.error(err);
		await interaction.followUp({ content: 'Failed to join your channel!' });
		return;
	}
	player.process(player.queue);
	await interaction.followUp(`Đã thêm vào farm 1 ${title}`);
};


const constructSongObj = async (video, voiceChannel, user, timestamp) => {
	let duration = video.duration.toString();
	if (duration === '00:00') duration = 'Live Stream';

	// checks if the user searched for a song using a Spotify URL
	console.log('video', video);
	await setData({ video, user });
	return {
		id: video.videoId,
		durationSecond: video.seconds,
		url: video.url,
		title: video.title,
		view: video.views,
		uploadedAt: video.ago,
		rawDuration: 0,
		duration,
		timestamp,
		thumbnail: video.thumbnail,
		voiceChannel,
		memberDisplayName: user.username,
		memberAvatar: user.avatarURL('webp', false, 16),
	};
};

const createSelectMenu = namesArray =>
	new MessageActionRow().addComponents(
		new MessageSelectMenu()
			.setCustomId('search-yt-menu')
			.setPlaceholder('Please select a video')
			.addOptions([
				{
					label: `${namesArray[0]}`,
					value: '1',
				},
				{
					label: `${namesArray[1]}`,
					value: '2',
				},
				{
					label: `${namesArray[2]}`,
					value: '3',
				},
				{
					label: `${namesArray[3]}`,
					value: '4',
				},
				{
					label: `${namesArray[4]}`,
					value: '5',
				},
				{
					label: 'Cancel',
					value: 'cancel_option',
				},
			]),
	);
const deletePlayerIfNeeded = interaction => {
	const player = interaction.client.playerManager.get(interaction.guildId);
	if (player) {
		if (
			(player.queue.length && !player.nowPlaying) ||
      (!player.queue.length && !player.nowPlaying)
		) {return;}
		return interaction.client.playerManager.delete(interaction.guildId);
	}
};