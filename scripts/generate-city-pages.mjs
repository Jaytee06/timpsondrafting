import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cityPages } from '../src/city-pages/city-page.data.mjs';
import { validateCityPages } from '../src/city-pages/city-page.validation.mjs';

const BASE = 'https://timpsondrafting.com';
const ORG_ID = `${BASE}/#organization`;
const DIST = join(process.cwd(), 'dist');
const validateOnly = process.argv.includes('--validate-only');
const { enabled, errors, warnings } = validateCityPages(cityPages);

for (const warning of warnings) console.warn(`CITY WARNING: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`CITY ERROR: ${error}`);
  process.exit(1);
}
if (validateOnly) {
  console.log(`Validated ${enabled.length} enabled and ${cityPages.length - enabled.length} disabled city records.`);
  process.exit(0);
}

const services = {
  'custom-home-plans': ['Custom home plans', 'Site- and household-specific residential plans developed around an agreed drawing scope.'],
  'adu-plans': ['ADU plans', 'Drawing support for attached, detached, or converted accessory living space.'],
  'home-addition-plans': ['Home addition plans', 'Existing- and proposed-condition drawings for expanding a home.'],
  'garage-shop-plans': ['Garage and shop plans', 'Plans for attached or detached residential garages and shops.'],
  'as-built-drawings': ['As-built drawings', 'Existing-condition drawings based on dependable measurements and source information.'],
};

const nav = `<a class="brand" href="/">Timpson <span>Drafting &amp; Design</span></a><button class="nav-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button><nav id="site-nav" aria-label="Primary"><details><summary>Services</summary><div class="menu"><a href="/residential-drafting-services/">Residential Drafting Services</a><a href="/custom-home-plans/">Custom Home Plans</a><a href="/adu-plans/">ADU Plans</a><a href="/home-addition-plans/">Home Addition Plans</a><a href="/garage-shop-plans/">Garage and Shop Plans</a><a href="/remodel-drafting/">Remodel Drafting</a><a href="/as-built-drawings/">As-Built Drawings</a></div></details><details><summary>Service Areas</summary><div class="menu"><a href="/southern-utah-drafting-services/">Southern Utah</a><a href="/northern-arizona-drafting-services/">Northern Arizona</a><a href="/service-areas/remote-drafting/">Remote Drafting</a></div></details><a href="/resources/">Resources</a><a href="/about-us/">About</a><a href="/contact/">Contact</a><a class="nav-cta" href="/#contact">Request a Quote</a></nav>`;
const footer = `<footer><div class="footer-grid"><div><strong>Timpson Drafting &amp; Design</strong><p>Residential drafting for homeowners and contractors, with remote service nationwide and local availability focused on Northern Arizona and Southern Utah.</p></div><div><strong>Contact</strong><p><a href="tel:+14353195331">(435) 319-5331</a><br><a href="mailto:admin@timpsondrafting.com">admin@timpsondrafting.com</a></p></div><div><strong>Service areas</strong><p><a href="/st-george-ut/">St. George drafting services</a><br><a href="/colorado-city-az/">Colorado City drafting services</a><br><a href="/service-areas/">All service areas</a></p></div></div><small>Project requirements and professional-stamp needs vary by jurisdiction. Confirm them with the applicable building department.</small></footer>`;

for (const city of enabled) write(city.slug, renderCity(city));
write('southern-utah-drafting-services', renderHub('Southern Utah'));
write('northern-arizona-drafting-services', renderHub('Northern Arizona'));
write('service-areas', renderServiceAreaHub());
console.log(`Generated ${enabled.length} city pages and 2 regional hubs in dist.`);

function renderCity(city) {
  const regionalSlug = city.region === 'Southern Utah' ? 'southern-utah-drafting-services' : 'northern-arizona-drafting-services';
  const regionUrl = `/${regionalSlug}/`;
  const quoteUrl = `/?projectCity=${encodeURIComponent(city.city)}&projectState=${city.stateCode}#contact`;
  const crumbs = [['Home', '/'], ['Service Areas', '/service-areas/'], [city.region, regionUrl], [`${city.city}, ${city.stateCode}`, `/${city.slug}/`]];
  const jsonLd = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebPage', '@id': `${city.seo.canonicalUrl}#webpage`, url: city.seo.canonicalUrl, name: city.seo.title, description: city.seo.description, about: { '@id': `${city.seo.canonicalUrl}#service` }, breadcrumb: { '@id': `${city.seo.canonicalUrl}#breadcrumb` } },
      { '@type': 'Service', '@id': `${city.seo.canonicalUrl}#service`, name: `Residential Drafting Services in ${city.city}, ${city.state}`, url: city.seo.canonicalUrl, provider: { '@id': ORG_ID }, areaServed: { '@type': 'City', name: city.city, containedInPlace: { '@type': 'State', name: city.state } } },
      { '@type': 'BreadcrumbList', '@id': `${city.seo.canonicalUrl}#breadcrumb`, itemListElement: crumbs.map(([name, path], index) => ({ '@type': 'ListItem', position: index + 1, name, item: `${BASE}${path}` })) },
    ],
  };
  const serviceCards = city.featuredServiceSlugs.map((slug) => `<a class="card" href="/${slug}/"><h3>${escapeHtml(services[slug]?.[0] || slug)}</h3><p>${escapeHtml(services[slug]?.[1] || 'View the service scope and quote requirements.')}</p></a>`).join('');
  const jurisdiction = city.jurisdiction ? `<section class="section"><h2>Local permit and jurisdiction guidance</h2><p>For property inside the applicable limits, start with the <a href="${escapeHtml(city.jurisdiction.url)}" rel="noopener">${escapeHtml(city.jurisdiction.name)}</a>. Requirements depend on the property and proposed work; the reviewing authority decides what supporting documents and licensed-professional services are required.</p><ul>${city.jurisdiction.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul><p class="reviewed">Official source last checked <time datetime="${city.jurisdiction.verifiedDate}">${formatDate(city.jurisdiction.verifiedDate)}</time>.</p></section>` : '';
  const nearby = city.nearbyCities.map((nearbyCity) => nearbyCity.slug ? `<a href="/${nearbyCity.slug}/">${escapeHtml(nearbyCity.name)}, ${nearbyCity.stateCode}</a>` : `<span>${escapeHtml(nearbyCity.name)}, ${nearbyCity.stateCode}</span>`).join('');
  const body = `<section class="hero city-hero"><div class="city-hero-copy"><p class="eyebrow">${escapeHtml(city.region)} service area</p><h1>Residential Drafting Services in ${escapeHtml(city.city)}, ${escapeHtml(city.state)}</h1><p>${escapeHtml(city.introduction)}</p><div class="actions"><a class="button primary" data-track="quote_form_start" href="${quoteUrl}">Request a Quote</a><a class="button secondary" href="tel:+14353195331">Call (435) 319-5331</a></div></div><img class="city-hero-image" src="/timpson-banner.jpg" width="640" height="426" alt="Residential drafting plans representing work in ${escapeHtml(city.city)}, ${escapeHtml(city.state)}"></section><section class="section"><h2>Local residential drafting support</h2><p>${escapeHtml(city.localOverview)}</p><div class="availability"><div><strong>Remote drafting</strong><span>${city.serviceAvailability.remoteDrafting ? 'Available for suitable projects' : 'Not currently offered'}</span></div><div><strong>On-site measurement</strong><span>${city.serviceAvailability.onsiteMeasurements ? 'May be available by scope' : 'Requires separate confirmation'}</span></div></div><p>${escapeHtml(city.serviceAvailability.onsiteSummary)}</p><p>To begin, provide the property location, intended work, approximate size, schedule, and any survey, photos, sketches, measurements, or existing plans.</p></section><section class="section"><h2>Featured residential drafting services</h2><div class="cards">${serviceCards}</div></section><section class="section"><h2>Common project types in ${escapeHtml(city.city)}</h2><ul>${city.commonProjectTypes.map((type) => `<li>${escapeHtml(type)}</li>`).join('')}</ul></section>${jurisdiction}<section class="section"><h2>Nearby communities</h2><div class="nearby-list">${nearby}</div><p><a href="${regionUrl}">Explore residential drafting across ${escapeHtml(city.region)}</a>.</p></section><section class="section"><h2>Questions from ${escapeHtml(city.city)} project owners</h2>${city.faqs.map((faq) => `<details><summary>${escapeHtml(faq.question)}</summary><p>${escapeHtml(faq.answer)}</p></details>`).join('')}</section><section class="cta"><h2>Request a ${escapeHtml(city.city)} project quote</h2><p>Your city and state will be carried into the quote form. You can review or change them before submitting.</p><a class="button primary" data-track="quote_form_start" href="${quoteUrl}">Start your quote</a></section>`;
  return layout(city.seo, crumbs, body, jsonLd, city);
}

