import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');
const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const errors = [];
const warnings = [];
const seen = { title: new Map(), description: new Map(), canonical: new Map() };
const prohibited = [/current repository does not contain/i, /available in the repository/i, /OWNER_OR_TEAM_MUST_VERIFY/i, /YYYY-MM-DD/i, /coming soon/i, /lorem ipsum/i, /\bTODO\b/i];

for (const url of urls) {
  const pathname = new URL(url).pathname;
  const file = pathname === '/' ? join(dist, 'index.html') : join(dist, pathname, 'index.html');
  if (!existsSync(file)) { errors.push(`${pathname}: sitemap route has no HTML file`); continue; }
  const html = readFileSync(file, 'utf8');
  const title = match(html, /<title>(.*?)<\/title>/i);
  const description = match(html, /<meta name="description" content="([^"]*)"/i) || match(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
  const canonical = match(html, /<link rel="canonical" href="([^"]+)"/i) || match(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i);
  const h1Count = (html.match(/<h1(?:\s|>)/gi) || []).length;
  if (!title) errors.push(`${pathname}: missing title`); else record('title', title, pathname);
  if (!description) errors.push(`${pathname}: missing description`); else { record('description', description, pathname); if (description.length < 100 || description.length > 165) warnings.push(`${pathname}: description length ${description.length}`); }
  if (!canonical) errors.push(`${pathname}: missing canonical`); else { record('canonical', canonical, pathname); if (canonical !== url) errors.push(`${pathname}: canonical mismatch (${canonical})`); }
  if (h1Count !== 1) errors.push(`${pathname}: expected one H1, found ${h1Count}`);
  for (const script of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gis)) try { JSON.parse(script[1]); } catch { errors.push(`${pathname}: invalid JSON-LD`); }
  for (const phrase of prohibited) if (phrase.test(html)) errors.push(`${pathname}: prohibited placeholder language (${phrase})`);
  for (const href of html.matchAll(/href="(\/[^"]*)"/g)) {
    const target = href[1].split(/[?#]/)[0];
    if (!target || target === '/') continue;
    if (/\.(?:jpg|jpeg|png|webp|avif|css|js|svg|xml)$/i.test(target)) continue;
    const targetFile = join(dist, target, 'index.html');
    if (!existsSync(targetFile) && !redirectTarget(target)) errors.push(`${pathname}: broken internal link ${target}`);
  }
}

for (const [kind, values] of Object.entries(seen)) for (const [value, paths] of values) if (paths.length > 1) errors.push(`duplicate ${kind}: ${value} (${paths.join(', ')})`);
const notFound = readFileSync(join(dist, '404.html'), 'utf8');
if (!/noindex,follow/i.test(notFound) || !/<h1>Page not found<\/h1>/i.test(notFound) || /rel="canonical"/i.test(notFound)) errors.push('404.html: must have noindex, one Page not found H1, and no canonical');
for (const file of walk(dist).filter((file) => file.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  for (const phrase of prohibited) if (phrase.test(html)) errors.push(`${file.slice(dist.length)}: prohibited public placeholder language`);
}
for (const warning of warnings) console.warn(`AUDIT WARNING: ${warning}`);
if (errors.length) { for (const error of [...new Set(errors)]) console.error(`AUDIT ERROR: ${error}`); process.exit(1); }
console.log(`Audited ${urls.length} canonical routes: no blocking errors (${warnings.length} editorial warnings).`);

function match(value, regex) { return value.match(regex)?.[1]?.trim() || ''; }
function record(kind, value, path) { const paths = seen[kind].get(value) || []; paths.push(path); seen[kind].set(value, paths); }
function redirectTarget(path) { return ['/home/','/main/','/hello/','/about-us-page/','/contact-us/','/contact-us-post/','/main/contact-us/','/service-areas/southern-utah/','/service-areas/arizona-strip/','/service-areas/colorado-city-az/'].includes(path); }
function walk(directory) { return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => { const path = join(directory, entry.name); return entry.isDirectory() ? walk(path) : [path]; }); }
