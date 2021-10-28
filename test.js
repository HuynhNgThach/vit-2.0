const yts = require('yt-search');
const url = require('url');

async function test() {
	const query = url.parse('https://www.youtube.com/watch?v=pAm1a5mrO8o&ab_channel=%C4%90%C3%ACnhTr%E1%BB%8DngOfficial', true)?.query;
	console.log(query);
	const r = await yts({ videoId: 'pAm1a5mrO8o' });

	console.log(r.videos);
}
test();

