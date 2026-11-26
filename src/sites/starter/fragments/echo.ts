import { z } from 'zod'
import { errorFragment } from '../../../shared/errors.ts'
import { html } from '../../../shared/html.ts'

const EchoBody = z.object({
  message: z
    .string()
    .trim()
    .min(1, '请先写一句话')
    .max(200, '最多 200 个字符'),
})

export const echoFragment = (body: Record<string, unknown>) => {
  const parsed = EchoBody.safeParse({ message: body.message })
  if (!parsed.success) {
    return {
      status: 422 as const,
      body: errorFragment(parsed.error.issues[0]?.message ?? '输入不合法', 'VALIDATION_FAILED'),
    }
  }

  return {
    status: 200 as const,
    body: html.div(
      { class: 'alert starter-echo-result' },
      html.strong('服务端收到'),
      html.span(parsed.data.message),
    ),
  }
}
