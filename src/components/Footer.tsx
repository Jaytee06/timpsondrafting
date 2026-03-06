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
              Professional residential drafting and design services. Creating accurate, code-compliant plans for homeowners and contractors throughout the local area.
            </p>
            <p className="text-slate-400 text-sm">
              Trusted by local homeowners for over a decade.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  Services
                </button>
              </li>
              <li>
                <button
                  onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  Get a Quote
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-400">43531953311</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-400">info@timpsondrafting.com</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-400">Serving the local area</span>
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
