const yts = require('yt-search');
const url = require('url');

async function test() {
	const r = await yts("top 20 WWE Theme songs");

	console.log(r.videos);
}
test();
const query = url.parse('https://www.youtube.com/watch?v=Xi2_K4aqxB4&ab_channel=NespChill%E3%83%85', true)?.query;
console.log(query);

