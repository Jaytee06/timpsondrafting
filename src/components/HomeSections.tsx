import { ArrowRight, Check, CircleDollarSign, RefreshCw, ShieldCheck } from 'lucide-react';
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
    <section className="section-space bg-paper"><div className="section-shell grid items-center gap-12 md:grid-cols-[.8fr_1.2fr]"><div className="border-l-4 border-orange pl-6"><p className="plan-label">The problem in numbers</p><strong className="mt-3 block font-display text-7xl uppercase leading-none text-blueprint sm:text-8xl">5–10%</strong><p className="mt-4 max-w-sm text-lg font-semibold leading-7 text-ink">of home HVAC systems ever get a real load calculation.</p><p className="mt-4 max-w-sm text-xs leading-5 text-steel">Industry estimate supplied for the website direction; supporting source pending owner confirmation.</p></div><div><p className="plan-label">The problem</p><h2 className="display-heading mt-3">Most plans stop at the walls.</h2><p className="mt-6 max-w-2xl text-lg leading-8 text-steel">Mechanical, electrical and plumbing get left to guesswork in the field. That’s where budgets break and systems underperform. TDD plans the whole house before a board is cut.</p></div></div></section>
    <section className="section-space bg-white"><div className="section-shell"><p className="plan-label">What you get</p><h2 className="display-heading mt-3">One price. The whole plan.</h2><div className="mt-10 grid items-stretch gap-5 lg:grid-cols-[1fr_auto_1fr]"><PlanCard title="The TDD Set" items={['Floor plans','Elevations','Sections','Foundation','Framing','Roof and site plans']} /><div className="hidden self-center font-display text-5xl text-steel lg:block">+</div><PlanCard title="Build-Ready Planning" featured items={['Manual J load calculation','Complete duct layout','Electrical layout','Plumbing layout','3D model and walk-through']} /></div><a className="mt-7 inline-flex items-center gap-2 font-semibold text-blueprint" href="/build-ready-planning/">See what’s in Build-Ready Planning <ArrowRight className="h-4 w-4" /></a></div></section>
  </>;
}

export function Walkthrough() {
  const youtubeId = import.meta.env.VITE_WALKTHROUGH_YOUTUBE_ID || '-cXUXkUGtIE';
  const videoSrc = import.meta.env.VITE_WALKTHROUGH_VIDEO_URL;
  return <section className="blueprint-grid section-space bg-ink text-white"><div className="section-shell grid items-center gap-10 lg:grid-cols-2"><div><p className="plan-label text-[#F3A06F]">3D walk-through included</p><h2 className="display-heading mt-3">Walk it before you build it.</h2><p className="mt-6 text-lg leading-8 text-white/70">Every TDD project includes a 3D model you can walk through, so changes happen on screen, not on site.</p><a href="/viewer" className="button-outline-light mt-7">Open the 3D Viewer</a></div><VideoEmbed title="TDD sample project 3D walk-through" youtubeId={youtubeId} videoSrc={videoSrc} poster="/hero-sequence/frame-1.webp" /></div></section>;
}

function Value({ icon: Icon, title, body }: { icon: typeof ShieldCheck; title: string; body: string }) {
  return <article className="border-l-2 border-orange pl-5"><Icon className="h-7 w-7 text-orange" /><h3 className="mt-4 font-display text-2xl font-bold uppercase">{title}</h3><p className="mt-2 text-steel">{body}</p></article>;
}

const serviceLinks = [['Barndominiums & Shops','/barndominium-plans/'],['Custom Homes','/custom-home-plans/'],['Garages, ADUs & Additions','/garage-adu-addition-plans/'],['Remodels & As-Builts','/remodel-as-built-drawings/'],['Permit Services','/permit-services/']];

const projectExamples = [
  { title: 'Custom home planning', href: '/projects/page-arizona-custom-residence/', image: '/project-assets/custom-home-render-front.webp', alt: 'Design visualization of a custom desert residence' },
  { title: 'Remodel planning', href: '/projects/arizona-whole-home-remodel/', image: '/project-assets/remodel-existing-photo.webp', alt: 'Existing-condition photograph of a residential remodel project' },
  { title: 'Detached garage', href: '/garage-adu-addition-plans/', image: '/project-assets/garage-elevations.webp', alt: 'Cropped garage elevations and building section drafted by Timpson Drafting and Design' },
];

