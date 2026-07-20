# Timpson website deployment checklist

The repository implements indexable static pages, canonical metadata, structured data, a canonical sitemap, and redirect maps. The following operations require access to production services and must be completed by an authorized administrator.

## Analytics

- Inspect GTM container `GTM-5L2FCX5W` before release. The current homepage also loads the Google tag directly for GA4 `G-BXQTF3KH70` and Google Ads `AW-17998095514`; remove either the matching GTM tags or the direct configuration so page views and conversions cannot fire twice.
- In GTM/GA4, register and test `quote_form_start`, `quote_form_submit`, `phone_click`, `email_click`, `chat_start`, `file_upload`, and `consultation_booked`.
- Mark only confirmed `quote_form_submit` and `consultation_booked` events as conversions. The form emits its submit event only after the CRM endpoint returns success.
- Verify original landing URL, referrer, UTM fields, `gclid`, `gbraid`, and `wbraid` in a real CRM lead.
- Test with Tag Assistant and GA4 DebugView. No authenticated container audit was possible from this repository.

## Search and webmaster tools

- Verify the production domain in Google Search Console and Bing Webmaster Tools.
- Connect GA4 to Search Console and submit `https://timpsondrafting.com/sitemap.xml`.
- Inspect the homepage, service hub, projects hub, service-area hub, top service pages, and new resources after deployment.
- Monitor coverage, crawl, Core Web Vitals, and structured-data reports weekly during rollout.

## Redirects and hosting

- Use `public/_redirects` for Netlify-compatible hosting or root `vercel.json` for Vercel. If production uses another server, translate the same map to native server rules.
- After deployment, run `curl -I` against every legacy URL and confirm one `301`/`308` hop to the final canonical page. Static legacy HTML remains in source for host portability but must be superseded by server rules.

## Evidence needed before additional pages

- Do not publish Washington, Hurricane, Cedar City, Hildale, or St. George city pages until the business supplies unique local experience, site-measurement availability, permit links, approved examples, and original media.
- Do not publish project detail pages until approved facts and redacted drawings/photos are available.
- Confirm founder/team history, the meaning of “Since 1980,” software, credentials, professional relationships, opening hours, logo URL, social profiles, and architecture/engineering status before adding those claims to About or Organization schema.
- Obtain permission and a verifiable source URL before adding testimonials or a Google review link.
