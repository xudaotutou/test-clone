import { Hono } from 'hono'
import type { Context } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { etag } from 'hono/etag'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { timing } from 'hono/timing'
import { AppError, errorFragment } from './shared/errors.ts'
import { cacheDefaults, publicCache } from './shared/cache.ts'
import {
  csrfOrigins,
  cspOrigins,
  env,
  isProduction,
  siteUrl,
} from './shared/env.ts'
import {
  isAllowedFetchSite,
  isAllowedOrigin,
  isSafeMethod,
  verifyCsrfToken,
} from './shared/csrf.ts'
import { configureLogger, error as logError, requestLogger } from './shared/logger.ts'
import { robotsTxt, sitemapXml, type SitemapEntry } from './shared/seo.ts'
import { readSessionId } from './shared/session.ts'
import type { AppEnv } from './shared/types.ts'
import type { SiteModule } from './shared/site.ts'
import starterSite from './sites/starter/index.ts'

export type { AppEnv } from './shared/types.ts'

export type StaticMode = 'bun' | 'none'

export interface CreateAppOptions {
  /**
   * 静态资源来源。Bun 默认读磁盘；Workers 必须传 `'none'`，
   * 文件由 assets binding 直接提供。
   */
  static?: StaticMode
  /** 时钟注入，便于测试和确定性基线。 */
  now?: () => number
}

/**
 * 应用装配的唯一入口。
 *
 * 中间件顺序即安全边界：
 * requestId → logger → timing → secureHeaders → bodyLimit
 * → cacheDefaults → CSRF → etag → routes
 */
export const createApp = (options: CreateAppOptions = {}): Hono<AppEnv> => {
  const app = new Hono<AppEnv>()
  const now = options.now ?? (() => Date.now())

  configureLogger()

  app.use('*', async (c, next) => {
    c.set('now', now)
    await next()
  })
  app.use('*', requestId())
  app.use('*', requestLogger())
  app.use('*', timing())
  app.use(
    '*',
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        // Alpine 的标准构建会在运行时编译 x-* 表达式，因此需要 unsafe-eval。
        // 若站点追求严格 CSP，请改用 Alpine CSP build。
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', ...cspOrigins().assets],
        connectSrc: ["'self'", ...cspOrigins().analytics],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
      strictTransportSecurity: isProduction()
        ? 'max-age=31536000; includeSubDomains'
        : undefined,
    }),
  )
  app.use('*', bodyLimit({ maxSize: 1024 * 1024 }))

  // 必须排在 CSRF 之前：403 响应也要带 no-store / Vary: Cookie。
  app.use('*', cacheDefaults())

  app.use('*', async (c, next) => {
    if (isSafeMethod(c.req.method)) return next()

    const origin = c.req.header('origin')
    const fetchSite = c.req.header('sec-fetch-site')

    if (!isAllowedOrigin(origin, csrfOrigins()) || !isAllowedFetchSite(fetchSite)) {
      return c.html(errorFragment('请求被拒绝（来源校验失败）', 'CSRF_ORIGIN'), 403)
    }

    const sessionId = await readSessionId(c)
    const token = c.req.header('x-csrf-token')
    if (!(await verifyCsrfToken(env().SESSION_SECRET, sessionId, token))) {
      return c.html(errorFragment('请求被拒绝（令牌无效）', 'CSRF_TOKEN'), 403)
    }

    return next()
  })

  app.use('*', etag())

  app.onError((cause, c) => {
    if (cause instanceof AppError) {
      return c.html(errorFragment(cause.message, cause.code), cause.status as 400)
    }

    logError('unhandled error', {
      method: c.req.method,
      path: c.req.path,
      error: cause instanceof Error ? cause.message : String(cause),
    })

    const message = isProduction()
      ? '服务器内部错误'
      : `开发模式错误：${cause instanceof Error ? cause.message : String(cause)}`
    return c.html(errorFragment(message, 'INTERNAL_ERROR'), 500)
  })

  app.notFound((c) => c.html(errorFragment('页面不存在', 'NOT_FOUND'), 404))

  if ((options.static ?? 'bun') === 'bun') {
    const staticRoute = async (c: Context, next: () => Promise<void>): Promise<Response | void> => {
      const { serveBunStatic } = await import('./shared/static-bun.ts')
      return serveBunStatic(c, next)
    }
    app.use('/static/*', staticRoute)
    app.use('/sites/*', staticRoute)
  }

  /**
   * 站点挂载点是显式的：一个模板实例默认承载一个来源站点。
   * 多站点必须使用不同前缀或拆成独立应用。
   */
  const sites: Array<{ prefix: string; module: SiteModule }> = [
    { prefix: '/', module: starterSite },
  ]

  for (const site of sites) {
    app.route(site.prefix, site.module.app)
  }

  const sitemapEntries = (): SitemapEntry[] =>
    sites.flatMap((site) =>
      site.module.sitemap.map((entry) => ({
        ...entry,
        path:
          site.prefix === '/'
            ? entry.path
            : `${site.prefix.replace(/\/$/, '')}${entry.path === '/' ? '' : entry.path}`,
      })),
    )

  app.get('/robots.txt', (c) => {
    publicCache(c, { sMaxAge: 3_600 })
    return c.text(robotsTxt(siteUrl(), { disallow: ['/fragments/', '/demo'] }), 200, {
      'Content-Type': 'text/plain; charset=utf-8',
    })
  })

  app.get('/sitemap.xml', (c) => {
    publicCache(c, { sMaxAge: 3_600 })
    return c.text(sitemapXml(siteUrl(), sitemapEntries()), 200, {
      'Content-Type': 'application/xml; charset=utf-8',
    })
  })

  app.get('/healthz', (c) => c.json({ ok: true }))

  app.get('/readyz', (c) =>
    c.json({
      ok: true,
      checks: {
        database: env().DATABASE_URL ? 'optional-not-probed' : 'not-configured',
      },
    }),
  )

  return app
}
