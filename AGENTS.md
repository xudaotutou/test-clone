# AI Website Cloner Template — 代理说明

## 目标

把目标网站重建为可读、可维护、可部署的 Bun + Hono 代码。先 1:1 还原真实内容与行为，再讨论个人风格改动。截图、iframe 和下载的生产 bundle 只作为证据，不是实现。

## 技术栈

- Bun 1.4.5、TypeScript strict、ESLint 10
- Hono 4 服务端路由；不使用 React、Next 或 Hono JSX
- htmx 4 负责表单与 fragment 往返，Alpine 3 负责本地 UI 状态
- Basecoat 组件类 + Tailwind CSS v4
- Kysely + pg；PGlite 只用于测试，数据库为可选注入

## 命令

- `bun run dev` — watch 模式启动 `src/index.ts`
- `bun run build` — 构建 `public/static/app.css` 并刷新资源哈希
- `bun run typecheck` — 执行 `bun check --no-script`
- `bun run lint` — ESLint
- `bun test` — 单元、HTTP 与 PGlite 测试
- `bun run smoke` — 解析真实 HTML、检查资源与缓存
- `bun run check` — 完整 CI
- `bun run routes` — 用 Hono CLI 查看真实路由
- `bun run bundle:worker` — Workers dry-run

不要把类型检查写成 `bun check`：`package.json` 里的 `check` 脚本会遮蔽 Bun 内置命令，必须带 `--no-script`。

## 代码结构

```text
src/index.ts          Bun 部署入口
src/worker.ts         Cloudflare Workers 部署入口
src/app-bun.ts        共享 Hono 应用实例，不是部署出口
src/app.ts            createApp()、中间件顺序与站点挂载
src/sites/<site>/     站点路由、完整页面、fragment 与组件
src/shared/           HTML、缓存、CSRF、会话、SEO、静态资源
public/static/        htmx、Alpine、字体与构建后的 CSS
public/sites/<site>/  来源站点资源
docs/research/        页面 brief、资源映射与检查证据
tests/                bun test 与行为基线
```

## 技能

- 先读 `.agents/skills/README.md` 了解可用 skill 与覆盖规则。
- 网站克隆主流程读 `.agents/skills/clone-website/SKILL.md`；栈细节按需读 `htmx4`、`alpine`、`hono`、`kysely`、`zod`、`tailwindcss`、`ui-kit`。
- skill 是参考材料，`AGENTS.md` 与当前代码优先；冲突时不要照搬 skill 里的 npm、React/JSX 或数据库假设。
- `hono` 与 `tailwindcss` 是外部只读快照：不要修改它们的 `SKILL.md`、`GENERATION.md` 或 `references/`；模板差异只写在 `.agents/skills/README.md`，并由 `bun run check:skills` 校验。

## 页面与 HTML

- 完整页面必须调用 `src/shared/page.ts` 的 `renderPage()`，并显式提供 `cache`。
- 公开页使用 `cache: { visibility: 'public', sMaxAge, tags }`；不写 cookie，`Vary` 为 `Accept-Encoding`。
- 私有页使用 `cache: { visibility: 'private', csrf: true }`；响应为 `no-store`、`Vary: Cookie`，并注入会话与 CSRF token。
- htmx 交互返回 HTML fragment，不返回完整文档；写请求必须经过 CSRF 中间件。
- 只在 `src/shared/html.ts` 构造 HTML。普通插值自动转义；用户输入绝不进入 `raw()`。
- 所有资源 URL 通过 `src/shared/assets.ts` 的 `assetUrl()` 生成。新增或替换文件后运行 `bun run build`，提交 CSS 与 `asset-versions.ts`。

## 站点克隆工作流

1. 读取 `.agents/skills/clone-website/SKILL.md`，建立来源 URL 到本地路由的映射。
2. 在桌面与移动宽度观察真实页面，记录滚动、点击、悬停和时间驱动的差异；保存带尺寸与状态的截图。
3. 提取真实文案、字体、图片、SVG、视频与元数据，记录来源 URL 到本地路径的对应关系。
4. 用 `src/sites/<site>/` 实现页面与 fragment，复用共享 HTML、缓存和资源工具。
5. 在相同视口与交互状态下并排比较，先修几何、缺失层、字体、裁切，再修间距与动效。
6. 运行 `bun run check`，并说明仍存在的视觉或功能差异。

被克隆站点的样式放 `src/styles/sites/<site>.css`，资源放 `public/sites/<site>/`。不要在模板首页尚未被替换时随意删除它的结构；先确认目标路由的覆盖关系。

## 交互分类

- 导航、表单提交、局部刷新：优先 htmx，服务端返回 HTML fragment。
- 菜单、标签页、对话框、轻量状态：优先 Alpine；不要为了一个开关引入前端框架。
- 滚动、时间与复杂动画：先判断真实驱动方式，再用 CSS 或成熟动画库实现；不要用点击伪造滚动行为。

## 缓存分类

- `/static/*`、`/sites/*`：真实存在的文件返回 200 与 `public, max-age=31536000, immutable`；缺失文件返回 404 且不得带 immutable。
- 公开页面：共享缓存，绝不携带 `Set-Cookie`。
- `/demo` 与所有写请求：`no-store`、`Vary: Cookie`。
- 新增路由时必须选择一种缓存分类，禁止依赖默认值猜。

## 数据库

默认不要求 `DATABASE_URL`。需要数据时用 `src/shared/db.ts` 的 `createDb()` 创建 Kysely，再传给站点或路由；迁移放 `src/db/migrations/*.sql`，运行 `bun run typegen` 更新 `src/db/types.ts`。PGlite 只用于测试库创建与 schema 漂移检查。

## 测试与交付

- 新行为先加测试：公开页缓存与 cookie、私有页 CSRF、静态资源缓存、运维端点。
- 行为基线的变更是有意的才运行 `bun run snapshot`；不要用它掩盖回归。
- `bun run check` 必须全绿；`bun run smoke` 必须能解析真实 HTML 并访问所有资源。
- 交付时给出运行方式、路由映射、桌面/移动对比截图、实际执行的检查，以及剩余差异。

## 版本控制

仓库使用 jj 工作流，详见 `docs/JJ.md`。不要创建 git 分支或提交，除非用户明确要求。
