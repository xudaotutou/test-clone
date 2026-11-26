/**
 * 默认数据库类型为空。
 *
 * 第一次接业务数据时：
 *   1. 在 src/db/migrations/ 添加 `.sql`
 *   2. 执行 bun run typegen
 *   3. review 生成结果并提交
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DB {}
