import { useState, useRef } from 'react';
import { Send, CheckCircle2, Mail, Phone, MapPin } from 'lucide-react';

const ADMIN_EMAIL = 'admin@timpsondrafting.com';
const TRACKING_STORAGE_KEY = 'td_tracking_params';
const GA4_MEASUREMENT_ID = 'G-BXQTF3KH70';
const GOOGLE_ADS_CONVERSION_ID = 'AW-17998095514/Izg4CNGKkIYcEJrJlIZD';

type TrackingParams = {
  keyword: string;
  gclid: string;
  gbraid: string;
  wbraid: string;
  campaignid: string;
  utmSource: string;
  utmCampaign: string;
  utmTerm: string;
};

const EMPTY_TRACKING_PARAMS: TrackingParams = {
  keyword: '',
  gclid: '',
  gbraid: '',
  wbraid: '',
  campaignid: '',
  utmSource: '',
  utmCampaign: '',
  utmTerm: '',
};

const PROJECT_TYPE_OPTIONS = [
  'Build a custom home',
  'Modify an existing plan',
  'Addition or remodel',
  "Not sure - I'd like some guidance",
] as const;

const TIMELINE_OPTIONS = [
  'As soon as possible',
  '1-3 months',
  'No rush / just exploring',
] as const;

const CRM_FILE_UPLOAD_KEY = 'files';

type SitelinkPrefill = {
  heading: string;
  description: string;
  detail: string;
  projectType?: (typeof PROJECT_TYPE_OPTIONS)[number];
  timeline?: (typeof TIMELINE_OPTIONS)[number];
};

const TYPE_PREFILLS: Record<string, SitelinkPrefill> = {
  custom: {
    heading: 'Custom Home Design',
    description: 'Turn your vision into expert plans.',
    detail: 'Full 3D residential design docs.',
    projectType: 'Build a custom home',
  },
  modify: {
    heading: 'Modify Existing Plans',
    description: 'Need changes to a stock plan?',
    detail: 'Professional edits for permit prep.',
    projectType: 'Modify an existing plan',
  },
  addition: {
    heading: 'Home Addition Drafting',
    description: 'Expand your home with expert plans.',
    detail: 'Designs for additions and remodels.',
    projectType: 'Addition or remodel',
  },
  'not-sure': {
    heading: 'Need Design Guidance?',
    description: 'Expert advice for your home vision.',
    detail: 'Map out your project with a pro.',
    projectType: "Not sure - I'd like some guidance",
  },
};

const TIMELINE_PREFILLS: Record<string, SitelinkPrefill> = {
  asap: {
    heading: 'Start Your Project ASAP',
    description: 'Fast-track your permit-ready docs.',
    detail: 'Reliable plans for urgent projects.',
    timeline: 'As soon as possible',
  },
  exploring: {
    heading: 'Explore Design Options',
    description: 'In the early research phase?',
    detail: 'Get inspired and plan your dream.',
    timeline: 'No rush / just exploring',
  },
};

type ContactFormState = {
  name: string;
  phone: string;
  email: string;
  projectCity: string;
  projectState: string;
  projectType: string;
  timeline: string;
  description: string;
  consent: boolean;
  website: string;
};

const INITIAL_FORM_DATA: ContactFormState = {
  name: '',
  phone: '',
  email: '',
  projectCity: '',
  projectState: '',
  projectType: '',
  timeline: '',
  description: '',
  consent: false,
  website: '',
};

const getSitelinkPrefill = () => {
  if (typeof window === 'undefined') return null;

  const searchParams = new URLSearchParams(window.location.search);
  const href = window.location.href.toLowerCase();
  const type = searchParams.get('type')?.trim().toLowerCase();
  const timeline = searchParams.get('timeline')?.trim().toLowerCase();

  if (type && TYPE_PREFILLS[type]) return TYPE_PREFILLS[type];
  if (timeline && TIMELINE_PREFILLS[timeline]) return TIMELINE_PREFILLS[timeline];

  for (const [key, prefill] of Object.entries(TYPE_PREFILLS)) {
    if (href.includes(`type=${key}`)) return prefill;
  }

  for (const [key, prefill] of Object.entries(TIMELINE_PREFILLS)) {
    if (href.includes(`timeline=${key}`)) return prefill;
  }

  return null;
};

