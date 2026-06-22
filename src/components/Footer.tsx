import { Home, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Home className="w-8 h-8 text-emerald-400" />
              <h3 className="text-2xl font-bold">Timpson Drafting & Design</h3>
            </div>
            <p className="text-slate-400 leading-relaxed mb-4">
              Professional residential drafting and design services for custom homes, garages, additions, remodels, and permit-ready residential projects.
            </p>
            <p className="text-slate-400 text-sm">
              Trusted by local homeowners for over a decade.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="/#services" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  Services
                </a>
              </li>
              <li>
                <a href="/#process" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="/#pricing" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="/#contact" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  Get a Quote
                </a>
              </li>
              <li>
                <a
                  href="/permit-ready-construction-documents/"
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  Permit Guide
                </a>
              </li>
              <li>
                <a
                  href="#privacy-policy"
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#terms-and-conditions"
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  Terms &amp; Conditions
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <a href="tel:+14353195331" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  (435) 319-5331
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <a
                  href="mailto:info@timpsondrafting.com"
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  info@timpsondrafting.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <a
                  href="https://maps.google.com/?q=10+Central+St+Suite+205,+Colorado+City,+AZ+86021"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  10 Central St Suite 205<br />Colorado City, AZ 86021
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm">
              © {currentYear} Timpson Drafting & Design. All rights reserved.
            </p>
            <p className="text-slate-500 text-sm">
              Professional Residential Drafting Services
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
