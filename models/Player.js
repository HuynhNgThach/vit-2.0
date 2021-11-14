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
const { MessageEmbed } = require('discord.js');
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
				this.textChannel.send({ embeds: [playingEmbed] });
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
		try {
			// const resource = await this.createAudioResource(song.url);
			const stream = ytdl(song.url, { filter: 'audioonly' });
			const resource = createAudioResource(stream);
			this.audioPlayer.play(resource);
			this.audioPlayer.on('error', error => {
				console.error(`Error: ${error.message} with resource`, error);

			});
		}
		catch (err) {
			console.error(err);
			return this.process(queue);
		}
	}
}

module.exports = MusicPlayer;
