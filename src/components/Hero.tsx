import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-35"
        style={{
          backgroundImage: 'url(/timpson-banner.jpg), url(/haus-grundriss-zeichnen.jpg)',
        }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/70 to-slate-900/80"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 font-medium text-sm tracking-wide uppercase">Residential drafting from Colorado City</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-4">
            Residential Drafting for Southern Utah and Northern Arizona
          </h1>

          <p className="text-xl sm:text-2xl text-slate-300 mb-2 font-light">
            Timpson Drafting &amp; Design
          </p>

          <p className="text-slate-400 mb-10 text-lg">
            Custom-home, addition, ADU, garage, remodel, and as-built plans for homeowners and contractors, with remote drafting available nationwide.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="/#contact"
              className="inline-flex items-center justify-center px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              Get a Project Quote
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>

            <a
              href="/services/"
              className="inline-flex items-center justify-center px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg backdrop-blur-sm border border-white/20 transition-all duration-200"
            >
              Explore Drafting Services
            </a>
            <a href="tel:+14353195331" className="inline-flex items-center justify-center px-8 py-4 font-semibold text-emerald-300 underline underline-offset-4">Call (435) 319-5331</a>
          </div>

          <div className="mt-12 flex flex-wrap gap-8 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Garage &amp; Addition Plans</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Permit-Ready Documents</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Remodel &amp; As-Built Support</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
