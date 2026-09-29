import { lazy, Suspense } from 'react';
import Hero from './components/Hero';
import Reviews from './components/Reviews';
import Services from './components/Services';
import ProjectPlanning from './components/ProjectPlanning';
import ServiceArea from './components/ServiceArea';
import Pricing from './components/Pricing';
import ContactForm from './components/ContactForm';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsAndConditions from './components/TermsAndConditions';
import Footer from './components/Footer';
import Header from './components/Header';
import AnalyticsHooks from './components/AnalyticsHooks';

const ModelViewer = lazy(() => import('./components/ModelViewer'));
const CesiumViewer = lazy(() => import('./components/CesiumViewer'));

const viewerFallback = <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">Loading viewer…</div>;

function App() {
  if (window.location.pathname.replace(/\/$/, '') === '/viewer') {
    return <Suspense fallback={viewerFallback}><ModelViewer /></Suspense>;
  }

  if (window.location.pathname.replace(/\/$/, '') === '/cesium-viewer') {
    return <Suspense fallback={viewerFallback}><CesiumViewer /></Suspense>;
  }

  return (
    <div className="min-h-screen">
      <AnalyticsHooks />
      <Header />
      <main id="main-content">
      <Hero />
      <Services />
      <ProjectPlanning />
      <ServiceArea />
      <Pricing />
      <ContactForm />
      <Reviews />
      <PrivacyPolicy />
      <TermsAndConditions />
      </main>
      <Footer />
    </div>
  );
}

export default App;
