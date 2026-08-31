import { SITE } from '@/contracts'
import { absoluteUrl, SITE_URL } from './seo'
import type { Branch, Product, Post, Job } from './api'

/**
 * Structured data builders.
 *
 * Rich results are the cheapest visibility win available to a local financial
 * institution: LocalBusiness puts opening hours in the SERP, JobPosting feeds
 * Google Jobs, FAQPage can win an answer box.
 */

const DAY_SCHEMA = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function organizationLd(settings: Record<string, unknown> = {}) {
  const site = (settings.site ?? {}) as Record<string, string>
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'FinancialService'],
    '@id': `${SITE_URL}/#organization`,
    name: SITE.shortName,
    legalName: SITE.legalName,
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: absoluteUrl('/logo.png'), width: 512, height: 512 },
    description: site.description ?? SITE.description,
    foundingDate: SITE.foundedAt,
    email: site.email || undefined,
    telephone: site.phone || undefined,
    areaServed: SITE.areaServed.map((name) => ({ '@type': 'AdministrativeArea', name })),
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Jl. Pering Sari, Br. Siladumi, Desa Peringsari',
      addressLocality: 'Selat',
      addressRegion: 'Bali',
      addressCountry: 'ID',
    },
    identifier: SITE.legal.map((l) => ({ '@type': 'PropertyValue', name: l.label, value: l.value })),
    knowsLanguage: ['id-ID'],
  }
}

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE.shortName,
    inLanguage: 'id-ID',
    publisher: { '@id': `${SITE_URL}/#organization` },
  }
}

export function localBusinessLd(branch: Branch) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FinancialService',
    '@id': absoluteUrl(`/lokasi/${branch.slug}#business`),
    name: `${SITE.shortName} — ${branch.name}`,
    parentOrganization: { '@id': `${SITE_URL}/#organization` },
    url: absoluteUrl(`/lokasi/${branch.slug}`),
    telephone: branch.phone ?? undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: branch.address,
      addressLocality: branch.district ?? branch.regency,
      addressRegion: branch.province,
      postalCode: (branch as unknown as { postalCode?: string }).postalCode || undefined,
      addressCountry: 'ID',
    },
    geo: { '@type': 'GeoCoordinates', latitude: branch.latitude, longitude: branch.longitude },
    // Written as structured hours, not free text — the audit found opening hours
    // were missing entirely from the old contact page.
    openingHoursSpecification: branch.hours
      .filter((h) => h.opensAt && h.closesAt)
      .map((h) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${DAY_SCHEMA[h.day]}`,
        opens: h.opensAt,
        closes: h.closesAt,
      })),
    currenciesAccepted: 'IDR',
    priceRange: 'Rp',
    areaServed: { '@type': 'AdministrativeArea', name: branch.regency },
  }
}

export function productLd(product: Product) {
  const isLoan = product.category === 'pinjaman'
  return {
    '@context': 'https://schema.org',
    '@type': isLoan ? 'LoanOrCredit' : 'BankAccount',
    '@id': absoluteUrl(`/produk/${product.category}/${product.slug}#product`),
    name: product.name,
    description: product.summary ?? product.tagline ?? undefined,
    url: absoluteUrl(`/produk/${product.category}/${product.slug}`),
    provider: { '@id': `${SITE_URL}/#organization` },
    ...(isLoan && product.ratePercent != null
      ? {
          annualPercentageRate: { '@type': 'QuantitativeValue', value: product.ratePercent, unitText: 'PERCENT' },
          amount: product.minAmount != null && product.maxAmount != null
            ? { '@type': 'MonetaryAmount', currency: 'IDR', minValue: product.minAmount, maxValue: product.maxAmount }
            : undefined,
          loanTerm: product.tenorOptions.length
            ? { '@type': 'QuantitativeValue', minValue: Math.min(...product.tenorOptions), maxValue: Math.max(...product.tenorOptions), unitCode: 'MON' }
            : undefined,
        }
      : {}),
    ...(!isLoan && product.ratePercent != null
      ? { interestRate: { '@type': 'QuantitativeValue', value: product.ratePercent, unitText: 'PERCENT' } }
      : {}),
    areaServed: { '@type': 'AdministrativeArea', name: 'Karangasem' },
  }
}

export function articleLd(post: Post) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    '@id': absoluteUrl(`/berita/${post.slug}#article`),
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.coverImage ? [post.coverImage] : undefined,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.publishedAt ?? undefined,
    inLanguage: 'id-ID',
    author: { '@id': `${SITE_URL}/#organization` },
    publisher: { '@id': `${SITE_URL}/#organization` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(`/berita/${post.slug}`) },
    articleSection: post.categoryName ?? undefined,
  }
}

export function jobPostingLd(job: Job) {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description ?? `<p>${job.requirements.join('. ')}</p>`,
    datePosted: job.createdAt,
    validThrough: job.closesAt ?? undefined,
    employmentType: job.employmentType.toUpperCase(),
    hiringOrganization: { '@id': `${SITE_URL}/#organization` },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: job.branchAddress ?? job.location ?? 'Karangasem',
        addressLocality: job.location ?? 'Karangasem',
        addressRegion: 'Bali',
        addressCountry: 'ID',
      },
    },
    directApply: true,
  }
}

export function faqLd(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.question,
      acceptedAnswer: { '@type': 'Answer', text: i.answer.replace(/<[^>]*>/g, '') },
    })),
  }
}

export function breadcrumbLd(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function itemListLd(items: { name: string; path: string }[], name: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, url: absoluteUrl(item.path) })),
  }
}
