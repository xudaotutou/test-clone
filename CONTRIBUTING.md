# 贡献指南

感谢改进 **AI Website Cloner Template**。本仓库是模板；如果你只是想克隆某个网站，请先创建自己的副本，不要向模板仓库提交目标站点的业务代码。

## 可以贡献什么

- 改进 `.agents/skills/clone-website/`：抽取方法、交互观察、Bun + Hono 实现与验收标准。
- 修复 Hono、htmx、Alpine、Basecoat 或 Tailwind 脚手架中的问题。
- 改进文档、测试、Docker、Workers 或 CI。
- 增加可复用的缓存、CSRF、HTML 安全或资源版本化实践。

较大的改动请先开 issue 对齐范围。

## 开发环境

需要 Bun 1.4.5 或更新的稳定版。

```bash
bun install --frozen-lockfile
bun run check
```

`bun run check` 会依次执行构建、类型检查、ESLint、文档检查、`bun test`、生成物一致性、行为基线与 HTML 冒烟。日常开发可用：

```bash
bun run dev
bun test
bun run smoke
```

## 源码归属

- 项目指令：`AGENTS.md`
- 规范克隆工作流：`.agents/skills/clone-website/SKILL.md`
- Claude Code 入口：`.claude/commands/clone-website.md`，必须保持为薄桥接
- 架构与缓存约定：`docs/ARCHITECTURE.md`
- jj 工作流：`docs/JJ.md`
- 已知问题：`docs/ISSUES.md`

直接编辑规范技能及其 references，没有生成或同步步骤。

## 提交前检查

1. 新行为必须有测试；缓存、cookie、CSRF 与静态资源尤其不能只靠目测。
2. HTML 只能通过 `src/shared/html.ts` 构造；不要用字符串拼接用户输入。
3. 新资源必须通过 `assetUrl()` 引用，并提交 `public/static/app.css` 与 `src/shared/asset-versions.ts`。
4. 只有确认行为变更是预期时才运行 `bun run snapshot`。
5. 运行 `bun run check`，确保全绿。
6. 保持改动聚焦；不要顺手重命名无关文件或覆盖他人的未完成工作。

## 版本控制

仓库使用 jj。用 `jj describe` 写当前变更说明，用 `jj new` 开始下一项工作，用 `jj bookmark` 管理书签。不要创建 git 分支，除非维护者明确要求。详见 `docs/JJ.md`。

## 问题

可以在 [Discord 社区](https://discord.gg/hrTSX5yTpB) 提问。安全问题请按 [SECURITY.md](SECURITY.md) 私下报告。
