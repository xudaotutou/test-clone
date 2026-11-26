import { html } from '../../../shared/html.ts'

export const siteFooter = () =>
  html.footer(
    { class: 'starter-footer' },
    html.p('Hono + htmx 4 + Alpine + Tailwind v4 + Basecoat'),
    html.p(
      { class: 'starter-footer-note' },
      '像素级还原是目标；每一次交互都应该有证据。',
    ),
  )
