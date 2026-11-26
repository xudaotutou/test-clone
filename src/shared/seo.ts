import { esc } from './html.ts'

const xml = (value: string): string => String(esc(value))

export interface SitemapEntry {
  path: string
  lastmod?: string
  changefreq?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  priority?: number
}

export const sitemapXml = (siteUrl: string, entries: readonly SitemapEntry[]): string => {
  const urls = entries
    .map((entry) => {
      const parts = [`<loc>${xml(`${siteUrl}${entry.path}`)}</loc>`]
      if (entry.lastmod) parts.push(`<lastmod>${xml(entry.lastmod)}</lastmod>`)
      if (entry.changefreq) parts.push(`<changefreq>${entry.changefreq}</changefreq>`)
      if (entry.priority !== undefined) {
        parts.push(`<priority>${entry.priority.toFixed(1)}</priority>`)
      }
      return `  <url>${parts.join('')}</url>`
    })
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n')
}

export interface RobotsOptions {
  disallow?: string[]
}

export const robotsTxt = (siteUrl: string, options: RobotsOptions = {}): string => {
  const disallow = options.disallow ?? ['/fragments/', '/demo']
  return [
    'User-agent: *',
    ...disallow.map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n')
}
