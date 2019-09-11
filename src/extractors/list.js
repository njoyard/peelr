import PeelrValue from "../base/value";

export default class PeelrList extends PeelrValue {
  constructor(selector, list, options = {}) {
    super(selector, options);
    this.list = list;
  }

  async getValue($selection, ctx) {
    let { list } = this;

    return await Promise.all(
      list.map(async val => {
        val.stack = this.valueStack;
        let matches = await val.findElements(ctx, $selection);

        if (val.multiple) {
          return await Promise.all(
            matches.map(el => val.getElementValue(el, ctx))
          );
        } else if (matches) {
          return await val.getElementValue(matches, ctx);
        }
      })
    );
  }
}
