---
name: htmx4
description: htmx 4 —— 本模板的交互层。用于任何 hx-* 属性、局部刷新、hx-target/hx-swap、morph、OOB 更新、表单替换、请求风暴、以及 htmx 2→4 迁移与排错。TRIGGER on hx-get/hx-post/hx-trigger/hx-target/hx-swap/hx-vals/hx-headers, 局部刷新, 片段返回, 升级 htmx。
---

# htmx 4 速查（关键差异）

> ⚠️ **LLM 训练数据几乎全是 htmx 2** —— 这是本模板最高频的错误来源。
> 完整官方文档在 `references/`（从 htmx 官方 npm 包提取，未做修改）。

> **本模板覆盖**：`AGENTS.md` 优先。HTML 只从 `src/shared/html.ts` 构造；
> htmx 端点返回 HTML fragment，不返回 JSON；检查命令是 `bun run routes` /
> `bun run snapshot` / `bun run batch`，不要改成 npm 或 `npx hono`。

## htmx 2 → 4 破坏性变更

| htmx 2（会静默失效） | htmx 4（正确） |
|---|---|
| 继承默认开启 | **必须显式 `:inherited`** |
| `hx-vars='...'` | **`hx-vals="js:{...}"`** |
| `hx-ignore` | `hx-ignore` = 跳过处理；**`hx-disable`** = 禁用元素 |
| `hx-headers` | **`hx-headers:inherited`** |
| 4xx/5xx 不 swap | **4xx/5xx 也 swap** |
| `hx-on::before-swap` | `hx-on::<event>:<name>` 语法调整 |

## 核心概念

| 属性 | 用途 |
|---|---|
| `hx-get` / `hx-post` / `hx-put` / `hx-delete` | 发请求 |
| `hx-trigger` | 触发时机（`click`, `load`, `revealed`, `changed delay:500ms`） |
| `hx-target` | 更新目标（`this`, `#id`, `closest div`, `next`） |
| `hx-swap` | 替换方式（`innerHTML`, `outerHTML`, `beforeend`, `morph`） |
| `hx-swap-oob` | 响应里的 out-of-band 更新 |
| `hx-vals` | 附加参数（`js:{...}`） |
| `hx-headers` | 附加请求头 |
| `hx-sync` | 请求同步（`this:drop` 丢弃旧请求） |
| `hx-confirm` | 确认对话框 |
| `hx-indicator` | loading 指示器 |
| `hx-boost` | 提升为链接导航 |
| `hx-push-url` | 更新 URL |

## ⚠️ 三个必须遵守的规则

### 1. 端点返回 HTML fragment（永远不是 JSON）

```ts
// ✅
return c.html(html.td(esc(order.total_cents)))

// ❌ htmx 会把 JSON 字符串直接塞进 DOM
return c.json({ total: 100 })
```

### 2. 错误响应也是 fragment

htmx 4 会 swap 4xx/5xx。统一走 `errorFragment()`。

### 3. 不要制造请求风暴

```html
<!-- ❌ 页面加载 = N 个并发请求 -->
<div hx-get="/a" hx-trigger="load"></div>

<!-- ✅ 懒加载 -->
<div hx-get="/a" hx-trigger="revealed"></div>

<!-- ❌ 每个按键一个请求 -->
<input hx-get="/search" hx-trigger="input">

<!-- ✅ 防抖 + 丢弃旧请求 -->
<input hx-get="/search"
       hx-trigger="input changed delay:500ms, keyup[key=='Enter']"
       hx-sync="this:drop">
```

## morph 的性能

`morphScanLimit` 默认 10 —— 长列表 morph 是 O(n×10) 扫描。
**长列表用 `innerHTML`，不用 morph。**

## 本模板的 CSRF 注入点

`X-CSRF-Token` 由 `src/shared/layout.ts` 写在 `<body hx-headers:inherited='{...}'>` 上。
**值不加 `js:` 前缀** —— `js:` 会让 htmx 把值当表达式求值，JSON 在表达式位置是语法错误。
端点里不用管 CSRF 头。

## 参考文档（按需读，不要一次全读）

| 文件 | 大小 | 什么时候读 |
|---|---|---|
| `references/htmx-upgrade-from-htmx2.md` | 15.9 KB | **最优先**：任何不确定的语法，先查它 |
| `references/htmx-guidance.md` | 34.7 KB | 需要完整用法/属性语义时 |
| `references/htmx-debugging.md` | 9.4 KB | 行为不符合预期、排查 swap/trigger 问题 |
| `references/htmx-extension-authoring.md` | 14.7 KB | 写自定义扩展（本仓暂未使用） |

## 来源与更新

直接来自 htmx 官方 npm 包（`htmx.org@next` → `dist/skills/`），**未做任何修改**。
版本：htmx 4.0.2 (next)。

```bash
npm pack htmx.org@next
tar -xzf htmx.org-4.0.2.tgz
cp package/dist/skills/*.md .agents/skills/htmx4/references/
```

升级检查工具：`bunx htmx upgrade-check`（需要 Python 3，CI 未启用）。
官方资源：https://four.htmx.org/llms.txt · https://four.htmx.org/docs/

## 三重保险（本仓）

1. `AGENTS.md` 第 4 节的 htmx 2 → 4 对照表
2. `eslint.config.js` 拦截 `hx-vars` 与旧 `hx-on::` 语法
3. 本 skill 的 `references/htmx-upgrade-from-htmx2.md`
