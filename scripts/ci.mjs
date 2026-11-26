#!/usr/bin/env bun
/**
 * 本地与 CI 共用的检查入口。
 *
 * 默认不要求 DATABASE_URL，也不执行 typegen：模板默认不接数据库。
 */

import { existsSync, rmSync, statSync } from 'node:fs'

const CI_ENV = {
  NODE_ENV: 'test',
  SESSION_SECRET: 'ci-test-secret-at-least-32-characters-long',
  SITE_URL: 'http://localhost:3000',
  LOG_LEVEL: 'warn',
}

const ARTIFACTS = ['public/static/app.css', 'src/shared/asset-versions.ts']
const TEMP_FILES = ['.smoke.json']

const bunRun = (script) =>
  Bun.spawnSync({
    cmd: ['bun', 'run', script],
    stdout: 'inherit',
    stderr: 'inherit',
    env: { ...process.env, ...CI_ENV },
  })

const succeeded = (result) => (result.exitCode ?? result.status ?? 1) === 0

const sha = async (file) => {
  if (!existsSync(file)) return 'missing'
  const bytes = await Bun.file(file).arrayBuffer()
  return new Bun.CryptoHasher('sha256').update(bytes).digest('hex').slice(0, 12)
}

const generatedConsistency = async () => {
  const before = new Map()
  for (const file of ARTIFACTS) before.set(file, await sha(file))

  const result = bunRun('build:css')
  if (!succeeded(result)) return result

  const drifted = []
  for (const file of ARTIFACTS) {
    if ((await sha(file)) !== before.get(file)) drifted.push(file)
  }
  if (drifted.length === 0) return { status: 0 }

  console.error('✖ 生成物与入库版本不一致：')
  for (const file of drifted) console.error(`   ${file}   ${before.get(file)} → ${await sha(file)}`)
  console.error('   修法：bun run build:css，然后提交生成物。')
  return { status: 1 }
}

const steps = [
  { name: '构建 CSS / 资源哈希', run: () => bunRun('build') },
  { name: 'typecheck', run: () => bunRun('typecheck') },
  { name: 'lint', run: () => bunRun('lint') },
  { name: 'check:docs', run: () => bunRun('check:docs') },
  { name: 'check:skills', run: () => bunRun('check:skills') },
  { name: 'test', run: () => bunRun('test') },
  { name: '生成物一致性', run: generatedConsistency },
  {
    name: 'batch（行为基线）',
    run: () => {
      if (!existsSync('tests/baseline.jsonl') || statSync('tests/baseline.jsonl').size === 0) {
        console.error('✖ tests/baseline.jsonl 为空。先运行 bun run snapshot。')
        return { status: 1 }
      }
      return bunRun('batch')
    },
  },
  {
    name: 'smoke（页面冒烟）',
    run: () => {
      const result = bunRun('smoke')
      for (const file of TEMP_FILES) if (existsSync(file)) rmSync(file)
      return result
    },
  },
]

const started = Date.now()
const durations = []

for (const [index, step] of steps.entries()) {
  process.stdout.write(`\n▶ ${index + 1}/${steps.length} ${step.name}\n`)
  const start = Date.now()
  const result = await step.run()
  const seconds = ((Date.now() - start) / 1000).toFixed(1)
  durations.push(`${step.name} ${seconds}s`)

  if (!succeeded(result)) {
    console.error(`\n✖ 失败于第 ${index + 1} 道：${step.name}（${seconds}s）`)
    process.exit(1)
  }
  process.stdout.write(`✔ ${step.name}（${seconds}s）\n`)
}

console.log(
  `\n✔ CI 全绿：${steps.length} 道，共 ${((Date.now() - started) / 1000).toFixed(1)}s\n` +
    `  ${durations.join(' · ')}`,
)