function renderHub(region) {
  const cities = enabled.filter((city) => city.region === region);
  const slug = region === 'Southern Utah' ? 'southern-utah-drafting-services' : 'northern-arizona-drafting-services';
  const title = `${region} Residential Drafting Services | Timpson`;
  const description = `Explore enabled Timpson residential drafting locations in ${region}, plus remote coordination, primary services, and project quote information.`;
  const cards = cities.map((city) => `<a class="card" href="/${city.slug}/"><h2>${escapeHtml(city.city)}, ${city.stateCode}</h2><p>${escapeHtml(city.introduction)}</p></a>`).join('');
  const body = `<section class="hero"><p class="eyebrow">Regional service hub</p><h1>Residential drafting services across ${escapeHtml(region)}</h1><p>Timpson evaluates residential drafting projects from the actual property, scope, source information, and reviewing jurisdiction. Remote coordination is available; field measurement depends on the address, existing conditions, and work required.</p><div class="actions"><a class="button primary" href="/#contact">Request a Quote</a><a class="button secondary" href="tel:+14353195331">Call (435) 319-5331</a></div></section><section class="section"><h2>How regional service works</h2><p>Homeowners and residential contractors can request drafting for custom homes, additions, ADUs, garages, shops, remodels, and as-built documentation. A useful first review includes the property location, intended work, approximate size, schedule, and any survey, photographs, sketches, measurements, or existing plans.</p><p>Local availability does not mean every project includes a site visit. Timpson confirms whether the work can proceed remotely, whether field measurement is available, and whether a local surveyor, engineer, architect, or other professional is needed.</p></section><section class="section"><h2>Enabled ${escapeHtml(region)} locations</h2><div class="cards">${cards}</div></section><section class="section"><h2>Residential services and planning guides</h2><div class="link-grid"><a href="/custom-home-plans/">Custom home drafting</a><a href="/adu-plans/">ADU plans</a><a href="/home-addition-plans/">Home addition plans</a><a href="/garage-shop-plans/">Garage and shop plans</a><a href="/remodel-drafting/">Remodel drafting</a><a href="/resources/what-is-included-in-permit-ready-plans/">Permit-plan guide</a></div></section><section class="section"><h2>Permitting and jurisdiction</h2><p>Requirements vary by city, county, parcel, occupancy, and project scope. Confirm the authority having jurisdiction and its current checklist before assuming a standard drawing package applies. The reviewing authority decides whether engineering, architecture, energy documentation, or other supporting work is required.</p></section><section class="cta"><h2>Discuss a ${escapeHtml(region)} project</h2><p>Share the property location and core project details for a project-based scope and quote.</p><a class="button primary" href="/#contact">Start a project quote</a></section>`;
  const seo = { title, description, canonicalUrl: `${BASE}/${slug}/`, socialImage: `${BASE}/timpson-banner.jpg` };
  const crumbs = [['Home', '/'], ['Service Areas', '/service-areas/'], [region, `/${slug}/`]];
  return layout(seo, crumbs, body, breadcrumbSchema(seo.canonicalUrl, title, crumbs));
}

