export default function TermsAndConditions() {
  return (
    <section id="terms-and-conditions" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Terms &amp; Conditions
          </p>
          <h2 className="mb-6 text-3xl font-bold text-slate-900">Website and SMS Terms</h2>
          <div className="space-y-6 text-sm leading-7 text-slate-700 sm:text-base">
            <div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">Use of This Website</h3>
              <p>
                By using this website, you agree to provide accurate information when
                requesting a quote or contacting Timpson Drafting. Submission of a form does
                not guarantee project acceptance, scheduling availability, or a specific
                response time.
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">SMS Terms of Service</h3>
              <p>
                By opting into SMS from Timpson Drafting, you agree to receive
                conversational messages related to your request for drafting services.
              </p>
              <p className="mt-3">
                Message frequency varies depending on your interaction.
              </p>
              <p className="mt-3">
                Message and data rates may apply.
              </p>
              <p className="mt-3">
                To opt out, reply STOP at any time. For help, reply HELP or contact us at
                {' '}
                <a
                  href="tel:+14353195331"
                  className="font-medium text-emerald-700 hover:text-emerald-800"
                >
                  (435) 319-5331
                </a>
                .
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">Communications</h3>
              <p>
                Email, phone, and SMS communications are used to respond to quote requests,
                answer questions, coordinate scheduling, and provide service-related updates.
                Consent to receive SMS is optional and is not a condition of purchase.
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">Contact</h3>
              <p>
                Questions about these terms can be directed to
                {' '}
                <a
                  href="mailto:admin@timpsondrafting.com"
                  className="font-medium text-emerald-700 hover:text-emerald-800"
                >
                  admin@timpsondrafting.com
                </a>
                {' '}
                or
                {' '}
                <a
                  href="tel:+14353195331"
                  className="font-medium text-emerald-700 hover:text-emerald-800"
                >
                  (435) 319-5331
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
