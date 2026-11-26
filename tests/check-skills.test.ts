import { afterEach, describe, expect, it } from 'bun:test'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'

const tempDirs: string[] = []

const makeRoot = () => {
  const root = mkdtempSync(join(tmpdir(), 'skills-check-'))
  tempDirs.push(root)
  return root
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const normalize = (text: string) => text.replace(/\r\n/g, '\n')
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')

const walk = (dir: string): string[] => {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(file))
    else if (entry.isFile()) files.push(file)
  }
  return files
}

const hashTree = (dir: string) => {
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

const setup = () => {
  const root = makeRoot()
  const skillDir = join(root, 'demo')
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: demo\n---\n')
  writeFileSync(join(skillDir, 'reference.md'), 'reference\n')

  const lockPath = join(root, 'skills-lock.json')
  writeFileSync(
    lockPath,
    JSON.stringify({
      version: 2,
      skills: {
        demo: {
          computedHash: sha256(normalize(readFileSync(join(skillDir, 'SKILL.md'), 'utf8'))),
          treeHash: hashTree(skillDir),
        },
      },
    }),
  )

  return { root, skillDir, lockPath }
}

const runCheck = (root: string, lockPath: string) =>
  Bun.spawnSync({
    cmd: ['bun', 'scripts/check-skills.mjs'],
    env: { ...process.env, SKILLS_ROOT: root, SKILLS_LOCK_PATH: lockPath },
    stdout: 'pipe',
    stderr: 'pipe',
  })

describe('外部 skill 漂移检查', () => {
  it('原版目录通过', () => {
    const { root, lockPath } = setup()
    const result = runCheck(root, lockPath)

    expect(result.exitCode).toBe(0)
    expect(String(result.stdout)).toContain('外部 skill 与锁定原版一致')
  })

  it('SKILL.md 被修改时失败', () => {
    const { root, skillDir, lockPath } = setup()
    writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: demo\n---\nchanged\n')

    const result = runCheck(root, lockPath)

    expect(result.exitCode).not.toBe(0)
    expect(String(result.stderr)).toContain('SKILL.md')
  })

  it('目录新增文件时失败', () => {
    const { root, skillDir, lockPath } = setup()
    writeFileSync(join(skillDir, 'extra.md'), 'extra\n')

    const result = runCheck(root, lockPath)

    expect(result.exitCode).not.toBe(0)
    expect(String(result.stderr)).toContain('目录内容与锁定原版不一致')
  })

  it('目录删除文件时失败', () => {
    const { root, skillDir, lockPath } = setup()
    rmSync(join(skillDir, 'reference.md'))

    const result = runCheck(root, lockPath)

    expect(result.exitCode).not.toBe(0)
    expect(String(result.stderr)).toContain('目录内容与锁定原版不一致')
  })
})
