#!/usr/bin/env bun
/**
 * 页面冒烟：解析真实 HTML，逐个请求本地资源，并检查缓存/CSRF 分层。
 *
 * 这不是浏览器像素验收；布局仍需要在真实浏览器中看桌面与移动宽度。
 */

import { Window } from 'happy-dom'
import { createApp } from '../src/app.ts'

Object.assign(process.env, {
  NODE_ENV: 'test',
  SESSION_SECRET: 'smoke-test-secret-at-least-32-characters',
  SITE_URL: 'http://localhost:3000',
  LOG_LEVEL: 'error',
  ALLOWED_ORIGINS: '',
})

const app = createApp({ static: 'bun', now: () => 0 })
const failures = []

const fail = (message) => failures.push(message)

const home = await app.request('/')
const html = await home.text()

if (home.status !== 200) fail(`首页状态 ${home.status}`)
if (!html.includes('Clone target')) fail('首页缺少 “Clone target” 提示')
if (!html.includes('not yet built.')) fail('首页缺少 “not yet built.” 文案')
if (home.headers.get('set-cookie')) fail('公开首页写入了 Set-Cookie')
if (home.headers.get('vary') !== 'Accept-Encoding') fail('公开首页 Vary 不是 Accept-Encoding')
if (!(home.headers.get('cache-control') ?? '').includes('public')) fail('公开首页不可缓存')
if (html.includes('hx-headers:inherited')) fail('公开首页注入了 CSRF token')

const window = new Window({ url: 'http://localhost:3000/' })
window.document.write(html)
if (!window.document.querySelector('h1')) fail('解析后没有 h1')
if (!window.document.querySelector('.starter-page')) fail('解析后没有 starter 页面根节点')

const scriptUrls = [...html.matchAll(/<script src="([^"]+)"/g)].map((match) => match[1])
if (
  scriptUrls.length !== 3 ||
  !scriptUrls[0]?.startsWith('/static/htmx.js') ||
  !scriptUrls[1]?.startsWith('/static/alpine.js') ||
  !scriptUrls[2]?.startsWith('/static/ext/hx-alpine-compat.js')
) {
  fail('脚本顺序不是 htmx → Alpine → compat')
}

const assetUrls = [
  ...new Set(
    [...html.matchAll(/(?:href|src)="((?:\/static|\/sites)\/[^"]+)"/g)].map(
      (match) => match[1],
    ),
  ),
]

for (const asset of assetUrls) {
  if (!/\?v=[0-9a-f]{8}$/.test(asset)) fail(`资源 URL 缺少版本号：${asset}`)
  const response = await app.request(asset)
  if (response.status !== 200) {
    fail(`资源不可访问：${asset} (${response.status})`)
    continue
  }
  if (!(response.headers.get('cache-control') ?? '').includes('immutable')) {
    fail(`静态资源未带 immutable：${asset}`)
  }
}

const css = await (await app.request('/static/app.css')).text()
for (const selector of ['.starter-page', '.btn', '[data-variant=primary]', '.card']) {
  if (!css.includes(selector)) fail(`CSS 缺少 ${selector}`)
}

const missing = await app.request('/static/not-found.css')
if (missing.status !== 404) fail('不存在的静态资源没有返回 404')
if ((missing.headers.get('cache-control') ?? '').includes('immutable')) {
  fail('404 静态响应被标记 immutable')
}

const demo = await app.request('/demo')
const demoHtml = await demo.text()
if (demo.status !== 200) fail(`交互页状态 ${demo.status}`)
if (!demo.headers.get('set-cookie')) fail('交互页没有匿名会话 cookie')
if (demo.headers.get('cache-control') !== 'no-store') fail('交互页不是 no-store')
if (demo.headers.get('vary') !== 'Cookie') fail('交互页 Vary 不是 Cookie')
if (!demoHtml.includes('hx-headers:inherited')) fail('交互页没有注入 CSRF token')

if (failures.length > 0) {
  console.error('✖ 冒烟失败：')
  for (const failure of failures) console.error('  - ' + failure)
  process.exit(1)
}

console.log(`✔ 冒烟通过（检查 ${assetUrls.length} 个静态资源）`)