const getInitialFormData = (): ContactFormState => {
  const sitelinkPrefill = getSitelinkPrefill();

  return {
    ...INITIAL_FORM_DATA,
    projectType: sitelinkPrefill?.projectType || '',
    timeline: sitelinkPrefill?.timeline || '',
  };
};

const getOptionCardClass = (selected: boolean) =>
  `flex h-full cursor-pointer rounded-xl border p-4 transition-all ${
    selected
      ? 'border-emerald-500 bg-emerald-50 shadow-sm ring-1 ring-emerald-200'
      : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
  }`;

const getFirstQueryParam = (params: URLSearchParams, keys: string[]) => {
  for (const key of keys) {
    const value = params.get(key);
    if (value && value.trim()) return value.trim();
  }
  return '';
};

const fireLeadTrackingEvents = () => {
  if (typeof window.gtag !== 'function') return;

  // Google Ads conversion. This needs the Ads conversion label.
  window.gtag('event', 'conversion', {
    send_to: GOOGLE_ADS_CONVERSION_ID,
  });

  // GA4 recommended event. Keep the destination explicit for Tag Assistant visibility.
  window.gtag('event', 'generate_lead', {
    send_to: GA4_MEASUREMENT_ID,
    method: 'contact_form',
  });
};

const readTrackingParams = (): TrackingParams => {
  if (typeof window === 'undefined') return EMPTY_TRACKING_PARAMS;

  let storedParams: Partial<TrackingParams> = {};
  const rawStoredParams = window.sessionStorage.getItem(TRACKING_STORAGE_KEY);
  if (rawStoredParams) {
    try {
      storedParams = JSON.parse(rawStoredParams) as Partial<TrackingParams>;
    } catch {
      storedParams = {};
    }
  }

  const searchParams = new URLSearchParams(window.location.search);
  const currentParams: TrackingParams = {
    keyword:
      getFirstQueryParam(searchParams, ['keyword', 'kw', 'utm_term']) ||
      storedParams.keyword ||
      '',
    gclid:
      getFirstQueryParam(searchParams, ['gclid']) ||
      storedParams.gclid ||
      '',
    gbraid:
      getFirstQueryParam(searchParams, ['gbraid']) ||
      storedParams.gbraid ||
      '',
    wbraid:
      getFirstQueryParam(searchParams, ['wbraid']) ||
      storedParams.wbraid ||
      '',
    campaignid:
      getFirstQueryParam(searchParams, ['campaignid', 'campaign_id', 'utm_campaign']) ||
      storedParams.campaignid ||
      '',
    utmSource:
      getFirstQueryParam(searchParams, ['utm_source']) ||
      storedParams.utmSource ||
      '',
    utmCampaign:
      getFirstQueryParam(searchParams, ['utm_campaign', 'campaignid', 'campaign_id']) ||
      storedParams.utmCampaign ||
      storedParams.campaignid ||
      '',
    utmTerm:
      getFirstQueryParam(searchParams, ['utm_term', 'keyword', 'kw']) ||
      storedParams.utmTerm ||
      storedParams.keyword ||
      '',
  };

  window.sessionStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(currentParams));
  return currentParams;
};

