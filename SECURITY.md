# 安全政策

## 支持范围

本仓库是模板而不是版本化的库。安全修复进入 `master` 最新版本；由模板创建的项目不会自动收到更新，维护者需要自行审查并同步相关改动。

## 报告漏洞

请不要在公开 issue、pull request、discussion 或 Discord 中披露漏洞细节。

请使用 GitHub 的私密 [Report a vulnerability](https://github.com/JCodesMore/ai-website-cloner-template/security/advisories/new) 表单，并尽量提供：

- 漏洞描述与影响
- 受影响文件、依赖、配置或提交
- 复现步骤或最小 PoC
- 建议的缓解或修复方式

我们会在可行范围内尽快确认、调查，并在公开披露前与你协调。

如果私密表单不可用，可以在 [Discord 社区](https://discord.gg/hrTSX5yTpB) 仅向维护者询问私密联系方式，不要在那里发布漏洞细节。

## 范围

安全报告可以覆盖：

- `master` 上的 Bun + Hono 代码与依赖
- `scripts/` 下的构建、迁移、检查与辅助脚本
- 可能让生成项目不安全的仓库默认配置
- 会引入具体安全漏洞的 AI 代理指令

生成站点的业务代码、第三方服务、无关网站的漏洞，以及没有证明实际影响的自动审计输出，不在本项目范围内。

## 安全基线

- HTML 默认转义，只有显式 `raw()` 可以输出未转义内容。
- 私有页面使用 `no-store` 与 `Vary: Cookie`，写请求校验 Origin、Sec-Fetch-Site 与 CSRF token。
- 生产环境拒绝默认开发密钥；`SESSION_SECRET` 至少 32 字符。
- 静态资源只有真实文件才标记 `immutable`，缺失资源返回 404。
- 生产镜像以非 root 用户运行。

## 合理使用

本模板用于获得授权的开发、迁移、恢复与学习。禁止钓鱼、冒充、侵犯版权或违反目标站点条款。滥用举报不要在公开渠道附带敏感安全细节。
