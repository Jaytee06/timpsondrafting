import { Menu, Phone, X } from 'lucide-react';
import { useState } from 'react';

const navigation = [
  ['Services', '/services/'],
  ['Build-Ready Planning', '/build-ready-planning/'],
  ['Projects', '/projects/'],
  ['3D Viewer', '/viewer'],
  ['About', '/about/'],
  ['Get a Quote', '/quote/'],
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-blueprint text-white">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-white focus:p-3 focus:text-ink">
        Skip to content
      </a>
      <div className="section-shell flex items-center gap-5 py-3">
        <a href="/" className="mr-auto leading-none" aria-label="Timpson Drafting and Design home">
          <span className="block font-display text-lg font-semibold tracking-tight sm:text-xl">Timpson</span>
          <span className="mt-1 block text-xs font-medium tracking-wide text-white/75">Drafting &amp; Design</span>
        </a>
        <nav aria-label="Primary" className="hidden items-center gap-5 lg:flex">
          {navigation.map(([label, href]) => <a key={href} href={href} className="text-sm font-semibold text-white/85 transition hover:text-white">{label}</a>)}
        </nav>
        <a href="tel:+14353195311" className="hidden items-center gap-2 text-sm font-semibold xl:flex"><Phone className="h-4 w-4" />435-319-5311</a>
        <a href="/quote/" className="hidden min-h-12 items-center justify-center rounded border border-orange px-6 py-3 text-sm font-bold text-[#F3A06F] transition hover:bg-orange hover:text-white sm:inline-flex">Request a Quote</a>
        <a href="tel:+14353195311" className="p-2 sm:hidden" aria-label="Call Timpson Drafting"><Phone className="h-5 w-5" /></a>
        <button type="button" className="p-2 lg:hidden" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X /> : <Menu />}</button>
      </div>
      {open && (
        <nav id="mobile-navigation" aria-label="Mobile" className="border-t border-white/10 bg-blueprint px-4 py-4 lg:hidden">
          {navigation.map(([label, href]) => <a key={href} href={href} className="block border-b border-white/10 py-3 font-semibold" onClick={() => setOpen(false)}>{label}</a>)}
        </nav>
      )}
    </header>
  );
}
