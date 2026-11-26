import { assetUrl } from './assets.ts'
import { esc, escAttr, htmlText, type SafeHtml } from './html.ts'

export interface LayoutOptions {
  title: string
  description: string
  children: SafeHtml
  csrfToken?: string
  canonical?: string
  locale?: string
  noindex?: boolean
  alternates?: { hreflang: string; href: string }[]
}

const SITE_NAME = 'AI 网站克隆模板'
const FAVICON_PATH = '/sites/starter/favicon.svg'

/**
 * 页面外壳。整个模板中只有这里可以输出 `<html>` / `<head>` / `<body>`。
 *
 * 脚本顺序固定：htmx → Alpine → hx-alpine-compat。
 * 公开页没有 CSRF token，因此也不会出现 `hx-headers:inherited`。
 */
export const layout = (options: LayoutOptions): SafeHtml => {
  const canonicalTag = options.canonical
    ? htmlText`  <link rel="canonical" href="${escAttr(options.canonical)}">
`
    : ''
  const robotsTag = options.noindex
    ? htmlText`  <meta name="robots" content="noindex, nofollow">
`
    : ''
  const alternateTags = (options.alternates ?? []).map(
    (alternate) =>
      htmlText`  <link rel="alternate" hreflang="${escAttr(alternate.hreflang)}" href="${escAttr(alternate.href)}">
`,
  )
  const csrfHeaders = options.csrfToken
    ? htmlText` hx-headers:inherited="${escAttr(
        JSON.stringify({ 'X-CSRF-Token': options.csrfToken }),
      )}"`
    : ''
  const canonicalMeta = options.canonical
    ? htmlText`  <meta property="og:url" content="${escAttr(options.canonical)}">
`
    : ''

  return htmlText`<!DOCTYPE html>
<html lang="${escAttr(options.locale ?? 'zh-CN')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(options.title)} · ${SITE_NAME}</title>
  <meta name="description" content="${escAttr(options.description)}">
  <meta name="theme-color" content="#0f172a">
${robotsTag}${canonicalTag}${alternateTags}  <meta property="og:type" content="website">
  <meta property="og:title" content="${escAttr(options.title)}">
  <meta property="og:description" content="${escAttr(options.description)}">
  <meta property="og:site_name" content="${SITE_NAME}">
${canonicalMeta}  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="${escAttr(assetUrl(FAVICON_PATH))}" type="image/svg+xml">
  <link rel="stylesheet" href="${escAttr(assetUrl('/static/app.css'))}">
  <script src="${escAttr(assetUrl('/static/htmx.js'))}" defer></script>
  <script src="${escAttr(assetUrl('/static/alpine.js'))}" defer></script>
  <script src="${escAttr(assetUrl('/static/ext/hx-alpine-compat.js'))}" defer></script>
</head>
<body class="min-h-screen antialiased"${csrfHeaders}>
${options.children}
</body>
</html>`
}
