import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { cityPages } from '../../src/city-pages/city-page.data.mjs';
import { validateCityPages } from '../../src/city-pages/city-page.validation.mjs';

const root = process.cwd();

test('production city records validate', () => {
  const result = validateCityPages(cityPages);
  assert.deepEqual(result.errors, []);
  assert.equal(result.enabled.length, 2);
});

test('duplicate slugs and canonicals fail', () => {
  const first = structuredClone(cityPages.find((city) => city.enabled));
  const duplicate = structuredClone(first);
  duplicate.city = 'Duplicate';
  const result = validateCityPages([first, duplicate], { strictEditorial: false });
  assert.ok(result.errors.some((error) => error.includes('duplicate slug')));
  assert.ok(result.errors.some((error) => error.includes('duplicate SEO canonical')));
});

test('placeholders and invalid relationships fail', () => {
  const record = structuredClone(cityPages.find((city) => city.enabled));
  record.localOverview = 'OWNER_OR_TEAM_MUST_VERIFY';
  record.featuredServiceSlugs = ['imaginary-service'];
  record.nearbyCities = [{ name: 'Missing', stateCode: 'UT', slug: 'missing-ut' }];
  const result = validateCityPages([record], { strictEditorial: false });
  assert.ok(result.errors.some((error) => error.includes('placeholder')));
  assert.ok(result.errors.some((error) => error.includes('unsupported service')));
  assert.ok(result.errors.some((error) => error.includes('nearby link')));
});

test('invalid and unsourced code profiles fail validation', () => {
  const record = structuredClone(cityPages.find((city) => city.slug === 'st-george-ut'));
  record.codeProfile.status = 'approved-ish';
  record.codeProfile.verifiedDate = '2026-99-99';
  record.codeProfile.adoptedCodes[0].sourceUrl = '';
  record.codeProfile.localDesignCriteria = [{ label: 'Snow', value: '30 psf' }];
  record.codeProfile.commonSubmissionItems[0].requiredStatus = 'mandatory';
  const result = validateCityPages([record], { strictEditorial: false });
  assert.ok(result.errors.some((error) => error.includes('unapproved codeProfile status')));
  assert.ok(result.errors.some((error) => error.includes('invalid codeProfile verifiedDate')));
  assert.ok(result.errors.some((error) => error.includes('incomplete adopted code')));
  assert.ok(result.errors.some((error) => error.includes('incomplete local design criterion')));
  assert.ok(result.errors.some((error) => error.includes('incomplete submission item')));
});

test('disabled cities do not generate and enabled output is complete', () => {
  for (const city of cityPages) {
    const target = join(root, 'dist', city.slug, 'index.html');
    if (!city.enabled) {
      assert.equal(existsSync(target), false, `${city.slug} should not be generated`);
      continue;
    }
    const html = readFileSync(target, 'utf8');
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1);
    for (const marker of ['<title>', 'name="description"', 'rel="canonical"', 'property="og:url"', 'name="twitter:card"', 'application/ld+json']) assert.ok(html.includes(marker), `${city.slug} missing ${marker}`);
    const schemaText = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1];
    const schema = JSON.parse(schemaText);
    assert.ok(JSON.stringify(schema).includes('https://timpsondrafting.com/#organization'));
    assert.ok(html.includes(city.region === 'Southern Utah' ? '/southern-utah-drafting-services/' : '/northern-arizona-drafting-services/'));
    assert.ok(html.includes(`Building Codes and Permit Context for ${city.city}`));
    assert.ok(html.includes('Planning summary—not a code analysis'));
    assert.ok(html.includes(`<time datetime="${city.codeProfile.verifiedDate}">`));
    assert.equal((html.match(/<tr><th scope="row">/g) || []).length, city.codeProfile.adoptedCodes.length + (city.codeProfile.localDesignCriteria?.length || 0));
    for (const code of city.codeProfile.adoptedCodes) assert.ok(html.includes(`href="${code.sourceUrl}"`), `${city.slug} missing code source`);
    for (const criterion of city.codeProfile.localDesignCriteria || []) assert.ok(html.includes(`href="${criterion.sourceUrl}"`), `${city.slug} missing design source`);
  }
});

test('pilot profiles render only their approved tables and warnings', () => {
  const stGeorge = readFileSync(join(root, 'dist', 'st-george-ut', 'index.html'), 'utf8');
  const coloradoCity = readFileSync(join(root, 'dist', 'colorado-city-az', 'index.html'), 'utf8');
  assert.equal(stGeorge.includes('Published local design criteria'), false);
  assert.ok(stGeorge.includes('Utah statewide amendments'));
  assert.ok(coloradoCity.includes('Published local design criteria'));
  assert.ok(coloradoCity.includes('confirm current enforcement'));
  assert.ok(coloradoCity.includes('published ordinance and are not a substitute'));
  assert.equal((coloradoCity.match(/<table class="code-table">/g) || []).length, 2);
});

test('sitemap contains enabled cities and excludes disabled cities', () => {
  const sitemap = readFileSync(join(root, 'dist', 'sitemap.xml'), 'utf8');
  for (const city of cityPages) assert.equal(sitemap.includes(`/${city.slug}/`), city.enabled, city.slug);
});
