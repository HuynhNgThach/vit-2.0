const express = require("express");
const app = express();
const api = require("./apis/song");
const cors = require("cors");

// app.listen(3030, () => {
//  console.log(`Start server at port ${"3030"}`);
// });
app.use(cors());
app.use("/vit", api);
module.exports = app;
