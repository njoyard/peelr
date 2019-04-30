import cheerio from "cheerio";
import request from "request-promise-native";

function isAbsoluteURL(url) {
  return url && url.match(/^https?:\/\//);
}

function isRequestParams(url) {
  return typeof url === "object" && ("uri" in url || "url" in url);
}

export default class PeelrContext {
  static create(source) {
    if (source instanceof PeelrContext) {
      return source;
    }

    return new PeelrContext(source);
  }

  constructor(source, cache) {
    this.source = source;
    this.jar = (isRequestParams(source) && source.jar) || request.jar();
    this.keepHeaders = isRequestParams(source) && source.keepHeaders;
    this.cache = cache || {};
  }

  async getHTML() {
    let { cache, jar, source } = this;

    if (typeof source === "string") {
      if (isAbsoluteURL(source)) {
        source = { uri: source };
      } else {
        return { html: source };
      }
    }

    if (isRequestParams(source)) {
      let headers = Object.keys(source.headers || {})
        .sort()
        .map(k => `${k}=${source.headers[k]}`)
        .join(" ");
      let cacheKey = `${source.uri || source.url} ${headers}`;
      let req;

      if (
        (!source.method || source.method.toUpperCase() === "GET") &&
        cacheKey in cache
      ) {
        req = cache[cacheKey];
      } else {
        req = cache[cacheKey] = request(Object.assign({ jar }, source));
      }

      return {
        html: await req,
        url: source.uri || source.url
      };
    }

    throw new Error(`Cannot extract HTML from source '${source}'`);
  }

  async load() {
    let { html, url } = await this.getHTML();

    this._html = html;
    this._url = url;
  }

  async html() {
    if (!this._html) {
      await this.load();
    }

    return this._html;
  }

  async url() {
    if (!this._url && !this._html) {
      await this.load();
    }

    return this._url;
  }

  async cheerio() {
    if (!this._cheerio) {
      this._cheerio = cheerio.load(await this.html());
    }

    return this._cheerio;
  }

  deriveParams(params, deriveURL) {
    let { jar, keepHeaders, source } = this;

    // Keep current jar
    let paramsChain = [{ jar }];

    // Keep auth & oauth params
    if (isRequestParams(source)) {
      if ("auth" in source) {
        paramsChain.push({ auth: source.auth });
      }

      if ("oauth" in source) {
        paramsChain.push({ oauth: source.oauth });
      }
    }

    // Keep headers we're asked to keep, as well as the keepHeaders parameter
    if (keepHeaders) {
      let keepHeaderNames =
        keepHeaders === true ? Object.keys(source.headers || {}) : keepHeaders;

      paramsChain.push({ keepHeaders });
      paramsChain.push({
        headers: keepHeaderNames.reduce((headers, name) => {
          if (source.headers && name in source.headers) {
            headers[name] = source.headers[name];
          }
          return headers;
        }, {})
      });
    }

    // Keep request parameters that were passed to us
    if (isRequestParams(params)) {
      paramsChain.push(params);
    }

    // Add the new URL and ensure there is no duplicate url/uri
    paramsChain.push({ uri: deriveURL, url: null });

    return Object.assign(...paramsChain);
  }

  async deriveURL(deriveURL) {
    // Resolve relative URL
    if (!isAbsoluteURL(deriveURL)) {
      let ctxURL = await this.url();
      let $ = await this.cheerio();
      let baseURL = $("base[href]").attr("href");
      let refURL;

      if (isAbsoluteURL(baseURL)) {
        refURL = baseURL;
      } else if (baseURL && isAbsoluteURL(ctxURL)) {
        refURL = new URL(baseURL, ctxURL);
      } else if (isAbsoluteURL(ctxURL)) {
        refURL = ctxURL;
      } else {
        throw new Error(
          `Cannot resolve relative URL '${deriveURL}' from HTML without an absolute <base href>`
        );
      }

      deriveURL = new URL(deriveURL, refURL).href;
    }

    return deriveURL;
  }

  async derive(params) {
    let { cache } = this;

    let deriveURL = await this.deriveURL(
      isRequestParams(params) ? params.uri || params.url : params
    );

    let deriveParams = this.deriveParams(params, deriveURL);

    return new PeelrContext(deriveParams, cache);
  }
}
