import type { MiddlewareHandler } from 'hono'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

export const ALLOWED = new Set([
  'level',
  'time',
  'msg',
  'requestId',
  'method',
  'path',
  'status',
  'durationMs',
  'error',
  'code',
  'component',
  'event',
])

let minLevel: LogLevel = 'info'
let pretty = false

export const configureLogger = (options?: { level?: LogLevel; pretty?: boolean }): void => {
  const configured = (process.env.LOG_LEVEL ?? '').toLowerCase()
  minLevel =
    options?.level ??
    (configured in LEVEL_ORDER ? (configured as LogLevel) : 'info')
  pretty = options?.pretty ?? process.env.NODE_ENV === 'development'
}

export const shouldLog = (level: LogLevel): boolean =>
  LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel]

const write = (level: LogLevel, msg: string, fields?: Record<string, unknown>): void => {
  if (!shouldLog(level)) return

  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields ?? {})) {
    if (ALLOWED.has(key)) safe[key] = value
  }

  const record = {
    level,
    time: new Date().toISOString(),
    msg,
    ...safe,
  }

  if (pretty) {
    const extras = Object.entries(safe)
      .map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
      .join(' ')
    process.stdout.write(
      `${level.toUpperCase().padEnd(5)} ${msg}${extras ? ' ' + extras : ''}\n`,
    )
    return
  }

  process.stdout.write(JSON.stringify(record) + '\n')
}

export const debug = (msg: string, fields?: Record<string, unknown>): void =>
  write('debug', msg, fields)
export const info = (msg: string, fields?: Record<string, unknown>): void =>
  write('info', msg, fields)
export const warn = (msg: string, fields?: Record<string, unknown>): void =>
  write('warn', msg, fields)
export const error = (msg: string, fields?: Record<string, unknown>): void =>
  write('error', msg, fields)

export const requestLogger = (): MiddlewareHandler => {
  return async (c, next) => {
    const start = Date.now()
    const requestId = (c.get('requestId') as string | undefined) ?? undefined

    try {
      await next()
    } catch (cause) {
      error('request failed', {
        requestId,
        method: c.req.method,
        path: c.req.path,
        durationMs: Date.now() - start,
        error: cause instanceof Error ? cause.message : String(cause),
      })
      throw cause
    }

    const fields = {
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - start,
    }

    if (c.req.path.startsWith('/static/') || c.req.path.startsWith('/sites/')) {
      debug('request', fields)
    } else if (c.res.status >= 500) {
      error('request', fields)
    } else if (c.res.status >= 400) {
      warn('request', fields)
    } else {
      info('request', fields)
    }
  }
}
