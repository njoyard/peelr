import { assert } from "chai";

import Peelr from "../src";
import PeelrValue from "../src/base";

let html = `
  <p>
    <div class="mycls" id="child1"></div>
    <div class="mycls" id="child2"></div>
  </p>
`;

async function getValue() {
  let val = new PeelrValue(...arguments);
  val.getValue = function($el) {
    return $el.attr("id");
  };
  return await val.extract(html);
}

describe("PeelrValue", function() {
  it("extracts value", async function() {
    assert.equal(await getValue(".mycls"), "child1");
  });

  it("transforms value", async function() {
    assert.equal(
      await getValue(".mycls", { transform: v => v.toUpperCase() }),
      "CHILD1"
    );
  });

  it("awaits async transform", async function() {
    assert.equal(
      await getValue(".mycls", {
        transform: v => Promise.resolve(v.toUpperCase())
      }),
      "CHILD1"
    );
  });

  it("extracts multiple values", async function() {
    assert.deepEqual(await getValue(".mycls", { multiple: true }), [
      "child1",
      "child2"
    ]);
  });

  it("transforms multiple values", async function() {
    assert.deepEqual(
      await getValue(".mycls", {
        multiple: true,
        transform: v => v.toUpperCase()
      }),
      ["CHILD1", "CHILD2"]
    );
  });

  it("extracts from url", async function() {
    let val = new PeelrValue("h1");
    val.getValue = function($el) {
      return $el.text();
    };
    assert.equal(await val.extract("http://localhost:8000"), "h1 text content");
  });

  it("extracts from request parameters", async function() {
    let val = new PeelrValue("h1");
    val.getValue = function($el) {
      return $el.text();
    };
    assert.equal(
      await val.extract({ uri: "http://localhost:8000" }),
      "h1 text content"
    );
  });

  it("extracts paginated values with nextPage extractor", async function() {
    let val = new PeelrValue(".item", {
      multiple: true,
      nextPage: Peelr.attr(".next", "href")
    });
    val.getValue = function($el) {
      return $el.text();
    };
    assert.deepEqual(await val.extract("http://localhost:8000/page1"), [
      "item 1",
      "item 2",
      "item 3",
      "item 4",
      "item 5",
      "item 6"
    ]);
  });

  it("extracts paginated values with nextPage selector", async function() {
    let val = new PeelrValue(".item", {
      multiple: true,
      nextPage: ".next"
    });
    val.getValue = function($el) {
      return $el.text();
    };
    assert.deepEqual(await val.extract("http://localhost:8000/page1"), [
      "item 1",
      "item 2",
      "item 3",
      "item 4",
      "item 5",
      "item 6"
    ]);
  });
});
