const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const SongSchema = new Schema({
  name: String,
  requestBy: String,
  requesterAvatar: String,
  date: { type: Date, default: Date.now() },
  type: String,
  duration: String,
  image: String,
  thumbnail: String,
  id: String,
});

module.exports = mongoose.model("Song", SongSchema);