function renderServiceAreaHub() {
  const seo = { title: 'Residential Drafting Service Areas | Timpson', description: 'Find enabled Timpson residential drafting locations in Southern Utah and Northern Arizona, plus nationwide remote drafting availability.', canonicalUrl: `${BASE}/service-areas/`, socialImage: `${BASE}/timpson-banner.jpg` };
  const crumbs = [['Home', '/'], ['Service Areas', '/service-areas/']];
  const cityLinks = enabled.map((city) => `<a class="card" href="/${city.slug}/"><h2>${escapeHtml(city.city)}, ${city.stateCode}</h2><p>${escapeHtml(city.introduction)}</p></a>`).join('');
  const body = `<section class="hero"><p class="eyebrow">Service areas</p><h1>Local and remote residential drafting service areas</h1><p>Use the regional hubs or enabled city pages to see locally reviewed service information. Remote residential drafting remains available nationwide for suitable projects.</p></section><section class="section"><h2>Regional drafting hubs</h2><div class="cards"><a class="card" href="/southern-utah-drafting-services/"><h2>Southern Utah drafting services</h2><p>Enabled Southern Utah locations and local-versus-remote availability.</p></a><a class="card" href="/northern-arizona-drafting-services/"><h2>Northern Arizona drafting services</h2><p>Enabled Northern Arizona and Arizona Strip locations.</p></a><a class="card" href="/service-areas/remote-drafting/"><h2>Remote drafting nationwide</h2><p>How to prepare measurements and source information for remote work.</p></a></div></section><section class="section"><h2>Enabled city pages</h2><div class="cards">${cityLinks}</div></section>`;
  return layout(seo, crumbs, body, breadcrumbSchema(seo.canonicalUrl, seo.title, crumbs));
}

