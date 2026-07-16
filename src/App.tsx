import Hero from './components/Hero';
import Reviews from './components/Reviews';
import Services from './components/Services';
import ProjectPlanning from './components/ProjectPlanning';
import Pricing from './components/Pricing';
import ContactForm from './components/ContactForm';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsAndConditions from './components/TermsAndConditions';
import Footer from './components/Footer';

function App() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Services />
      <ProjectPlanning />
      <Pricing />
      <ContactForm />
      <Reviews />
      <PrivacyPolicy />
      <TermsAndConditions />
      <Footer />
    </div>
  );
}

export default App;
