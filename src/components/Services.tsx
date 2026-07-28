import { Home, Building2, Wrench, FileCheck, Ruler, PenTool } from 'lucide-react';

interface Service {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface ServiceDetail {
  id: string;
  title: string;
  description: string;
  points: string[];
  href: string;
}

interface ServiceQuestion {
  question: string;
  answer: string;
}

const services: Service[] = [
  {
    icon: <Home className="w-8 h-8" />,
    title: 'Residential Drafting',
    description: 'Residential drawing packages for new homes, defined around the project scope and local requirements.',
  },
  {
    icon: <Building2 className="w-8 h-8" />,
    title: 'Garage & Addition Plans',
    description: 'Professional drawings for detached garages, ADUs, mudrooms, bedroom suites, and home additions that fit your existing structure.',
  },
  {
    icon: <Wrench className="w-8 h-8" />,
    title: 'Remodel & Renovation Drawings',
    description: 'Detailed plans for kitchen, bathroom, mudroom, and whole-home renovations that bring your vision to life.',
  },
  {
    icon: <FileCheck className="w-8 h-8" />,
    title: 'Permit-Ready Construction Documents',
    description: 'Complete document packages that meet local building codes and streamline the permitting process.',
  },
  {
    icon: <Ruler className="w-8 h-8" />,
    title: 'As-Built Drawings',
    description: 'Accurate measurements and documentation of existing structures for renovation planning and records.',
  },
  {
    icon: <PenTool className="w-8 h-8" />,
    title: 'Custom Home Design Support',
    description: 'Collaborative design services working alongside homeowners and contractors to realize custom projects.',
  },
];

const serviceDetails: ServiceDetail[] = [
  {
    id: 'custom-home-plans',
    title: 'Custom Home Plans',
    description:
      'Custom residential plans should reflect the property, household needs, and build path from the beginning. This page now carries the clearest fit for unique homes, compact footprints, and efficient room planning.',
    points: [
      'Custom home drafting support',
      'Small and efficient home layouts',
      'Site-fit and footprint planning',
      'Plan revisions before permit submission',
    ],
    href: '/custom-home-plans/',
  },
  {
    id: 'adu-plans',
    title: 'ADU Plans',
    description:
      'Accessory dwelling unit projects need a clear scope around site constraints, access, utilities, and permit requirements before the drafting package can be defined.',
    points: [
      'Attached and detached ADU layouts',
      'Garage conversion planning support',
      'Compact living-space drafting',
      'Project-specific permit coordination',
    ],
    href: '/adu-plans/',
  },
  {
    id: 'home-addition-plans',
    title: 'Home Addition Plans',
    description:
      'Addition work needs proposed space to connect cleanly to the existing home, lot conditions, and the jurisdiction review path.',
    points: [
      'Bedroom suites and mudrooms',
      'Expanded living areas and attached additions',
      'Existing-condition coordination',
      'Quote inputs for addition planning',
    ],
    href: '/home-addition-plans/',
  },
  {
    id: 'garage-shop-plans',
    title: 'Garage and Shop Plans',
    description:
      'Garage and shop projects need a scope that accounts for use, size, setbacks, and permit requirements before the drawings can move confidently into review.',
    points: [
      'Attached and detached garage planning',
      'Residential shop layouts and exterior views',
      'Project fit and permit-factor review',
      'Quote inputs for garage and shop work',
    ],
    href: '/garage-shop-plans/',
  },
  {
    id: 'permit-drawing-services',
    title: 'Permit Drawing Services',
    description:
      'Permit drawing coordination starts with the right project facts, existing information, and a realistic view of what the reviewing authority may require.',
    points: [
      'Project-based permit drawing scope',
      'Submission and revision planning',
      'Support for homes, ADUs, garages, and remodels',
      'Clearer quote prep before submission',
    ],
    href: '/permit-drawing-services/',
  },
];

const serviceQuestions: ServiceQuestion[] = [
  {
    question: 'Can Timpson help with ADUs, garages, and additions?',
    answer:
      'Yes. Timpson prepares residential drafting plans for garages, ADUs, additions, master suites, mudrooms, remodels, and custom home projects, with the drawing package scoped to your project details.',
  },
  {
    question: 'What do we need to quote a project?',
    answer:
      'Helpful starting details include the project location, project type, rough size, timeline, any existing plans or photos, and whether the work is a new build, remodel, garage, ADU, or addition.',
  },
  {
    question: 'What are permit-ready construction documents?',
    answer:
      'Permit-ready documents are organized drawings prepared for review by a local building department. Requirements vary by project and jurisdiction, so Timpson reviews the scope before confirming the right drawing package.',
  },
  {
    question: 'When are as-built drawings useful?',
    answer:
      'As-built drawings are useful when an existing structure needs to be measured and documented before a remodel, addition, repair, or contractor review.',
  },
  {
    question: 'How is drafting pricing scoped?',
    answer:
      'Drafting quotes are usually scoped around project size, complexity, existing information, revision needs, and permit requirements. That helps Timpson provide a project-based quote instead of forcing every job into the same fixed package.',
  },
];

export default function Services() {
  return (
    <section id="services" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Our Services
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Professional drafting and design services for custom homes, garages, additions, remodels, as-built drawings, and efficient residential layouts.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-200 hover:border-emerald-300 group"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-lg flex items-center justify-center mb-6 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                {service.icon}
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-3">
                {service.title}
              </h3>

              <p className="text-slate-600 leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 grid lg:grid-cols-2 gap-8">
          {serviceDetails.map((detail) => (
            <article
              id={detail.id}
              key={detail.title}
              className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                {detail.title}
              </h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                {detail.description}
              </p>
              <ul className="grid sm:grid-cols-2 gap-3">
                {detail.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-slate-700">
                    <FileCheck className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <a
                  href={detail.href}
                  className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                >
                  Learn more about {detail.title}
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
          <div className="max-w-3xl mb-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-3">
              Drafting and Permit Questions
            </h3>
            <p className="text-slate-600 leading-relaxed">
              These are common questions for homeowners comparing drafting options for additions, remodels, garages, ADUs, small-home plans, and permit document packages.
            </p>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            {serviceQuestions.map((item) => (
              <article key={item.question}>
                <h4 className="font-semibold text-slate-900 mb-2">
                  {item.question}
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-12 bg-emerald-50 rounded-xl p-8 border border-emerald-100 shadow-sm">
          <div className="max-w-3xl">
            <h3 className="text-2xl font-bold text-slate-900 mb-3">
              What Permit-Ready Plans Include
            </h3>
            <p className="text-slate-700 leading-relaxed mb-5">
              Need a clearer picture of what to gather before asking for a drafting quote? This guide walks through the project details, existing information, and permit questions that usually shape a residential drafting scope.
            </p>
            <a
              href="/resources/what-is-included-in-permit-ready-plans/"
              className="inline-flex items-center px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              Explore the Permit-Plan Guide
            </a>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-slate-600 mb-6">
            Don't see your exact project listed? Timpson handles a wide range of residential drafting work, from additions and remodels to small custom homes and permit updates.
          </p>
          <a
            href="/#contact"
            className="inline-flex items-center px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Discuss Your Project
          </a>
        </div>
      </div>
    </section>
  );
}