function layout(seo, crumbs, body, jsonLd, city) {
  const bodyAttrs = city ? ` data-page-type="city_service_area" data-landing-city="${escapeHtml(city.slug)}" data-landing-region="${escapeHtml(city.region)}" data-project-city-prefill="${escapeHtml(city.city)}" data-project-state-prefill="${city.stateCode}"` : '';
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(seo.title)}</title><meta name="description" content="${escapeHtml(seo.description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${seo.canonicalUrl}"><meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(seo.title)}"><meta property="og:description" content="${escapeHtml(seo.description)}"><meta property="og:url" content="${seo.canonicalUrl}"><meta property="og:image" content="${seo.socialImage}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(seo.title)}"><meta name="twitter:description" content="${escapeHtml(seo.description)}"><meta name="twitter:image" content="${seo.socialImage}"><link rel="stylesheet" href="/site-pages.css"><script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script></head><body${bodyAttrs}><a class="skip" href="#main">Skip to content</a><header>${nav}</header><main id="main" class="page-shell"><nav class="breadcrumbs" aria-label="Breadcrumb">${crumbs.map(([name, path], index) => index === crumbs.length - 1 ? `<span aria-current="page">${escapeHtml(name)}</span>` : `<a href="${path}">${escapeHtml(name)}</a><b aria-hidden="true">/</b>`).join('')}</nav>${body}</main>${footer}<script src="/site.js" defer></script></body></html>`;
}

function breadcrumbSchema(url, name, crumbs) {
  return { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage', '@id': `${url}#webpage`, url, name, breadcrumb: { '@id': `${url}#breadcrumb` } }, { '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: crumbs.map(([crumbName, path], index) => ({ '@type': 'ListItem', position: index + 1, name: crumbName, item: `${BASE}${path}` })) }] };
}
function write(slug, html) { const dir = join(DIST, slug); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'index.html'), html); }
function escapeHtml(value = '') { return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
function formatDate(value) { return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)); }
