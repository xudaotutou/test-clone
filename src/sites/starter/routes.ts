import { Hono } from 'hono'
import type { AppEnv } from '../../shared/types.ts'
import { renderPage } from '../../shared/page.ts'
import { demoPage } from './pages/demo.ts'
import { homePage } from './pages/home.ts'
import { echoFragment } from './fragments/echo.ts'
import { readyFragment } from './fragments/ready.ts'

export const routes = new Hono<AppEnv>()

routes.get('/', (c) =>
  renderPage(c, {
    title: '开始克隆',
    description: 'Hono + htmx 4 网站克隆模板：先观察真实页面，再构建可编辑的本地实现。',
    body: homePage(),
    cache: {
      visibility: 'public',
      sMaxAge: 3_600,
      tags: ['page:starter'],
    },
    locale: 'zh-CN',
  }),
)

routes.get('/demo', (c) =>
  renderPage(c, {
    title: '交互示例',
    description: 'htmx 表单往返与 CSRF fragment 的模板示例。',
    body: demoPage(),
    cache: { visibility: 'private', csrf: true },
    noindex: true,
    locale: 'zh-CN',
  }),
)

routes.get('/fragments/ready', (c) => c.html(readyFragment()))

routes.post('/fragments/echo', async (c) => {
  const body = await c.req.parseBody()
  const result = echoFragment(body)
  return c.html(result.body, result.status)
})
