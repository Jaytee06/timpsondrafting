import { CheckCircle2, ArrowRight } from 'lucide-react';

interface PricingTier {
  name: string;
  startingPrice: string;
  description: string;
  features: string[];
  popular?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Basic Drafting Packages',
    startingPrice: 'Contact for Pricing',
    description: 'Simple residential projects and straightforward additions.',
    features: [
      'Site plans and layouts',
      'Basic construction drawings',
      'Code compliance review',
      'Permit-ready documents',
    ],
  },
  {
    name: 'Garages & Additions',
    startingPrice: 'Custom Quote',
    description: 'Detached garages, ADUs, and home additions of all sizes.',
    features: [
      'Complete architectural plans',
      'Structural specifications',
      'Foundation and framing details',
      'Local permit coordination',
      'Revision support',
    ],
    popular: true,
  },
  {
    name: 'Custom Residential Projects',
    startingPrice: 'Priced Per Scope',
    description: 'Full custom homes and complex renovation projects.',
    features: [
      'Comprehensive design services',
      'Detailed construction documents',
      'Material specifications',
      'Contractor coordination',
      'Multiple revision rounds',
      'Project consultation',
    ],
  },
];

export default function Pricing() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Transparent Pricing
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Every project is unique. We provide clear, upfront pricing based on your specific needs.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {pricingTiers.map((tier, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-xl p-8 border-2 transition-all duration-300 ${
                tier.popular
                  ? 'border-emerald-500 shadow-xl scale-105'
                  : 'border-slate-200 hover:border-emerald-300 shadow-sm hover:shadow-lg'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  {tier.name}
                </h3>
                <p className="text-slate-600 mb-4">
                  {tier.description}
                </p>
                <div className="text-3xl font-bold text-slate-900">
                  {tier.startingPrice}
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-2 ${
                  tier.popular
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                }`}
              >
                Request a Quote
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-200">
          <p className="text-slate-700 text-lg mb-2">
            <span className="font-semibold">Final pricing depends on project size, complexity, and local requirements.</span>
          </p>
          <p className="text-slate-600">
            Contact us for a detailed quote tailored to your specific project needs.
          </p>
        </div>
      </div>
    </section>
  );
}
