import { html } from '../../../shared/html.ts'
import { brandMark } from '../components/brand-mark.ts'
import { siteFooter } from '../components/site-footer.ts'

const stackItems = [
  {
    title: 'Hono 4.13',
    body: '显式路由、HTML fragment、Bun 与 Workers 共用同一份应用。',
  },
  {
    title: 'htmx 4 + Alpine',
    body: '服务端返回视图；局部状态留给 Alpine，复杂交互再用原生 ESM。',
  },
  {
    title: 'Tailwind v4 + Basecoat',
    body: 'CSS-first 设计令牌与组件样式；不把 React 组件库带回来。',
  },
] as const

const steps = [
  ['01', '观察', '抓真实内容、字体、图片、响应式与状态证据。'],
  ['02', '分类', '区分 CSS 动画、Alpine 状态、htmx fragment 与独立 island。'],
  ['03', '构建', '在 src/sites/<site>/ 内实现页面、组件与 fragment。'],
  ['04', '对照', '同视口同状态比较，修最大差异，最后跑完整 CI。'],
] as const

export const homePage = () =>
  html.div(
    { class: 'starter-page' },
    html.header(
      { class: 'starter-nav' },
      html.a({ class: 'starter-brand', href: '/' }, brandMark(), html.span('AI Website Cloner')),
      html.nav(
        { class: 'starter-nav-links', 'aria-label': '主导航' },
        html.a({ href: '#stack' }, '技术栈'),
        html.a({ href: '#workflow' }, '工作流'),
        html.a({ href: '/demo' }, '交互示例'),
        html.a(
          {
            href: 'https://github.com/JCodesMore/ai-website-cloner-template',
            target: '_blank',
            rel: 'noreferrer',
            class: 'btn',
            'data-variant': 'outline',
            'data-size': 'sm',
          },
          'GitHub',
        ),
      ),
    ),
    html.main(
      { class: 'starter-main' },
      html.section(
        { class: 'starter-hero' },
        html.div(
          { class: 'starter-hero-copy' },
          html.div(
            { class: 'starter-eyebrow' },
            html.span({ class: 'badge', 'data-variant': 'secondary' }, 'Hono + htmx 4'),
            html.span('为 AI agent 准备的网站反编译底座'),
          ),
          html.h1(
            { class: 'starter-title' },
            'Clone target',
            html.span({ class: 'starter-title-soft' }, 'not yet built.'),
          ),
          html.p(
            { class: 'starter-lede' },
            '这个模板已经迁移到无 React 的 Hono 技术栈。把目标 URL 交给 agent，先观察真实页面，再开始第一行代码。',
          ),
          html.div(
            { class: 'starter-command' },
            html.code('/clone-website https://example.com'),
            html.button(
              {
                type: 'button',
                class: 'btn',
                'data-variant': 'ghost',
                'data-size': 'sm',
                'x-data': '',
                '@click': "navigator.clipboard?.writeText('/clone-website https://example.com')",
              },
              '复制',
            ),
          ),
          html.div(
            { class: 'starter-actions' },
            html.a(
              { class: 'btn', 'data-size': 'lg', href: '/demo' },
              '查看交互示例',
            ),
            html.a(
              {
                class: 'btn',
                'data-variant': 'outline',
                'data-size': 'lg',
                href: '#stack',
              },
              '检查技术栈',
            ),
          ),
        ),
        html.aside(
          { class: 'starter-status-card' },
          html.div(
            { class: 'starter-status-head' },
            html.span('LIVE CHECK'),
            html.span({ class: 'starter-status-dot', 'aria-hidden': 'true' }),
          ),
          html.p(
            '这是一张由 Hono 生成的完整页面。点一下按钮，htmx 会取回一个 HTML fragment。',
          ),
          html.button(
            {
              type: 'button',
              class: 'btn',
              'data-variant': 'secondary',
              'hx-get': '/fragments/ready',
              'hx-target': '#fragment-status',
              'hx-swap': 'innerHTML',
            },
            '运行自检',
          ),
          html.div({ id: 'fragment-status', class: 'starter-fragment-slot' }, '尚未请求'),
        ),
      ),
      html.section(
        { id: 'stack', class: 'starter-section' },
        html.div(
          { class: 'starter-section-head' },
          html.p({ class: 'starter-kicker' }, 'STACK'),
          html.h2('更少的运行时，更清楚的边界'),
        ),
        html.div(
          { class: 'starter-grid' },
          ...stackItems.map((item, index) =>
            html.article(
              { class: 'card starter-card' },
              html.div({ class: 'starter-card-index' }, String(index + 1).padStart(2, '0')),
              html.h3(item.title),
              html.p(item.body),
            ),
          ),
        ),
        html.div(
          { class: 'starter-disclosure', 'x-data': '{ open: false }' },
          html.button(
            {
              type: 'button',
              class: 'starter-disclosure-trigger',
              '@click': 'open = !open',
              ':aria-expanded': 'open',
            },
            html.span('为什么不用 JSX？'),
            html.span({ class: 'starter-disclosure-icon', 'aria-hidden': 'true' }, '+'),
          ),
          html.div(
            {
              class: 'starter-disclosure-panel',
              'x-show': 'open',
              'x-cloak': '',
              'x-transition.opacity.duration.150ms': '',
            },
            html.p(
              '克隆站的布局、首屏和内容主要来自 HTML 与 CSS。把页面表达为显式路由和字符串模板，agent 更容易定位、替换、验证，也更少被框架运行时干扰。',
            ),
          ),
        ),
      ),
      html.section(
        { id: 'workflow', class: 'starter-section' },
        html.div(
          { class: 'starter-section-head' },
          html.p({ class: 'starter-kicker' }, 'WORKFLOW'),
          html.h2('先拿证据，再谈像素'),
        ),
        html.ol(
          { class: 'starter-steps' },
          ...steps.map(([number, title, body]) =>
            html.li(
              { class: 'starter-step' },
              html.span({ class: 'starter-step-number' }, number),
              html.div(html.h3(title), html.p(body)),
            ),
          ),
        ),
      ),
    ),
    siteFooter(),
  )
