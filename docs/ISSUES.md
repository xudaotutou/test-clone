# 已知问题

<!-- ISSUES_SUMMARY total=3 -->

## 🔴 ISSUE-001 生产数据库连接池缺少启动探活

**状态**：🔴 待处理

`src/shared/db.ts` 在注入 `DATABASE_URL` 时直接创建 Kysely 实例，`/readyz` 只报告 `optional-not-probed`。数据库不可达时进程仍会启动，首个业务请求才失败。

建议：增加可选启动探活，并复用同一连接池。

## 🟡 ISSUE-002 真实浏览器视觉回归尚未自动化

**状态**：🟡 进行中

当前 `bun run smoke` 使用 happy-dom 解析 HTML，只能验证结构、资源与缓存，不能替代桌面/移动截图的像素比较。克隆站点仍需在真实浏览器中并排检查。

建议：为 Chromium 增加截图脚本，并把关键页面纳入 CI 的 artifact。

## 🟢 ISSUE-003 Workers 静态资源缓存需要部署验证

**状态**：🟢 已缓解

`wrangler.jsonc` 与 `public/_headers` 已声明 `/static/*`、`/sites/*` 的 immutable 规则；本地 dry-run 能验证打包，但不能完全证明线上边缘缓存行为。

建议：首次部署后对真实域名检查响应头。
