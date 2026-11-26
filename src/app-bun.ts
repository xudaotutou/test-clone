import { createApp } from './app.ts'

/**
 * Bun 专用共享应用实例，供 `src/index.ts` 与 Hono CLI 使用。
 *
 * 只切换静态资源来源，不注入数据库；同一份应用在 Workers 上使用 assets binding。
 * 它不是第三个部署出口。
 */
export const app = createApp({ static: 'bun' })

export default app
