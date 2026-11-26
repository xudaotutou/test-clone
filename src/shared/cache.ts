import type { Context, MiddlewareHandler } from 'hono'

/**
 * 缓存策略是二分的：
 *   - 公开且逐字节一致的内容：显式调用 `publicCache()`
 *   - 含会话、表单或用户数据的内容：默认 `no-store`
 *
 * 失败方向必须是安全的：忘了声明只损失缓存收益；忘了关闭会串用户。
 */

export interface PublicCacheOptions {
  sMaxAge?: number
  staleWhileRevalidate?: number
  tags?: string[]
}

export const CACHE_TAG_HEADER = 'Cache-Tag'

export const publicCache = (c: Context, options: PublicCacheOptions = {}): void => {
  const sMaxAge = options.sMaxAge ?? 86_400
  const staleWhileRevalidate = options.staleWhileRevalidate ?? sMaxAge * 7

  c.header(
    'Cache-Control',
    `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
  )
  c.header('X-Accel-Expires', String(sMaxAge))
  c.header('Vary', 'Accept-Encoding')
  if (options.tags && options.tags.length > 0) {
    c.header(CACHE_TAG_HEADER, options.tags.join(','))
  }
}

/** 私有响应必须显式 no-store；`Vary: Cookie` 让共享缓存不要复用。 */
export const privateCache = (c: Context): void => {
  c.header('Cache-Control', 'no-store')
  c.header('X-Accel-Expires', '0')
  c.header('Vary', 'Cookie')
}

/**
 * 兜底策略：端点没声明就 `no-store`。
 *
 * 必须排在 CSRF 之前：CSRF 拒绝请求时不会调用 `next()`，
 * 排在后面会让 403 响应漏掉缓存头。
 */
export const cacheDefaults = (): MiddlewareHandler => async (c, next) => {
  await next()

  if (c.req.path.startsWith('/static/') || c.req.path.startsWith('/sites/')) return

  if (c.res.headers.has('cache-control')) {
    if (!c.res.headers.has('vary')) c.header('Vary', 'Accept-Encoding')
    return
  }

  privateCache(c)
}
