import { Kysely, PostgresDialect, sql } from 'kysely'
import { Pool } from 'pg'
import type { DB } from '../db/types.ts'

/**
 * 可选数据库工厂。
 *
 * 默认应用不会 import 本文件；只有需要业务数据时才在入口注入 Kysely。
 */
export interface CreateDbOptions {
  max?: number
  connectionTimeoutMillis?: number
}

export interface DbHandle {
  db: Kysely<DB>
  pool: Pool
}

export const createDb = (
  connectionString: string,
  options: CreateDbOptions = {},
): DbHandle => {
  const pool = new Pool({
    connectionString,
    max: options.max ?? 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: options.connectionTimeoutMillis ?? 5_000,
  })
  return {
    db: new Kysely<DB>({ dialect: new PostgresDialect({ pool }) }),
    pool,
  }
}

export const checkDb = async (db: Kysely<DB>): Promise<boolean> => {
  try {
    await sql`select 1`.execute(db)
    return true
  } catch {
    return false
  }
}
