const { SlashCommandBuilder } = require('@discordjs/builders');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('resume')
		.setDescription('Unpause cái đang pause'),
	execute(interaction) {
		const voiceChannel = interaction.member.voice.channel;
		if (!voiceChannel) {
			interaction.reply(':duck: vào voice chat chưa ??');
			return;
		}
		const player = interaction.client.playerManager.get(interaction.guildId);
		if (!player) {
			interaction.reply('Có bài nào đâu mà resume!');
			return;
		}
		if (player.audioPlayer.state.status === AudioPlayerStatus.Paused) {
			return interaction.reply('Có gì pause đâu ');
		}
		const success = player.audioPlayer.unpause();
		if (success) {
			return interaction.reply(':play_pause: Resumed! :))');
		}
		return interaction.reply(
			':duck: Không resume được ta ??',
		);
	},
};