import { PGlite } from '@electric-sql/pglite'
import { createPgConfig } from '@electric-sql/pglite/node-postgres'
import pg from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { DB } from '../db/types.ts'

/**
 * 进程内 Postgres 测试设施。
 *
 * PGlite 只给一个连接，不能用来测并发；它的价值是零基础设施的 schema 漂移检测。
 */
export const applyMigrations = async (pglite: PGlite): Promise<void> => {
  const dir = join(process.cwd(), 'src', 'db', 'migrations')
  if (!existsSync(dir)) return
  const files = (await readdir(dir)).filter((file) => file.endsWith('.sql')).sort()
  for (const file of files) {
    await pglite.exec(await readFile(join(dir, file), 'utf8'))
  }
}

export interface TestDb {
  pglite: PGlite
  db: Kysely<DB>
  cleanup: () => Promise<void>
}

export const makeTestDb = async (): Promise<TestDb> => {
  const pglite = new PGlite()
  await applyMigrations(pglite)
  const pool = new pg.Pool(createPgConfig(pglite))
  const db = new Kysely<DB>({ dialect: new PostgresDialect({ pool }) })

  return {
    pglite,
    db,
    cleanup: async () => {
      await db.destroy()
      await pglite.close()
    },
  }
}
