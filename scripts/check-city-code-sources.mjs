import { cityPages } from '../src/city-pages/city-page.data.mjs';

const urls = new Set();

for (const city of cityPages.filter((record) => record.enabled && record.codeProfile)) {
  const profile = city.codeProfile;
  for (const value of [profile.authority.buildingDepartmentUrl, profile.authority.permitPortalUrl, profile.authority.codeAdoptionUrl]) {
    if (value) urls.add(value);
  }
  for (const collection of [profile.adoptedCodes, profile.amendments, profile.localDesignCriteria, profile.commonSubmissionItems]) {
    for (const item of collection || []) if (item.sourceUrl) urls.add(item.sourceUrl);
  }
}

let warnings = 0;

for (const url of urls) {
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15_000), headers: { 'user-agent': 'TimpsonDraftingSourceReview/1.0' } });
    if (response.ok) {
      console.log(`SOURCE OK ${response.status} ${url}`);
    } else if (response.status === 403 && new URL(url).hostname === 'codelibrary.amlegal.com') {
      warnings += 1;
      console.warn(`SOURCE MANUAL REVIEW ${response.status} ${url} (publisher blocks automated checks)`);
    } else {
      warnings += 1;
      console.warn(`SOURCE WARNING ${response.status} ${url}`);
    }
  } catch (error) {
    warnings += 1;
    console.warn(`SOURCE WARNING ${url} (${error.message})`);
  }
}

console.log(`Checked ${urls.size} unique code-profile sources with ${warnings} warning${warnings === 1 ? '' : 's'}.`);
