import PeelrCustom from "./custom";
import PeelrForm from "./form";
import PeelrHash from "./hash";
import PeelrList from "./list";
import PeelrLink from "./link";
import {
  PeelrAttr,
  PeelrData,
  PeelrHasClass,
  PeelrHtml,
  PeelrIs,
  PeelrText,
  PeelrVal
} from "./dom";

function exportCtors(ctors) {
  return ctors.reduce((obj, Ctor) => {
    let { name } = Ctor;
    let short = name.replace(/^Peelr(.)/, function(m, p1) {
      return p1.toLowerCase();
    });

    obj[name] = Ctor;
    obj[short] = function() {
      return new Ctor(...arguments);
    };

    return obj;
  }, {});
}

export default exportCtors([
  PeelrAttr,
  PeelrCustom,
  PeelrData,
  PeelrForm,
  PeelrHasClass,
  PeelrHash,
  PeelrHtml,
  PeelrIs,
  PeelrLink,
  PeelrList,
  PeelrText,
  PeelrVal
]);
