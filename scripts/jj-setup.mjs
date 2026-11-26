#!/usr/bin/env bun
/** 应用推荐的 jj 用户配置。 */

import { spawnSync } from 'node:child_process'

const settings = [
  ['ui.paginate', 'never'],
  ['ui.color', 'never'],
  ['ui.paginate-on-open', 'false'],
  ['git.import', 'true'],
  ['merge.tool', ':builtin'],
  ['aliases.st', '["status"]'],
  ['aliases.lg', '["log"]'],
  ['aliases.d', '["diff"]'],
  ['aliases.co', '["commit"]'],
]

const version = spawnSync('jj', ['--version'], { encoding: 'utf8' })
if (version.status !== 0) {
  console.error('未找到 jj。安装：https://jj-vcs.github.io/jj/latest/install-and-setup/')
  process.exit(1)
}

for (const [key, value] of settings) {
  const result = spawnSync('jj', ['config', 'set', '--user', key, value], {
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log('✔ jj 推荐配置已应用。若未设置身份，请运行：')
console.log('  jj config set --user user.name "你的名字"')
console.log('  jj config set --user user.email "you@example.com"')
