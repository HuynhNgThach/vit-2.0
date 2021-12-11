const express = require("express");
const app = express();
const api = require("./apis/song");

// app.listen(3030, () => {
//  console.log(`Start server at port ${"3030"}`);
// });
app.use("/vit", api);
module.exports = app;
