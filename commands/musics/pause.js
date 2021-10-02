const { SlashCommandBuilder } = require('@discordjs/builders');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pause')
		.setDescription('Khoan dừng khoảng chừng là ... s'),
	execute(interaction) {
		const voiceChannel = interaction.member.voice.channel;
		if (!voiceChannel) {
			interaction.reply(':duck: vào voice chat chưa ??');
			return;
		}
		const player = interaction.client.playerManager.get(interaction.guildId);
		if (!player) {
			interaction.reply('Có bài nào đâu mà pause!');
			return;
		}
		if (player.audioPlayer.state.status === AudioPlayerStatus.Paused) {
			return interaction.reply('Bài này đang pause r đó');
		}
		const success = player.audioPlayer.pause();
		if (success) {
			return interaction.reply(':pause_button: Pause rồi đó, dùng resum để k pause nữa :))');
		}
		return interaction.reply(
			':duck: Pause không được ta ??',
		);
	},
};