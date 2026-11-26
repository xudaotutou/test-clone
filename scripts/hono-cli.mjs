#!/usr/bin/env bun
/**
 * @hono/cli 的确定性环境包装。
 *
 * 固定测试环境，避免本机 .env 改变路由检查结果。
 * Bun 1.4.5 的 node:module 尚无 registerHooks；CLI 只用它解析 data: 父 URL，
 * 因此生成一个将 registerHooks 替换为空实现的临时入口再执行。
 */

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

Object.assign(process.env, {
  NODE_ENV: 'test',
  SESSION_SECRET: 'test-secret-at-least-32-characters-long',
  SITE_URL: 'http://localhost:3000',
  LOG_LEVEL: 'warn',
  ALLOWED_ORIGINS: '',
})

const cli = fileURLToPath(import.meta.resolve('@hono/cli/dist/cli.js'))
const source = await Bun.file(cli).text()
const compatible = source.replace(
  'import { createRequire, registerHooks } from "node:module";',
  'import { createRequire } from "node:module";\nconst registerHooks = () => {};',
)

if (compatible === source) {
  console.error('无法为 @hono/cli 应用 Bun 兼容补丁：导入语句已变化。')
  process.exit(1)
}

const cliDir = dirname(cli)
const patchedCli = join(cliDir, '.hono-cli-bun.mjs')
await Bun.write(patchedCli, compatible)

const result = Bun.spawnSync({
  cmd: [process.execPath, patchedCli, ...process.argv.slice(2)],
  stdout: 'inherit',
  stderr: 'inherit',
  env: process.env,
})
process.exit(result.exitCode ?? result.status ?? 1)
