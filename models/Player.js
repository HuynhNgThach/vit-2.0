const {
	AudioPlayerStatus,
	createAudioPlayer,
	entersState,
	VoiceConnectionDisconnectReason,
	VoiceConnectionStatus,
	createAudioResource,
	StreamType,
} = require('@discordjs/voice');
const { setTimeout } = require('timers');
const { promisify } = require('util');
const ytdl = require('ytdl-core');
const { MessageEmbed, MessageButton, MessageActionRow } = require('discord.js');
const wait = promisify(setTimeout);

class MusicPlayer {
	constructor() {
		this.connection = null;
		this.audioPlayer = createAudioPlayer();
		this.queue = [];
		this.skipTimer = false;
		this.loopSong = false;
		this.loopQueue = false;
		this.volume = 1;
		this.commandLock = false;
		this.textChannel;
	}

	passConnection(connection) {
		this.connection = connection;
		this.connection.on('stateChange', async (_, newState) => {
			if (newState.status === VoiceConnectionStatus.Disconnected) {
				if (
					newState.reason === VoiceConnectionDisconnectReason.WebSocketClose &&
                    newState.closeCode === 4014
				) {
					try {
						await entersState(
							this.connection,
							VoiceConnectionStatus.Connecting,
							5000,
						);
					}
					catch {
						this.connection.destroy();
					}
				}
				else if (this.connection.rejoinAttemps < 5) {
					await wait((this.connection.rejoinAttemps + 1) * 5000);
					this.connection.rejoin();
				}
				else {
					this.connection.destroy();
				}
			}
			else if (newState.status === VoiceConnectionStatus.Destroyed) {
				// when leaving
				if (this.nowPlaying !== null) {
					this.textChannel.client.guildData
						.get(this.textChannel.guildId)
						.queueHistory.unshift(this.nowPlaying);
				}
				this.stop();
			}
			else if (
				newState.status === VoiceConnectionStatus.Connecting ||
                newState.status === VoiceConnectionStatus.Signalling
			) {
				try {
					await entersState(
						this.connection,
						VoiceConnectionStatus.Ready,
						20000,
					);
				}
				catch {
					if (this.connection.state.status !== VoiceConnectionStatus.Destroyed) {this.connection.destroy();}
				}
			}
		});

		this.audioPlayer.on('stateChange', (oldState, newState) => {

			// next queue
			if (
				newState.status === AudioPlayerStatus.Idle &&
                oldState.status !== AudioPlayerStatus.Idle
			) {
				console.log('1');
				if (this.loopSong) {
					this.process(this.queue.unshift(this.nowPlaying));
				}
				else if (this.loopQueue) {
					this.process(this.queue.push(this.nowPlaying));
				}
				else {
					if (this.nowPlaying !== null) {
						this.textChannel.client.guildData
							.get(this.textChannel.guildId)
							.queueHistory.unshift(this.nowPlaying);
					}
					// Finished playing audio
					if (this.queue.length) {
						console.log('in the next queue');
						this.process(this.queue);
					}
					else {
						// leave channel close connection and subscription
						// eslint-disable-next-line no-lonely-if
						if (this.connection._state.status !== 'destroyed') {
							this.connection.destroy();
							this.textChannel.client.playerManager.delete(
								this.textChannel.guildId,
							);
						}
					}
				}
			}
			else if (newState.status === AudioPlayerStatus.Playing && oldState.status !== AudioPlayerStatus.Paused) {
				console.log('2');


				const pauseBtn = new MessageButton()
					.setCustomId('pause')
					.setLabel('Pause')
					.setStyle('PRIMARY');
				const pausedBtn = new MessageButton()
					.setCustomId('paused')
					.setLabel('Paused')
					.setStyle('SECONDARY');
				const skipBtn = new MessageButton()
					.setCustomId('skip')
					.setLabel('Skip')
					.setStyle('DANGER');
				const shuffleBtn = new MessageButton()
					.setCustomId('shuffle')
					.setLabel('Shuffle')
					.setStyle('PRIMARY');
				const row = new MessageActionRow()
					.addComponents(
						pauseBtn,
					)
					.addComponents(shuffleBtn)
					.addComponents(
						skipBtn,
					);
				console.log('set timeout collector: ', `${this.nowPlaying.durationSecond / 60}s`, this.nowPlaying);
				const collector = this.textChannel.createMessageComponentCollector({ componentType: 'BUTTON', time: (this.nowPlaying.durationSecond / 60) * 1000 });

				collector.on('collect', async i => {
					if (i.customId === 'skip') {
						console.log('skip', i);
						// await guildQueue.skip();
						if (this.audioPlayer && this.audioPlayer.state.status === AudioPlayerStatus.Playing) {
							await i.update({ content: 'Skipped!', components: [] });
							this.audioPlayer.stop();
							if (!collector.ended) {
								collector.stop();
							}
						}

					}
					else if (i.customId === 'pause') {
						// await guildQueue.setPaused(true);
						if (this.audioPlayer && this.audioPlayer.state.status === AudioPlayerStatus.Playing) {
							row.spliceComponents(0, 1, pausedBtn);
							await i.update({ content: ':pause_button:', components: [row] });
							this.audioPlayer.pause();
							console.log(this.audioPlayer.state);
						}

					}
					else if (i.customId === 'paused') {
						if (this.audioPlayer && this.audioPlayer.state.status === AudioPlayerStatus.Paused) {
							row.spliceComponents(0, 1, pauseBtn);
							await i.update({ content: ':microphone:', components: [row] });
							this.audioPlayer.unpause();
							console.log(this.audioPlayer.state);
						}
					}
					else if (i.customId === 'shuffle') {
						if (this.queue.length < 1) {
							await i.update({ content: 'Có bài nào đâu mà xào', components: [row] });
						}
						else {
							for (let k = this.queue.length - 1; k > 0; k--) {
								const j = Math.floor(Math.random() * (k + 1));
								[this.queue[k], this.queue[j]] = [this.queue[j], this.queue[k]];
							}
							await i.update({ content: 'Xào bài xong!', components: [row] });
						}
					}
				});

				collector.on('end', collected => {
					console.log(`Collected ${collected.size} interactions.`);
				});
				const playingEmbed = new MessageEmbed()
					.setImage(this.nowPlaying.thumbnail)
					.setTitle(this.nowPlaying.title)
					.setColor('#e26900')
					.addField('Duration', ':stopwatch: ' + this.nowPlaying.duration, true)
					.addField('Views', new Intl.NumberFormat().format(this.nowPlaying.view), true)
					.setFooter(
						`Requested by ${this.nowPlaying.memberDisplayName}!`,
						this.nowPlaying.memberAvatar,
					);
				if (this.queue.length) {
					playingEmbed.addField('Next Song', this.queue[this.queue.length - 1].title, true);
				}
				this.textChannel.send({ embeds: [playingEmbed], components: [row] });
			}
		});

		this.audioPlayer.on('error', error => {
			console.error(error);
		});

		this.connection.subscribe(this.audioPlayer);
	}

	stop() {
		this.queue.length = 0;
		this.nowPlaying = null;
		this.skipTimer = false;
		this.isPreviousTrack = false;
		this.loopSong = false;
		this.loopQueue = false;
		this.audioPlayer.stop(true);
	}

	async process(queue) {
		if (
			this.audioPlayer.state.status !== AudioPlayerStatus.Idle ||
            this.queue.length === 0
		) return;

		const song = this.queue.shift();
		this.nowPlaying = song;
		if (this.commandLock) this.commandLock = false;
		try {
			// const resource = await this.createAudioResource(song.url);
			const stream = ytdl(song.url, {
				filter: 'audio',
				quality: 'highestaudio',
				highWaterMark: 1 << 25,
			});
			const resource = createAudioResource(stream, {
				inputType: StreamType.Arbitrary,
			});
			this.audioPlayer.play(resource);
		}
		catch (err) {
			console.error(err);
			return this.process(queue);
		}
	}
}

module.exports = MusicPlayer;
