import { serveStatic } from 'hono/bun'
import { join } from 'node:path'

/**
 * Bun 专用静态服务。
 *
 * Hono 的 `onFound` 只在文件真实存在并成功读取后触发，因此 404 不会带上
 * 永久缓存头。Workers 走 assets binding，不会加载本文件。
 */
const PUBLIC_ROOT = join(process.cwd(), 'public')

export const serveBunStatic = serveStatic({
  root: PUBLIC_ROOT,
  onFound: (_path, c) => {
    c.header('Cache-Control', 'public, max-age=31536000, immutable')
  },
})
