#!/usr/bin/env bun
/**
 * 行为基线的共享请求定义。
 *
 * 只取确定性响应；含随机匿名会话与 CSRF token 的 `/demo` 不进入基线，
 * 它由 HTTP 测试覆盖。
 */

const HEADER_NAMES = [
  'content-type',
  'cache-control',
  'vary',
  'x-accel-expires',
  'cache-tag',
]

export const CASES = [
  { name: 'home', method: 'GET', path: '/' },
  { name: 'ready-fragment', method: 'GET', path: '/fragments/ready' },
  { name: 'healthz', method: 'GET', path: '/healthz' },
  { name: 'readyz', method: 'GET', path: '/readyz' },
  { name: 'robots', method: 'GET', path: '/robots.txt' },
  { name: 'sitemap', method: 'GET', path: '/sitemap.xml' },
  { name: 'not-found', method: 'GET', path: '/__baseline_missing__' },
  { name: 'csrf-rejection', method: 'POST', path: '/fragments/echo' },
]

export const createBaselineApp = async () => {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    SESSION_SECRET: 'baseline-test-secret-at-least-32-characters',
    SITE_URL: 'http://localhost:3000',
    LOG_LEVEL: 'error',
    ALLOWED_ORIGINS: '',
    PUBLIC_ASSET_ORIGINS: '',
    ANALYTICS_ORIGINS: '',
  })
  const { createApp } = await import('../src/app.ts')
  return createApp({ static: 'none', now: () => 0 })
}

export const recordCase = async (app, testCase) => {
  const response = await app.request(testCase.path, { method: testCase.method })
  const headers = {}
  for (const name of HEADER_NAMES) {
    headers[name] = response.headers.get(name)
  }
  return {
    name: testCase.name,
    method: testCase.method,
    path: testCase.path,
    status: response.status,
    headers,
    body: await response.text(),
  }
}
