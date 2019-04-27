import { PeelrAttr } from "./dom";

export default class PeelrLink extends PeelrAttr {
  constructor(selector, extractor, options = {}) {
    options = Object.assign(
      { transform: x => x, attr: "href", buildURL: x => x },
      options
    );

    let { attr, buildURL, transform: callerTransform } = options;

    super(
      selector,
      attr,
      Object.assign(options, {
        async transform(url, ctx) {
          let finalURL = await buildURL(url);
          let derivedCtx = await ctx.derive(finalURL);
          let value = await extractor.extract(derivedCtx);

          return await callerTransform(value, ctx);
        }
      })
    );
  }
}
