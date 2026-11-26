---
name: ui-kit
description: Basecoat 组件层 —— 本模板的 UI 样式来源。用于按钮/卡片/表单/徽章/提示条的编写与审查，以及「样式为什么没生效」的排错。
---

# Basecoat 速查

CSS-only 组件库（`basecoat-css@1.2.1`，精确版本），编译进
`public/static/app.css`。没有 JS 运行时：交互归 htmx / 原生元素，局部状态归 Alpine。

## 四条最容易错的事

1. **变体是 `data-*`，不是 class**

   ```ts
   html.button({ class: 'btn', 'data-variant': 'outline', 'data-size': 'sm' }, '取消') // ✅
   html.button({ class: 'btn btn-outline' }, '取消')                                  // ❌ 静默无样式
   ```

   `.btn-primary` 这个选择器不存在。写错不报错、页面 200、DOM 也对，只是没样式。

2. **只引 `components/*.css` 会得到「有布局没颜色」**
   结构在 `components/`，颜色/圆角/尺寸在 `styles/vega.css`。三层都要：
   `base/base.css`（token）→ `components/*.css`（结构）→ `styles/vega.css`（外观）。

3. **基础层有全局副作用**
   `* { border-color: var(--border) }`、`body { bg-background text-foreground }`。
   所以 `<body>` 不要再写 `bg-gray-50`；要底色就改 token。

4. **Tailwind 必须 `source(none)` + 显式 `@source`**
   `src/styles/app.css` 使用 `@import 'tailwindcss' source(none)`，只扫描
   `src/**/*.ts` 与 `islands/**/*.js`。不要打开全仓扫描，否则
   `tests/baseline.jsonl` 会反过来影响 CSS 哈希，形成构建循环。

## 组件

当前入口已引入 button、card、alert、badge、input、label、field，以及 vega 外观层。

| 组件 | class | 变体 / 尺寸 |
| --- | --- | --- |
| 按钮 | `.btn` | `data-variant`: primary（默认）、secondary、outline、ghost、link、destructive<br>`data-size`: xs、sm、default、lg、icon、icon-xs、icon-sm、icon-lg |
| 提示条 | `.alert` | `data-variant="destructive"`；子元素：`<strong>` 标题、`<section>` 正文、`<footer>` 动作 |
| 卡片 | `.card` | `data-size="sm"`；子元素用 `<header>` / `<section>` / `<footer>` |
| 徽章 | `.badge` | 同 `.btn` 的 variant，没有 size |
| 输入框 | `.input` | 必须带 `type`；放在 `.field` 里时不写 class |
| 表单 | `.field` | 子元素：`<label>` / `<input>` / `<p>` / `p.field-error` |

```ts
html.div(
  { class: 'card' },
  html.header(html.h2('本月订单')),
  html.section(html.p({ class: 'text-muted-foreground' }, '共 12 条')),
  html.footer(html.a({ href: '/orders', class: 'btn', 'data-variant': 'outline' }, '查看')),
)
```

## 表单

本模板还没有 `src/shared/form.ts`。直接写 `.field` 结构：

```ts
html.div(
  { class: 'field', 'data-invalid': 'true' },
  html.label({ for: 'email' }, '邮箱'),
  html.input({ id: 'email', name: 'email', type: 'email', value }),
  html.p('我们只用来发送登录链接。'),
  html.p({ class: 'field-error' }, '请输入有效邮箱'),
)
```

不能删的细节：

| 细节 | 不写会怎样 |
| --- | --- |
| `.field` 上的 `data-invalid="true"` | label 和错误文案不变红 |
| 错误 `<p>` 的 class 是 `field-error` | 样式依赖 `.field > .field-error`，否则被 Basecoat 的 `.field > p` 染成灰色 |
| `hx-target="closest form"` + `hx-swap="outerHTML"` | 字段错误、回填值、aria 属性要一起更新 |

## 颜色 / 间距用 token

| token（utility） | 用途 |
| --- | --- |
| `bg-background` / `text-foreground` | 页面底 / 正文（body 已默认） |
| `bg-card` / `text-card-foreground` | 卡片、弹层 |
| `bg-primary` / `text-primary-foreground` | 主按钮、强调 |
| `bg-muted` / `text-muted-foreground` | 次级底、说明文字（替代 `text-gray-500`） |
| `border-border` | 分割线 |
| `text-destructive` | 错误文案 |

品牌色 `brand-50/100/500/600/700` 仍然可用（`@theme` 里定义），但新代码优先用语义 token。

## 字体

Geist 自托管在 `public/static/fonts/`，文件名带内容哈希，只含 latin / latin-ext；
中文回落到 `--font-sans` 的系统字体。文件在 `src/styles/app.css` 的 `@font-face` 引用。

换字体必须换文件名：`/static/*` 是 immutable 强缓存，文件名不变 = 老用户一年看不到新字体。

## 加/删组件

```css
/* src/styles/app.css —— 用哪个引哪个，不要全量 import */
@import 'basecoat-css/components/dialog.css';
```

改完运行 `bun run build`（会刷新 `src/shared/asset-versions.ts`），再运行 `bun test`。
当前没有专门的 `tests/ui-kit.test.ts`；新增 UI 约定时再补对应测试。

## 不要做

| 禁止 | 原因 |
| --- | --- |
| `@import 'basecoat-css'`（全量） | 体积大，且大多组件用不到 |
| 引 `basecoat-css/all`（JS） | `MutationObserver` 会与 Alpine 争节点 |
| 抄 `templates/nunjucks|jinja/` | 绕过 `src/shared/html.ts` 的自动转义 |
| `class="btn btn-primary"` | 变体是 `data-variant` |
| 手写 `rounded border px-3 py-2 text-sm` 做按钮 | 会与 token 脱节 |
