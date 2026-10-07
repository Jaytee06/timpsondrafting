import { useEffect, useState } from 'react';
import { ArrowRight, Cuboid, Scan, Footprints, Palette, Check, CircleDollarSign, RefreshCw, ShieldCheck } from 'lucide-react';
import VideoEmbed from './VideoEmbed';

function PlanCard({ title, items, featured = false }: { title: string; items: string[]; featured?: boolean }) {
  return <article className={`relative border p-7 ${featured ? 'border-orange bg-paper' : 'border-steel/30 bg-white'}`}>
    {featured && <span className="absolute right-4 top-4 bg-orange px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">Included</span>}
    <h3 className="pr-24 font-display text-2xl font-bold uppercase">{title}</h3>
    <ul className="mt-5 grid gap-3 sm:grid-cols-2">{items.map(item => <li key={item} className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-orange" /><span>{item}</span></li>)}</ul>
  </article>;
}

export function ProblemAndBundle() {
  return <>
    <section className="section-space bg-paper"><div className="section-shell grid items-center gap-12 md:grid-cols-[.8fr_1.2fr]"><div className="border-l-4 border-orange pl-6"><p className="plan-label">The problem in numbers</p><strong className="mt-3 block font-display text-7xl uppercase leading-none text-blueprint sm:text-8xl">5–10%</strong><p className="mt-4 max-w-sm text-lg font-semibold leading-7 text-ink">of home HVAC systems ever get a real load calculation.</p><p className="mt-4 max-w-sm text-xs leading-5 text-steel">Industry estimate supplied for the website direction; supporting source pending owner confirmation.</p></div><div><p className="plan-label">The problem</p><h2 className="display-heading mt-3">Planning beyond the floor plan.</h2><p className="mt-6 max-w-2xl text-lg leading-8 text-steel">A complete home plan considers mechanical, electrical and plumbing alongside the spaces you live in. We coordinate these details early to support clearer decisions during construction.</p></div></div></section>
    <section className="section-space bg-white"><div className="section-shell"><p className="plan-label">What you get</p><h2 className="display-heading mt-3">A coordinated residential drawing package.</h2><div className="mt-10 grid items-stretch gap-5 lg:grid-cols-[1fr_auto_1fr]"><PlanCard title="The TDD Set" items={['Floor plans','Elevations','Sections','Foundation','Framing','Roof and site plans']} /><div className="hidden self-center font-display text-5xl text-steel lg:block">+</div><PlanCard title="Build-Ready Planning" featured items={['Manual J load calculation','Complete duct layout','Electrical layout','Plumbing layout','3D model and walk-through']} /></div><a className="mt-7 inline-flex items-center gap-2 font-semibold text-blueprint" href="/build-ready-planning/">See what’s in Build-Ready Planning <ArrowRight className="h-4 w-4" /></a></div></section>
  </>;
}

export function Walkthrough() {
  const youtubeId = 'fV5b3TQft-8';
  const videoSrc = import.meta.env.VITE_WALKTHROUGH_VIDEO_URL;
  return <section id="demo" className="blueprint-grid scroll-mt-24 bg-ink py-10 text-white sm:py-14"><div className="section-shell grid items-center gap-6 lg:grid-cols-[.8fr_1.4fr] lg:gap-10"><div><p className="plan-label text-[#F3A06F]">Watch the demo</p><h2 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">See your plans come to life.</h2><p className="mt-4 leading-7 text-white/70">Take a guided look at the 3D walk-through included with every TDD project.</p><a href="#interactive-models" className="mt-5 inline-flex items-center gap-2 font-semibold text-white">Try an interactive model <ArrowRight className="h-4 w-4" /></a></div><VideoEmbed title="TDD sample project 3D walk-through" youtubeId={youtubeId} videoSrc={videoSrc} poster="/project-assets/model-02-thumbnail.jpg" /></div></section>;
}

function Value({ icon: Icon, title, body }: { icon: typeof ShieldCheck; title: string; body: string }) {
  return <article className="border-l-2 border-orange pl-5"><Icon className="h-7 w-7 text-orange" /><h3 className="mt-4 font-display text-2xl font-bold uppercase">{title}</h3><p className="mt-2 text-steel">{body}</p></article>;
}

const serviceLinks = [['Barndominiums & Shops','/barndominium-plans/'],['Custom Homes','/custom-home-plans/'],['Garages, ADUs & Additions','/garage-adu-addition-plans/'],['Remodels & As-Builts','/remodel-as-built-drawings/'],['Permit Services','/permit-services/']];

const projectExamples = [
  { label: 'Design visualization', title: 'Custom home planning', href: '/projects/page-arizona-custom-residence/', image: '/project-assets/custom-home-render-front.webp', alt: 'Design visualization of a custom desert residence' },
  { label: '3D model', title: 'Farmhouse visualization', href: '/projects/farmhouse-design-visualization/', image: '/project-assets/farmhouse-render-front-enhanced.webp', alt: 'Front three-quarter design visualization of a single-story farmhouse' },
  { label: 'Existing condition', title: 'Remodel planning', href: '/projects/arizona-whole-home-remodel/', image: '/project-assets/remodel-existing-photo.webp', alt: 'Existing-condition photograph of a residential remodel project' },
  { label: 'Drawing example', title: 'Detached garage', href: '/garage-adu-addition-plans/', image: '/project-assets/garage-elevations.webp', alt: 'Cropped garage elevations and building section drafted by Timpson Drafting and Design' },
];

type FeaturedModel = { id: string; label: string; modelUrl: string | null; featured?: boolean; image?: string | null; imageAlt?: string; profileSlug?: string; projectType: string; description: string };

export function InteractiveModels() {
  const [models, setModels] = useState<FeaturedModel[]>([]);
  useEffect(() => {
    let active = true;
    void fetch('/viewer-projects.json').then((response) => response.ok ? response.json() : [])
      .then((catalog: FeaturedModel[]) => { if (active) setModels(catalog.filter((model) => model.featured && model.modelUrl)); })
      .catch(() => { /* Existing project work remains available when the model catalog cannot load. */ });
    return () => { active = false; };
  }, []);
  if (!models.length) return null;
  return <section id="interactive-models" className="spatial-models relative isolate scroll-mt-24 overflow-hidden py-10 sm:py-12" aria-labelledby="interactive-models-heading">
      <div className="section-shell relative">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold tracking-[.12em] text-blueprint"><Cuboid className="h-4 w-4" aria-hidden="true" /> 3D · AR · SPATIAL</p><h2 id="interactive-models-heading" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Step inside the design.</h2><p className="mt-2 text-steel">Walk through the rooms, make it yours, then bring it into your space.</p></div>
          <a href="/projects/" className="inline-flex items-center gap-2 font-semibold text-blueprint">All projects <ArrowRight className="h-4 w-4" /></a>
        </div>
        <ul className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 pt-1" aria-label="Interactive residential models">
          {models.map((model) => <li key={model.id} className="spatial-model-card w-[85%] max-w-sm shrink-0 snap-start overflow-hidden rounded-xl border border-blueprint/15 bg-white/90 sm:w-[calc((100%_-_1rem)/2)] lg:w-[calc((100%_-_2rem)/3)] lg:max-w-none">
            <a href={`/viewer?project=${encodeURIComponent(model.id)}`} className="group flex h-full flex-col focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange" aria-label={`Explore ${model.label.toLowerCase()} in 3D`}>
              <div className="spatial-model-stage relative aspect-video overflow-hidden bg-blueprint/5">
                {model.image ? <img src={model.image} alt={model.imageAlt || `Exterior visualization of ${model.label.toLowerCase()}`} width="1920" height="1200" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]" /> : <div className="grid h-full place-items-center"><Cuboid className="h-12 w-12 text-blueprint" aria-hidden="true" /></div>}
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/85 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-blueprint"><Cuboid className="h-3.5 w-3.5" aria-hidden="true" /> Interactive 3D</span>
                <span className="spatial-viewfinder pointer-events-none absolute inset-4" aria-hidden="true" />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-blueprint/10 px-4 py-4">
                <h3 className="font-display text-lg font-semibold tracking-tight transition-colors group-hover:text-orange">{model.label}</h3>
                <span className="inline-flex shrink-0 items-center gap-2 text-xs font-semibold text-blueprint">Explore in 3D <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
              </div>
            </a>
          </li>)}
        </ul>
        <p className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-blueprint/80">
          <span className="inline-flex items-center gap-1.5"><Footprints className="h-3.5 w-3.5" aria-hidden="true" /> Walk through</span>
          <span className="inline-flex items-center gap-1.5"><Palette className="h-3.5 w-3.5" aria-hidden="true" /> Try finishes</span>
          <span className="inline-flex items-center gap-1.5"><Scan className="h-3.5 w-3.5" aria-hidden="true" /> View in AR</span>
        </p>
      </div>
    </section>;
}

export function ProjectsWhyServices() {
  return <>
    <section className="section-space bg-paper"><div className="section-shell"><p className="plan-label">Selected work</p><h2 className="display-heading mt-3">See the project—and the thinking behind it.</h2><p className="mt-6 max-w-2xl text-lg text-steel">Concept imagery, existing conditions and drawing examples show the project at a glance and the coordination behind it.</p><div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{projectExamples.map((project) => <a key={project.title} href={project.href} className="group overflow-hidden border border-steel/25 bg-white">{project.image ? <img src={project.image} alt={project.alt} width="1400" height="875" loading="lazy" decoding="async" className="aspect-[8/5] w-full object-cover object-center transition duration-500 group-hover:scale-[1.025]" /> : <div className="grid aspect-[8/5] place-items-center bg-blueprint text-white"><Cuboid className="h-16 w-16" aria-hidden="true" /></div>}<div className="flex items-end justify-between gap-4 p-6"><div><p className="plan-label">{project.label}</p><h3 className="mt-3 font-display text-2xl font-bold uppercase leading-tight group-hover:text-orange">{project.title}</h3></div><ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" /></div></a>)}</div><a href="/projects/" className="mt-7 inline-flex items-center gap-2 font-semibold text-blueprint">Browse project types <ArrowRight className="h-4 w-4" /></a></div></section>
    <section className="section-space bg-white"><div className="section-shell"><p className="plan-label">Why TDD</p><h2 className="display-heading mt-3">Drawing on practical building experience.</h2><div className="mt-9 grid gap-8 md:grid-cols-3"><Value icon={ShieldCheck} title="Honest." body="Straight answers on what your plans can and can’t do." /><Value icon={CircleDollarSign} title="Fair price." body="$1.50/sq ft, $3,000 minimum, or by bid for larger projects." /><Value icon={RefreshCw} title="Revisions until it’s right." body="Multiple design iterations are built in." /></div></div></section>
    <section className="section-space bg-paper"><div className="section-shell"><p className="plan-label">Services</p><h2 className="display-heading mt-3">What are you building?</h2><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">{serviceLinks.map(([label, href], index) => <a key={href} href={href} className={`group flex min-h-44 flex-col border border-steel/20 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-orange hover:shadow-lg lg:col-span-2 ${index === 3 ? 'lg:col-start-2' : ''} ${index === serviceLinks.length - 1 ? 'sm:col-span-2 lg:col-span-2' : ''}`}><span className="plan-label">0{index + 1}</span><h3 className="mt-6 max-w-sm font-display text-2xl font-bold uppercase leading-tight group-hover:text-orange">{label}</h3><ArrowRight className="mt-auto h-5 w-5 pt-5 box-content transition-transform group-hover:translate-x-1" /></a>)}</div></div></section>
  </>;
}

const steps = [['Send your project.','Location, rough size, sketches or photos. We model your site from available satellite data.'],['Initial concept in 10 business days.','A clear first direction for your review.'],['Design at your pace.','Revisions returned within a work week, depending on scope.'],['Construction drawings after approval.','Final drawings follow two weeks after approval. Permit support is available nationwide and coordinated to local requirements.']];

export function HowItWorks() {
  return <section id="how-it-works" className="section-space bg-blueprint text-white"><div className="section-shell"><p className="plan-label text-[#F3A06F]">How it works</p><h2 className="display-heading mt-3">From idea to build-ready.</h2><ol className="mt-10 grid gap-8 md:grid-cols-4">{steps.map(([title, body], index) => <li key={title} className="border-t border-white/25 pt-5"><span className="font-display text-4xl text-[#F3A06F]">0{index + 1}</span><h3 className="mt-4 font-display text-xl font-bold uppercase">{title}</h3><p className="mt-3 text-sm leading-6 text-white/70">{body}</p></li>)}</ol></div></section>;
}
