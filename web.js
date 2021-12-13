const server = require("./server");

try {
  // start api server
  server.listen(process.env.PORT || 3020, () => {
    console.log(`Server started successfully`);
  });
} catch (e) {
  console.log("error start server ", e);
}
