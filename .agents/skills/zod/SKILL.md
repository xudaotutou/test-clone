---
name: zod
description: Zod v4 —— 本模板的输入校验层。用于 schema 定义、环境变量、表单/query 校验和类型推断。
---

# Zod 速查

本模板安装 `zod`，但**没有** `@hono/zod-validator`。默认做法是
`schema.safeParse()`，失败时返回 HTML fragment，而不是 JSON。

## 核心原则

1. 只校验输入，不重复校验数据库输出。
2. 用户输入先 `safeParse`，不要直接 `parse` 到全局错误处理。
3. htmx 4 会 swap 4xx/5xx，所以校验失败也返回 `errorFragment()`。
4. 需要和 DB 类型互锁时，用 `Insertable<DB['table']>`，并等 `bun run typegen`
   生成真实表类型后再写。

## 环境变量

`src/shared/env.ts` 是现成例子：`z.object()` + `safeParse()`，失败时拼出
`issue.path` 与 `issue.message`，启动阶段直接抛错。

```ts
const parsed = EnvSchema.safeParse(process.env)
if (!parsed.success) {
  throw new Error(parsed.error.issues.map((issue) => issue.message).join('\n'))
}
```

## 表单

```ts
import { z } from 'zod'
import { errorFragment } from '../../shared/errors.ts'

const EchoSchema = z.object({
  message: z.string().trim().min(1).max(200),
})

const parsed = EchoSchema.safeParse(await c.req.parseBody())
if (!parsed.success) {
  return c.html(errorFragment('请填写 1–200 个字符', 'VALIDATION_FAILED'), 422)
}
const { message } = parsed.data
```

如果表单需要回填和字段级错误，返回包含 `.field`、`data-invalid="true"` 和
`.field-error` 的 fragment；用 `hx-target="closest form"` + `hx-swap="outerHTML"`
替换整个表单。

## Query 参数

```ts
const ListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const parsed = ListSchema.safeParse(
  Object.fromEntries(new URL(c.req.url).searchParams),
)
```

query 参数都是字符串，数字字段用 `z.coerce.number()`。

## 常用类型

```ts
z.string().min(1).max(500)
z.email() // v4：不是 z.string().email()
z.uuid() // v4：不是 z.string().uuid()
z.number().int().positive().max(1_000_000)
z.boolean()
z.enum(['a', 'b'])
z.array(z.string())
z.object({ ... })
z.record(z.string(), z.number())
```

可选性：`optional()` = `undefined`，`nullable()` = `null`，`nullish()` = 两者都可。

## 与 DB 类型互锁

```ts
import type { DB, Insertable } from '../../db/types.ts'

type OrderInput = Pick<Insertable<DB['orders']>, 'total_cents' | 'note'>
const OrderSchema: z.ZodType<OrderInput> = z.object({
  total_cents: z.number().int().positive(),
  note: z.string().max(500).nullish(),
})
```

`DB` 默认是空接口；没有迁移时不要写这种 schema。

## 错误响应

```ts
return c.html(errorFragment('请求参数不合法', 'VALIDATION_FAILED'), 422)
```

不要返回 `c.json({ error: ... })` 给 htmx 端点。

## 参考

- Zod v4 迁移指南: https://zod.dev/v4/changelog
