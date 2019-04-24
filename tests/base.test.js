import { assert } from "chai";

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
      await val.extract({ url: "http://localhost:8000" }),
      "h1 text content"
    );
  });
});
