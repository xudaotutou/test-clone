#!/usr/bin/env bun
/**
 * 生成静态资源内容哈希。
 *
 * 同时扫描 `public/static/**` 与 `public/sites/**`，输出统一清单。
 * URL 使用内容哈希后，`immutable` 才是安全的。
 */

const ROOTS = ['public/static/**/*', 'public/sites/**/*']
const OUT_FILE = 'src/shared/asset-versions.ts'
const SKIP = [/\.md$/i, /\.map$/i, /^README/i, /\.DS_Store$/]

const urlPathOf = (file) => '/' + file.replaceAll('\\', '/').replace(/^public\//, '')

const hashOf = async (file) =>
  new Bun.CryptoHasher('sha256')
    .update(await Bun.file(file).arrayBuffer())
    .digest('hex')
    .slice(0, 8)

const files = [
  ...new Set(
    ROOTS.flatMap((pattern) =>
      [...new Bun.Glob(pattern).scanSync({ cwd: '.', onlyFiles: true })].filter(
        (file) => !SKIP.some((skip) => skip.test(file)),
      ),
    ),
  ),
].sort((left, right) => urlPathOf(left).localeCompare(urlPathOf(right)))

if (files.length === 0) {
  console.error('没有找到任何静态资源。')
  process.exit(1)
}

const entries = []
for (const file of files) {
  entries.push({ file, path: urlPathOf(file), hash: await hashOf(file) })
}

const record = entries.map((entry) => `  '${entry.path}': '${entry.hash}',`)
const source = `/**
 * ⚠️ 生成文件，不要手改 —— \`bun run assets:hash\` 产出。
 *
 * 静态资源配置表：URL 路径 → 内容哈希（sha256 前 8 位）。
 * 页面必须通过 \`assetUrl()\` 引用资源。
 */

export const ASSET_VERSIONS: Readonly<Record<string, string>> = {
${record.join('\n')}
}
`

const previous = (await Bun.file(OUT_FILE).exists()) ? await Bun.file(OUT_FILE).text() : ''
if (previous !== source) {
  await Bun.write(OUT_FILE, source)
  console.log(`✔ 已更新 ${OUT_FILE}（${files.length} 个资源）`)
} else {
  console.log(`✔ ${OUT_FILE} 无变化（${files.length} 个资源）`)
}

for (const entry of entries) {
  console.log(`  ${entry.path}?v=${entry.hash}`)
}
