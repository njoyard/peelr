# Peelr

Peelr is a versatile web data extraction (or scraping) library for NodeJS.

It uses [request][rqst] to make http requests and [cheerio][cheerio] to extract
things from HTML.

## Quickstart

```sh
yarn add Peelr
```

```js
const Peelr = require('Peelr');
```

## Introduction

This documentation is written bottom-up, presenting simpler concepts and
features first, later building on them to reach more complex goals.  In a
nutshell it describes the following tasks, in order:

* Extracting simple values from HTML snippets
* Building more complex values using simple extractors
* Combining data from multiple pages
* Defining a full data model to extract data from a website (or multiple
  interlinked websites)

## Peelr extractors

The root concept in Peelr is an extractor.  An extractor is defined using a
target CSS selector and a few parameters, and they all share the same syntax:

```js
let extractor = Peelr.something(
  '.my-target', extractorSpecificParameters[, options]
);
```

They all accept a selector as their first argument, and an optional common
options object as their last argument, which may contain the following values:
* `multiple`: a boolean to indicate whether to extract a list of values, one for
  each matching target element, or a single value only, from the first matching
  element.  Defaults to `false`.
* `transform`: a function to apply to extracted values before returning them.
  That function can be `async`.  When `multiple` is `true`, it will be called
  once for each value.

Once defined, an extractor can be applied to HTML snippets or webpage URLs:

```js
let result1 = await extractor.extract('<html>...</html>');
let result2 = await extractor.extract('https://example.com');
```

Instead of a URL, you may also pass a full options object for [request][rqst].
This is useful if you need to pass specific headers, use an other method than
GET, or for example if the target website requires signing in:

```js
const request = require('request-promise-native');
const cookieJar = request.jar()

await request.post({
  url: 'https://example.com/login',
  jar: cookieJar,
  form: { login: 'john', password: 'hunter3' }
});

let result = await extractor.extract({
  url: 'https://example.com/data',
  jar: cookieJar
});
```

## Simple extractors

Simple extractors extract values from target elements.

* `Peelr.attr(selector, name)` extracts attribute values
* `Peelr.data(selector, name)` extracts data-attribute values
* `Peelr.hasClass(selector, className)` extracts booleans from class presence
* `Peelr.html(selector)` extracts inner HTML
* `Peelr.is(selector, selector)` extracts booleans from matching selectors
* `Peelr.text(selector)` extracts text content
* `Peelr.val(selector)` extracts `<input>` values

A few quick examples:

```js
await Peelr.attr('p', 'id')
  .extract('<div><p id="foo"></p><p id="bar"></p></div>');
// "foo"

await Peelr.is('p', '.visible', { multiple: true })
  .extract(`
    <p class="visible"></p>
    <p class="invisible"></p>
    <p class="visible"></p>
  `);
// [true, false, true]

await Peelr.html('div', { transform: t => t.toUpperCase() })
  .extract('<div><p id="foo"></p></div>');
// "<P ID="FOO"></P>"
```

For more specific needs you can use a custom extractor.  Pass a custom
extraction function, which will receive a [cheerio][cheerio] matched set with
only 1 element.  When using `{ multiple: true }`, the extraction function will
be called once for each matched element.  This function can be `async`.

```js
await Peelr.custom('form', ($target) => $target.serialize())
  .extract(`
    <form>
      <input name="foo" value="foos" />
      <input name="bar" value="bars" />
    </form>
  `)
// "foo=foos&bar=bars"
```

## Complex extractors

Complex extractors combine simple extractors to build complex data structures.

### List extractor

List extractors can be used to build arrays containing the results of many other
extractors.

A quick example:

```js
await Peelr.list(
  '.item',
  [Peelr.text('.description'), Peelr.text('.price')],  
).extract(`
  <div class="item">
    <span class="description">Item 1</span>
    <span class="price">12.00</span>
  </div>
`)
// ["Item 1", "12.00"]
```

You can still use the `multiple` option, of course:

