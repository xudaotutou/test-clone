import { ASSET_VERSIONS } from './asset-versions.ts'

/**
 * 静态资源的唯一 URL 出口。
 *
 * `public/_headers` 给 `/static/*` 与 `/sites/*` 设置了 immutable，
 * 所以文件名固定时必须靠 `?v=<内容哈希>` 区分版本。
 */
export const assetUrl = (path: string): string => {
  const version = ASSET_VERSIONS[path]
  return version ? `${path}?v=${version}` : path
}

export const assetVersions = (): Readonly<Record<string, string>> => ASSET_VERSIONS
