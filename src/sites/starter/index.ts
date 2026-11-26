import type { SiteModule } from '../../shared/site.ts'
import { routes } from './routes.ts'

const starterSite = {
  app: routes,
  sitemap: [{ path: '/', changefreq: 'weekly', priority: 1 }],
} satisfies SiteModule

export default starterSite