```js
await Peelr.list(
  '.item',
  [Peelr.text('.description'), Peelr.text('.price')],
  { multiple: true }
).extract(`
  <div class="item">
    <span class="description">Item 1</span>
    <span class="price">12.00</span>
  </div>
  <div class="item">
    <span class="description">Item 2</span>
    <span class="price">36.50</span>
  </div>
`)
// [["Item 1", "12.00"], ["Item 2", "36.50"]]
```

Selectors used in the list parameter will only target children of the root
element.  However, you can use the `::root` selector to target the root
element itself:

```js
await Peelr.list(
  '.article',
  [Peelr.attr('::root', 'href'), Peelr.text('.title')],
  { multiple: true }
).extract(`
  <a class="article" href="/article/1">
    <span class="title">You will not believe this</span>
  </a>
  <a class="article" href="/article/2">
    <span class="title">Wow, this is crazy</span>
  </a>
`)
// [["/article/1", "You will not believe this"],
//  ["/article/2", "Wow, this is crazy"]]
```

Using the `transform` option with a list extractor allows building arbitrary
structures with each list of results:

```js
await Peelr.list(
  '.article',
  [Peelr.attr('::root', 'href'), Peelr.text('.title')],
  {
    multiple: true,
    transform: ([link, title]) => `[${title}](${link})`
  }
).extract(`
  <a class="article" href="/article/1">
    <span class="title">You will not believe this</span>
  </a>
  <a class="article" href="/article/2">
    <span class="title">Wow, this is crazy</span>
  </a>
`)
// ["[You will not believe this](/article/1)",
//  "[Wow, this is crazy](/article/2)"]
```

### Hash extractor

Hash extractors can be used to build POJOs by combining the results from other
extractors.  They are implemented as list extractors with a predefined
`transform` option (but you can add your own on top of it, of course).

A quick example:

```js
await Peelr.hash(
  '.item',
  {
    desc: Peelr.text('.description'),
    price: Peelr.text('.price', { transform: p => Number(p) })
  },
  { multiple: true }
).extract(`
  <section class="items">
    <div class="item">
      <span class="description">Item 1</span>
      <span class="price">12.00</span>
    </div>
    <div class="item">
      <span class="description">Item 2</span>
      <span class="price">36.50</span>
    </div>
  </section>
`);
// [{ desc: "Item 1", price: 12 }, { desc: "Item 2", price: 36.5 }]
```

The hash parameter is not limited to a flat list of key/value pairs, it can also
have a deeply nested structure including extractors at any level, as well as
non-extractor values that will just be copied to the result:

```js
await Peelr.hash(
  '.item',
  {
    type: 'item',
    desc: Peelr.text('.description'),
    price: {
      amount: Peelr.text('.price', { transform: p => Number(p) }),
      currency: Peelr.text('.currency')
    }
  }
).extract(`
  <div class="item">
    <span class="description">Item 1</span>
    <span class="price">12.00</span>
    <span class="currency">EUR</span>
  </div>
`);
// { type: "item", desc: "Item 1", price: { amount: 12, currency: "EUR" } }
```

You can still use the `::root` selector to target the root element:

```js
await Peelr.hash(
  '.article',
  {
    link: Peelr.attr('::root', 'href'),
    title: Peelr.text('.title')
  },
  { multiple: true }
).extract(`
  <a class="article" href="/article/1">
    <span class="title">You will not believe this</span>
  </a>
  <a class="article" href="/article/2">
    <span class="title">Wow, this is crazy</span>
  </a>
`)
// [{ link: '/article/1', title: "You will not believe this" },
//  { link: '/article/2', title: "Wow, this is crazy" }]
```

> **Caveat:** do not include arrays in the hash, or objects that are neither
> extractors nor POJOs, as this will mess up the hash parsing stage.  If you
> need those, use a transform function to add them after extraction.

## Development

### Running tests

`yarn test` runs the full test suite.  Note that it requires port 8000 to be
available, as it spawns a test web server.

---

[cheerio]: https://github.com/cheeriojs/cheerio
[rqst]: https://github.com/request/request
