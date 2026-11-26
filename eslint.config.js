import js from '@eslint/js'
import tseslint from 'typescript-eslint'

/**
 * ESLint 是模板的机械约束层。
 *
 * 能写成规则的约束不要只写进 AGENTS.md：
 *   - 禁止 React / Next / shadcn 回潮
 *   - 禁止 `hono/jsx` 和 `hono/html` 标签（与 SafeHtml 不兼容）
 *   - 禁止未转义的 HTML 模板插值
 *   - 禁止裸 JSON 解析和业务逻辑里的 `Date.now()`
 *   - 禁止 htmx 2 语法和 Basecoat 的假变体 class
 */
export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'public/**',
      '.wrangler/**',
      '.dryrun/**',
      'dist/**',
      'islands/**',
      'tests/baseline.jsonl',
      'eslint.config.js',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        Bun: 'readonly',
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        crypto: 'readonly',
        performance: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },

  {
    files: ['src/**/*.ts', 'worker/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        crypto: 'readonly',
        performance: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      'no-console': ['warn', { allow: ['warn', 'error', 'log', 'info'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },

  {
    files: ['src/**/*.ts', 'worker/**/*.ts', 'tests/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'next', 'next/*'],
              message: '本模板已迁移到 Hono + htmx；不要重新引入 React / Next.js。',
            },
            {
              group: ['@base-ui/*', 'lucide-react', 'shadcn', 'shadcn/*'],
              message: 'UI 底座是 Basecoat CSS；图标优先使用站点自己的 SVG 资产。',
            },
            {
              group: ['hono/jsx', 'hono/html'],
              message: '不要使用 JSX 或 hono/html 标签；请使用 src/shared/html.ts 的 html.* / htmlText。',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['src/**/*.ts'],
    ignores: ['src/shared/logger.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.property.name='req'][callee.property.name='json']",
          message: '禁止 c.req.json()。表单交互请用 c.req.parseBody() 并做显式校验。',
        },
        {
          selector: "CallExpression[callee.name='Date'][callee.property.name='now']",
          message: '业务代码不要直接调用 Date.now()；需要时钟时使用 createApp({ now })。',
        },
        {
          selector: "Literal[value=/hx-vars(=|\\s|>)/]",
          message: 'htmx 4: hx-vars 已移除，请改用 hx-vals="js:{...}"。',
        },
        {
          selector: "Literal[value=/class=.{0,80}btn-(primary|secondary|outline|ghost|sm)/]",
          message: 'Basecoat 变体不是 class。请写 class="btn" data-variant="..." data-size="..."。',
        },
        {
          selector:
            "TemplateLiteral:has(TemplateElement[value.raw=/</])[parent.type!='TaggedTemplateExpression'] > Identifier",
          message:
            'HTML 模板插值必须走 htmlText`...` / html.*；原始字符串插值会被 XSS 规则拦下。',
        },
        {
          selector:
            "BinaryExpression[operator=/^[!=]==?$/][left.type='CallExpression'][left.callee.name=/^(esc|escAttr|safeHtml|raw|htmlText)$/]",
          message:
            'esc()/html.* 返回带 isEscaped 标记的 String 对象；需要比较时先 String(...)。',
        },
      ],
    },
  },

  {
    files: ['worker/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
)
