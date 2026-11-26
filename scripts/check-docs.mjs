#!/usr/bin/env bun
/**
 * 文档一致性检查。
 *
 * 只检查能机械判定的事情：迁移后的主文档不能残留旧栈路径，
 * clone skill 必须包含交互/缓存分类，ISSUES 标题与状态必须一致。
 */

import { readFileSync } from 'node:fs'

const errors = []
const read = (file) => readFileSync(file, 'utf8')

const mainDocs = ['README.md', 'AGENTS.md', 'docs/ARCHITECTURE.md', 'docs/JJ.md']
const required = ['Hono', 'htmx', 'Basecoat', 'Tailwind']

for (const file of mainDocs) {
  let text
  try {
    text = read(file)
  } catch {
    errors.push(`${file} 不存在`)
    continue
  }
  for (const term of required) {
    if (!text.includes(term)) errors.push(`${file} 缺少关键栈说明：${term}`)
  }
  for (const stale of ['src/app/page.tsx', 'src/components/sites/', 'next.config.ts']) {
    if (text.includes(stale)) errors.push(`${file} 残留旧栈路径：${stale}`)
  }
}

try {
  const skill = read('.agents/skills/clone-website/SKILL.md')
  for (const term of ['交互分类', '缓存分类', 'HTML fragment', 'assetUrl', 'Alpine']) {
    if (!skill.includes(term)) errors.push(`clone skill 缺少：${term}`)
  }
} catch {
  errors.push('.agents/skills/clone-website/SKILL.md 不存在')
}

try {
  const issues = read('docs/ISSUES.md')
  const blocks = issues.split(/^## /m).slice(1)
  const rows = blocks
    .map((block) => {
      const heading = block.split('\n')[0] ?? ''
      const id = (heading.match(/ISSUE-(\d+)/) ?? [])[1]
      if (!id) return null
      const status = block
        .split('\n')
        .find((line) => line.startsWith('**状态**'))
      const headingEmoji = ['🔴', '🟡', '🟢'].find((emoji) => heading.startsWith(emoji))
      const statusEmoji = ['🔴', '🟡', '🟢'].find((emoji) => status?.includes(emoji))
      if (!headingEmoji || !statusEmoji) {
        errors.push(`ISSUE-${id} 缺少标题或状态 emoji`)
        return null
      }
      if (headingEmoji !== statusEmoji) {
        errors.push(`ISSUE-${id} 标题 ${headingEmoji} 与状态 ${statusEmoji} 不一致`)
      }
      return { id, emoji: headingEmoji }
    })
    .filter(Boolean)

  if (rows.length === 0) errors.push('docs/ISSUES.md 没有可检查的 ISSUE 条目')

  const summary = issues.match(/<!--\s*ISSUES_SUMMARY total=(\d+)\s*-->/)
  if (!summary) {
    errors.push('docs/ISSUES.md 缺少 ISSUES_SUMMARY 汇总注释')
  } else if (Number(summary[1]) !== rows.length) {
    errors.push(`ISSUES_SUMMARY 写 ${summary[1]}，实际 ${rows.length}`)
  }
} catch {
  errors.push('docs/ISSUES.md 不存在')
}

if (errors.length > 0) {
  console.error('✖ 文档一致性问题：')
  for (const item of errors) console.error('  - ' + item)
  process.exit(1)
}

console.log('✔ 文档一致')
