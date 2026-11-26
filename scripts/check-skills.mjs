#!/usr/bin/env bun
/**
 * 外部 skill 漂移检查。
 *
 * 外部 skill 必须保持上游原版；模板差异写在 .agents/skills/README.md 与 AGENTS.md。
 * 这里用 LF 归一化后的内容哈希校验 SKILL.md 与整个目录。
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const normalize = (text) => text.replace(/\r\n/g, '\n')
const sha256 = (text) => createHash('sha256').update(text).digest('hex')

export const hashFile = (file) => sha256(normalize(readFileSync(file, 'utf8')))

const walk = (dir) => {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(file))
    else if (entry.isFile()) files.push(file)
  }
  return files
}

export const hashTree = (dir) => {
  const hash = createHash('sha256')
  const files = walk(dir)
    .map((file) => ({ file, rel: relative(dir, file).split(sep).join('/') }))
    .sort((a, b) => a.rel.localeCompare(b.rel))

  for (const { file, rel } of files) {
    hash.update(rel)
    hash.update('\0')
    hash.update(normalize(readFileSync(file, 'utf8')))
    hash.update('\0')
  }

  return hash.digest('hex')
}

export const verifySkills = ({ skillsRoot, lockPath }) => {
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
  const errors = []

  for (const [name, entry] of Object.entries(lock.skills ?? {})) {
    const dir = join(skillsRoot, name)
    if (!existsSync(dir)) {
      errors.push(`${name}: 目录不存在`)
      continue
    }

    const skillFile = join(dir, 'SKILL.md')
    if (!existsSync(skillFile)) {
      errors.push(`${name}: 缺少 SKILL.md`)
      continue
    }

    if (entry.computedHash && hashFile(skillFile) !== entry.computedHash) {
      errors.push(`${name}/SKILL.md: 内容与锁定原版不一致`)
    }
    if (entry.treeHash && hashTree(dir) !== entry.treeHash) {
      errors.push(`${name}: 目录内容与锁定原版不一致（有文件被修改、增加或删除）`)
    }
  }

  return errors
}

if (import.meta.main) {
  const skillsRoot = process.env.SKILLS_ROOT ?? '.agents/skills'
  const lockPath = process.env.SKILLS_LOCK_PATH ?? 'skills-lock.json'

  let errors
  try {
    errors = verifySkills({ skillsRoot, lockPath })
  } catch (error) {
    console.error('✖ 无法校验外部 skill：')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }

  if (errors.length > 0) {
    console.error('✖ 外部 skill 与锁定原版不一致：')
    for (const error of errors) console.error(`  - ${error}`)
    console.error('  修法：从上游整目录替换，更新 skills-lock.json；不要直接修改外部 skill。')
    process.exit(1)
  }

  const count = Object.keys(JSON.parse(readFileSync(lockPath, 'utf8')).skills ?? {}).length
  console.log(`✔ 外部 skill 与锁定原版一致（${count} 个）`)
}
