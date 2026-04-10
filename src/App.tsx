import Hero from './components/Hero';
import Reviews from './components/Reviews';
import Services from './components/Services';
import Pricing from './components/Pricing';
import ContactForm from './components/ContactForm';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsAndConditions from './components/TermsAndConditions';
import Footer from './components/Footer';
import ChatWidget from './components/ChatWidget';

function App() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Reviews />
      <Services />
      <Pricing />
      <ContactForm />
      <PrivacyPolicy />
      <TermsAndConditions />
      <Footer />
      <ChatWidget />
    </div>
  );
}

export default App;
