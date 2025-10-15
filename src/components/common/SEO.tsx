/**
 * SEO Component - Dynamic Meta Tags
 *
 * Manages page-specific meta tags for better SEO
 *
 * @module components/common/SEO
 */

import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

interface SEOProps {
  title?: string
  description?: string
  image?: string
  type?: 'website' | 'article'
  noindex?: boolean
  keywords?: string[]
  author?: string
  publishedTime?: string
  modifiedTime?: string
}

const DEFAULT_TITLE = 'Fiskalni Račun - Evidencija računa i garancija'
const DEFAULT_DESCRIPTION =
  'Najbolja aplikacija za čuvanje fiskalnih računa i upravljanje garancijama. Potpuno besplatno, radi offline, bez reklama.'
const DEFAULT_IMAGE = 'https://fiskalni.app/og-image.png'
const SITE_URL = 'https://fiskalni.app'

/**
 * SEO component with dynamic meta tags
 *
 * @example
 * ```tsx
 * <SEO
 *   title="Moji računi"
 *   description="Pregled svih računa"
 *   image="/receipts-preview.png"
 * />
 * ```
 */
export function SEO({
  title,
  description,
  image,
  type = 'website',
  noindex = false,
  keywords,
  author,
  publishedTime,
  modifiedTime,
}: SEOProps) {
  const location = useLocation()
  const url = `${SITE_URL}${location.pathname}`

  const seo = {
    title: title ? `${title} | Fiskalni Račun` : DEFAULT_TITLE,
    description: description || DEFAULT_DESCRIPTION,
    image: image ? `${SITE_URL}${image}` : DEFAULT_IMAGE,
    url,
  }

  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <link rel="canonical" href={seo.url} />

      {/* Keywords */}
      {keywords && keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}

      {/* Author */}
      {author && <meta name="author" content={author} />}

      {/* Robots */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={seo.url} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:image" content={seo.image} />
      <meta property="og:locale" content="sr_RS" />
      <meta property="og:site_name" content="Fiskalni Račun" />

      {/* Article meta (if type is article) */}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={seo.url} />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={seo.image} />
    </Helmet>
  )
}

/**
 * Structured data - Organization
 */
export function OrganizationStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Fiskalni Račun',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    description: DEFAULT_DESCRIPTION,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@fiskalni.app',
    },
    sameAs: ['https://github.com/zoxknez/fiskalni-racun'],
  }

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  )
}

/**
 * Structured data - Breadcrumbs
 */
export function BreadcrumbsStructuredData({
  items,
}: {
  items: Array<{ name: string; url: string }>
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  }

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  )
}

/**
 * Structured data - Software Application
 */
export function SoftwareApplicationStructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Fiskalni Račun',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any (PWA)',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'RSD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
    },
    description: DEFAULT_DESCRIPTION,
    featureList: [
      'QR kod skeniranje',
      'OCR prepoznavanje',
      'Offline podrška',
      'Cloud sinhronizacija',
      'Upravljanje garancijama',
      'Push notifikacije',
    ],
  }

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  )
}
