import { lazy, Suspense } from 'react';
import Hero from './components/Hero';
import ContactForm from './components/ContactForm';
import Footer from './components/Footer';
import Header from './components/Header';
import AnalyticsHooks from './components/AnalyticsHooks';
import { HowItWorks, ProblemAndBundle, ProjectsWhyServices, Walkthrough } from './components/HomeSections';

const ModelViewer = lazy(() => import('./components/ModelViewer'));
const ArchitecturalViewer = lazy(() => import('./components/ArchitecturalViewer'));
const CesiumViewer = lazy(() => import('./components/CesiumViewer'));

const viewerFallback = <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">Loading viewer…</div>;

function App() {
  if (window.location.pathname.replace(/\/$/, '') === '/architectural-viewer') {
    return <Suspense fallback={viewerFallback}><ArchitecturalViewer /></Suspense>;
  }

  if (window.location.pathname.replace(/\/$/, '') === '/viewer') {
    return <Suspense fallback={viewerFallback}><ModelViewer /></Suspense>;
  }

  if (window.location.pathname.replace(/\/$/, '') === '/cesium-viewer') {
    return <Suspense fallback={viewerFallback}><CesiumViewer /></Suspense>;
  }

  if (window.location.pathname.replace(/\/$/, '') === '/quote') {
    return <div className="min-h-screen bg-paper text-ink"><AnalyticsHooks /><Header /><main id="main-content"><ContactForm heading="Request a Quote" description="Tell us about your project. We'll follow up with a quote and next steps." /></main><Footer /><div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-white/15 bg-blueprint text-center font-bold text-white md:hidden"><a className="py-4" href="tel:+14353195311">Call</a><a className="bg-orange py-4" href="#contact">Get a Quote</a></div></div>;
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AnalyticsHooks />
      <Header />
      <main id="main-content">
      <Hero />
      <ProblemAndBundle />
      <Walkthrough />
      <ProjectsWhyServices />
      <HowItWorks />
      <ContactForm />
      </main>
      <Footer />
      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-white/15 bg-blueprint text-center font-bold text-white md:hidden">
        <a className="py-4" href="tel:+14353195311">Call</a>
        <a className="bg-orange py-4" href="/quote/">Get a Quote</a>
      </div>
    </div>
  );
}

export default App;
