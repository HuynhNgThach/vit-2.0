const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data:  new SlashCommandBuilder()
		.setName('shuffle')
		.setDescription('Xào bài nè'),
	async execute(interaction) {
		await interaction.deferReply();
		const voiceChannel = interaction.member.voice.channel;
		if (!voiceChannel) {
			interaction.followUp('Vào voice chưa vậy?');
		}
		const player = interaction.client.playerManager.get(interaction.guildId);
		if (!player) {
			return interaction.followUp('Có bài nào đâu');
		}
		if (player.queue.length < 1) {
			return interaction.followUp('Không có bài nào trong farm để xào cả');
		}
		shuffle(player.queue);
		return interaction.followUp('Xào bài xong');

	},
};

function shuffle(queue) {
	for (let i = queue.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[queue[i], queue[j]] = [queue[j], queue[i]];
	}
}