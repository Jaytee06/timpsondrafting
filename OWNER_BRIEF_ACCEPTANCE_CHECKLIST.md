# Owner Brief Acceptance Checklist

Audit date: 2026-09-29  
Source: business-owner website build-out notes supplied in the project conversation.

## Status legend

- ✅ Complete — implemented and checked locally.
- 🟡 Partial — the structure exists, but one or more requested details remain.
- ⬜ Missing — not yet implemented.
- ⛔ Owner input — implementation depends on approved content, media, or a business decision.
- ⚠️ Intentional variance — deliberately handled differently, with the reason recorded.

## Launch gate

The rebuilt site is structurally usable, but the owner's complete brief is **not yet checked off**. The principal blockers are approved project material, the requested video/media, testimonials, permit-service areas, and final business copy. Static/legacy page templates also need to be brought into the same navigation, footer, and language rules as the new React pages.

## 1. Global design system

- ✅ Use Paper `#F4F1EA`, Ink `#1F2328`, Blueprint `#1E3A5F`, Safety Orange `#C8581E`, and Steel `#6B7280` as the principal tokens.
- ✅ Use a condensed display face (Oswald) for headings and Inter for body copy.
- ✅ Use uppercase tracking for labels and compact square/4px-radius controls.
- ✅ Add subtle blueprint-grid styling.
- ✅ Replace the former green/white presentation on the primary React experience.
- ✅ Apply the new system consistently to generated core, city, region, and resource pages.
- 🟡 Retired static redirect-source pages still retain some older markup, but public requests are redirected before those documents render.
- ✅ Enforce “one orange action per screen” by styling the persistent header quote link as a white outline and reserving orange for the page-level primary action.
- 🟡 Remove prohibited promotional terminology across all legacy/SEO pages. The new core copy is restrained, but older generated content still contains terms the owner asked not to use outside the required transparency statement.
- ⚠️ Keep the exact transparency statement even though it includes otherwise restricted terms; the brief explicitly requires that language.

## 2. Shared navigation and footer

- ✅ Sticky primary header implemented.
- ✅ Primary navigation includes Services, Build Ready, Projects, About, and Get Quote.
- ✅ Phone link and prominent quote action are present.
- ✅ Mobile header exposes phone, quote, and menu controls.
- ✅ Viewer access is present in navigation as an additional owner-requested action.
- ✅ React footer contains service/company links, phone/contact paths, and the required transparency statement.
- ✅ Sticky mobile Call and Get Quote actions are implemented.
- ✅ Replace generated-page headers and footers with the shared system, including city and regional pages.
- 🟡 Confirm the final public company/contact details shown in every footer variant.

## 3. Home page

- 🟡 Hero structure, positioning, headline, supporting copy, and quote/viewer paths are implemented.
- ✅ Replace the static hero treatment with a lightweight six-frame crossfade extracted from the approved demo footage; reduced-motion visitors receive a single still.
- 🟡 “Problem” section is implemented as “Plan the whole house,” but the requested numeric rework statistic is not published.
- ⚠️ The `5–10%` rework statistic was intentionally omitted because no defensible source was provided. Add it only after the owner approves a credible source and exact wording.
- ✅ The mechanical/electrical/plumbing/3D bundle is explained.
- ✅ Walk-through section embeds the supplied YouTube demo using the privacy-enhanced player, with a configurable video ID for later replacement; the employee/owner viewer upload remains available separately.
- ⛔ Add three approved featured projects with imagery, scope, and outcomes.
- ✅ “Why Timpson”/differentiation content is present.
- ✅ Process/how-it-works content is present.
- ✅ Service tiles and links are present.
- ✅ Final quote call-to-action is present.
- 🟡 Verify final home-page copy against the owner's preferred exact wording after content approval.

## 4. Build Ready page

- ✅ `/build-ready/` exists and explains mechanical plans, electrical plans, plumbing plans, and 3D modeling.
- 🟡 Convert the four plan sections to the requested alternating media/text composition.
- ⛔ Supply approved mechanical, electrical, plumbing, and 3D-model sample imagery/video.
- ✅ Add the requested explicit three-point “why it matters” section.
- ✅ Required transparency statement is included in the new generated layout.
- ✅ Closing quote action is present.

## 5. Services hub and service pages

- ✅ Services hub route exists.
- ✅ Five service routes exist: custom home drafting, additions/remodels, barndominiums, as-built drawings, and contractor/owner-builder support.
- ✅ Each service page has an introduction, scope/bundle explanation, process content, transparency language, and a quote action.
- ✅ Align the services hub to the requested five-tile layout and pricing strip.
- 🟡 Add requested related-project cards to each service page.
- ⛔ Related-project cards depend on at least three approved project profiles and images.
- 🟡 Review every service page for prohibited promotional terms and remove legacy phrasing where it appears.

## 6. Projects

