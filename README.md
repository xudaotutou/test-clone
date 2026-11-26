<div align="center">

# AI Website Cloner Template

### 用一条命令克隆网站，交付可维护的 Bun + Hono 代码

给 AI 编码代理一个网址，它会先观察真实页面，再用 Hono、htmx、Alpine、Basecoat 与 Tailwind CSS v4 重建可编辑的本地实现。

**推荐 [Claude Code](https://docs.anthropic.com/en/docs/claude-code)，也支持 Codex、Cursor 与 OpenCode。**

[![Use this template](https://img.shields.io/badge/Use_this_template-Create_your_copy-2ea44f?style=for-the-badge&logo=github&logoColor=white)](https://github.com/JCodesMore/ai-website-cloner-template/generate) <a href="https://github.com/JCodesMore/ai-website-cloner-template/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" /></a>

</div>

---

## Fork 说明

本项目是 [JCodesMore/ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template) 的 fork，不是上游官方仓库。原项目使用 Next.js；本仓库在其网站克隆工作流与模板内容的基础上，迁移为 Bun + Hono、htmx、Alpine、Basecoat 与 Tailwind CSS v4。原项目的版权与 MIT License 保持不变。

## 这是什么

这是一个面向 AI 编码代理的网站逆向工程模板。它不生成截图或 iframe 假页面，而是要求代理提取真实文案、字体、图片与行为，用可读的服务端 HTML 和少量 Alpine/htmx 交互重建页面。

模板只保留两个部署出口：

- `src/index.ts`：Bun 原生服务器，供本地、Docker 和常规 VPS 使用。
- `src/worker.ts`：Cloudflare Workers 入口，静态文件由 assets binding 提供。

`src/app-bun.ts` 只是共享的 Hono 应用实例，供 Bun 入口与 Hono CLI 复用，不是第三个部署出口。

## 快速开始

前置条件：Bun 1.4.5 或更新的稳定版，以及一个能访问浏览器的编码代理。

```bash
bun install --frozen-lockfile
bun run dev
```

打开 `http://localhost:3000`，然后让代理执行：

```text
/clone-website https://example.com
```

Codex、Cursor 与 OpenCode 直接读取 `.agents/skills/`；网站克隆走 `.agents/skills/clone-website/SKILL.md`，栈细节按需读 `htmx4`、`alpine`、`hono`、`kysely`、`zod`、`tailwindcss` 与 `ui-kit`。Claude Code 通过 `.claude/commands/clone-website.md` 进入同一份工作流。

`hono` 与 `tailwindcss` 保持上游原版，模板差异统一记录在 `.agents/skills/README.md`；外部 skill 由 `skills-lock.json` 与 `bun run check:skills` 校验。

## 技术栈

- **运行时**：Bun 1.4.5，`Bun.serve()` 与 `Bun.file()`
- **服务端**：Hono 4，类型安全的中间件与路由
- **页面**：服务端 HTML、htmx 4、Alpine 3、Basecoat 组件类
- **样式**：Tailwind CSS v4，构建到 `public/static/app.css`
- **数据**：Kysely + pg；测试使用进程内 PGlite，生产数据库始终可选
- **质量**：TypeScript strict、ESLint 10、`bun test`、行为基线与 HTML 冒烟

## 项目结构

```text
src/
  index.ts                 # Bun 部署入口
  worker.ts                # Cloudflare Workers 部署入口
  app-bun.ts               # 共享 Hono 应用实例
  app.ts                   # createApp() 装配与中间件顺序
  sites/<site>/
    index.ts               # SiteModule：应用与 sitemap
    routes.ts              # 完整页面和 fragment 路由
    pages/                 # 完整页面 HTML
    fragments/             # htmx 返回的 HTML fragment
    components/            # 站点内可复用片段
  shared/                  # HTML、缓存、CSRF、会话、SEO、静态资源
  styles/                  # Tailwind 入口与站点样式
public/
  static/                  # htmx、Alpine、字体与构建后的 CSS
  sites/<site>/            # 来源站点图片、SVG、视频等
docs/
  research/<site>/         # 页面 brief、资源映射与检查证据
  design-references/       # 对比截图
tests/                     # bun test、行为基线
scripts/                   # 构建、检查、迁移与冒烟脚本
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `bun run dev` | 以 watch 模式启动 `src/index.ts` |
| `bun run start` | 启动生产入口 |
| `bun run build` | 构建 Tailwind CSS 并刷新资源哈希 |
| `bun run typecheck` | 执行 `bun check --no-script` |
| `bun run lint` | 执行 ESLint |
| `bun test` | 运行应用与 PGlite 测试 |
| `bun run snapshot` | 重新生成 `tests/baseline.jsonl` |
| `bun run smoke` | 解析真实 HTML 并请求全部静态资源 |
| `bun run routes` | 用 Hono CLI 展开 `src/app-bun.ts` 的真实路由 |
| `bun run check` | 完整 CI：构建、类型、lint、文档、测试、基线、冒烟 |
| `bun run bundle:worker` | 用 Wrangler dry-run 验证 Workers 产物 |

`public/static/app.css` 与 `src/shared/asset-versions.ts` 是生成物，但必须提交。CI 会重新构建并检查它们是否漂移。

## 页面与缓存约定

每个完整页面都必须通过 `renderPage()` 输出，并显式选择缓存分类：

- `public`：可共享缓存，设置 `Vary: Accept-Encoding`，绝不写 cookie。
- `private`：`no-store`、`Vary: Cookie`，确保匿名会话并注入 CSRF token。

htmx 路由返回 HTML fragment，不输出完整文档。读操作可公开缓存；写操作必须经过 CSRF 校验并返回 `no-store`。所有站内图片、脚本、字体与样式都必须通过 `assetUrl()` 引用，URL 会带内容哈希。

## 两个部署出口

### Bun

```bash
bun run build
bun run start
```

`Bun.serve()` 读取 `PORT`（默认 `3000`）与 `HOSTNAME`（默认 `0.0.0.0`），并在 SIGINT/SIGTERM 时优雅停止。`/static/*` 与 `/sites/*` 由 Bun 文件服务读取；只有真实存在的文件才获得 `public, max-age=31536000, immutable`。

### Cloudflare Workers

```bash
bun run bundle:worker
bun run deploy:worker
```

`wrangler.jsonc` 指向 `src/worker.ts`，并把 `public/` 作为静态资源目录。Worker 使用 `createApp({ static: 'none' })`，HTML 仍由同一份 Hono 应用生成。

### Docker

```bash
bun run secret:gen -- --file .env
docker compose up app --build
docker compose up dev --build
```

生产模式拒绝开发默认密钥，因此 `app` 需要至少 32 字符的 `SESSION_SECRET`。上面的命令会把它写入被忽略的 `.env`，再由 compose 注入容器。生产镜像基于 `oven/bun:1.4.5-slim` 多阶段构建；开发服务挂载源码并运行 watch 模式。

## 安全与合规

- 所有 HTML 通过 `src/shared/html.ts` 构造，默认转义，只有显式 `raw()` 才允许原样输出。
- 写请求校验 Origin、Sec-Fetch-Site 与每会话 CSRF token。
- 公开页与私有页的缓存策略是类型约束，而不是口头约定。
- 只克隆你有权迁移、恢复或学习的网站。不要用于钓鱼、冒充或违反目标站点条款。

安全报告方式见 [SECURITY.md](SECURITY.md)。

## 贡献

模板自身的问题与改进请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。如果只是想克隆一个网站，请先创建自己的副本。

## License

MIT
