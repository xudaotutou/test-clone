#!/usr/bin/env bun
/**
 * 行为基线回归。
 *
 * 和快照使用同一组请求；任何状态、关键响应头或 body 变化都会失败。
 */

import { createBaselineApp, recordCase } from './baseline.mjs'

const expected = (await Bun.file('tests/baseline.jsonl').text())
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line))

const app = await createBaselineApp()

let failed = 0
for (const testCase of expected) {
  const actual = await recordCase(app, testCase)
  const same =
    actual.status === testCase.status &&
    JSON.stringify(actual.headers) === JSON.stringify(testCase.headers) &&
    actual.body === testCase.body

  if (same) {
    console.log(`✔ ${testCase.method} ${testCase.path}`)
    continue
  }

  failed++
  console.error(`✖ ${testCase.method} ${testCase.path}`)
  if (actual.status !== testCase.status) {
    console.error(`   status ${testCase.status} → ${actual.status}`)
  }
  if (JSON.stringify(actual.headers) !== JSON.stringify(testCase.headers)) {
    console.error('   headers 发生变化：')
    console.error('   expected ' + JSON.stringify(testCase.headers))
    console.error('   actual   ' + JSON.stringify(actual.headers))
  }
  if (actual.body !== testCase.body) {
    const expectedLine = testCase.body.split('\n').findIndex((line, index) => line !== actual.body.split('\n')[index])
    console.error(`   body 首个差异行：${expectedLine === -1 ? '行尾' : expectedLine + 1}`)
    console.error('   expected ' + testCase.body.split('\n')[Math.max(0, expectedLine)]?.slice(0, 180))
    console.error('   actual   ' + actual.body.split('\n')[Math.max(0, expectedLine)]?.slice(0, 180))
  }
}

if (failed > 0) {
  console.error(`\n✖ 行为基线 ${failed} 条不符。确认是预期变更后再运行 bun run snapshot。`)
  process.exit(1)
}

console.log(`\n✔ 行为基线全绿（${expected.length} 条）`)
