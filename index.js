require('dotenv').config();
const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { CLIENT_ID } = require('./config.js');
const { Client, Intents, Collection } = require('discord.js');
const BOT_TOKEN = process.env.BOT_TOKEN;
const rest = new REST({ version: 9 }).setToken(BOT_TOKEN);
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] });
client.commands = new Collection();
const commands = [];


// lấy được list tên file js trong thư ./commands
const commandFiles = fs.readdirSync('./commands').map(folder =>
	fs.readdirSync(`./commands/${folder}`)
		.filter(file => file.endsWith('.js'))
		.map(file => `./commands/${folder}/${file}`)).flat();

for (const file of commandFiles) {
	const command = require(`${file}`);
	if (Object.keys(command).length === 0) continue;
	commands.push(command.data.toJSON());
	client.commands.set(command.data.name, command);
}
(async () => {
	try {
		console.log('Started refreshing application (/) commands.');

		await rest.put(Routes.applicationCommands(CLIENT_ID), {
			body: commands,
		});

		console.log('Successfully reloaded application (/) commands.');
	}
	catch (error) {
		console.error(error);
	}
})();

// đăng kí các event
const eventFiles = fs
	.readdirSync('./events')
	.filter(file => file.endsWith('.js'));


for (const file of eventFiles) {
	const event = require(`./events/${file}`);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args, client));
	}
	else {
		client.on(event.name, (...args) => event.execute(...args, client));
	}
}

client.once('ready', () => {
	client.playerManager = new Map();
	client.guildData = new Collection();
	client.user.setActivity('/', { type: 'WATCHING' });
	console.log('Bot ready!');
});


client.login(BOT_TOKEN);