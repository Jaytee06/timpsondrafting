import { ArrowRightCircle, ClipboardList, FileCheck, MapPinned } from 'lucide-react';

const planningSteps = [
  {
    icon: ClipboardList,
    title: 'Share the project basics',
    description:
      'A clear starting note helps Timpson understand whether the project is a custom home, garage, addition, remodel, ADU, or permit update before the drafting scope is outlined.',
  },
  {
    icon: FileCheck,
    title: 'Gather what already exists',
    description:
      'Existing plans, photos, sketches, inspiration, and rough dimensions usually make it easier to define the work and reduce guesswork in the first quote conversation.',
  },
  {
    icon: MapPinned,
    title: 'Clarify the permit and location details',
    description:
      'Project city, state, timeline, and any known building-department questions help shape the permit-ready document path and the amount of drafting coordination needed.',
  },
  {
    icon: ArrowRightCircle,
    title: 'Receive a scoped next step',
    description:
      'Timpson reviews the available information, identifies important unknowns, and responds with the next clarification, consultation, or project-specific quote path.',
  },
];

const preparationItems = [
  'Project city and state',
  'Whether the project needs remote drafting only or local field measurement',
  'Rough size or footprint',
  'Existing plans, photos, or sketches',
  'Timeline and permit questions',
];

const relatedLinks = [
  {
    href: '/service-areas/',
    label: 'Service area and project location details',
  },
  {
    href: '/home-addition-plans/',
    label: 'Home addition plans',
  },
  {
    href: '/garage-shop-plans/',
    label: 'Garage and shop plans',
  },
  {
    href: '/as-built-drawings/',
    label: 'As-built drawings',
  },
  {
    href: '/resources/what-is-included-in-permit-ready-plans/',
    label: 'What permit-ready plans include',
  },
];

export default function ProjectPlanning() {
  return (
    <section id="process" className="py-20 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-12">
          <p className="text-emerald-400 uppercase tracking-[0.2em] text-sm font-semibold mb-4">
            How Residential Drafting Usually Starts
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Helpful details before you request a drafting quote
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed">
            A useful first conversation should clarify the property, intended work,
            available source information, and likely review path. These details help
            Timpson identify unknowns before promising a drawing scope.
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-8 mb-12">
          {planningSteps.map((step) => {
            const Icon = step.icon;

            return (
              <article
                key={step.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-8"
              >
                <div className="w-14 h-14 rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center mb-6">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-slate-300 leading-relaxed">{step.description}</p>
              </article>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="rounded-2xl bg-white text-slate-900 p-8">
            <h3 className="text-2xl font-bold mb-4">Good prep items for the first call</h3>
            <ul className="space-y-3">
              {preparationItems.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <FileCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-slate-600 mt-6 leading-relaxed">
              If the scope is still changing, that is normal. A clearer starting
              picture still helps Timpson narrow the likely drafting path and quote
              range more accurately.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <h3 className="text-2xl font-bold mb-4">Related planning pages</h3>
            <p className="text-slate-300 mb-5 leading-relaxed">
              These pages go deeper on the project types already supported on the site.
            </p>
            <ul className="space-y-3 mb-6">
              {relatedLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-emerald-300 hover:text-emerald-200 underline underline-offset-4"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <a
              href="/#contact"
              className="inline-flex items-center rounded-lg bg-emerald-500 px-6 py-3 font-semibold text-white hover:bg-emerald-600 transition-colors"
            >
              Request a project quote
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