- ✅ `/projects/` route exists.
- ⬜ Build the requested filterable project gallery.
- ⬜ Build individual project-detail pages with scope, plans, models, challenges, and outcomes.
- ⛔ Obtain at least three approved projects, including images/renders, project type, location disclosure preference, services performed, and outcome copy.
- ⚠️ The projects page remains excluded from indexing until it has enough real project content; this avoids launching a thin placeholder gallery.

## 7. About page

- ✅ `/about/` exists with company positioning, values, work approach, transparency statement, and quote path.
- 🟡 Confirm the company story and values with the owner rather than treating draft marketing copy as final business fact.
- ⬜ Add the requested testimonial section/carousel.
- ⛔ Obtain at least three owner-approved testimonials and attribution/display permissions.

## 8. Quote page and form

- ✅ `/quote/` exists.
- ✅ Form includes the requested project-type options.
- ✅ Optional square footage field is present.
- ✅ Optional timeline choices are present.
- ✅ Permit-help selection is present.
- ✅ Project-details field is present.
- ✅ File upload is present and intended for employees/owners working with their own files.
- ✅ Submitted project type, square footage, timeline, permit need, details, and files are passed into the CRM request flow.
- ✅ The page sidebar contains the owner's requested pricing, initial-concept timeline, construction-drawing timeline, phone, and email.
- 🟡 Replace the generic success promise with an owner-approved response-time commitment (`X business days`).
- 🟡 Confirm required contact fields and consent/privacy language with the owner.
- 🟡 Perform a real end-to-end production submission with uploads. Automated/local structural tests pass, but the user has reserved final form testing for the next test session.

## 9. Search metadata and sharing

- ✅ Core and generated routes receive page-specific titles, descriptions, and canonical URLs.
- ✅ Core page titles and descriptions match the owner's SEO table verbatim. Short-description audit warnings for About, Permit Services, and Quote are intentionally accepted because the supplied wording is exact.
- ✅ LocalBusiness structured data is included on the primary document.
- ⬜ Create and install the requested `1200 × 630` social share image.
- 🟡 Replace current Open Graph/Twitter references to the older small JPEG.
- 🟡 Validate structured data and social previews against the production URL after deployment.

## 10. Redirects and route integrity

- ✅ Requested core redirects are represented in the deployment configuration/public redirects.
- ✅ Remove redirect chains from older About and Contact URLs by pointing them directly to their final destinations.
- ✅ Convert generated navigation, footer, service-card, and quote-action links to the new information architecture.
- ✅ Local route audit passes for the currently generated output.

## 11. Media and content rules

- ✅ No stock-person photography was introduced into the redesigned core experience.
- ⛔ Obtain approved plans, renders, jobsite images, and finished-build imagery.
- ⛔ Obtain the requested 3D loop/walk-through media and poster assets.
- ⬜ Convert photographic assets to appropriately sized WebP/modern formats.
- 🟡 Add meaningful alt text once final media is selected. Decorative CSS imagery does not require alt text, but real project/media content will.
- 🟡 Lazy-load all approved below-the-fold media after it is added.

## 12. Performance, accessibility, and analytics

- ✅ Primary app is route-split; the heavy viewer code is not loaded with the home page.
- ✅ Home initial assets are currently under the requested 2 MB ceiling because large media has not yet been added.
- ✅ Viewer stays available through a clear button/navigation path without turning the marketing site into an upload workflow.
- ✅ Telephone actions use `tel:` links in the new shared components.
- ✅ Core analytics and conversion-event hooks are present.
- ✅ Local build, lint, typecheck, route audit, and automated test suite pass.
- ✅ True 375px device-metrics checks pass on Home, Quote, Services, Build Ready, About, Permit Services, and Projects with no horizontal overflow.
- ✅ Add global visible-focus and reduced-motion handling, and run automated core-route DOM checks for unnamed buttons, unlabeled fields, missing image alternatives, and duplicate IDs.
- 🟡 A final human screen-reader pass remains appropriate after owner media and final copy are installed.
- 🟡 Verify phone links and analytics events across legacy/generated templates, not only shared React components.
- ⬜ Test on a physical iPhone and Android device over mobile data.
- 🟡 Retest load performance after the final video and project imagery are installed; the present result is not representative of the finished media payload.

## 13. Required owner inputs

These are content dependencies, not engineering tasks that should be invented:

1. At least three approved project profiles and image sets.
2. Mechanical, electrical, plumbing, and 3D-model sample sheets/media.
3. At least three approved testimonials with attribution permissions.
4. Confirmed permit-service areas.
5. Approved response-time promise for form submissions.
6. Confirmation of company story, values, contact details, and exact transparency/legal wording.
7. A credible source and approved wording if the `5–10%` rework statistic is still desired.

## 14. Recommended completion order

1. Normalize all generated headers, footers, routes, and prohibited language.
2. Obtain/approve the owner-supplied content listed above.
3. Complete Projects, testimonials, Build Ready media, and home video.
4. Finish the response promise and permit areas.
5. Create the social share image and convert/lazy-load final media.
6. Run end-to-end form, accessibility, analytics, performance, physical-device, redirect, and production-preview checks.
