import { ArrowRight, FileCheck, MapPinned, Ruler } from 'lucide-react';

const remoteHighlights = [
  'Remote residential drafting support is available for projects throughout the United States.',
  'Custom homes, garages, additions, remodels, and permit-ready drawing packages can often be scoped remotely.',
  'Clear photos, sketches, dimensions, surveys, and local permit details usually help remote projects move faster.',
];

const localHighlights = [
  'On-site field measurement and in-person project support are currently focused around Colorado City.',
  'Local site visits are the best fit when an existing home needs to be measured before remodel or addition drawings begin.',
  'Northern Arizona and Southern Utah projects are the clearest local-service area for field verification and nearby coordination.',
];

const fitChecks = [
  'Project city and state',
  'Whether the job needs remote drafting only or local field measurement',
  'Existing plans, photos, surveys, or sketches',
  'Any known permit-review or building-department questions',
];

const relatedLinks = [
  {
    href: '/service-area/',
    label: 'Full service area details',
  },
  {
    href: '/garage-addition-plans/',
    label: 'Garage, ADU, and addition plans',
  },
  {
    href: '/remodel-as-built-drawings/',
    label: 'Remodel and as-built drawings',
  },
  {
    href: '/permit-ready-construction-documents/',
    label: 'Permit-ready construction document guide',
  },
];

export default function ServiceArea() {
  return (
    <section id="service-area" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-12">
          <p className="text-emerald-600 uppercase tracking-[0.2em] text-sm font-semibold mb-4">
            Service Area
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Remote drafting nationwide, local on-site support near Colorado City
          </h2>
          <p className="text-slate-600 text-lg leading-relaxed">
            Timpson supports residential drafting projects across the United States
            when homeowners and contractors can share the right files, dimensions,
            and permit details. On-site field measurement and in-person coordination
            are currently the best fit for projects in Colorado City, Northern
            Arizona, and Southern Utah.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
            <div className="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
              <FileCheck className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">
              Remote residential drafting across the U.S.
            </h3>
            <ul className="space-y-3 text-slate-700">
              {remoteHighlights.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <FileCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-8 shadow-sm">
            <div className="w-14 h-14 rounded-xl bg-white text-emerald-600 flex items-center justify-center mb-6">
              <MapPinned className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">
              On-site measurement in the Arizona-Utah region
            </h3>
            <ul className="space-y-3 text-slate-700">
              {localHighlights.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <MapPinned className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="mt-8 grid lg:grid-cols-[1.05fr,0.95fr] gap-8">
          <article className="rounded-2xl bg-slate-900 text-white p-8">
            <div className="w-14 h-14 rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center mb-6">
              <Ruler className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold mb-4">
              Helpful details to share early
            </h3>
            <p className="text-slate-300 leading-relaxed mb-6">
              The project location often shapes whether Timpson should plan around a
              remote drafting workflow or a local field-measurement visit.
            </p>
            <ul className="space-y-3">
              {fitChecks.map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-200">
                  <Ruler className="w-5 h-5 text-emerald-300 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-4">
              <a
                href="/service-area/"
                className="inline-flex items-center rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600 transition-colors"
              >
                View the full service area page
                <ArrowRight className="ml-2 w-5 h-5" />
              </a>
              <a
                href="/#contact"
                className="inline-flex items-center rounded-lg border border-white/15 px-6 py-3 font-semibold text-white hover:bg-white/5 transition-colors"
              >
                Request a project quote
              </a>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">
              Related planning pages
            </h3>
            <p className="text-slate-600 leading-relaxed mb-5">
              These pages give searchers and future clients a clearer next step
              based on project type and location fit.
            </p>
            <ul className="space-y-3">
              {relatedLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-emerald-600 hover:text-emerald-700 font-semibold underline underline-offset-4"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
