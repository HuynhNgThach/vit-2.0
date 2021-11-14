const youtubedl = require('youtube-dl-exec');

youtubedl('https://www.youtube.com/watch?v=WhcWfpCWsS0&ab_channel=MixiCityRecords', {
	dumpSingleJson: true,
	noWarnings: true,
	noCallHome: true,
	noCheckCertificate: true,
	preferFreeFormats: true,
	youtubeSkipDashManifest: true,
	referer: 'https://www.youtube.com/watch?v=WhcWfpCWsS0&ab_channel=MixiCityRecords',
})
	.then(output => console.log(output));