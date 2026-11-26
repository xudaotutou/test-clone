import { html, type SafeHtml } from './html.ts'

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION_FAILED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details?: Record<string, unknown>

  constructor(code: ErrorCode, message: string, status = 400, details?: Record<string, unknown>) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.details = details
  }

  static unauthorized(message = '请先登录'): AppError {
    return new AppError('UNAUTHORIZED', message, 401)
  }

  static forbidden(message = '无权访问'): AppError {
    return new AppError('FORBIDDEN', message, 403)
  }

  static notFound(message = '资源不存在'): AppError {
    return new AppError('NOT_FOUND', message, 404)
  }

  static validation(message: string, details?: Record<string, unknown>): AppError {
    return new AppError('VALIDATION_FAILED', message, 422, details)
  }
}

/**
 * 错误 fragment。htmx 4 在 4xx/5xx 时也会 swap，所以绝不能返回 JSON 或裸文本。
 */
export const errorFragment = (message: string, code?: string): SafeHtml => {
  const safeCode = code?.replace(/[^a-zA-Z0-9_-]/g, '')
  return html.div(
    {
      class: 'alert',
      'data-variant': 'destructive',
      role: 'alert',
      ...(safeCode ? { 'data-error-code': safeCode } : {}),
    },
    message,
  )
}
