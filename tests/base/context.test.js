import { assert } from "chai";
import request from "request-promise-native";

import PeelrContext from "../../src/base/context";

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

  describe("PeelrContext.deriveURL", function() {
    it("keeps absolute URLs", async function() {
      let ctx = PeelrContext.create("");
      assert.equal(
        await ctx.deriveURL("http://example.com"),
        "http://example.com"
      );
    });

    it("resolves relative URL with absolute <base href>", async function() {
      let ctx = PeelrContext.create('<base href="http://example.com">');
      assert.equal(await ctx.deriveURL("foo"), "http://example.com/foo");
    });

    it("resolves relative URL with absoute URL", async function() {
      let ctx = PeelrContext.create("http://localhost:8000");
      assert.equal(await ctx.deriveURL("foo"), "http://localhost:8000/foo");
    });

    it("resolves relative URL with relative <base href> and absolute URL", async function() {
      let ctx = PeelrContext.create("http://localhost:8000/baserel");
      assert.equal(
        await ctx.deriveURL("foo"),
        "http://localhost:8000/details/foo"
      );
    });

    it("resolves relative URL with absolute <base href> and absolute URL", async function() {
      let ctx = PeelrContext.create("http://localhost:8000/baseabs");
      assert.equal(
        await ctx.deriveURL("foo"),
        "http://localhost:8000/details/foo"
      );
    });
  });

  describe("PeelrContext.deriveParams", function() {
    it("replaces new URL and adds jar", function() {
      let ctx = PeelrContext.create("contextURL");
      let expected = {
        uri: "newURL",
        url: null,
        jar: ctx.jar
      };

      assert.deepEqual(ctx.deriveParams("deriveURL", "newURL"), expected);
      assert.deepEqual(
        ctx.deriveParams({ url: "deriveURL" }, "newURL"),
        expected
      );
      assert.deepEqual(
        ctx.deriveParams({ uri: "deriveURL" }, "newURL"),
        expected
      );
    });

    it("keeps auth and oauth from source context", function() {
      let auth = {};
      let oauth = {};
      let ctx = PeelrContext.create({ uri: "contextURL", auth, oauth });

      assert.equal(ctx.deriveParams("deriveURL", "newURL").auth, auth);
      assert.equal(ctx.deriveParams("deriveURL", "newURL").oauth, oauth);
    });

    it("keeps headers from source context when requested", function() {
      let ctx = PeelrContext.create({
        uri: "contextURL",
        headers: {
          "X-Foo": "foo",
          "X-Bar": "bar"
        },
        keepHeaders: ["X-Foo"]
      });

      assert.deepEqual(
        ctx.deriveParams({ url: "deriveURL" }, "newURL").headers,
        {
          "X-Foo": "foo"
        }
      );

      ctx = PeelrContext.create({
        uri: "contextURL",
        headers: {
          "X-Foo": "foo",
          "X-Bar": "bar"
        },
        keepHeaders: true
      });

      assert.deepEqual(ctx.deriveParams("deriveURL", "newURL").headers, {
        "X-Foo": "foo",
        "X-Bar": "bar"
      });
    });

    it("keeps other derived request params", function() {
      let ctx = PeelrContext.create("contextURL");
      assert.deepEqual(
        ctx.deriveParams({ url: "deriveURL", foo: "bar" }, "newURL"),
        {
          uri: "newURL",
          url: null,
          foo: "bar",
          jar: ctx.jar
        }
      );
    });
  });

  describe("PeelrContext.derive", function() {
    it("derives context from absolute URL", async function() {
      let ctx = PeelrContext.create("");
      let drv = await ctx.derive("http://localhost:8000");
      assert.equal(await drv.html(), "<h1>h1 text content</h1>");
    });

    it("derives context from request parameters", async function() {
      let ctx = PeelrContext.create("");
      let drv = await ctx.derive({ uri: "http://localhost:8000" });
      assert.equal(await drv.html(), "<h1>h1 text content</h1>");
    });

    describe("relative url resolution", function() {
      it("derives context from relative URL with absolute <base href>", async function() {
        let ctx = PeelrContext.create('<base href="http://localhost:8000">');
        let drv = await ctx.derive("details");
        assert.equal(await drv.html(), "<h1>details</h1>");
      });

      it("derives context from relative URL with absolute URL", async function() {
        let ctx = PeelrContext.create("http://localhost:8000");
        let drv = await ctx.derive("details");
        assert.equal(await drv.html(), "<h1>details</h1>");
      });

      it("derives context from relative URL with relative <base href> and absolute URL", async function() {
        let ctx = PeelrContext.create("http://localhost:8000/baserel");
        let drv = await ctx.derive("sub");
        assert.equal(await drv.html(), "<h1>sub</h1>");
      });

      it("derives context from relative URL with absolute <base href> and absolute URL", async function() {
        let ctx = PeelrContext.create("http://localhost:8000/baseabs");
        let drv = await ctx.derive("sub");
        assert.equal(await drv.html(), "<h1>sub</h1>");
      });
    });

    describe("response cache", function() {
      it("shares cache with derived contexts", async function() {
        let ctx = PeelrContext.create("http://localhost:8000/count");
        let html = await ctx.html();

        let drv = await ctx.derive("/count");
        assert.equal(await drv.html(), html);
      });

      it("misses cache when headers change", async function() {
        let ctx = PeelrContext.create("http://localhost:8000/count");
        let html = await ctx.html();

        let drv = await ctx.derive({
          url: "/count",
          headers: { "X-Foo": "bar" }
        });
        assert.notEqual(await drv.html(), html);
      });
    });

    describe("cookies", function() {
      it("keeps cookie jar", async function() {
        let value = Math.floor(Math.random() * 1000000);
        let ctx = PeelrContext.create(
          `http://localhost:8000/setcookie/${value}`
        );
        let drv = await ctx.derive("/getcookie");

        assert.equal(await drv.html(), `<div class="result">${value}</div>`);
      });

      it("overrides passed cookie jar", async function() {
        let value = Math.floor(Math.random() * 1000000);
        let ctx = PeelrContext.create(
          `http://localhost:8000/setcookie/${value}`
        );
        let drv = await ctx.derive({ url: "/getcookie", jar: request.jar() });

        assert.equal(await drv.html(), `<div class="result">undefined</div>`);
      });
    });
  });
});