import { assert } from "chai";

import PeelrContext from "../src/context";

describe("PeelrContext", function() {
  describe("PeelrContext.create", function() {
    it("creates a new instance", async function() {
      assert.ok(PeelrContext.create("source") instanceof PeelrContext);
    });

    it("returns existing instance", async function() {
      let ctx = PeelrContext.create("source");
      assert.equal(PeelrContext.create(ctx), ctx);
    });
  });

  describe("PeelrContext.html", function() {
    it("returns HTML from source", async function() {
      assert.equal(
        await PeelrContext.create(`<html>foo</html>`).html(),
        "<html>foo</html>"
      );
    });

    it("returns HTML from URL", async function() {
      assert.equal(
        await PeelrContext.create("http://localhost:8000").html(),
        "<h1>h1 text content</h1>"
      );
    });

    it("returns HTML from request parameters", async function() {
      assert.equal(
        await PeelrContext.create({
          uri: "http://localhost:8000"
        }).html(),
        "<h1>h1 text content</h1>"
      );
    });
  });

  describe("PeelrContext.url", function() {
    it("returns no URL from source", async function() {
      assert.equal(
        await PeelrContext.create(`<html>foo</html>`).url(),
        undefined
      );
    });

    it("returns URL from URL", async function() {
      assert.equal(
        await PeelrContext.create("http://localhost:8000").url(),
        "http://localhost:8000"
      );
    });

    it("returns URL from request parameters", async function() {
      assert.equal(
        await PeelrContext.create({
          uri: "http://localhost:8000"
        }).url(),
        "http://localhost:8000"
      );
    });
  });

  describe("PeelrContext.cheerio", function() {
    it("returns cheerio instance from source", async function() {
      let $ = await PeelrContext.create(`<html>foo</html>`).cheerio();
      assert.equal(typeof $, "function");
      assert.equal($("html").text(), "foo");
    });

    it("returns cheerio instance from URL", async function() {
      let $ = await PeelrContext.create("http://localhost:8000").cheerio();
      assert.equal(typeof $, "function");
      assert.equal($("h1").text(), "h1 text content");
    });

    it("returns cheerio instance from request parameters", async function() {
      let $ = await PeelrContext.create({
        uri: "http://localhost:8000"
      }).cheerio();
      assert.equal(typeof $, "function");
      assert.equal($("h1").text(), "h1 text content");
    });
  });

  describe("PeelrContext.derive", function() {
    it("derives context from absolute URL", async function() {
      let ctx = await PeelrContext.create("");
      let drv = await ctx.derive("http://localhost:8000");
      assert.equal(await drv.html(), "<h1>h1 text content</h1>");
    });

    it("derives context from request parameters", async function() {
      let ctx = await PeelrContext.create("");
      let drv = await ctx.derive({ uri: "http://localhost:8000" });
      assert.equal(await drv.html(), "<h1>h1 text content</h1>");
    });

    it("derives context from relative URL with absolute <base href>", async function() {
      let ctx = await PeelrContext.create(
        '<base href="http://localhost:8000">'
      );
      let drv = await ctx.derive("details");
      assert.equal(await drv.html(), "<h1>details</h1>");
    });

    it("derives context from relative URL with absolute URL", async function() {
      let ctx = await PeelrContext.create("http://localhost:8000");
      let drv = await ctx.derive("details");
      assert.equal(await drv.html(), "<h1>details</h1>");
    });

    it("derives context from relative URL with relative <base href> and absolute URL", async function() {
      let ctx = await PeelrContext.create("http://localhost:8000/baserel");
      let drv = await ctx.derive("sub");
      assert.equal(await drv.html(), "<h1>sub</h1>");
    });

    it("derives context from relative URL with absolute <base href> and absolute URL", async function() {
      let ctx = await PeelrContext.create("http://localhost:8000/baseabs");
      let drv = await ctx.derive("sub");
      assert.equal(await drv.html(), "<h1>sub</h1>");
    });
  });
});