export function ProjectsWhyServices() {
  return <>
    <section className="section-space bg-paper"><div className="section-shell"><p className="plan-label">Selected work</p><h2 className="display-heading mt-3">See the project—and the thinking behind it.</h2><p className="mt-6 max-w-2xl text-lg text-steel">Concept imagery and existing conditions show the project at a glance; detailed plans on each project page show how TDD coordinates the work behind it.</p><div className="mt-9 grid gap-5 md:grid-cols-3">{projectExamples.map((project, index) => <a key={project.title} href={project.href} className="group overflow-hidden border border-steel/25 bg-white"><img src={project.image} alt={project.alt} width="1400" height="875" loading="lazy" decoding="async" className="aspect-[8/5] w-full object-cover object-center transition duration-500 group-hover:scale-[1.025]" /><div className="flex items-end justify-between gap-4 p-6"><div><p className="plan-label">{index === 0 ? 'Design visualization' : index === 1 ? 'Existing condition' : 'Drawing example'}</p><h3 className="mt-3 font-display text-2xl font-bold uppercase leading-tight group-hover:text-orange">{project.title}</h3></div><ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" /></div></a>)}</div><a href="/projects/" className="mt-7 inline-flex items-center gap-2 font-semibold text-blueprint">Browse project types <ArrowRight className="h-4 w-4" /></a></div></section>
    <section className="section-space bg-white"><div className="section-shell"><p className="plan-label">Why TDD</p><h2 className="display-heading mt-3">Plans built for the field.</h2><div className="mt-9 grid gap-8 md:grid-cols-3"><Value icon={ShieldCheck} title="Honest." body="Straight answers on what your plans can and can’t do." /><Value icon={CircleDollarSign} title="Fair price." body="$1.50/sq ft, $3,000 minimum, or by bid for larger projects." /><Value icon={RefreshCw} title="Revisions until it’s right." body="Multiple design iterations are built in." /></div></div></section>
    <section className="section-space bg-paper"><div className="section-shell"><p className="plan-label">Services</p><h2 className="display-heading mt-3">What are you building?</h2><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">{serviceLinks.map(([label, href], index) => <a key={href} href={href} className={`group flex min-h-44 flex-col border border-steel/20 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-orange hover:shadow-lg lg:col-span-2 ${index === 3 ? 'lg:col-start-2' : ''} ${index === serviceLinks.length - 1 ? 'sm:col-span-2 lg:col-span-2' : ''}`}><span className="plan-label">0{index + 1}</span><h3 className="mt-6 max-w-sm font-display text-2xl font-bold uppercase leading-tight group-hover:text-orange">{label}</h3><ArrowRight className="mt-auto h-5 w-5 pt-5 box-content transition-transform group-hover:translate-x-1" /></a>)}</div></div></section>
  </>;
}

const steps = [['Send your project.','Location, rough size, sketches or photos. We model your site from available satellite data.'],['Initial concept in 10 business days.','A clear first direction for your review.'],['Design at your pace.','Revisions returned within a work week, depending on scope.'],['Construction drawings after approval.','Final drawings follow two weeks after approval. Permit support is available nationwide and coordinated to local requirements.']];

export function HowItWorks() {
  return <section id="how-it-works" className="section-space bg-blueprint text-white"><div className="section-shell"><p className="plan-label text-[#F3A06F]">How it works</p><h2 className="display-heading mt-3">From idea to build-ready.</h2><ol className="mt-10 grid gap-8 md:grid-cols-4">{steps.map(([title, body], index) => <li key={title} className="border-t border-white/25 pt-5"><span className="font-display text-4xl text-[#F3A06F]">0{index + 1}</span><h3 className="mt-4 font-display text-xl font-bold uppercase">{title}</h3><p className="mt-3 text-sm leading-6 text-white/70">{body}</p></li>)}</ol></div></section>;
}
