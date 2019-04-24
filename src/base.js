import cheerio from "cheerio";
import request from "request-promise-native";

export default class PeelrValue {
  constructor(selector, options = {}) {
    this.selector = selector;
    this.transform = options.transform || (x => x);
    this.multiple = options.multiple || false;
  }

  async extract(source) {
    let { selector, multiple, transform } = this;
    let $, html;

    if (typeof source === "string") {
      if (source.match(/^https?:\/\//)) {
        source = { url: source };
      } else {
        html = source;
      }
    }

    if (typeof source === "object") {
      html = await request(source);
    }

    $ = cheerio.load(html);
    let $target = $(selector);

    if (multiple) {
      return await Promise.all(
        $target
          .map(
            async (_, el) =>
              await transform(await this.getValue($(el).first(), $))
          )
          .get()
      );
    } else {
      return await transform(await this.getValue($target.first(), $));
    }
  }
}
