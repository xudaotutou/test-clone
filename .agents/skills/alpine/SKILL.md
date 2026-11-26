---
name: alpine
description: Alpine.js —— 本模板的局部状态层。用于任何 x-data / x-model / x-show / x-for 的编写与审查。
---

# Alpine.js 速查（白名单模式）

⚠️ **Alpine 官方称依赖追踪功能 "unreliable"** —— 所以本模板只允许极小的子集。

## ✅ 允许（唯一可用的）

| 属性 | 用途 |
|---|---|
| `x-data` | 声明组件状态 |
| `x-show` | 显示/隐藏（保留 DOM） |
| `x-text` | 设置文本内容 |
| `x-html` | 设置 HTML（⚠️ 只放可信内容） |
| `x-bind` / `:attr` | 绑定属性 |
| `x-on` / `@event` | 事件处理 |
| `x-model` | 表单双向绑定 |
| `x-for` | 列表渲染 |
| `x-if` | 条件渲染 |
| `x-transition` | 过渡动画 |
| `x-ref` | DOM 引用 |

## ❌ 禁止（ESLint 会拦 / 官方不推荐）

| 禁止 | 原因 |
|---|---|
| `x-effect` | 依赖追踪 unreliable |
| `$watch` | 同上 |
| `$store` | 同上 |

## 边界规则（最重要）

**Alpine 只管表单内的瞬时状态。跨视图状态一律服务端。**

| 场景 | 归属 |
|---|---|
| 展开/收起、tab 切换、输入校验提示 | ✅ Alpine |
| 登录状态、购物车、分页、筛选结果 | ❌ 服务端（htmx） |
| 跨页面的数据同步 | ❌ 服务端 |

## 与 htmx 共存

**必须加载 `hx-alpine-compat` 扩展**（htmx 4 官方扩展）。本模板已在
`src/shared/layout.ts` 中通过 `assetUrl('/static/ext/hx-alpine-compat.js')` 加载，
新增页面不要重复引入，也不要手动写死文件名：

```html
<script src="/static/ext/hx-alpine-compat.js?v=<hash>" defer></script>
```

没有它，htmx 替换 DOM 后 Alpine 状态会丢失。

**⚠️ Alpine 与 htmx 不得操作同一份数据。** Alpine 管 DOM 状态，htmx 管服务端数据。

## 例子

```html
<!-- 表单内的瞬时状态 -->
<div x-data="{ open: false, count: 0 }">
  <button @click="open = !open">展开</button>
  <div x-show="open">内容</div>
  <button @click="count++">已选 <span x-text="count"></span></button>
</div>

<!-- 循环 -->
<ul>
  <template x-for="item in items" :key="item.id">
    <li x-text="item.name"></li>
  </template>
</ul>

<!-- 双向绑定 -->
<input x-model="keyword" @input.debounce.500ms="search()">
```

## ⚠️ htmx 4 注意

htmx 4 的继承必须显式：`<body hx-headers:inherited='{"X-CSRF-Token":"..."}'>`。
不要给静态 JSON 加 `js:` 前缀；本模板由 `src/shared/layout.ts` 直接输出 JSON。

Alpine 表达式在 htmx 替换的内容里会重新初始化（配合 hx-alpine-compat）。

## 参考

- 官方文档（npm `@alpinejs/docs` 含 57 个 md）
- 官方无 llms.txt —— 本 skill 是自建的精简版
