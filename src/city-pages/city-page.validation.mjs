import { approvedProjectIds, approvedTestimonialIds, supportedServiceSlugs } from './city-page.data.mjs';

const PLACEHOLDER = /(owner_or_team|yyyy-mm-dd|todo|placeholder|add a verified|lorem ipsum)/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateCityPages(records, { strictEditorial = true } = {}) {
  const errors = [];
  const warnings = [];
  const enabled = records.filter((record) => record.enabled);
  const slugs = new Set();
  const canonicals = new Set();
  const titles = new Set();
  const descriptions = new Set();
  const enabledSlugs = new Set(enabled.map((record) => record.slug));

  for (const record of records) {
    if (!record.slug || !SLUG.test(record.slug)) errors.push(`${record.city || 'Unknown city'}: invalid slug`);
    if (slugs.has(record.slug)) errors.push(`${record.slug}: duplicate slug`);
    slugs.add(record.slug);
    if (!record.enabled) continue;

    const label = record.slug;
    for (const field of ['city', 'state', 'stateCode', 'region', 'introduction', 'localOverview', 'lastReviewed']) {
      if (!record[field]) errors.push(`${label}: missing ${field}`);
    }
    if (strictEditorial && record.editorialApproved !== true) errors.push(`${label}: enabled page lacks editorial approval`);
    if (!DATE.test(record.lastReviewed || '')) errors.push(`${label}: invalid lastReviewed`);
    if (PLACEHOLDER.test(JSON.stringify(record))) errors.push(`${label}: placeholder content`);
    const expectedCanonical = `https://timpsondrafting.com/${record.slug}/`;
    if (record.seo?.canonicalUrl !== expectedCanonical) errors.push(`${label}: canonical URL must be ${expectedCanonical}`);
    for (const [name, value, seen] of [['title', record.seo?.title, titles], ['description', record.seo?.description, descriptions], ['canonical', record.seo?.canonicalUrl, canonicals]]) {
      if (!value) errors.push(`${label}: missing SEO ${name}`);
      else if (seen.has(value)) errors.push(`${label}: duplicate SEO ${name}`);
      else seen.add(value);
    }
    if (!record.seo?.socialImage?.startsWith('https://')) errors.push(`${label}: social image must be absolute HTTPS`);
    if (!record.serviceAvailability?.onsiteSummary) errors.push(`${label}: missing onsite availability summary`);
    if (!record.featuredServiceSlugs?.length) errors.push(`${label}: no featured services`);
    for (const slug of record.featuredServiceSlugs || []) if (!supportedServiceSlugs.has(slug)) errors.push(`${label}: unsupported service ${slug}`);
    for (const id of record.projectIds || []) if (!approvedProjectIds.has(id)) errors.push(`${label}: invalid project ID ${id}`);
    for (const id of record.testimonialIds || []) if (!approvedTestimonialIds.has(id)) errors.push(`${label}: invalid testimonial ID ${id}`);
    if (record.jurisdiction) {
      try { const url = new URL(record.jurisdiction.url); if (url.protocol !== 'https:') throw new Error(); } catch { errors.push(`${label}: invalid jurisdiction URL`); }
      if (!DATE.test(record.jurisdiction.verifiedDate || '')) errors.push(`${label}: invalid jurisdiction verifiedDate`);
    } else warnings.push(`${label}: no jurisdiction information`);
    for (const nearby of record.nearbyCities || []) if (nearby.slug && !enabledSlugs.has(nearby.slug)) errors.push(`${label}: nearby link targets disabled or missing city ${nearby.slug}`);
    if ((record.localOverview || '').length < 220) warnings.push(`${label}: local overview may be too short`);
    if (!(record.faqs || []).length) warnings.push(`${label}: no unique FAQs`);
    if (!(record.projectIds || []).length) warnings.push(`${label}: no approved projects`);
    if (!(record.testimonialIds || []).length) warnings.push(`${label}: no approved testimonials`);
    if ((record.seo?.title || '').length < 45 || (record.seo?.title || '').length > 65) warnings.push(`${label}: title length is ${record.seo?.title?.length || 0}`);
    if ((record.seo?.description || '').length < 135 || (record.seo?.description || '').length > 165) warnings.push(`${label}: description length is ${record.seo?.description?.length || 0}`);
  }

  for (let i = 0; i < enabled.length; i += 1) for (let j = i + 1; j < enabled.length; j += 1) {
    const a = tokens(enabled[i]); const b = tokens(enabled[j]);
    const overlap = [...a].filter((token) => b.has(token)).length / Math.max(1, Math.min(a.size, b.size));
    if (overlap > 0.72) warnings.push(`${enabled[i].slug} / ${enabled[j].slug}: unusually high localized-content overlap (${Math.round(overlap * 100)}%)`);
  }
  return { enabled, errors, warnings };
}

function tokens(record) {
  return new Set(`${record.introduction} ${record.localOverview} ${(record.faqs || []).map((faq) => faq.answer).join(' ')}`.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((word) => word.length > 4));
}
