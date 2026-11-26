#!/usr/bin/env bun
/**
 * 可选数据库类型生成器。
 *
 * 没有迁移时输出空 `DB`，保证默认模板无需数据库也能通过 typecheck。
 */

import { PGlite } from '@electric-sql/pglite'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const MIGRATIONS_DIR = 'src/db/migrations'
const OUT_FILE = 'src/db/types.ts'

const files = (await readdir(MIGRATIONS_DIR))
  .filter((file) => file.endsWith('.sql') && !file.endsWith('.down.sql'))
  .sort()

if (files.length === 0) {
  await writeFile(
    OUT_FILE,
    `/**
 * 默认数据库类型为空。
 *
 * 第一次接业务数据时：
 *   1. 在 src/db/migrations/ 添加 \`.sql\`
 *   2. 执行 bun run typegen
 *   3. review 生成结果并提交
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DB {}
`,
    'utf8',
  )
  console.log(`✔ 没有迁移文件，已生成空 ${OUT_FILE}`)
  process.exit(0)
}

let sql = ''
for (const file of files) {
  sql += (await readFile(join(MIGRATIONS_DIR, file), 'utf8')) + '\n'
}

const comments = new Map()
for (const match of sql.matchAll(
  /COMMENT\s+ON\s+COLUMN\s+(\w+)\.(\w+)\s+IS\s+'((?:[^']|'')*)'/gi,
)) {
  comments.set(
    `${match[1].toLowerCase()}.${match[2].toLowerCase()}`,
    match[3].replace(/''/g, "'"),
  )
}

const tableComments = new Map()
for (const match of sql.matchAll(
  /COMMENT\s+ON\s+TABLE\s+(\w+)\s+IS\s+'((?:[^']|'')*)'/gi,
)) {
  tableComments.set(match[1].toLowerCase(), match[2].replace(/''/g, "'"))
}

const pglite = new PGlite()
await pglite.exec(sql)

const { rows } = await pglite.query(`
  SELECT c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable, c.column_default
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_name = c.table_name AND t.table_schema = c.table_schema
  WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  ORDER BY c.table_name, c.ordinal_position
`)

const { rows: enumRows } = await pglite.query(`
  SELECT t.typname, string_agg(e.enumlabel, '|' ORDER BY e.enumsortorder) AS labels
  FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
  GROUP BY t.typname
`)
await pglite.close()

const enums = new Map(enumRows.map((row) => [row.typname, row.labels.split('|')]))

const tsType = (dataType, nullable) => {
  const base = (() => {
    if (['int2', 'int4', 'int8', 'smallint', 'integer', 'bigint'].includes(dataType)) return 'number'
    if (['float4', 'float8', 'numeric', 'double precision', 'real'].includes(dataType)) return 'number'
    if (['bool', 'boolean'].includes(dataType)) return 'boolean'
    if (['text', 'varchar', 'character varying', 'uuid', 'date', 'char'].includes(dataType)) return 'string'
    if (['timestamp', 'timestamptz', 'timestamp with time zone', 'timestamp without time zone'].includes(dataType)) return 'Date'
    if (['json', 'jsonb'].includes(dataType)) return 'unknown'
    if (dataType === 'bytea') return 'Buffer'
    return 'unknown'
  })()
  return nullable ? `${base} | null` : base
}

const tables = new Map()
for (const row of rows) {
  if (!tables.has(row.table_name)) tables.set(row.table_name, [])
  tables.get(row.table_name).push(row)
}

const lines = [
  '// ⚠️ 本文件由 scripts/typegen.mjs 生成 —— 请勿手工编辑',
  '// 生成后必须人工 review 并提交进仓库',
  '',
  "import type { ColumnType, Selectable, Insertable, Updateable } from 'kysely'",
  '',
  '/** 有默认值的列：插入时可选，更新时可选，读取时一定存在 */',
  'export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>',
  '  ? ColumnType<S, I | undefined, U>',
  '  : ColumnType<T, T | undefined, T>',
  '',
]

for (const [name, labels] of enums) {
  lines.push(`export type ${name} = ${labels.map((label) => `'${label}'`).join(' | ')}`)
}
if (enums.size > 0) lines.push('')

for (const [table, columns] of tables) {
  const tableComment = tableComments.get(table)
  if (tableComment) lines.push(`/** ${tableComment} */`)
  lines.push(`export interface ${table} {`)
  for (const column of columns) {
    const comment = comments.get(`${table}.${column.column_name}`)
    if (comment) lines.push(`  /** ${comment} */`)
    const type = enums.has(column.udt_name)
      ? column.udt_name.toLowerCase()
      : tsType(column.data_type, column.is_nullable === 'YES')
    lines.push(
      `  ${column.column_name}: ${column.column_default ? `Generated<${type}>` : type}`,
    )
  }
  lines.push('}')
  lines.push('')
}

lines.push('export interface DB {')
for (const table of tables.keys()) lines.push(`  ${table}: ${table}`)
lines.push('}', '')

const singular = (name) => {
  const base = name.endsWith('ies')
    ? name.slice(0, -3) + 'y'
    : name.endsWith('ses')
      ? name.slice(0, -2)
      : name.endsWith('s')
        ? name.slice(0, -1)
        : name
  return base.charAt(0).toUpperCase() + base.slice(1)
}

for (const table of tables.keys()) {
  const name = singular(table)
  lines.push(`export type ${name}Row = Selectable<DB['${table}']>`)
  lines.push(`export type ${name}Insert = Insertable<DB['${table}']>`)
  lines.push(`export type ${name}Update = Updateable<DB['${table}']>`)
}

lines.push('', 'export type { Selectable, Insertable, Updateable }')

await writeFile(OUT_FILE, lines.join('\n'), 'utf8')
console.log(`✔ 已生成 ${OUT_FILE}`)
