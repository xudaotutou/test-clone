---
name: kysely
description: Kysely 查询构建器 —— 本模板的可选数据访问层。用于写/改 SQL 查询、where、join、insert、update，以及接入迁移和类型生成。
---

# Kysely 速查

Kysely 只生成 SQL，没有运行时。本模板默认不连接数据库；需要业务数据时再显式注入。

## 本模板入口

```ts
import { createDb } from '../../shared/db.ts'

const { db, pool } = createDb(connectionString, { max: 10 })
try {
  const rows = await db.selectFrom('orders').selectAll().execute()
} finally {
  await db.destroy()
}
```

- `createDb(connectionString, options)` 返回 `{ db, pool }`；没有全局 `db`。
- 相对导入必须带 `.ts` 扩展名；本模板没有 `@/` 路径别名。
- `src/db/types.ts` 默认是空 `DB {}`。新增 `src/db/migrations/*.sql` 后运行
  `bun run migrate` 与 `bun run typegen`，review 生成结果并提交。
- 测试用 `src/shared/db-test.ts` 的 `makeTestDb()`，它返回
  `{ pglite, db, cleanup }`；PGlite 只用于测试。
- 默认没有多租户或 RLS 约束。要加隔离，就在唯一入口封装 `scoped*()`，不要让
  feature 直接拼租户条件。

## 核心原则

1. **不要用 `sql.raw()` 拼用户输入**；用参数化表达式。裸 SQL 会绕过类型检查。
2. **列名/表名写错在编译期报错**，这是 Kysely 的主要价值。
3. **行类型用生成的别名**（`OrderRow` 等），不要直接拿 `DB['orders']`：
   `Generated<T>` 未解包时会和 `Selectable` 不兼容。
4. 插入用 `Insertable`，更新用 `Updateable`。

```ts
import type { DB, OrderRow, OrderInsert, OrderUpdate } from '../../db/types.ts'
// OrderRow    = Selectable<DB['orders']>
// OrderInsert = Insertable<DB['orders']>
// OrderUpdate = Updateable<DB['orders']>
```

## 查询模式

```ts
// SELECT
await db.selectFrom('orders').selectAll().execute()
await db.selectFrom('orders').select(['id', 'total_cents']).execute()

// WHERE
await db.selectFrom('orders').selectAll().where('status', '=', 'paid').execute()
await db.selectFrom('orders').selectAll().where('id', 'in', [id1, id2]).execute()
await db.selectFrom('orders').selectAll().where('total_cents', '>', 100).execute()

// 多条件 AND
await db
  .selectFrom('orders')
  .selectAll()
  .where('customer_id', '=', cid)
  .where('status', '=', 'pending')
  .execute()

// OR
await db
  .selectFrom('orders')
  .selectAll()
  .where((eb) => eb.or([eb('status', '=', 'paid'), eb('status', '=', 'shipped')]))
  .execute()

// JOIN
await db
  .selectFrom('orders')
  .innerJoin('customers', 'customers.id', 'orders.customer_id')
  .select(['orders.id', 'customers.name'])
  .execute()

// INSERT
const row = await db
  .insertInto('orders')
  .values({ total_cents: 100, customer_id: cid })
  .returningAll()
  .executeTakeFirstOrThrow()

// UPDATE / DELETE
await db.updateTable('orders').set({ status: 'paid' }).where('id', '=', id).execute()
await db.deleteFrom('orders').where('id', '=', id).execute()

// COUNT
const [{ count }] = await db
  .selectFrom('orders')
  .select((eb) => eb.fn.countAll().as('count'))
  .execute()
```

## 事务

```ts
await db.transaction().execute(async (trx) => {
  await trx.insertInto('orders').values(order).execute()
  await trx.updateTable('inventory').set({ reserved: true }).where('id', '=', id).execute()
})
```

## 性能

先测量再优化。热路径确实重复编译同一查询时，可以 `compile()` 一次再
`db.executeQuery(query)`；普通页面不要提前缓存查询对象。

## 参考

- 官方 llms.txt: https://kysely.dev/llms.txt
- 分页 API: https://kysely.dev/docs/explanations/pagination
