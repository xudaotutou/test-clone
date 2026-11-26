import type { Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { getIronSession, type CookieJar } from 'iron-session'
import { env, isProduction } from './env.ts'

/**
 * 匿名会话只做一件事：给交互页提供稳定的 CSRF 绑定。
 *
 * 公开页绝不调用这里 —— 那会写入 `Set-Cookie`，破坏边缘缓存。
 */
interface AnonymousSession {
  id?: string
}

const normalizeSameSite = (
  value: boolean | 'lax' | 'none' | 'strict' | undefined,
): 'lax' | 'none' | 'strict' | undefined => {
  if (value === true) return 'strict'
  if (value === false) return undefined
  return value ?? 'lax'
}

const cookieJar = (c: Context): CookieJar => ({
  read: (name) => getCookie(c, name),
  write: (name, value, options) => {
    const sameSite = normalizeSameSite(options.sameSite)
    setCookie(c, name, value, {
      path: options.path ?? '/',
      httpOnly: options.httpOnly ?? true,
      secure: options.secure ?? isProduction(),
      ...(sameSite ? { sameSite } : {}),
      ...(options.maxAge !== undefined ? { maxAge: options.maxAge } : {}),
      ...(options.domain ? { domain: options.domain } : {}),
    })
  },
})

const sessionOptions = () => ({
  cookieName: 'clone_anon_session',
  password: env().SESSION_SECRET,
  ttl: 60 * 60 * 24 * 14,
  cookieOptions: {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax' as const,
    path: '/',
  },
})

/** 只读取现有会话；没有 cookie 时返回 `anonymous`，且不写 Set-Cookie。 */
export const readSessionId = async (c: Context): Promise<string> => {
  const session = await getIronSession<AnonymousSession>(cookieJar(c), sessionOptions())
  return session.id ?? 'anonymous'
}

/**
 * 交互页使用：确保存在匿名会话。
 *
 * 必须在响应头发出之前调用，`session.save()` 才能写入 `Set-Cookie`。
 */
export const ensureSessionId = async (c: Context): Promise<string> => {
  const session = await getIronSession<AnonymousSession>(cookieJar(c), sessionOptions())
  if (!session.id) {
    session.id = crypto.randomUUID()
    await session.save()
  }
  return session.id
}
