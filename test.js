const yts = require('yt-search');
const url = require('url');

async function test() {
	const r = await yts({ videoId: 'tZY-iWc242c' });

	console.log(r);
}
test();
const query = url.parse('https://www.youtube.com/watch?v=Xi2_K4aqxB4&ab_channel=NespChill%E3%83%85', true)?.query;
console.log(query);

