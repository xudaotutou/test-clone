import { html } from '../../../shared/html.ts'

export const readyFragment = () =>
  html.div(
    { class: 'starter-check-result', role: 'status' },
    html.span({ class: 'starter-check-icon', 'aria-hidden': 'true' }, '✓'),
    html.div(
      html.strong('服务端响应正常'),
      html.span('这是一个由 GET 路由返回的 HTML fragment，默认不缓存。'),
    ),
  )
