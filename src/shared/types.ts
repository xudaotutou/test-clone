export interface AppEnv {
  Variables: {
    /** 注入的时钟；业务逻辑不得直接读 Date.now()。 */
    now: () => number
    /** request-id 中间件写入，日志使用。 */
    requestId: string
  }
}
