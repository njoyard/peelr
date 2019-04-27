import { createServer } from "http";

let server;

const pages = {
  index: "<h1>h1 text content</h1>",

  baserel: '<base href="/details/">',
  baseabs: '<base href="http://localhost:8000/details/">',

  details: "<h1>details</h1>",
  details_sub: "<h1>sub</h1>",

  page1: `
    <div class="item">item 1</div>
    <div class="item">item 2</div>
    <a class="next" href="/page2"></a>
  `,
  page2: `
    <div class="item">item 3</div>
    <div class="item">item 4</div>
    <a class="next" href="/page3"></a>
  `,
  page3: `
    <div class="item">item 5</div>
    <div class="item">item 6</div>
  `
};

before(function() {
  server = createServer((req, res) => {
    let path = req.url.replace(/^\//, "").replace(/\//g, "_");

    if (path === "") {
      path = "index";
    }

    if (path in pages) {
      res.end(pages[path].trim());
    } else {
      // eslint-disable-next-line no-console
      console.log(`Unknown path ${req.url}`);

      res.statusCode = 404;
      res.end();
    }
  });

  server.listen(8000);
});

after(function() {
  server.close();
});
