#!/usr/bin/env bun
/**
 * 可选数据库迁移器。
 *
 * 默认仓库没有迁移文件；第一次接业务数据时再向 src/db/migrations/ 添加 `.sql`。
 */

import { Client } from 'pg'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MIGRATIONS_DIR = join(ROOT, 'src', 'db', 'migrations')
const TABLE = '_migrations'
const LOCK_KEY = 0x616e6d69

const command = (process.argv[2] ?? 'up').toLowerCase()
if (!['up', 'down', 'status'].includes(command)) {
  console.error(`未知命令：${command}\n可用：up | status | down`)
  process.exit(1)
}

const files = (await readdir(MIGRATIONS_DIR))
  .filter((file) => file.endsWith('.sql') && !file.endsWith('.down.sql'))
  .sort()

if (files.length === 0) {
  console.log('没有迁移文件。默认模板不连接数据库。')
  process.exit(0)
}

const databaseUrl = process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('缺少 MIGRATE_DATABASE_URL / DATABASE_URL。')
  process.exit(1)
}

const client = new Client({ connectionString: databaseUrl })
await client.connect()

try {
  await client.query(
    `CREATE TABLE IF NOT EXISTS ${TABLE} (
       name text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     )`,
  )
  await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY])

  const appliedResult = await client.query(`SELECT name FROM ${TABLE} ORDER BY name`)
  const applied = new Set(appliedResult.rows.map((row) => row.name))
  const migrations = files.map((file) => ({
    name: file.replace(/\.sql$/, ''),
    file: join(MIGRATIONS_DIR, file),
  }))

  if (command === 'status') {
    for (const migration of migrations) {
      console.log(`${applied.has(migration.name) ? '[x]' : '[ ]'} ${migration.name}`)
    }
    const pending = migrations.filter((migration) => !applied.has(migration.name)).length
    console.log(`\n${migrations.length} 个迁移，${pending} 个待执行。`)
  } else if (command === 'up') {
    for (const migration of migrations) {
      if (applied.has(migration.name)) continue
      await client.query('BEGIN')
      try {
        await client.query(await readFile(migration.file, 'utf8'))
        await client.query(`INSERT INTO ${TABLE} (name) VALUES ($1)`, [migration.name])
        await client.query('COMMIT')
        console.log(`[applied] ${migration.name}`)
      } catch (cause) {
        await client.query('ROLLBACK')
        throw cause
      }
    }
  } else {
    const last = migrations.filter((migration) => applied.has(migration.name)).at(-1)
    if (!last) {
      console.log('没有已应用的迁移，无需回滚。')
    } else {
      const downFile = last.file.replace(/\.sql$/, '.down.sql')
      let downSql
      try {
        downSql = await readFile(downFile, 'utf8')
      } catch {
        console.error(
          `拒绝回滚 ${last.name}：缺少 ${downFile}。` +
            '\n数据迁移请用向前迁移撤销，避免静默丢数据。',
        )
        process.exitCode = 1
        downSql = ''
      }
      if (downSql) {
        await client.query('BEGIN')
        try {
          await client.query(downSql)
          await client.query(`DELETE FROM ${TABLE} WHERE name = $1`, [last.name])
          await client.query('COMMIT')
          console.log(`[reverted] ${last.name}`)
        } catch (cause) {
          await client.query('ROLLBACK')
          throw cause
        }
      }
    }
  }
} finally {
  await client.end()
}
