import { ArrowRight } from 'lucide-react';

const heroFrames = [
  '/project-assets/custom-home-render-front.webp',
  '/project-assets/custom-home-render-rear.webp',
  '/project-assets/residential-concept.webp',
];

export default function Hero() {
  return (
    <section className="blueprint-grid relative overflow-hidden bg-blueprint text-white lg:flex lg:items-center">
      <div className="absolute inset-0" aria-hidden="true">
        {heroFrames.map((src, index) => (
          <div key={src} className="hero-media-frame absolute inset-0" style={{ animationDelay: `${index * 8}s` }}>
            <img src={src} alt="" className="h-full w-full object-cover object-center" loading={index === 0 ? 'eager' : 'lazy'} decoding="async" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-blueprint/95 via-blueprint/65 to-blueprint/15" />
      <div className="section-shell relative w-full py-16 sm:py-20 lg:py-20">
        <div className="max-w-3xl">
          <p className="plan-label text-[#F3A06F]">Full-service residential drafting</p>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.12] tracking-tight sm:text-6xl">Residential plans, carefully considered.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/80 sm:text-xl">Thoughtful residential drafting informed by hands-on construction experience. Complete plans with mechanical, electrical, plumbing and a 3D walk-through included.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="/quote/" className="button-primary">Request a Quote <ArrowRight className="h-4 w-4" /></a>
            <a href="#interactive-models" className="button-outline-light">Explore the Models</a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/20 pt-5 text-sm font-medium text-white/75">
            <span>$1.50/sq ft</span><span>10-day initial concept</span><span>Nationwide</span>
          </div>
        </div>
      </div>
    </section>
  );
}
