import { ArrowRight } from 'lucide-react';

const heroFrames = [
  '/project-assets/custom-home-render-front.webp',
  '/project-assets/custom-home-render-rear.webp',
  '/project-assets/residential-concept.webp',
];

export default function Hero() {
  return (
    <section className="blueprint-grid relative overflow-hidden bg-blueprint text-white lg:flex lg:min-h-[calc(100svh-4.5rem)] lg:items-center">
      <div className="absolute inset-0" aria-hidden="true">
        {heroFrames.map((src, index) => (
          <div key={src} className="hero-media-frame absolute inset-0" style={{ animationDelay: `${index * 8}s` }}>
            <img src={src} alt="" className="h-full w-full object-cover object-center" loading={index === 0 ? 'eager' : 'lazy'} decoding="async" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-blueprint/95 via-blueprint/65 to-blueprint/15" />
      <div className="section-shell relative w-full py-24 sm:py-32 lg:py-24 xl:py-28">
        <div className="max-w-3xl">
          <p className="plan-label text-[#F3A06F]">Full-service residential drafting</p>
          <h1 className="mt-5 font-display text-5xl font-bold uppercase leading-[.95] sm:text-7xl">Designed by Tradesmen.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/80 sm:text-xl">Complete residential plans with mechanical, electrical, plumbing and a 3D walk-through included. Drawn by people who know how a house goes together.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="/quote/" className="button-primary">Request a Quote <ArrowRight className="h-4 w-4" /></a>
            <a href="#how-it-works" className="button-outline-light">See How It Works</a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/20 pt-5 text-sm font-semibold uppercase tracking-wider text-white/75">
            <span>$1.50/sq ft</span><span>10-day initial concept</span><span>Nationwide</span>
          </div>
        </div>
      </div>
    </section>
  );
}
