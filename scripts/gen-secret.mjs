#!/usr/bin/env bun
/**
 * 生成至少 32 字符的随机 secret。
 *
 * 用法：
 *   bun run secret:gen
 *   bun run secret:gen -- --file .env
 */

import { randomBytes } from 'node:crypto'
import { appendFileSync } from 'node:fs'

const secret = randomBytes(32).toString('base64url')
console.log(secret)

const fileIndex = process.argv.indexOf('--file')
if (fileIndex !== -1) {
  const file = process.argv[fileIndex + 1]
  if (!file) {
    console.error('--file 后面需要路径')
    process.exit(1)
  }
  appendFileSync(file, `\nSESSION_SECRET=${secret}\n`)
  console.log(`已追加到 ${file}`)
}
