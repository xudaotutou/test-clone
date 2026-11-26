import app from './app-bun.ts'
import { env, isProduction } from './shared/env.ts'

const port = Number(Bun.env.PORT ?? process.env.PORT ?? 3000)
const hostname = Bun.env.HOSTNAME ?? process.env.HOSTNAME ?? '0.0.0.0'

if (!isProduction() && env().SESSION_SECRET.startsWith('dev-only-')) {
  console.warn('[startup] 正在使用开发用 SESSION_SECRET；部署前请通过环境变量覆盖。')
}

const server = Bun.serve({
  port,
  hostname,
  fetch: app.fetch,
})

console.log(`[startup] ${env().NODE_ENV} — http://localhost:${server.port}`)

const shutdown = async (signal: string): Promise<void> => {
  console.log(`[shutdown] 收到 ${signal}，正在退出。`)
  await server.stop()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
