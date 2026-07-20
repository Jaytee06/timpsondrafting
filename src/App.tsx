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

function App() {
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
