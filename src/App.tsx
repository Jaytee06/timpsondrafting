import Hero from './components/Hero';
import Reviews from './components/Reviews';
import Services from './components/Services';
import Pricing from './components/Pricing';
import ContactForm from './components/ContactForm';
import Footer from './components/Footer';

function App() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Reviews />
      <Services />
      <Pricing />
      <ContactForm />
      <Footer />
    </div>
  );
}

export default App;
