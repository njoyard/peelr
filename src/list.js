import PeelrValue from "./base";

export default class PeelrList extends PeelrValue {
  constructor(selector, list, options = {}) {
    super(selector, options);
    this.list = list;
  }

  async getValue($selection, $) {
    let { list } = this;

    return await Promise.all(
      list.map(
        async val =>
          await val.transform(
            val.selector === "::root"
              ? await val.getValue($selection, $)
              : await val.getValue($(val.selector, $selection), $)
          )
      )
    );
  }
}
