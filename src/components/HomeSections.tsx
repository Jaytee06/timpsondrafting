import { useEffect, useState } from 'react';
import { ArrowRight, Cuboid, Check, CircleDollarSign, RefreshCw, ShieldCheck } from 'lucide-react';
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
  const youtubeId = 'UXs--NWB6i0';
  const videoSrc = import.meta.env.VITE_WALKTHROUGH_VIDEO_URL;
  return <section className="blueprint-grid section-space bg-ink text-white"><div className="section-shell grid items-center gap-10 lg:grid-cols-2"><div><p className="plan-label text-[#F3A06F]">3D walk-through included</p><h2 className="display-heading mt-3">Explore your home before construction.</h2><p className="mt-6 text-lg leading-8 text-white/70">Every TDD project includes a 3D model you can walk through, so changes happen on screen, not on site.</p><a href="/viewer" className="button-outline-light mt-7">Open the 3D Viewer</a></div><VideoEmbed title="TDD sample project 3D walk-through" youtubeId={youtubeId} videoSrc={videoSrc} poster="/hero-sequence/frame-1.webp" /></div></section>;
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

export function ProjectsWhyServices() {
  const [models, setModels] = useState<FeaturedModel[]>([]);
  useEffect(() => {
    let active = true;
    void fetch('/viewer-projects.json').then((response) => response.ok ? response.json() : [])
      .then((catalog: FeaturedModel[]) => { if (active) setModels(catalog.filter((model) => model.featured && model.modelUrl)); })
      .catch(() => { /* Existing project work remains available when the model catalog cannot load. */ });
    return () => { active = false; };
  }, []);
  return <>
    {models.length > 0 && <section id="interactive-models" className="section-space bg-white" aria-labelledby="interactive-models-heading">
      <div className="section-shell">
        <p className="plan-label">Explore the design</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
          <div><h2 id="interactive-models-heading" className="display-heading">Interactive models</h2><p className="mt-5 max-w-2xl text-lg text-steel">Step inside a residential design. Walk through the rooms and explore different finishes.</p></div>
          <a href="/projects/" className="inline-flex items-center gap-2 font-semibold text-blueprint">All projects <ArrowRight className="h-4 w-4" /></a>
        </div>
        <ul className="mt-9 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4" aria-label="Interactive residential models">
          {models.map((model) => <li key={model.id} className="w-[85%] max-w-sm shrink-0 snap-start overflow-hidden border border-steel/25 bg-paper sm:w-[calc((100%_-_1.25rem)/2)] lg:w-[calc((100%_-_2.5rem)/3)] lg:max-w-none">
            <a href={`/viewer?project=${encodeURIComponent(model.id)}`} className="group flex h-full flex-col focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange" aria-label={`Explore ${model.label.toLowerCase()} in 3D`}>
              {model.image ? <div className="aspect-[8/5] overflow-hidden bg-steel/10"><img src={model.image} alt={model.imageAlt || `Exterior visualization of ${model.label.toLowerCase()}`} width="1920" height="1200" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]" /></div> : <div className="grid aspect-[8/5] place-items-center bg-blueprint/5"><Cuboid className="h-12 w-12 text-blueprint" aria-hidden="true" /></div>}
              <div className="flex flex-1 flex-col p-6">
                <p className="plan-label">{model.projectType}</p>
                <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight transition-colors group-hover:text-orange">{model.label}</h3>
                <p className="mt-3 flex-1 text-steel">{model.description}</p>
                <span className="mt-7 inline-flex min-h-12 items-center justify-between gap-3 border-t border-steel/25 pt-4 font-semibold text-blueprint">Explore in 3D <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
              </div>
            </a>
          </li>)}
        </ul>
      </div>
    </section>}
    <section className="section-space bg-paper"><div className="section-shell"><p className="plan-label">Selected work</p><h2 className="display-heading mt-3">See the project—and the thinking behind it.</h2><p className="mt-6 max-w-2xl text-lg text-steel">Concept imagery, existing conditions and drawing examples show the project at a glance and the coordination behind it.</p><div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{projectExamples.map((project) => <a key={project.title} href={project.href} className="group overflow-hidden border border-steel/25 bg-white">{project.image ? <img src={project.image} alt={project.alt} width="1400" height="875" loading="lazy" decoding="async" className="aspect-[8/5] w-full object-cover object-center transition duration-500 group-hover:scale-[1.025]" /> : <div className="grid aspect-[8/5] place-items-center bg-blueprint text-white"><Cuboid className="h-16 w-16" aria-hidden="true" /></div>}<div className="flex items-end justify-between gap-4 p-6"><div><p className="plan-label">{project.label}</p><h3 className="mt-3 font-display text-2xl font-bold uppercase leading-tight group-hover:text-orange">{project.title}</h3></div><ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" /></div></a>)}</div><a href="/projects/" className="mt-7 inline-flex items-center gap-2 font-semibold text-blueprint">Browse project types <ArrowRight className="h-4 w-4" /></a></div></section>
    <section className="section-space bg-white"><div className="section-shell"><p className="plan-label">Why TDD</p><h2 className="display-heading mt-3">Drawing on practical building experience.</h2><div className="mt-9 grid gap-8 md:grid-cols-3"><Value icon={ShieldCheck} title="Honest." body="Straight answers on what your plans can and can’t do." /><Value icon={CircleDollarSign} title="Fair price." body="$1.50/sq ft, $3,000 minimum, or by bid for larger projects." /><Value icon={RefreshCw} title="Revisions until it’s right." body="Multiple design iterations are built in." /></div></div></section>
    <section className="section-space bg-paper"><div className="section-shell"><p className="plan-label">Services</p><h2 className="display-heading mt-3">What are you building?</h2><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">{serviceLinks.map(([label, href], index) => <a key={href} href={href} className={`group flex min-h-44 flex-col border border-steel/20 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-orange hover:shadow-lg lg:col-span-2 ${index === 3 ? 'lg:col-start-2' : ''} ${index === serviceLinks.length - 1 ? 'sm:col-span-2 lg:col-span-2' : ''}`}><span className="plan-label">0{index + 1}</span><h3 className="mt-6 max-w-sm font-display text-2xl font-bold uppercase leading-tight group-hover:text-orange">{label}</h3><ArrowRight className="mt-auto h-5 w-5 pt-5 box-content transition-transform group-hover:translate-x-1" /></a>)}</div></div></section>
  </>;
}

const steps = [['Send your project.','Location, rough size, sketches or photos. We model your site from available satellite data.'],['Initial concept in 10 business days.','A clear first direction for your review.'],['Design at your pace.','Revisions returned within a work week, depending on scope.'],['Construction drawings after approval.','Final drawings follow two weeks after approval. Permit support is available nationwide and coordinated to local requirements.']];

export function HowItWorks() {
  return <section id="how-it-works" className="section-space bg-blueprint text-white"><div className="section-shell"><p className="plan-label text-[#F3A06F]">How it works</p><h2 className="display-heading mt-3">From idea to build-ready.</h2><ol className="mt-10 grid gap-8 md:grid-cols-4">{steps.map(([title, body], index) => <li key={title} className="border-t border-white/25 pt-5"><span className="font-display text-4xl text-[#F3A06F]">0{index + 1}</span><h3 className="mt-4 font-display text-xl font-bold uppercase">{title}</h3><p className="mt-3 text-sm leading-6 text-white/70">{body}</p></li>)}</ol></div></section>;
}
