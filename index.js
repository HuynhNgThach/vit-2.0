/*
                  ,--.    ,--.
                 ((O ))--((O ))
               ,'_`--'____`--'_`.
              _:  ____________  :_
             | | ||::::::::::|| | |
             | | ||::::::::::|| | |
             | | ||::::::::::|| | |
             |_| |/__________\| |_|
               |________________|
            __..-'            `-..__
         .-| : .----------------. : |-.
       ,\ || | |\______________/| | || /.
      /`.\:| | ||  __  __  __  || | |;/,'\
     :`-._\;.| || '--''--''--' || |,:/_.-':
     |    :  | || .----------. || |  :    |
     |    |  | || '----VIT---' || |  |    |
     |    |  | ||   _   _   _  || |  |    |
     :,--.;  | ||  (_) (_) (_) || |  :,--.;
     (`-'|)  | ||______________|| |  (|`-')
      `--'   | |/______________\| |   `--'
             |____________________|
              `.________________,'
               (_______)(_______)
               (_______)(_______)
               (_______)(_______)
               (_______)(_______)
              |        ||        |
              '--------''--------'
*/


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
let textChannelId = '';
const mongoose = require('mongoose');


const { continuousGetMessage } = require('./msteam.js');
const url = `https://southeastasia-prod-2.notifications.teams.microsoft.com/users/8:orgid:e91527c9-2481-45ec-972c-9ceb2226357d/endpoints/88001bde-ee83-4214-aaab-6cbf312993ee/events/poll?cursor=${Math.round(Date.now() / 1000)}&sca=0`;


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

client.once('ready', (c) => {

	client.playerManager = new Map();
	client.guildData = new Collection();
	client.user.setActivity('/', { type: 'WATCHING' });
	console.log('Bot ready!');
	const channelData = [];
	c.channels.cache.forEach(channel => {
		if (channel.type === 'GUILD_TEXT') {
			textChannelId = channel.id;
			channelData.push(textChannelId);
		}
	});
	client.channels.cache.get('909085755845017661').send('Vit đã online :duck:');
	// try {
	// 	continuousGetMessage(url, client);
	// 	// connect database
	// 	mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
	// 	mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));
	// }
	// catch (error) {
	// 	console.log('ERROR', error);
	// }
});


client.login(BOT_TOKEN);