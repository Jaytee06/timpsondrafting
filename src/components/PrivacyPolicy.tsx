export default function PrivacyPolicy() {
  return (
    <section id="privacy-policy" className="bg-white py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 shadow-sm sm:p-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Privacy Policy
          </p>
          <h2 className="mb-6 text-3xl font-bold text-slate-900">How We Use Your Information</h2>
          <div className="space-y-6 text-sm leading-7 text-slate-700 sm:text-base">
            <p>
              Timpson Drafting uses the information you submit to respond to your inquiry,
              prepare quotes, schedule work, and provide service-related communication.
            </p>

            <div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                Information We Collect
              </h3>
              <p>
                We may collect the information you provide through this website, including
                your name, email address, phone number, project details, uploaded files, and
                other information relevant to your request.
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">SMS Communication</h3>
              <p>
                If you provide your phone number, you consent to receive SMS messages from
                Timpson Drafting related to your inquiry, including updates, scheduling, and
                service-related communication.
              </p>
              <p className="mt-3">
                Message frequency varies. Message and data rates may apply.
              </p>
              <p className="mt-3">
                You may opt out at any time by replying STOP. We do not sell or share your
                phone number with third parties for marketing purposes.
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                How We Use Information
              </h3>
              <p>
                We use submitted information to contact you, provide estimates, manage
                appointments, deliver requested services, maintain business records, and
                improve our website and customer communications.
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                Information Sharing
              </h3>
              <p>
                We do not sell your personal information. We may share information only with
                service providers that support our business operations, such as website,
                hosting, communication, or customer management tools, and only as needed to
                operate our business and respond to your request.
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">Data Security</h3>
              <p>
                We use reasonable administrative and technical measures to protect the
                information submitted through this website. No method of transmission or
                storage is guaranteed to be completely secure.
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">Your Choices</h3>
              <p>
                You may contact us to update your information or request that we stop using
                your contact information for follow-up communications. SMS recipients may opt
                out at any time by replying STOP.
              </p>
            </div>

            <p>
              We do not use your submitted contact information for unrelated third-party
              marketing. If you need help regarding a message from us, contact
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
    </section>
  );
}
