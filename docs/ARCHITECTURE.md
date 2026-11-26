# 架构

## 目标

同一份 Hono 应用必须同时运行在 Bun 与 Cloudflare Workers。页面以服务端 HTML 为主，htmx 负责局部往返，Alpine 负责少量本地状态，Basecoat 提供组件语义类，Tailwind CSS v4 负责构建样式。

部署出口只有两个：

1. `src/index.ts`：`Bun.serve()`，读取 `PORT` 与 `HOSTNAME`，直接挂载应用。
2. `src/worker.ts`：Workers `fetch`，使用 assets binding 提供静态文件。

`src/app-bun.ts` 导出共享应用实例，供 Bun 入口与 Hono CLI 使用；它不是独立服务器。

## 应用装配

`src/app.ts` 的 `createApp()` 是唯一装配入口。中间件顺序就是安全边界：

```text
requestId → logger → timing → secureHeaders → bodyLimit
→ cacheDefaults → CSRF → etag → routes
```

- `cacheDefaults()` 位于 CSRF 之前，因此 403 响应也带 `no-store` 与 `Vary: Cookie`。
- 安全方法直接放行；写方法校验 Origin、Sec-Fetch-Site 与每会话 CSRF token。
- 未捕获错误与 404 都返回 HTML fragment，避免把栈信息泄露给生产用户。

站点通过 `SiteModule` 显式挂载。默认 starter 站点挂在 `/`，sitemap 由各站点声明后统一展开。

## 页面模型

完整页面必须经过 `renderPage()`：

- `PageSpec.cache` 是必填的联合类型，公开页和私有页不能混淆。
- 公开页使用 `publicCache`，返回共享缓存头与 `Vary: Accept-Encoding`，不接触 cookie。
- 私有页使用 `privateCache`，返回 `no-store` 与 `Vary: Cookie`，确保匿名会话并注入 CSRF token。
- `layout()` 只引用经过 `assetUrl()` 的资源；脚本顺序固定为 htmx、Alpine、兼容层。

所有标签都通过 `src/shared/html.ts` 构造。普通字符串插值自动转义，`SafeHtml` 标记只有在显式 `raw()` 或受控模板中才会原样输出。htmx 返回的 fragment 同样走这套构造器。

## 静态资源

资源放在 `public/static/` 或 `public/sites/<site>/`。`scripts/asset-hash.mjs` 计算内容哈希并生成 `src/shared/asset-versions.ts`，`assetUrl()` 再追加 `?v=<hash>`。

- Bun：`src/shared/static-bun.ts` 使用 `serveStatic()` 读取磁盘；`onFound` 只对真实文件设置 `public, max-age=31536000, immutable`。
- Workers：`createApp({ static: 'none' })`，由 `wrangler.jsonc` 的 assets binding 与 `public/_headers` 提供同样的缓存规则。
- 缺失文件返回 404，不得带 immutable；否则浏览器会永久缓存错误。

`public/static/app.css` 与 `src/shared/asset-versions.ts` 是入库生成物。CI 会重新构建并比较哈希，发现漂移即失败。

## 数据

Kysely + pg 是默认数据库边界，但数据库不参与 `createApp()` 装配。需要数据时由入口或站点通过 `src/shared/db.ts` 的 `createDb()` 创建 `Kysely<DB>`，再传给对应的站点或路由。`DATABASE_URL` 未配置时应用仍可启动，`/readyz` 会报告 `not-configured`。

PGlite 只在测试中使用，用来创建进程内 Postgres、应用迁移并验证清理；它不是生产数据库。迁移文件放 `src/db/migrations/*.sql`，`bun run typegen` 生成 `src/db/types.ts`。

## 环境与安全

`src/shared/env.ts` 使用 zod 在首次读取时校验环境变量：

- `SESSION_SECRET` 至少 32 字符；生产环境拒绝开发默认值。
- `ALLOWED_ORIGINS` 为空时，生产环境至少允许 `SITE_URL` 自身。
- CSP 默认只允许同源脚本与样式；Alpine 标准构建需要 `unsafe-eval`，需要严格 CSP 时改用 CSP build。

安全响应头、请求 ID、body 上限与 ETag 由全局中间件统一处理。

## 测试层次

- `tests/app.test.ts`：公开缓存与 cookie、私有 CSRF、静态资源 200/404、运维端点。
- `tests/db.test.ts`：PGlite 创建、查询与关闭。
- `scripts/baseline.mjs`：确定性行为基线，覆盖页面、fragment、SEO 与 CSRF 拒绝。
- `scripts/smoke.mjs`：解析真实 HTML，请求所有静态资源并检查缓存分类。
- `scripts/ci.mjs`：按顺序运行构建、类型、lint、文档、测试、生成物一致性、基线与冒烟。

这就是 Hono + htmx + Basecoat + Tailwind 模板的质量闭环。
