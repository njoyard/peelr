import { createServer } from "http";

let server;

before(function() {
  server = createServer((req, res) => {
    res.end(`
      <h1>h1 text content</h1>
    `);
  });
  server.listen(8000);
});

after(function() {
  server.close();
});
