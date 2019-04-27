import { assert } from "chai";
import Peelr from "../src";

describe("Peelr.link", function() {
  it("extracts from href attribute", async function() {
    assert.equal(
      await Peelr.link("a", Peelr.text("h1")).extract(`
        <a href="http://localhost:8000/">link</a>
      `),
      "h1 text content"
    );
  });

  it("extracts from other attribute", async function() {
    assert.equal(
      await Peelr.link("a", Peelr.text("h1"), { attr: "src" }).extract(`
          <a src="http://localhost:8000/">link</a>
        `),
      "h1 text content"
    );
  });

  it("extracts from transformed url", async function() {
    assert.equal(
      await Peelr.link("a", Peelr.text("h1"), {
        buildURL: url => url.replace(/removeme$/, "")
      }).extract(`
        <a href="http://localhost:8000/removeme">link</a>
      `),
      "h1 text content"
    );
  });

  it("extracts from async transformed url", async function() {
    assert.equal(
      await Peelr.link("a", Peelr.text("h1"), {
        buildURL: url => Promise.resolve(url.replace(/removeme$/, ""))
      }).extract(`
        <a href="http://localhost:8000/removeme">link</a>
      `),
      "h1 text content"
    );
  });
});
