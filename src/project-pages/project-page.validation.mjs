const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PLACEHOLDER = /(owner_or_team|yyyy-mm-dd|placeholder|lorem ipsum)/i;
const EDITORIAL_MARKER = /\b(?:TODO|TBD|VERIFY)\b/;

export function validateProjectProfiles(records) {
  const errors = [];
  const warnings = [];
  const approved = records.filter((record) => record.enabled);
  const slugs = new Set();

  for (const record of records) {
    const label = record.slug || record.title || 'Unknown project';
    if (!record.slug || !SLUG.test(record.slug)) errors.push(`${label}: invalid slug`);
    if (slugs.has(record.slug)) errors.push(`${label}: duplicate slug`);
    slugs.add(record.slug);
    if (!record.enabled) continue;

    if (record.editorialApproved !== true) errors.push(`${label}: enabled project lacks editorial approval`);
    if (!record.clientMediaApproved) errors.push(`${label}: media publication permission is required`);
    if (!isValidDate(record.reviewedDate)) errors.push(`${label}: invalid reviewedDate`);
    for (const field of ['title', 'projectType', 'locationLabel', 'summary', 'challenge', 'approach', 'result']) {
      if (!record[field]) errors.push(`${label}: missing ${field}`);
    }
    if (!(record.deliverables || []).length) errors.push(`${label}: no deliverables`);
    if (!(record.images || []).length) errors.push(`${label}: no approved images`);
    for (const [index, image] of (record.images || []).entries()) {
      if (!image.src?.startsWith('/') || !image.alt || image.approved !== true) {
        errors.push(`${label}: incomplete or unapproved image at index ${index}`);
      }
    }
    if (record.testimonial && (!record.testimonial.text || !record.testimonial.attribution || record.testimonial.approved !== true)) {
      errors.push(`${label}: testimonial is incomplete or lacks approval`);
    }
    const serialized = JSON.stringify(record);
    if (PLACEHOLDER.test(serialized) || EDITORIAL_MARKER.test(serialized)) errors.push(`${label}: placeholder content`);
    if (!(record.measurementContext || '').trim()) warnings.push(`${label}: no measurement context`);
  }

  return { approved, errors, warnings };
}

function isValidDate(value) {
  if (!DATE.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
