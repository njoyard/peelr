import PeelrContext from "./context";

export default class PeelrValue {
  constructor(selector, options = {}) {
    this.selector = selector;
    this.transform = options.transform || (x => x);
    this.multiple = options.multiple || false;
    this.nextPage = options.nextPage;
  }

  async extract(source) {
    let ctx = PeelrContext.create(source);

    let { selector, multiple, nextPage, transform } = this;
    let $ = await ctx.cheerio();
    let $target = $(selector);

    if (typeof nextPage === "string") {
      nextPage = new PeelrValue.PeelrAttr(nextPage, "href");
    }

    if (multiple) {
      let items = [];

      while ($target) {
        items.push(
          ...(await Promise.all(
            $target
              .map(
                async (_, el) =>
                  await transform(await this.getValue($(el).first(), ctx), ctx)
              )
              .get()
          ))
        );

        if (nextPage) {
          let nextUrl = await nextPage.extract(ctx);
          if (nextUrl) {
            ctx = await ctx.derive(nextUrl);
            $ = await ctx.cheerio();
            $target = $(selector);
          } else {
            $target = null;
          }
        } else {
          $target = null;
        }
      }

      return items;
    } else if ($target.length) {
      return await transform(await this.getValue($target.first(), ctx), ctx);
    }
  }
}
