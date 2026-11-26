import { createApp } from './app.ts'
import { html } from './shared/html.ts'

/**
 * Cloudflare Workers 入口。
 *
 * 静态资源由 assets binding 提供，应用只负责 HTML 与 fragment。
 * 默认不绑定数据库；需要业务数据时再显式注入。
 *
 * 配置错误也必须返回 HTML fragment：htmx 4 在 5xx 时同样会 swap。
 */
const configError = (message: string): Response =>
  new Response(String(html.p({ class: 'alert', 'data-variant': 'destructive' }, message)), {
    status: 500,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      vary: 'Cookie',
    },
  })

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const app = createApp({ static: 'none' })
      return await app.fetch(request)
    } catch (cause) {
      const message =
        cause instanceof Error ? `Worker 配置错误：${cause.message}` : 'Worker 配置错误'
      return configError(message)
    }
  },
}
