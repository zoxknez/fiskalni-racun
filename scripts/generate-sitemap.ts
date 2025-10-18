/**
 * Generate sitemap.xml
 *
 * Automatically creates sitemap with all routes
 *
 * @usage npm run sitemap
 */

import { writeFileSync } from 'fs'
import { resolve } from 'path'

interface SitemapURL {
  loc: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

const SITE_URL = 'https://fiskalni.app'

const staticPages: SitemapURL[] = [
  {
    loc: '/',
    changefreq: 'daily',
    priority: 1.0,
  },
  {
    loc: '/receipts',
    changefreq: 'daily',
    priority: 0.9,
  },
  {
    loc: '/warranties',
    changefreq: 'daily',
    priority: 0.9,
  },
  {
    loc: '/add',
    changefreq: 'weekly',
    priority: 0.8,
  },
  {
    loc: '/search',
    changefreq: 'weekly',
    priority: 0.7,
  },
  {
    loc: '/analytics',
    changefreq: 'weekly',
    priority: 0.7,
  },
  {
    loc: '/profile',
    changefreq: 'monthly',
    priority: 0.5,
  },
  {
    loc: '/about',
    changefreq: 'monthly',
    priority: 0.4,
  },
  {
    loc: '/auth',
    changefreq: 'yearly',
    priority: 0.3,
    // noindex - auth pages shouldn't be in sitemap actually
  },
]

function generateSitemapXML(urls: SitemapURL[]): string {
  const urlEntries = urls
    .map((url) => {
      const lastmod = url.lastmod || new Date().toISOString().split('T')[0]

      return `
  <url>
    <loc>${SITE_URL}${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ''}
    ${url.priority ? `<priority>${url.priority}</priority>` : ''}
  </url>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urlEntries}
</urlset>`
}

function generateRobotsTxt(): string {
  return `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# Disallow admin and auth pages
Disallow: /admin
Disallow: /auth/callback

Sitemap: ${SITE_URL}/sitemap.xml`
}

function main() {
  try {
    // Generate sitemap.xml
    const sitemapXML = generateSitemapXML(staticPages)
    const sitemapPath = resolve(process.cwd(), 'public', 'sitemap.xml')
    writeFileSync(sitemapPath, sitemapXML, 'utf-8')
    console.log('✅ Sitemap generated:', sitemapPath)

    // Generate robots.txt
    const robotsTxt = generateRobotsTxt()
    const robotsPath = resolve(process.cwd(), 'public', 'robots.txt')
    writeFileSync(robotsPath, robotsTxt, 'utf-8')
    console.log('✅ robots.txt generated:', robotsPath)
  } catch (error) {
    console.error('❌ Failed to generate sitemap:', error)
    process.exit(1)
  }
}

main()
