import { Home, Building2, Wrench, FileCheck, Ruler, PenTool } from 'lucide-react';

interface Service {
  icon: React.ReactNode;
  title: string;
  description: string;
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
