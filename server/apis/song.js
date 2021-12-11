const router = require("express").Router();
const Song = require("../../models/Song");

router.get("/getSongs", async (req, res) => {
  const songs = await Song.find();
  res.json(songs);
});

module.exports = router;
