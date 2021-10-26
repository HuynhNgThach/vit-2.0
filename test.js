const yts = require('yt-search');
async function test() {
	const r = await yts('phi hành gia');

	console.log(r.videos.slice(0, 3));
}
test();

