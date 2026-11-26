import type { Hono } from 'hono'
import type { SitemapEntry } from './seo.ts'
import type { AppEnv } from './types.ts'

/**
 * 一个来源站点对应一个 SiteModule。
 *
 * `app` 内部使用站点相对路径，挂载点由 `src/app.ts` 显式决定。
 */
export interface SiteModule {
  app: Hono<AppEnv>
  sitemap: SitemapEntry[]
}
