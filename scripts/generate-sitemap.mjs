import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cityPages } from '../src/city-pages/city-page.data.mjs';
import { validateCityPages } from '../src/city-pages/city-page.validation.mjs';

const dist = join(process.cwd(), 'dist');
const sitemapPath = join(dist, 'sitemap.xml');
const existing = readFileSync(sitemapPath, 'utf8');
const urls = new Set([...existing.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
const { enabled, errors } = validateCityPages(cityPages);
if (errors.length) throw new Error(errors.join('\n'));
urls.delete('https://timpsondrafting.com/service-areas/colorado-city-az/');
for (const city of enabled) urls.add(city.seo.canonicalUrl);
urls.add('https://timpsondrafting.com/southern-utah-drafting-services/');
urls.add('https://timpsondrafting.com/northern-arizona-drafting-services/');
const reviewedDates = new Map(enabled.map((city) => [city.seo.canonicalUrl, city.lastReviewed]));
for (const path of [
  '/services/', '/residential-drafting-services/', '/service-areas/',
  '/service-areas/remote-drafting/', '/southern-utah-drafting-services/',
  '/northern-arizona-drafting-services/', '/resources/',
  '/resources/draftsman-vs-architect-vs-engineer/',
  '/resources/what-is-included-in-permit-ready-plans/',
  '/resources/home-addition-permit-drawings/',
  '/resources/how-much-do-drafting-services-cost/',
  '/resources/remote-drafting-measurement-guide/',
]) reviewedDates.set(`https://timpsondrafting.com${path}`, '2026-07-20');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].sort().map((url) => `  <url><loc>${url}</loc>${reviewedDates.has(url) ? `<lastmod>${reviewedDates.get(url)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`;
writeFileSync(sitemapPath, xml);
console.log(`Generated sitemap with ${urls.size} canonical URLs.`);
