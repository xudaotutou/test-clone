/**
 * CSRF 防护。
 *
 * 不直接用 `hono/csrf`：它只覆盖表单 content-type，而 htmx 的 JSON 请求会漏掉。
 * 这里对所有 unsafe method 统一校验：
 *   1. `Origin` / `Sec-Fetch-Site`
 *   2. 与匿名会话绑定的 HMAC token
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export const isSafeMethod = (method: string): boolean => SAFE_METHODS.has(method.toUpperCase())

const encoder = new TextEncoder()

const base64Url = (bytes: ArrayBuffer): string => {
  const binary = String.fromCharCode(...new Uint8Array(bytes))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * 生成 HMAC token。
 *
 * 使用 Web Crypto，而不是平台私有的加密模块：同一份中间件要跑在 Bun 与 Workers。
 */
export const createCsrfToken = async (secret: string, sessionId: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(sessionId))
  return base64Url(signature)
}

export const verifyCsrfToken = async (
  secret: string,
  sessionId: string,
  token: string | undefined | null,
): Promise<boolean> => {
  if (!token) return false
  const expected = await createCsrfToken(secret, sessionId)
  if (expected.length !== token.length) return false

  let difference = 0
  for (let index = 0; index < expected.length; index++) {
    difference |= expected.charCodeAt(index) ^ token.charCodeAt(index)
  }
  return difference === 0
}

/** 来源白名单为空表示不限制（仅开发环境）；生产入口会自动回退到 SITE_URL。 */
export const isAllowedOrigin = (origin: string | undefined, allowed: string[]): boolean => {
  if (allowed.length === 0) return true
  if (!origin) return false
  return allowed.includes(origin)
}

export const isAllowedFetchSite = (site: string | undefined): boolean => {
  if (!site) return true
  return site === 'same-origin' || site === 'none'
}
