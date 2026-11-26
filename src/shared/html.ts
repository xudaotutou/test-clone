/**
 * HTML 构造与转义 —— 本项目唯一的 HTML 输出出口。
 *
 * 语义是 fail-safe：忘记调用 `esc()` 也安全；只有显式 `raw()` 才允许原样输出。
 *
 * | 写法 | 行为 |
 * |---|---|
 * | `html.p(userText)` | 自动转义 |
 * | `html.p(esc(userText))` | 只转义一次（返回值带标记） |
 * | `html.p(raw('<b>ok</b>'))` | 原样输出（唯一逃生门） |
 * | `htmlText\`<p>${userText}</p>\`` | 模板插值自动转义 |
 *
 * `esc()` 返回的是带 `isEscaped` 标记的 String 对象。直接拿它和普通字符串比较
 * 会恒为 false（ESLint 会拦），需要原始值请用 `String(esc(x))`。
 */

declare const safeBrand: unique symbol
export type SafeHtml = string & { readonly [safeBrand]?: true }

const markSafe = (value: string): SafeHtml => {
  const boxed = new String(value)
  Object.defineProperty(boxed, 'isEscaped', { value: true, enumerable: false })
  return boxed as unknown as SafeHtml
}

export const isSafeHtml = (value: unknown): value is SafeHtml =>
  typeof value === 'object' &&
  value !== null &&
  (value as { isEscaped?: unknown }).isEscaped === true

/** 唯一逃生门。绝不要传用户输入。 */
export const raw = (html: string): SafeHtml => markSafe(html)

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const escapeRaw = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (character) => ESCAPE_MAP[character]!)

export const esc = (value: unknown): SafeHtml => markSafe(escapeRaw(value))
export const escAttr = (value: unknown): SafeHtml => markSafe(escapeRaw(value))
export const escPath = (value: unknown): string => encodeURIComponent(String(value ?? ''))

const URL_ATTRS = new Set([
  'href',
  'src',
  'srcset',
  'action',
  'formaction',
  'poster',
  'cite',
  'background',
  'xlink:href',
])

const CONTROL_CHARS = new RegExp(
  '[' + String.fromCharCode(0) + '-' + String.fromCharCode(0x20) + ']',
  'g',
)

const isSafeUrl = (value: string): boolean => {
  const normalized = value.replace(CONTROL_CHARS, '').toLowerCase()
  if (normalized === '') return false
  if (/^(https?:|mailto:|tel:)/.test(normalized)) return true
  if (/^data:image\/(png|jpeg|gif|webp|avif);base64,/.test(normalized)) return true
  if (/^(#|\/|\.\/|\.\.\/|\?)/.test(normalized)) return true
  if (/^[a-z0-9._~%-]+(\/|$)/i.test(normalized) && !normalized.includes(':')) return true
  return false
}

type AttrValue = string | number | boolean | null | undefined
type Attrs = Record<string, AttrValue>

const attrs = (values: Attrs): string => {
  const parts: string[] = []
  for (const [key, value] of Object.entries(values)) {
    if (value === false || value === null || value === undefined) continue
    if (URL_ATTRS.has(key.toLowerCase()) && !isSafeUrl(String(value))) continue
    parts.push(value === true ? ' ' + key : ' ' + key + '="' + escapeRaw(value) + '"')
  }
  return parts.join('')
}

type Child = SafeHtml | string | number | boolean | null | undefined
type ChildArray = readonly Child[]

const renderChildren = (children: (Child | ChildArray)[]): string => {
  const output: string[] = []
  for (const item of children.flat()) {
    if (item === null || item === undefined || typeof item === 'boolean') continue
    if (typeof item === 'number') {
      output.push(String(item))
      continue
    }
    output.push(isSafeHtml(item) ? item.toString() : escapeRaw(item))
  }
  return output.join('')
}

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
])

const tag =
  (name: string) =>
  (a: Attrs | Child | ChildArray, ...children: (Child | ChildArray)[]): SafeHtml => {
    const hasAttrs =
      a !== null && typeof a === 'object' && !isSafeHtml(a) && !Array.isArray(a)
    const open = '<' + name + (hasAttrs ? attrs(a as Attrs) : '') + '>'
    if (VOID_TAGS.has(name)) return markSafe(open)
    const inner = hasAttrs ? renderChildren(children) : renderChildren([a, ...children])
    return markSafe(open + inner + '</' + name + '>')
  }

