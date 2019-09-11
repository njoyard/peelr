import PeelrContext from './context'

export default class PeelrValue {
  constructor(selector, options = {}) {
    this.selector = selector

    this.transform = options.transform || ((x) => x)

    this.multiple = options.multiple || false
    this.nextPage = options.nextPage
    this.shouldLoadMore = options.shouldLoadMore || (() => true)
    this.offset = options.offset || 0
    this.limit = options.limit || Infinity

    this.onRequest = options.onRequest
    this.onExtract = options.onExtract

    if (typeof this.nextPage === 'string') {
      this.nextPage = new PeelrValue.PeelrAttr(this.nextPage, 'href')
      this.nextPage.__defineGetter__('stack', () => this.valueStack)
    }
  }

  toString() {
    let short = this.constructor.name.replace(/^Peelr(.)/, function(m, p1) {
      return p1.toLowerCase()
    })

    return `Peelr.${short}${this.multiple ? '*' : ''}(${this.selector || ''})`
  }

  get valueStack() {
    return [].concat(this.stack || [], [this.toString()])
  }

  async emitExtract(context, found, more = {}) {
    let { selector, multiple } = this

    context.emit(
      'extract',
      Object.assign(
        {
          url: await context.url(),
          selector,
          multiple,
          found,
          stack: this.valueStack
        },
        more
      )
    )
  }

  async findElements(context, $root = null) {
    let { selector, multiple, nextPage, shouldLoadMore, offset, limit } = this

    if ($root && selector === '::root') {
      await this.emitExtract(context, 1)
      return multiple ? [$root] : $root
    } else if ($root) {
      if (nextPage) {
        throw new Error('Cannot use nextPage in nested multiple extractor')
      }

      let $ = await context.cheerio()
      let $target = $(selector, $root)

      process._debug = { $root, $target, $, selector, context, val: this }

      if (!multiple) {
        await this.emitExtract(context, $target.length ? 1 : 0)
        return $target.first()
      }

      let items = $target
        .slice(offset, limit)
        .map((index, el) => $(el).first())
        .get()

      await this.emitExtract(context, items.length)
      return items
    } else {
      let $ = await context.cheerio()
      let $target = $(selector)

      if (!multiple) {
        await this.emitExtract(context, $target.length ? 1 : 0)
        return $target.first()
      }

      let initialContext = context
      let urls = []

      let items = []
      while ($target && items.length < limit) {
        urls.push(await context.url())

        items.push(
          ...$target
            .slice(offset, limit - items.length)
            .map((index, el) => $(el).first())
            .get()
        )
        offset = Math.max(0, offset - $target.length)

        if (nextPage && items.length < limit) {
          let nextUrl = await nextPage.extract(context)
          if (nextUrl) {
            context = await context.derive(nextUrl)
            $ = await context.cheerio()
            $target = $(selector)
          } else {
            $target = null
          }
        } else {
          $target = null
        }
      }

      await this.emitExtract(
        initialContext,
        items.length,
        nextPage ? { pages: urls } : {}
      )
      return items
    }
  }

  async getElementValue(element, context) {
    let { transform } = this
    return await transform(await this.getValue(element, context), context)
  }

  async extract(source) {
    let { onRequest, onExtract, multiple } = this
    let ctx = PeelrContext.create(source)

    if (onRequest) {
      ctx.on('request', onRequest)
    }

    if (onExtract) {
      ctx.on('extract', onExtract)
    }

    let matches = await this.findElements(ctx)

    if (multiple) {
      return await Promise.all(
        matches.map((el) => this.getElementValue(el, ctx))
      )
    } else if (matches) {
      return await this.getElementValue(matches, ctx)
    }
  }
}
