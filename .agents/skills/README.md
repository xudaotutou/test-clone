# Agent skills

本目录按需加载；`AGENTS.md` 是项目契约，任何 skill 与它冲突时以 `AGENTS.md` 为准。

## 已包含

| Skill | 来源 | 状态 |
| --- | --- | --- |
| `clone-website` | 本仓库 / 上游模板 | 网站克隆主工作流 |
| `alpine` | `ai-naive-full-stack-template` | 本地维护，已适配本模板的 htmx / CSP 约定 |
| `htmx4` | `ai-naive-full-stack-template` | 本地维护，已适配本模板的 HTML fragment 与 CSRF 约定，含官方参考文档 |
| `hono` | `honojs/skills` | 官方原版，禁止修改；模板覆盖见下方 |
| `kysely` | `ai-naive-full-stack-template` | 本地维护，已改为本模板的可选 `createDb()` 注入方式 |
| `tailwindcss` | `hairyf/skills` | 第三方原版，禁止修改；模板覆盖见下方 |
| `ui-kit` | `ai-naive-full-stack-template` | 本地维护，已改为本模板的 Basecoat / `src/styles/app.css` 结构 |
| `zod` | `ai-naive-full-stack-template` | 本地维护，已改为 `safeParse` + HTML fragment；本模板未安装 `@hono/zod-validator` |

外部来源版本记录在根目录 `skills-lock.json`：

- `hono`: `honojs/skills` commit `e54ce51f6effaeb574ebd2629e89e086e14a2db3`
- `tailwindcss`: `hairyf/skills` commit `ffa1f904012f48f5bdf34ebb692daa09c778d47f`

## 外部 skill 规则

`hono` 与 `tailwindcss` 是从上游复制的只读快照。不要修改它们的 `SKILL.md`、`GENERATION.md` 或 `references/`；模板差异只写在本文件与 `AGENTS.md`。`bun run check:skills` 会校验文件哈希，任何改动都会失败。

## 本模板覆盖

### Hono

- 运行时是 Bun 1.4.5；命令用 `bun run ...`、`bun test`，不要改成 npm / npx。上游正文里的 `npx` 只是通用示例。
- 不使用 React、Next 或 Hono JSX；也不使用 `hono/html` 的 `html` / `raw`。HTML 只从 `src/shared/html.ts` 输出，通过 `c.html(fragment)` 返回。
- 完整页面必须走 `src/shared/page.ts` 的 `renderPage()` 并显式提供 `cache`。
- htmx 端点返回 HTML fragment，不返回 JSON；写请求经过 `src/app.ts` 的 CSRF 中间件。
- 没有安装 `@hono/zod-validator`；需要校验时用 `schema.safeParse()`，失败返回 `errorFragment()`，见 `zod` skill。
- 已有 `@hono/cli`。查看路由用 `bun run routes`；行为基线用 `bun run snapshot` / `bun run batch`。不要运行 `npx hono`。
- 入口：`src/index.ts`（Bun）、`src/worker.ts`（Workers）、`src/app-bun.ts`（共享实例）。

### Tailwind CSS

- 固定 Tailwind CSS `4.1.16`，入口是 `src/styles/app.css`，构建命令是 `bun run build`；产物 `public/static/app.css` 必须提交。
- 入口使用 `@import 'tailwindcss' source(none)` + 显式 `@source`，避免扫描 `tests/baseline.jsonl` 形成构建循环；新增源文件时补 `@source`。
- Basecoat 只引入需要的 `components/*.css`，并保留 `base/base.css` 与 `styles/vega.css`；不要全量 import。
- 页面图片、字体和样式 URL 必须走 `src/shared/assets.ts` 的 `assetUrl()`；换字体文件必须换文件名。

### 通用

- 不使用 React、Next 或 Hono JSX；HTML 只从 `src/shared/html.ts` 输出。
- 完整页面必须走 `src/shared/page.ts` 的 `renderPage()` 并显式提供 `cache`。
- htmx 端点返回 HTML fragment，不返回 JSON；写请求经过 CSRF 中间件。
- 资源 URL 必须通过 `src/shared/assets.ts` 的 `assetUrl()` 生成。
- 数据库是可选的：`src/shared/db.ts` 的 `createDb()` 返回 `{ db, pool }`；PGlite 只用于测试。
- 修改 CSS 后运行 `bun run build`，并提交 `public/static/app.css` 与 `src/shared/asset-versions.ts`。

## 没有迁移

- `vitest`：本仓库使用 `bun test`，直接迁移会给出错误的测试命令。
- `neon`、`neon-postgres`、`supabase-postgres-best-practices`：默认数据库是可选 pg，不绑定特定托管商；需要时再按目标平台引入。
- `ds-*`：通用 agent 工作流，不属于本模板的 Bun / Hono 技术栈；本仓库已有 `clone-website` 与 `AGENTS.md` 工作流。

## 更新

- 外部 skill：从 `skills-lock.json` 记录的 source / commit 整目录替换，更新 `computedHash` 与 `treeHash`，运行 `bun run check:skills`；不要手改正文。
- 本地 skill：按本模板接口修改，运行 `bun run check`；不要直接覆盖 `clone-website`。
