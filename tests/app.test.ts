import { beforeAll, describe, expect, it } from 'bun:test'
import type { Hono } from 'hono'
import { createApp } from '../src/app.ts'
import type { AppEnv } from '../src/shared/types.ts'

Object.assign(process.env, {
  NODE_ENV: 'test',
  SESSION_SECRET: 'unit-test-secret-at-least-32-characters',
  SITE_URL: 'http://localhost:3000',
  LOG_LEVEL: 'error',
  ALLOWED_ORIGINS: '',
})

let app: Hono<AppEnv>

beforeAll(() => {
  app = createApp({ static: 'bun', now: () => 0 })
})

const sessionFrom = (response: Response): string => {
  const cookie = response.headers.get('set-cookie')?.split(';')[0]
  if (!cookie) throw new Error('响应没有会话 cookie')
  return cookie
}

const csrfTokenFrom = (html: string): string => {
  const token = /X-CSRF-Token&quot;:&quot;([A-Za-z0-9_-]+)/.exec(html)?.[1]
  if (!token) throw new Error('页面没有注入 CSRF token')
  return token
}

describe('公开页面', () => {
  it('首页可公开缓存且不写 cookie', async () => {
    const response = await app.request('/')
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control') ?? '').toContain('public')
    expect(response.headers.get('vary')).toBe('Accept-Encoding')
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(html).toContain('Clone target')
    expect(html).not.toContain('hx-headers:inherited')
  })
})

describe('交互页面与 CSRF', () => {
  it('/demo 为私有 no-store，并下发会话与 CSRF token', async () => {
    const response = await app.request('/demo')
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('vary')).toBe('Cookie')
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(html).toContain('hx-headers:inherited')
    expect(csrfTokenFrom(html)).toHaveLength(43)
  })

  it('缺少 CSRF 令牌的写请求被拒绝', async () => {
    const response = await app.request('/fragments/echo', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'message=hello',
    })
    const html = await response.text()

    expect(response.status).toBe(403)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('vary')).toBe('Cookie')
    expect(html).toContain('CSRF_TOKEN')
  })

  it('携带会话与令牌的 htmx 请求成功', async () => {
    const demo = await app.request('/demo')
    const cookie = sessionFrom(demo)
    const token = csrfTokenFrom(await demo.text())

    const response = await app.request('/fragments/echo', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        cookie,
        'x-csrf-token': token,
      },
      body: 'message=' + encodeURIComponent('fragment 往返'),
    })
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('fragment 往返')
    expect(html).toContain('starter-echo-result')
  })
})

describe('静态资源', () => {
  it('真实文件返回 200 与 immutable', async () => {
    const response = await app.request('/static/htmx.js')

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
  })

  it('缺失文件返回 404 且不带 immutable', async () => {
    const response = await app.request('/static/does-not-exist.css')

    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control') ?? '').not.toContain('immutable')
  })
})

describe('运维端点', () => {
  it('healthz 与 readyz 返回 JSON', async () => {
    const health = await app.request('/healthz')
    const ready = await app.request('/readyz')

    expect(health.status).toBe(200)
    expect(await health.json()).toEqual({ ok: true })
    expect(ready.status).toBe(200)
    expect((await ready.json()).ok).toBe(true)
  })

  it('robots.txt 与 sitemap.xml 可访问', async () => {
    const robots = await app.request('/robots.txt')
    const sitemap = await app.request('/sitemap.xml')

    expect(robots.status).toBe(200)
    expect(robots.headers.get('content-type')).toContain('text/plain')
    expect(await robots.text()).toContain('Sitemap:')
    expect(sitemap.status).toBe(200)
    expect(sitemap.headers.get('content-type')).toContain('application/xml')
    expect(await sitemap.text()).toContain('<urlset')
  })
})
