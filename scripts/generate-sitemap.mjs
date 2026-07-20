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
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].sort().map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`;
writeFileSync(sitemapPath, xml);
console.log(`Generated sitemap with ${urls.size} canonical URLs.`);
