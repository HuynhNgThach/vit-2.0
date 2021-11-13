const jsoning = require('jsoning');
const db = new jsoning('db.json');

async function setData(data) {
	try {
		console.log('setData', db);
		const { ago, duration, image, thumbnail, timestamp, title, url, videoId, views } = data.video;
		await db.set(`${Date.now()}`, JSON.stringify({
			music: { ago, duration, image, thumbnail, timestamp, title, url, videoId, views },
			user: data.user,
		}));
	}
	catch (error) {
		console.log('ERROR in db ', error);
	}
}

module.exports = {
	setData,
};