import type { Context } from 'hono'
import { privateCache, publicCache } from './cache.ts'
import { createCsrfToken } from './csrf.ts'
import { env, siteUrl } from './env.ts'
import type { SafeHtml } from './html.ts'
import { layout } from './layout.ts'
import { ensureSessionId } from './session.ts'

export type PageCache =
  | { visibility: 'public'; sMaxAge?: number; tags?: string[] }
  | { visibility: 'private'; csrf: true }

export interface PageSpec {
  title: string
  description: string
  body: SafeHtml
  canonical?: string | null
  noindex?: boolean
  locale?: string
  status?: 200 | 404
  cache: PageCache
}

/**
 * 所有完整页面都从这里输出。
 *
 * `cache` 不是可选参数：每个页面都必须明确选择公开缓存或私有 no-store。
 * 私有页在这里确保匿名会话并注入 CSRF token；公开页不碰 cookie。
 */
export const renderPage = async (c: Context, page: PageSpec): Promise<Response> => {
  let csrfToken: string | undefined

  if (page.cache.visibility === 'public') {
    publicCache(c, {
      ...(page.cache.sMaxAge !== undefined ? { sMaxAge: page.cache.sMaxAge } : {}),
      ...(page.cache.tags ? { tags: page.cache.tags } : {}),
    })
  } else {
    privateCache(c)
    const sessionId = await ensureSessionId(c)
    csrfToken = await createCsrfToken(env().SESSION_SECRET, sessionId)
  }

  const shell = layout({
    title: page.title,
    description: page.description,
    children: page.body,
    ...(csrfToken ? { csrfToken } : {}),
    ...(page.canonical === null
      ? {}
      : { canonical: page.canonical ?? `${siteUrl()}${c.req.path}` }),
    ...(page.noindex !== undefined ? { noindex: page.noindex } : {}),
    ...(page.locale !== undefined ? { locale: page.locale } : {}),
  })

  return c.html(shell, page.status ?? 200)
}
