import { z } from 'zod'

const DEV_SECRET = 'dev-only-secret-at-least-32-characters-long'

/**
 * 环境变量在第一次读取时校验。
 *
 * 默认运行时不要求 `DATABASE_URL`：只有需要业务数据时才接数据库。
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET 至少 32 字符').default(DEV_SECRET),
  ALLOWED_ORIGINS: z.string().default(''),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SITE_URL: z.string().min(1).default('http://localhost:3000'),
  PUBLIC_ASSET_ORIGINS: z.string().default(''),
  ANALYTICS_ORIGINS: z.string().default(''),
})

export type Env = z.infer<typeof EnvSchema>

let cached: Env | null = null

export const env = (): Env => {
  if (cached) return cached

  const parsed = EnvSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    LOG_LEVEL: process.env.LOG_LEVEL,
    SITE_URL: process.env.SITE_URL,
    PUBLIC_ASSET_ORIGINS: process.env.PUBLIC_ASSET_ORIGINS,
    ANALYTICS_ORIGINS: process.env.ANALYTICS_ORIGINS,
  })

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`环境变量配置错误：\n${issues}`)
  }

  if (parsed.data.NODE_ENV === 'production' && parsed.data.SESSION_SECRET === DEV_SECRET) {
    throw new Error('生产环境必须设置随机的 SESSION_SECRET（至少 32 字符）。')
  }

  cached = parsed.data
  return cached
}

export const isProduction = (): boolean => env().NODE_ENV === 'production'

export const siteUrl = (): string => env().SITE_URL.replace(/\/+$/, '')

export const allowedOrigins = (): string[] =>
  env()
    .ALLOWED_ORIGINS.split(',')
    .map((item) => item.trim())
    .filter(Boolean)

/** 生产环境即使忘记配置 ALLOWED_ORIGINS，也至少允许自己的 SITE_URL。 */
export const csrfOrigins = (): string[] => {
  const configured = allowedOrigins()
  if (configured.length > 0 || !isProduction()) return configured
  try {
    return [new URL(siteUrl()).origin]
  } catch {
    return []
  }
}

const splitOrigins = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

export const cspOrigins = (): { assets: string[]; analytics: string[] } => ({
  assets: splitOrigins(env().PUBLIC_ASSET_ORIGINS),
  analytics: splitOrigins(env().ANALYTICS_ORIGINS),
})
