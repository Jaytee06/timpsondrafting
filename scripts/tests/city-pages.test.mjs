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
  }
});

test('sitemap contains enabled cities and excludes disabled cities', () => {
  const sitemap = readFileSync(join(root, 'dist', 'sitemap.xml'), 'utf8');
  for (const city of cityPages) assert.equal(sitemap.includes(`/${city.slug}/`), city.enabled, city.slug);
});
