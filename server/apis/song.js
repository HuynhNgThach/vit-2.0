const router = require("express").Router();
const Song = require("../../models/Song");
const stream = require("youtube-audio-stream");

router.get("/getSongs", async (req, res) => {
  const songs = await Song.find();

  res.json(songs);
});
router.get("/audio", async (req, res) => {
  try {
    // for await (const chunk of stream(
    //  "http://youtube.com/watch?v=NbQ9HCr3IeY"
    // )) {
    //  res.write(chunk);
    // }
    stream("http://youtube.com/watch?v=NbQ9HCr3IeY").pipe(res);
    // res.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end("internal system error");
    }
  }
});

module.exports = router;