export default function ContactForm() {
  const [sitelinkPrefill] = useState<SitelinkPrefill | null>(() => getSitelinkPrefill());
  const [formData, setFormData] = useState<ContactFormState>(() => getInitialFormData());
  const [trackingParams] = useState<TrackingParams>(() => readTrackingParams());

  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileNames = files ? Array.from(files).map((file) => file.name) : [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files && e.target.files.length > 0 ? e.target.files : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    // Honeypot check
    if (formData.website) {
      // Spam detected - simulate success
      setSubmitted(true);
      setIsLoading(false);
      setTimeout(() => setSubmitted(false), 5000);
      return;
    }

    // Validation
    const digitsOnly = formData.phone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      setErrorMessage('Please enter a valid phone number (at least 10 digits).');
      setIsLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    if (formData.name.trim().length < 2) {
      setErrorMessage('Please enter your name.');
      setIsLoading(false);
      return;
    }

    if (!formData.projectCity.trim()) {
      setErrorMessage('Please enter your project city.');
      setIsLoading(false);
      return;
    }

    if (!formData.projectState.trim()) {
      setErrorMessage('Please enter your project state.');
      setIsLoading(false);
      return;
    }

    if (!formData.projectType) {
      setErrorMessage('Please select what you are looking to do.');
      setIsLoading(false);
      return;
    }

    if (!formData.timeline) {
      setErrorMessage('Please select your timeline.');
      setIsLoading(false);
      return;
    }

    //Matching CRM Lead structure
    try {
      const data = new FormData();
      data.append('full_name', formData.name.trim());
      data.append('email', formData.email.trim());
      data.append('phone', formData.phone.trim());
      data.append('project_type', formData.projectType);
      data.append('project_city', formData.projectCity.trim());
      data.append('project_state', formData.projectState.trim());
      data.append('timeline', formData.timeline);
      data.append('description', formData.description.trim());
      data.append('consent_to_text', String(formData.consent));
      data.append('website', formData.website);
      data.append('keyword', trackingParams.keyword);
      data.append('gclid', trackingParams.gclid);
      data.append('gbraid', trackingParams.gbraid);
      data.append('wbraid', trackingParams.wbraid);
      data.append('campaignid', trackingParams.campaignid);
      data.append('utm_source', trackingParams.utmSource);
      data.append('utm_campaign', trackingParams.utmCampaign);
      data.append('utm_term', trackingParams.utmTerm);
      data.append('adminEmail', ADMIN_EMAIL);
      data.append('landingPageUrl', window.location.href);
      data.append('referrer', document.referrer || '');

      if (files) {
        data.append(CRM_FILE_UPLOAD_KEY, JSON.stringify({ uploadKey: CRM_FILE_UPLOAD_KEY }));
        for (let i = 0; i < files.length; i += 1) {
          const file = files.item(i);
          if (file) {
            data.append(CRM_FILE_UPLOAD_KEY, file);
          }
        }
      }

      const API_ENDPOINT = 'https://app.timpsondrafting.com/api/webhooks/event?apiKey=U2FsdGVkX1%2BReFsivY3REPgy9sV4HxDF7kjb91a9tdJ2a2IjPueKPkWqtKmQYcE0OBaIAwC91d4bH%2FOoHc71rw%3D%3D';

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        body: data,
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      fireLeadTrackingEvents();

      setSubmitted(true);
      setFormData(getInitialFormData());
      setFiles(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error('Submission error:', error);
      setErrorMessage('Something went wrong. Please try again or contact us directly.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, type, value } = e.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const heading = sitelinkPrefill?.heading || 'Tell Us About Your Project';
  const description = sitelinkPrefill
    ? `${sitelinkPrefill.description} ${sitelinkPrefill.detail}`
    : 'Share a few details and any reference files you have. We\'ll follow up with next steps.';

  return (
    <section id="contact" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            {heading}
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            {description}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
              <div className="hidden">
                <label htmlFor="website">Website</label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  autoComplete="off"
                  tabIndex={-1}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    autoComplete="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors outline-none"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors outline-none"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors outline-none"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="projectCity" className="block text-sm font-semibold text-slate-700 mb-2">
                    Project City *
                  </label>
                  <input
                    type="text"
                    id="projectCity"
                    name="projectCity"
                    required
                    autoComplete="address-level2"
                    value={formData.projectCity}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors outline-none"
                    placeholder="St. George"
                  />
                </div>

                <div>
                  <label htmlFor="projectState" className="block text-sm font-semibold text-slate-700 mb-2">
                    Project State *
                  </label>
                  <input
                    type="text"
                    id="projectState"
                    name="projectState"
                    required
                    autoComplete="address-level1"
                    value={formData.projectState}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors outline-none"
                    placeholder="UT"
                  />
                </div>
              </div>

              <fieldset className="mb-6">
                <legend className="block text-sm font-semibold text-slate-700 mb-3">
                  What are you looking to do? *
                </legend>
                <div className="grid sm:grid-cols-2 gap-4">
                  {PROJECT_TYPE_OPTIONS.map((option) => {
                    const selected = formData.projectType === option;

                    return (
                      <label key={option} className={getOptionCardClass(selected)}>
                        <input
                          type="radio"
                          name="projectType"
                          value={option}
                          checked={selected}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                              selected ? 'border-emerald-600 bg-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                selected ? 'bg-emerald-600' : 'bg-transparent'
                              }`}
                            />
                          </span>
                          <span className="text-sm font-medium text-slate-800 leading-6">{option}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="mb-6">
                <legend className="block text-sm font-semibold text-slate-700 mb-3">
                  What&apos;s your timeline? *
                </legend>
                <div className="grid gap-4 md:grid-cols-3">
                  {TIMELINE_OPTIONS.map((option) => {
                    const selected = formData.timeline === option;

                    return (
                      <label key={option} className={getOptionCardClass(selected)}>
                        <input
                          type="radio"
                          name="timeline"
                          value={option}
                          checked={selected}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                              selected ? 'border-emerald-600 bg-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                selected ? 'bg-emerald-600' : 'bg-transparent'
                              }`}
                            />
                          </span>
                          <span className="text-sm font-medium text-slate-800 leading-6">{option}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mb-6">
                <label htmlFor="description" className="mb-2 block text-sm font-semibold text-slate-700">
                  Project details
                  <span className="ml-2 font-medium text-slate-500">Optional</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={5}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 outline-none transition-colors resize-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  placeholder="Share anything helpful about the project, such as scope, square footage, existing conditions, or questions you want to discuss."
                />
              </div>

              <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50/80 p-5">
                <label htmlFor="file" className="block text-sm font-semibold text-slate-700 mb-2">
                  Upload anything you have (sketches, plans, inspiration)
                  <span className="ml-2 font-medium text-slate-500">Optional</span>
                </label>
                <input
                  type="file"
                  id="file"
                  name="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="w-full rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-emerald-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                  accept=".pdf,.jpg,.jpeg,.png,.dwg"
                />
                <p className="mt-2 text-sm text-slate-500">
                  Share sketches, existing plans, reference photos, or inspiration images if you
                  have them.
                </p>
                {selectedFileNames.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-slate-600">
                    {selectedFileNames.map((fileName, index) => (
                      <li key={`${fileName}-${index}`}>{fileName}</li>
                    ))}
                  </ul>
                )}
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm"
                >
                  {errorMessage}
                </div>
              )}

              {submitted ? (
                <div
                  role="status"
                  className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3"
                >
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <p className="text-emerald-800 font-medium">
                    Thank you. Your project details were sent successfully, and we&apos;ll follow up
                    soon.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <label htmlFor="consent" className="flex items-start gap-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        id="consent"
                        name="consent"
                        checked={formData.consent}
                        onChange={handleChange}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="leading-6">
                        I agree to receive SMS from Timpson Drafting about my inquiry,
                        updates, scheduling, and service-related communication. Message
                        frequency varies. Message and data rates may apply. Reply STOP to
                        opt out and HELP for help. Consent is not a condition of purchase.
                      </span>
                    </label>
                  </div>

                  <p className="text-xs leading-5 text-slate-500">
                    By submitting this form, you confirm the phone number above is yours and,
                    if checked, you consent to receive SMS from Timpson Drafting. See our
                    {' '}
                    <a href="#privacy-policy" className="font-medium text-emerald-700 hover:text-emerald-800">
                      Privacy Policy
                    </a>
                    {' '}
                    and
                    {' '}
                    <a
                      href="#terms-and-conditions"
                      className="font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Terms &amp; Conditions
                    </a>
                    .
                  </p>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {isLoading ? 'Sending...' : 'Submit Project Details'}
                    {!isLoading && <Send className="w-5 h-5" />}
                  </button>
                </div>
              )}
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl p-8 shadow-lg border border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Contact Information</h3>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Phone</p>
                    <a href="tel:+14353195331" className="text-emerald-600 hover:text-emerald-700 font-medium">
                      (435) 319-5331
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Email</p>
                    <p className="text-slate-600">info@timpsondrafting.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Location</p>
                    <a href="https://maps.google.com/?q=10+Central+St+Suite+205,+Colorado+City,+AZ+86021" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-emerald-600 transition-colors">10 Central St Suite 205<br />Colorado City, AZ 86021</a>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200 aspect-square bg-slate-900">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3183.176472658897!2d-112.97746352358988!3d36.9934273767083!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80cadd4fe6f26e51%3A0x627d057760e86230!2s10%20Central%20St%20STE%20205%2C%20Colorado%20City%2C%20AZ%2086021!5e0!3m2!1sen!2sus!4v1710375486522!5m2!1sen!2sus"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Office Location"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
