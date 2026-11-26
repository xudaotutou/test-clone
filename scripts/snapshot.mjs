#!/usr/bin/env bun
/**
 * 生成 tests/baseline.jsonl。
 *
 * 只在确认行为变化符合预期后运行；不要用它掩盖回归。
 */

import { mkdir } from 'node:fs/promises'
import { CASES, createBaselineApp, recordCase } from './baseline.mjs'

const app = await createBaselineApp()
const records = []
for (const testCase of CASES) {
  records.push(await recordCase(app, testCase))
}

await mkdir('tests', { recursive: true })
await Bun.write(
  'tests/baseline.jsonl',
  records.map((record) => JSON.stringify(record)).join('\n') + '\n',
)
console.log(`✔ 已写入 tests/baseline.jsonl（${records.length} 条）`)