export const html = {
  a: tag('a'),
  address: tag('address'),
  article: tag('article'),
  aside: tag('aside'),
  blockquote: tag('blockquote'),
  br: tag('br'),
  button: tag('button'),
  code: tag('code'),
  dd: tag('dd'),
  details: tag('details'),
  div: tag('div'),
  dl: tag('dl'),
  dt: tag('dt'),
  em: tag('em'),
  fieldset: tag('fieldset'),
  figcaption: tag('figcaption'),
  figure: tag('figure'),
  footer: tag('footer'),
  form: tag('form'),
  h1: tag('h1'),
  h2: tag('h2'),
  h3: tag('h3'),
  h4: tag('h4'),
  header: tag('header'),
  hr: tag('hr'),
  img: tag('img'),
  input: tag('input'),
  kbd: tag('kbd'),
  label: tag('label'),
  li: tag('li'),
  main: tag('main'),
  mark: tag('mark'),
  nav: tag('nav'),
  ol: tag('ol'),
  p: tag('p'),
  pre: tag('pre'),
  section: tag('section'),
  select: tag('select'),
  small: tag('small'),
  span: tag('span'),
  strong: tag('strong'),
  summary: tag('summary'),
  table: tag('table'),
  tbody: tag('tbody'),
  td: tag('td'),
  textarea: tag('textarea'),
  th: tag('th'),
  thead: tag('thead'),
  time: tag('time'),
  tr: tag('tr'),
  ul: tag('ul'),
} as const

/**
 * SVG 构造器。站点克隆优先把完整 SVG 原文件放进 `public/sites/<site>/`；
 * 需要内联颜色/交互时才用这里，避免把 React 图标组件直接贴回来。
 */
export const svg = {
  svg: tag('svg'),
  path: tag('path'),
  circle: tag('circle'),
  rect: tag('rect'),
  line: tag('line'),
  polyline: tag('polyline'),
  polygon: tag('polygon'),
  g: tag('g'),
  defs: tag('defs'),
  linearGradient: tag('linearGradient'),
  stop: tag('stop'),
  use: tag('use'),
} as const

/**
 * 带自动转义的 SVG 模板标签。只用于你自己掌握的静态 SVG 结构。
 */
export const svgText = (strings: TemplateStringsArray, ...values: unknown[]): SafeHtml =>
  htmlText(strings, ...values)

/**
 * 文档级 HTML 模板标签。用于 `<html>`、`<head>`、`<meta>`、`<script>` 等
 * 无法用 `html.*` 构造的标签。普通字符串插值会被转义，SafeHtml 插值原样输出。
 */
export const htmlText = (strings: TemplateStringsArray, ...values: unknown[]): SafeHtml => {
  let output = ''
  for (let index = 0; index < strings.length; index++) {
    output += strings[index]
    if (index >= values.length) continue
    const value = values[index]
    if (Array.isArray(value)) {
      output += renderChildren(value as Child[])
    } else if (isSafeHtml(value)) {
      output += value.toString()
    } else if (typeof value === 'number') {
      output += String(value)
    } else if (value === null || value === undefined || typeof value === 'boolean') {
      // 省略
    } else {
      output += escapeRaw(value)
    }
  }
  return markSafe(output)
}

const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'dd',
  'del',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
])

const ALLOWED_ATTRS = new Set([
  'alt',
  'class',
  'colspan',
  'height',
  'href',
  'lang',
  'loading',
  'rowspan',
  'src',
  'srcset',
  'target',
  'title',
  'width',
])

const SANITIZE_URL_ATTRS = new Set(['href', 'src', 'srcset'])

/**
 * 保守的白名单清洗。用户提供富文本时优先接入成熟 sanitizer；
 * 这里覆盖模板最低限度的安全需求。
 */
export const safeHtml = (dirty: string): SafeHtml => {
  let output = dirty.replace(
    /<\s*(script|style|iframe|object|embed|form|svg|math|link|meta|base)\b[\s\S]*?<\s*\/\s*\1\s*>/gi,
    '',
  )
  output = output.replace(
    /<\s*(script|style|iframe|object|embed|svg|math|link|meta|base)\b[^>]*\/?>/gi,
    '',
  )

  output = output.replace(
    /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g,
    (_full: string, closing: string, tagName: string, rawAttrs: string): string => {
      const lower = tagName.toLowerCase()
      if (!ALLOWED_TAGS.has(lower)) return ''
      if (closing === '/') return '</' + lower + '>'

      const kept: string[] = []
      const attrRe =
        /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g
      let match: RegExpExecArray | null
      while ((match = attrRe.exec(rawAttrs)) !== null) {
        const name = (match[1] ?? '').toLowerCase()
        const value = match[2] ?? match[3] ?? match[4] ?? ''
        if (!ALLOWED_ATTRS.has(name)) continue
        if (SANITIZE_URL_ATTRS.has(name) && !isSafeUrl(value)) continue
        kept.push(name + '="' + escapeRaw(value) + '"')
      }
      const selfClose = /\/\s*$/.test(rawAttrs) ? ' /' : ''
      return '<' + lower + (kept.length ? ' ' + kept.join(' ') : '') + selfClose + '>'
    },
  )

  output = output.replace(/<!--[\s\S]*?-->/g, '')
  return markSafe(output)
}

/** 生成可安全嵌入 `<script>` 的 JSON。 */
export const safeJson = (data: unknown): string =>
  JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029')
