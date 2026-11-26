import { html } from '../../../shared/html.ts'
import { brandMark } from '../components/brand-mark.ts'
import { siteFooter } from '../components/site-footer.ts'

export const demoPage = () =>
  html.div(
    { class: 'starter-page' },
    html.header(
      { class: 'starter-nav' },
      html.a({ class: 'starter-brand', href: '/' }, brandMark(), html.span('AI Website Cloner')),
      html.a(
        { class: 'btn', 'data-variant': 'ghost', 'data-size': 'sm', href: '/' },
        '返回首页',
      ),
    ),
    html.main(
      { class: 'starter-main starter-demo' },
      html.section(
        { class: 'starter-demo-head' },
        html.p({ class: 'starter-kicker' }, 'PRIVATE PAGE'),
        html.h1('一个真实的表单往返'),
        html.p(
          '这个页面明确选择 no-store，并为匿名会话签发 CSRF token。提交时不返回 JSON，而是用 HTML fragment 替换结果区域。',
        ),
      ),
      html.form(
        {
          class: 'card starter-demo-form',
          method: 'post',
          action: '/fragments/echo',
          'hx-post': '/fragments/echo',
          'hx-target': '#echo-result',
          'hx-swap': 'innerHTML',
        },
        html.div(
          { class: 'field' },
          html.label({ for: 'message' }, '写一句要回显的话'),
          html.input({
            id: 'message',
            name: 'message',
            type: 'text',
            maxlength: '200',
            placeholder: '例如：先测量，再还原。',
            required: true,
            autocomplete: 'off',
          }),
          html.p('最多 200 个字符。内容会被服务端自动转义。'),
        ),
        html.div(
          { class: 'starter-form-actions' },
          html.button({ type: 'submit', class: 'btn' }, '发送到服务端'),
          html.a(
            { class: 'btn', 'data-variant': 'ghost', href: '/' },
            '取消',
          ),
        ),
        html.div(
          { id: 'echo-result', class: 'starter-fragment-slot', 'aria-live': 'polite' },
          '等待输入',
        ),
      ),
      html.div(
        { class: 'alert starter-note' },
        html.strong('缓存分类不是装饰。'),
        html.span(
          '公开页必须逐字节一致；只要出现会话、表单或用户数据，就默认不缓存。',
        ),
      ),
    ),
    siteFooter(),
  )
