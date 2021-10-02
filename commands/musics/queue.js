const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const { PagesBuilder } = require('discord.js-pages');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('queue')
		.setDescription('Đang có gì trong farm!'),
	async execute(interaction) {
		await interaction.deferReply();

		const player = interaction.client.playerManager.get(interaction.guildId);
		if (player) {
			if (player.queue.length == 0) {
				return interaction.followUp(':x: Empty Farm');
			}
		}
		else if (!player) {
			return interaction.followUp(':x: Chưa có bài nào');
		}

		const queueClone = Array.from(player.queue);
		const embeds = [];

		for (let i = 0; i < Math.ceil(queueClone.length / 10); i++) {
			const playlistArray = queueClone.slice(i * 10, 10 + i * 10);
			const fields = [];

			playlistArray.forEach((element, index) => {
				fields.push({
					name: `${index + 1 + i * 10}`,
					value: `${element.title}`,
				});
			});

			embeds.push(new MessageEmbed().setTitle(`Page ${i}`).setFields(fields));
		}

		new PagesBuilder(interaction)
			.setTitle('Music Queue')
			.setPages(embeds)
			.setListenTimeout(2 * 60 * 1000)
			.setColor('#9096e6')
			.setAuthor(
				interaction.member.user.username,
				interaction.member.user.displayAvatarURL(),
			)
			.build();
	},
};
