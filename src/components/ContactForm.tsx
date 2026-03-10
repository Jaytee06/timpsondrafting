import { useState, useRef } from 'react';
import { Send, CheckCircle2, Mail, Phone, MapPin } from 'lucide-react';

const ADMIN_EMAIL = 'admin@timpsondrafting.com';
const TRACKING_STORAGE_KEY = 'td_tracking_params';

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

const getFirstQueryParam = (params: URLSearchParams, keys: string[]) => {
  for (const key of keys) {
    const value = params.get(key);
    if (value && value.trim()) return value.trim();
  }
  return '';
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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    projectType: '',
    description: '',
    website: '', // Honeypot field
  });
  const [trackingParams] = useState<TrackingParams>(() => readTrackingParams());

  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(e.target.files);
    }
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
    const phoneRegex = /^[\d\s()+-]{10,}$/;
    if (!phoneRegex.test(formData.phone)) {
      setErrorMessage('Please enter a valid phone number (at least 10 digits).');
      setIsLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrorMessage('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    if (formData.description.length < 20) {
      setErrorMessage('Please provide a clearer description (at least 20 characters).');
      setIsLoading(false);
      return;
    }

    //Matching CRM Lead structure
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if(key !== 'name' && key !== 'projectType')
          data.append(key, formData[key as keyof typeof formData]);
        else if(key === 'name')
          data.append('full_name', formData.name.trim());
        else if(key === 'projectType')
          data.append('project_type', formData.projectType);
      });
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
        for (let i = 0; i < files.length; i += 1) {
          const file = files.item(i);
          if (file) {
            data.append('file', file);
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

      // To-do: Setup conversion event under Timpson Drafting LP
      // if (typeof window.gtag === 'function') {
      //   window.gtag('event', 'conversion', {
      //     send_to: 'G-BXQTF3KH70/{{conversion action 'ctd'}}',
      //   });
      // }

      setSubmitted(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        projectType: '',
        description: '',
        website: '',
      });
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <section id="contact" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Get a Free Quote
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Fast response. No obligation. Local expertise.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Honeypot Field - Hidden */}
                <div className="hidden">
                  <label htmlFor="website">Website</label>
                  <input
                    type="text"
                    id="website"
                    name="website" // Must match state key
                    value={formData.website}
                    onChange={handleChange}
                    autoComplete="off"
                    tabIndex={-1}
                  />
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors outline-none"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors outline-none"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors outline-none"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label htmlFor="projectType" className="block text-sm font-semibold text-slate-700 mb-2">
                    Project Type *
                  </label>
                  <select
                    id="projectType"
                    name="projectType"
                    required
                    value={formData.projectType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors outline-none bg-white"
                  >
                    <option value="">Select a project type</option>
                    <option value="new-home">New Home</option>
                    <option value="garage">Garage / Carport</option>
                    <option value="addition">Home Addition</option>
                    <option value="remodel">Remodel / Renovation</option>
                    <option value="adu">ADU / Guest House</option>
                    <option value="asbuilt">As-Built Drawings</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-2">
                  Project Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleChange}
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors outline-none resize-none"
                  placeholder="Tell us about your project. Include details like square footage, location, timeline, and any specific requirements..."
                />
              </div>

              <div className="mb-6">
                <label htmlFor="file" className="block text-sm font-semibold text-slate-700 mb-2">
                  Attach Files (Optional)
                </label>
                <input
                  type="file"
                  id="file"
                  name="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-colors outline-none"
                  accept=".pdf,.jpg,.jpeg,.png,.dwg"
                />
                <p className="text-sm text-slate-500 mt-2">
                  Upload existing plans, sketches, or reference images (PDF, JPG, PNG, DWG)
                </p>
              </div>

              {errorMessage && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
                  {errorMessage}
                </div>
              )}

              {submitted ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <p className="text-emerald-800 font-medium">
                    Thank you! We'll get back to you within 24 hours.
                  </p>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Sending...' : 'Get My Quote'}
                  {!isLoading && <Send className="w-5 h-5" />}
                </button>
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
                    <a href="tel:43531953311" className="text-emerald-600 hover:text-emerald-700 font-medium">43531953311</a>
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
