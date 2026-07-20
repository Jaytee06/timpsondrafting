import { approvedProjectIds, approvedTestimonialIds, supportedServiceSlugs } from './city-page.data.mjs';

const PLACEHOLDER = /(owner_or_team|yyyy-mm-dd|placeholder|add a verified|lorem ipsum)/i;
const EDITORIAL_MARKER = /\b(?:TODO|TBD|VERIFY)\b/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CODE_PROFILE_STATUSES = new Set(['verified', 'published-ordinance-needs-department-confirmation', 'needs-review', 'unavailable']);
const SUBMISSION_STATUSES = new Set(['commonly-requested', 'project-dependent', 'verified-required']);

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
    const serializedRecord = JSON.stringify(record);
    if (PLACEHOLDER.test(serializedRecord) || EDITORIAL_MARKER.test(serializedRecord)) errors.push(`${label}: placeholder content`);
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
    if (record.codeProfile) {
      const profile = record.codeProfile;
      if (!CODE_PROFILE_STATUSES.has(profile.status)) errors.push(`${label}: unapproved codeProfile status`);
      if (!isValidDate(profile.verifiedDate)) errors.push(`${label}: invalid codeProfile verifiedDate`);
      else if (monthsSince(profile.verifiedDate) >= 6) warnings.push(`${label}: code profile has not been reviewed in six months`);
      if (!profile.summary) errors.push(`${label}: missing codeProfile summary`);
      if (!profile.authority?.name) errors.push(`${label}: missing codeProfile authority name`);
      if (!profile.authority?.buildingDepartmentUrl) errors.push(`${label}: missing codeProfile building department URL`);
      validateHttps(profile.authority?.buildingDepartmentUrl, `${label}: invalid codeProfile building department URL`, errors);
      for (const [field, value] of [['permit portal', profile.authority?.permitPortalUrl], ['code-adoption', profile.authority?.codeAdoptionUrl]]) {
        if (value) validateHttps(value, `${label}: invalid ${field} URL`, errors);
      }
      if (!(profile.adoptedCodes || []).length) errors.push(`${label}: codeProfile has no adopted codes`);
      for (const [index, code] of (profile.adoptedCodes || []).entries()) {
        if (!code.family || !code.edition || !code.appliesTo || !code.sourceUrl || !code.sourceLabel) errors.push(`${label}: incomplete adopted code at index ${index}`);
        validateHttps(code.sourceUrl, `${label}: invalid adopted-code source URL`, errors);
      }
      for (const [index, amendment] of (profile.amendments || []).entries()) {
        if (!amendment.title || !amendment.summary || !amendment.sourceUrl) errors.push(`${label}: incomplete amendment at index ${index}`);
        validateHttps(amendment.sourceUrl, `${label}: invalid amendment source URL`, errors);
      }
      if (!(profile.amendments || []).length) warnings.push(`${label}: no amendment source exists`);
      for (const [index, item] of (profile.localDesignCriteria || []).entries()) {
        if (!item.label || !item.value || !item.sourceUrl) errors.push(`${label}: incomplete local design criterion at index ${index}`);
        validateHttps(item.sourceUrl, `${label}: invalid design-criterion source URL`, errors);
      }
      for (const [index, item] of (profile.commonSubmissionItems || []).entries()) {
        if (!item.item || !SUBMISSION_STATUSES.has(item.requiredStatus) || !item.sourceUrl) errors.push(`${label}: incomplete submission item at index ${index}`);
        validateHttps(item.sourceUrl, `${label}: invalid submission-item source URL`, errors);
      }
      if (profile.status === 'published-ordinance-needs-department-confirmation') warnings.push(`${label}: published ordinance requires department confirmation`);
    } else warnings.push(`${label}: no code profile`);
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

function validateHttps(value, message, errors) {
  try { const url = new URL(value); if (url.protocol !== 'https:') throw new Error(); } catch { errors.push(message); }
}

function isValidDate(value) {
  if (!DATE.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function monthsSince(value) {
  const reviewed = new Date(`${value}T00:00:00Z`);
  const now = new Date();
  return (now.getUTCFullYear() - reviewed.getUTCFullYear()) * 12 + now.getUTCMonth() - reviewed.getUTCMonth();
}

function tokens(record) {
  return new Set(`${record.introduction} ${record.localOverview} ${(record.faqs || []).map((faq) => faq.answer).join(' ')}`.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((word) => word.length > 4));
}
