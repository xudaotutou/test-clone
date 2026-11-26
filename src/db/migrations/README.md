# 数据库迁移

默认模板不连接数据库，因此这里没有 `.sql` 文件。

第一次接入业务数据时：

1. 新增 `0001_xxx.sql`，把 schema 作为唯一真源。
2. 运行 `bun run migrate`。
3. 运行 `bun run typegen` 生成 `src/db/types.ts`。
4. 为涉及用户数据的表补授权边界和 RLS 策略。

`bun run check` 默认不要求 `DATABASE_URL`，也不执行 typegen。
