import cheerio from "cheerio";
import request from "request-promise-native";

function isAbsoluteURL(url) {
  return url && url.match(/^https?:\/\//);
}

function isRequestParams(url) {
  return typeof url === "object" && "uri" in url;
}

export default class PeelrContext {
  static create(source) {
    if (source instanceof PeelrContext) {
      return source;
    }

    return new PeelrContext(source);
  }

  constructor(source, jar) {
    this.source = source;
    this.jar = jar || request.jar();
  }

  async getHTML(source, jar) {
    if (typeof source === "string") {
      if (isAbsoluteURL(source)) {
        source = { uri: source };
      } else {
        return { html: source };
      }
    }

    if (isRequestParams(source)) {
      return {
        html: await request(Object.assign({ jar }, source)),
        url: source.uri
      };
    }

    throw new Error(`Cannot extract HTML from source '${source}'`);
  }

  async load() {
    let { source, jar } = this;
    let { html, url } = await this.getHTML(source, jar);

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

  async derive(url) {
    let { jar } = this;
    let requestParams;

    if (isRequestParams(url)) {
      requestParams = url;
      url = url.uri;
    }

    if (!isAbsoluteURL(url)) {
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
          `Cannot resolve relative URL '${url}' from HTML without an absolute <base href>`
        );
      }

      url = new URL(url, refURL).href;
    }

    return new PeelrContext(
      requestParams ? Object.assign({}, requestParams, { uri: url }) : url,
      jar
    );
  }
}
