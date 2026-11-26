import { describe, expect, it } from 'bun:test'
import { sql } from 'kysely'
import { makeTestDb } from '../src/shared/db-test.ts'

describe('PGlite 测试库', () => {
  it('可创建、查询并彻底关闭', async () => {
    const { pglite, db, cleanup } = await makeTestDb()

    const result = await sql<{ value: number }>`select 1 as value`.execute(db)
    expect(result.rows[0]?.value).toBe(1)

    await cleanup()
    expect(pglite.closed).toBe(true)
  })
})
