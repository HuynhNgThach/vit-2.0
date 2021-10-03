const axios = require('axios').default;
const cheerio = require('cheerio');
const from = ['Phương. Nguyễn Ngọc Quỳnh (2)'];
const config = {
	authentication: process.env.msteam_token,
	// authentication: 'skypetoken=eyJhbGciOiJSUzI1NiIsImtpZCI6IjEwMiIsIng1dCI6IjNNSnZRYzhrWVNLd1hqbEIySmx6NTRQVzNBYyIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MzIwNDA0MjksImV4cCI6MTYzMjEyNjgyOCwic2t5cGVpZCI6Im9yZ2lkOmU5MTUyN2M5LTI0ODEtNDVlYy05NzJjLTljZWIyMjI2MzU3ZCIsInNjcCI6NzgwLCJjc2kiOiIxNjMyMDQwMTI4IiwidGlkIjoiN2MxMTJhNmUtMTBlMi00ZTA5LWFmYzQtMmUzN2JjNjBkODIxIiwicmduIjoiYXBhYyJ9.ltKD1Nav0RyekmI-Sdzkf40eNbSzEr2QO5NQ8QVJqhT7bnjxrgpajNfenaDrTgB-aa3zF3-asdhxZY9tNoWzSsR1A7mu6Cgen9xPANUmWsfnhfyeW_-lZ3BiJJOs_vVh8PErMyaV0qQnw8XGthFVDsHQ0GNiTwsYpO5bhfauLrOU5TH3ONPCoDyEBBYpp2OwhxMYcUnTFPYOaYtwbq0nxyqaoxfDlgtUwvpoihBHNdGBw4iyw6QEpJhZxJbHi0FWWYl8HpIntSQI-99nDmI-RGK6E_2TFCk6aEWzupEJp3ljKDOqucOr4MNFzuw2ykbKRBDhwyTdcBUs8FdslHNQIA',
	url: `https://southeastasia-prod-2.notifications.teams.microsoft.com/users/8:orgid:e91527c9-2481-45ec-972c-9ceb2226357d/endpoints/88001bde-ee83-4214-aaab-6cbf312993ee/events/poll?cursor=${Math.round(Date.now() / 1000)}&sca=0`,
};

const options = {
	headers: {
		Authentication: config.authentication,
	},
};

const oldMessage = [];

async function conitunousGetMessage(link = config.url, client, textChannelId) {
	try {
		console.log('fetch url ', link);
		const response = await axios.get(link, options);
		const data = response.data;
		const eventMessages = data.eventMessages;
		if (eventMessages) {
			eventMessages.forEach(mess => {
				if (mess.resource && mess.resourceType === 'NewMessage') {
					if (!oldMessage.includes(mess.resource.clientmessageid)) {
						if (mess.resource.content && mess.resource.imdisplayname && from.includes(mess.resource.imdisplayname)) {
							// client.channels.cache.get(textChannelId).send(mess);
							const testParseHtml = cheerio.load(mess.resource.content);
							const url = testParseHtml('a').attr('href');
							if (url) {
								const cmd = `!dd  ${url}`;
								sendMessage(textChannelId, cmd, client);
							}


						}
					}

				}
			});
		}
		conitunousGetMessage(data.next, client, textChannelId);
		// config.url = data.next
	}
	catch (error) {
		// sendMessage(textChannelId, ':duck: :x: Tao chết rồi nhen!', client);
		sendMessage(textChannelId, `:duck: :x: ERROR ${error.message}`, client);
	}

}
function sendMessage(channelId, mess, client) {
	client.channels.cache.get(channelId).send(mess);
}
module.exports = {
	conitunousGetMessage,
};