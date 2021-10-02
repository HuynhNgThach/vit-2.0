const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageSelectMenu, MessageActionRow } = require('discord.js');
const Player = require('../../models/Player');
const Youtube = require('youtube-sr').default;
const createGuildData = require('../../models/GuildData');
const { AudioPlayerStatus, joinVoiceChannel, entersState, VoiceConnectionStatus } = require('@discordjs/voice');

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
		if (player.commandLock) {
			return interaction.followUp(':duck: busy');

		}
		player.commandLock = true;

		// seatch youtube song
		await searchYoutube(song,
			interaction,
			player,
			interaction.member.voice.channel, search);
	},
};
const searchYoutube = async (
	song,
	interaction,
	player,
	voiceChannel,
	searchFlag,
) => {
	const limit = searchFlag ? 5 : 1;
	const videos = await Youtube.search(song, { limit }).catch(
		async function() {
			return interaction.followUp(
				':x: There was a problem searching the video you requested!',
			);
		},
	);
	console.log(videos);
	if (!videos) {
		player.commandLock = false;
		return interaction.followUp(
			':x: I had some trouble finding what you were looking for, please try again or be more specific.',
		);
	}
	if (searchFlag && videos.length < 5) {
		player.commandLock = false;
		return interaction.followUp(
			':x: I had some trouble finding what you were looking for, please try again or be more specific.',
		);
	}
	if (searchFlag) {
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
				content: ':x:',
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
								`The queue hit its limit of ${MAX_QUEUE_LENGTH}, please wait a bit before attempting to add more songs`,
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
							'An error has occurred while trying to get the video ID from youtube.',
						);
					});
			}
		});
	}
	else {

		Youtube.getVideo(
			`https://www.youtube.com/watch?v=${videos[0].id}`,
		)
			.then(function(video) {
				if (video.live && !PLAY_LIVE_STREAM) {

					player.commandLock = false;
					return interaction.followUp(
						'Live streams are disabled in this server! Contact farmer to help',
					);
				}

				if (video.duration.hours !== 0 && !PLAY_VIDEO_LONGER_THAN_1_HOUR) {

					player.commandLock = false;
					return interaction.followUp(
						'Videos longer than 1 hour are disabled in this server! Contact farmer to help',
					);
				}

				if (
					interaction.client.playerManager.get(interaction.guildId).queue
						.length > MAX_QUEUE_LENGTH
				) {

					player.commandLock = false;
					return interaction.followUp(
						`The queue hit its limit of ${MAX_QUEUE_LENGTH}, please wait a bit before attempting to add more songs`,
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
				console.error(error);
				console.log('debug', videos);
				return interaction.followUp(
					'An error has occurred while trying to get the video ID from youtube.',
				);
			});
	}

};
const handleSubscription = async (queue, interaction, player) => {
	let voiceChannel = queue[0].voiceChannel;
	if (!voiceChannel) {
		// happens when loading a saved playlist
		voiceChannel = interaction.member.voice.channel;
	}

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
		deletePlayerIfNeeded(interaction);
		console.error(err);
		await interaction.followUp({ content: 'Failed to join your channel!' });
		return;
	}
	player.process(player.queue);
	await interaction.followUp(`Added to farm ${title}`);
};


const constructSongObj = (video, voiceChannel, user, timestamp) => {
	let duration = video.durationFormatted;
	if (duration === '00:00') duration = 'Live Stream';
	// checks if the user searched for a song using a Spotify URL
	return {
		url: video.url,
		title: video.title,
		view: video.views,
		uploadedAt: video.uploadedAt,
		rawDuration: video.duration,
		duration,
		timestamp,
		thumbnail: video.thumbnail.url,
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