const transparency = 'TDD is a residential design and drafting firm, not a licensed architect or engineer. Our mechanical, electrical and plumbing plans are construction planning documents, not stamped engineering. Where your jurisdiction requires a licensed professional, our plans give them a detailed head start.';

export default function Footer() {
  return (
    <footer className="bg-ink pb-20 text-white md:pb-0">
      <div className="section-shell grid gap-10 py-14 md:grid-cols-3">
        <div>
          <p className="font-display text-3xl font-bold uppercase">Timpson Drafting &amp; Design</p>
          <p className="mt-3 font-semibold">Residential drafting informed by building experience.</p>
          <p className="mt-5 text-white/65"><a href="tel:+14353195311">435-319-5311</a><br /><a href="mailto:info@timpsondrafting.com">info@timpsondrafting.com</a></p>
        </div>
        <div>
          <p className="plan-label text-white/50">Services</p>
          <p className="mt-4 grid gap-2 text-white/70"><a href="/barndominium-plans/">Barndominiums &amp; Shops</a><a href="/custom-home-plans/">Custom Homes</a><a href="/garage-adu-addition-plans/">Garages, ADUs &amp; Additions</a><a href="/remodel-as-built-drawings/">Remodels &amp; As-Builts</a><a href="/permit-services/">Permit Services</a></p>
        </div>
        <div>
          <p className="plan-label text-white/50">Explore</p>
          <p className="mt-4 grid gap-2 text-white/70"><a href="/projects/">Projects</a><a href="/viewer">3D Viewer</a><a href="/about/">About</a><a href="/quote/">Get a Quote</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></p>
        </div>
      </div>
      <div className="border-t border-white/10"><div className="section-shell py-7 text-xs leading-5 text-white/50"><p>{transparency}</p><p className="mt-4">© {new Date().getFullYear()} Timpson Drafting &amp; Design</p></div></div>
    </footer>
  );
}
