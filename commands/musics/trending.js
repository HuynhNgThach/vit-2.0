const { SlashCommandBuilder } = require('@discordjs/builders');
const Song = require('../../models/Song');
const { MessageAttachment, MessageEmbed } = require('discord.js');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');


// slash command for play
module.exports = {
	data: new SlashCommandBuilder()
		.setName('trending')
		.setDescription('Top 20 trending'),
	async execute(interaction) {
		try {
			await interaction.deferReply();
			const songs = await Song.find();
			const songTrend = [];
			songs.forEach(song => {
				const existIndex = songTrend.findIndex(i => i.name === song.name);
				if (existIndex === -1) {
					const s = {
						name: song.name,
						count: 1,
					};
					songTrend.push(s);
				}
				else {
					songTrend[existIndex].count += 1;
				}
			});
			songTrend.sort((a, b) => b.count - a.count);
			const width = 1000;
			const height = 1000;
			const backgroundColour = '#fff';
			const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour });
			const configuration = {
				type: 'line',
				data: {
					datasets: [
						{
							label: 'Song',
							data: songTrend.slice(0, 20),
							backgroundColor:'#e26900',
							borderColor: 'red',
						},
					],
				},
				options: {
					parsing: {
						xAxisKey: 'name',
						yAxisKey: 'count',
					},
					elements: {
						point: {
							radius: 5,
						},
						line: {
							borderWidth: 2,
						},

					},
				},

			};
			const image = await chartJSNodeCanvas.renderToBuffer(configuration);
			const attachment = new MessageAttachment(image);
			interaction.editReply({ embeds: [new MessageEmbed().setColor('#e26900').setDescription('Top 20 :medal:').setFooter('vit © 2021')], files: [attachment] });
		}
		catch (error) {
			console.log('ERROR||', error);
		}

	},
};

