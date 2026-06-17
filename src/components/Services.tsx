import { Home, Building2, Wrench, FileCheck, Ruler, PenTool } from 'lucide-react';

interface Service {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface ServiceDetail {
  title: string;
  description: string;
  points: string[];
}

interface ServiceQuestion {
  question: string;
  answer: string;
}

const services: Service[] = [
  {
    icon: <Home className="w-8 h-8" />,
    title: 'Residential Drafting',
    description: 'Complete architectural plans for new homes and residential construction projects with attention to every detail.',
  },
  {
    icon: <Building2 className="w-8 h-8" />,
    title: 'Garage & Addition Plans',
    description: 'Professional drawings for garages, ADUs, and home additions that complement your existing structure.',
  },
  {
    icon: <Wrench className="w-8 h-8" />,
    title: 'Remodel & Renovation Drawings',
    description: 'Detailed plans for kitchen, bathroom, and whole-home renovations that bring your vision to life.',
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
    title: 'Garage, ADU, and Addition Plans',
    description:
      'Plan sets for attached additions, detached garages, ADUs, and extra living space need to fit the existing home, site conditions, and permit path.',
    points: [
      'Detached garage and shop layouts',
      'Home additions, bedroom suites, and mudrooms',
      'ADU and guest-space drafting support',
      'Plan updates for permitting and contractor review',
    ],
  },
  {
    title: 'Remodel and As-Built Drawings',
    description:
      'Renovation work often starts with documenting what is already there before the new design can be drafted clearly.',
    points: [
      'Existing-condition drawings for remodel planning',
      'Kitchen, bath, and whole-home renovation drawings',
      'Field-measurement documentation when needed',
      'Clear drawings for homeowner and contractor coordination',
    ],
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
            Professional drafting and design services tailored to residential projects of all sizes.
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
            </article>
          ))}
        </div>

        <div className="mt-16 bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
          <div className="max-w-3xl mb-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-3">
              Drafting and Permit Questions
            </h3>
            <p className="text-slate-600 leading-relaxed">
              These are common questions for homeowners comparing drafting options for additions, remodels, garages, ADUs, and permit document packages.
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

        <div className="mt-16 text-center">
          <p className="text-slate-600 mb-6">
            Don't see what you're looking for? We handle a variety of residential drafting projects.
          </p>
          <button
            onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Discuss Your Project
          </button>
        </div>
      </div>
    </section>
  );
}
