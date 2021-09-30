const { SlashCommandBuilder } = require('@discordjs/builders');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('Skip bài đang hát!'),
	async execute(interaction) {
		const voiceChannel = interaction.member.voice.channel;
		if (!voiceChannel) {
			interaction.reply(':duck: vào voice chat chưa');
			return;
		}
		const player = interaction.client.playerManager.get(interaction.guildId);
		if (!player || player.audioPlayer.state.status !== AudioPlayerStatus.Playing) {
			interaction.reply('Có bài nào đâu mà skip!');
			return;
		}
		interaction.reply(
			`ok skip **${interaction.client.playerManager.get(interaction.guildId).nowPlaying.title}**`,
		);
		console.log(player.audioPlayer);
		player.audioPlayer.stop();
	},
};