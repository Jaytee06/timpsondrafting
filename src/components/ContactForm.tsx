import { lazy, Suspense, useState, useRef } from 'react';
import { Send, CheckCircle2, Mail, Phone, MessageCircle } from 'lucide-react';

const ChatIntake = lazy(() => import('./ChatIntake'));

const ADMIN_EMAIL = 'admin@timpsondrafting.com';
const PUBLIC_EMAIL = 'info@timpsondrafting.com';
const TRACKING_STORAGE_KEY = 'td_tracking_params';
const GOOGLE_ADS_CONVERSION_ID = 'AW-17998095514/Izg4CNGKkIYcEJrJlIZD';
const LEAD_INTAKE_API_URL =
  import.meta.env.VITE_LEAD_INTAKE_API_URL ||
  'https://n2s6trcvfc.execute-api.us-west-2.amazonaws.com/default/lead-intake/tdd/create';
const CRM_WEBHOOK_DRY_RUN = import.meta.env.VITE_CRM_WEBHOOK_DRY_RUN === 'true';
const LANDING_STORAGE_KEY = 'td_original_landing';
const REFERRER_STORAGE_KEY = 'td_original_referrer';
const SERVICE_INTEREST_LABELS: Record<string, string> = {
  'residential-drafting-services': 'Residential drafting services',
  'custom-home-plans': 'Custom home plans',
  'adu-plans': 'ADU plans',
  'home-addition-plans': 'Home addition plans',
  'garage-shop-plans': 'Garage and shop plans',
  'remodel-drafting': 'Remodel drafting',
  'as-built-drawings': 'As-built drawings',
  'stock-plan-modifications': 'Stock plan modifications',
  'permit-drawing-services': 'Permit drawing services',
  'contractor-drafting-services': 'Contractor drafting services',
  'barndominium-plans': 'Barndominium and shop plans',
  'garage-adu-addition-plans': 'Garage, ADU and addition plans',
  'remodel-as-built-drawings': 'Remodel and as-built drawings',
  'permit-services': 'Permit services',
};

const pushTrackingEvent = (event: string, details: Record<string, string | number | boolean> = {}) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event,
    page_path: window.location.pathname,
    original_landing: window.sessionStorage.getItem(LANDING_STORAGE_KEY) || window.location.href,
    original_referrer: window.sessionStorage.getItem(REFERRER_STORAGE_KEY) || document.referrer || '',
    landing_city: window.sessionStorage.getItem('td_landing_city') || '',
    landing_region: window.sessionStorage.getItem('td_landing_region') || '',
    first_touch_utm_source: window.sessionStorage.getItem('td_first_touch_utm_source') || '',
    first_touch_utm_medium: window.sessionStorage.getItem('td_first_touch_utm_medium') || '',
    first_touch_utm_campaign: window.sessionStorage.getItem('td_first_touch_utm_campaign') || '',
    ...details,
  });
};

type TrackingParams = {
  keyword: string;
  gclid: string;
  gbraid: string;
  wbraid: string;
  campaignid: string;
  utmSource: string;
  utmMedium: string;
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
  utmMedium: '',
  utmCampaign: '',
  utmTerm: '',
};

const PROJECT_TYPE_OPTIONS = [
  'Barndominium / Shop',
  'Custom Home',
  'Garage / ADU / Addition',
  'Remodel / As-Built',
  'Other',
] as const;

const TIMELINE_OPTIONS = [
  'ASAP',
  '1–3 months',
  '3–6 months',
  'Just planning',
] as const;

const CRM_FILE_UPLOAD_KEY = 'files';

type FileMetadata = {
  name: string;
  type: string;
  size: number;
};

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
    projectType: 'Custom Home',
  },
  modify: {
    heading: 'Modify Existing Plans',
    description: 'Need changes to a stock plan?',
    detail: 'Professional edits for permit prep.',
    projectType: 'Other',
  },
  addition: {
    heading: 'Home Addition Drafting',
    description: 'Expand your home with expert plans.',
    detail: 'Designs for additions and remodels.',
    projectType: 'Garage / ADU / Addition',
  },
  'not-sure': {
    heading: 'Need Design Guidance?',
    description: 'Expert advice for your home vision.',
    detail: 'Map out your project with a pro.',
    projectType: 'Other',
  },
};

const TIMELINE_PREFILLS: Record<string, SitelinkPrefill> = {
  asap: {
    heading: 'Start Your Project ASAP',
    description: 'Fast-track your permit-ready docs.',
    detail: 'Reliable plans for urgent projects.',
    timeline: 'ASAP',
  },
  exploring: {
    heading: 'Explore Design Options',
    description: 'In the early research phase?',
    detail: 'Get inspired and plan your dream.',
    timeline: 'Just planning',
  },
};

type ContactFormState = {
  name: string;
  phone: string;
  email: string;
  projectCity: string;
  projectState: string;
  projectType: string;
  squareFootage: string;
  timeline: string;
  permitServices: string;
  description: string;
  consent: boolean;
  website: string;
};

type SubmittedLead = {
  leadId: string;
  externalId: string;
  formSnapshot: Record<string, string | boolean>;
  leadDraft: LeadDraft;
};

type LeadDraft = {
  crmId?: string;
  fields: Record<string, string | boolean>;
  fieldStatus: Record<string, 'empty' | 'provided'>;
  missingRequiredFields: string[];
};

type FieldPatches = Partial<Pick<
  ContactFormState,
  'name' | 'phone' | 'email' | 'projectType' | 'projectCity' | 'projectState' | 'timeline' | 'description'
>>;

const PATCHABLE_FORM_FIELDS = [
  'name',
  'phone',
  'email',
  'projectType',
  'projectCity',
  'projectState',
  'timeline',
  'description',
] as const satisfies readonly (keyof FieldPatches)[];

const INITIAL_FORM_DATA: ContactFormState = {
  name: '',
  phone: '',
  email: '',
  projectCity: '',
  projectState: '',
  projectType: '',
  squareFootage: '',
  timeline: '',
  permitServices: '',
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

const getServiceInterest = () => {
  if (typeof window === 'undefined') return '';
  const value = new URLSearchParams(window.location.search).get('service')?.trim().toLowerCase() || '';
  return SERVICE_INTEREST_LABELS[value] || '';
};

const getInitialFormData = (): ContactFormState => {
  const sitelinkPrefill = getSitelinkPrefill();
  const searchParams = typeof window === 'undefined'
    ? new URLSearchParams()
    : new URLSearchParams(window.location.search);
  const projectCity = searchParams.get('projectCity')?.trim().slice(0, 100) || '';
  const projectStateCandidate = searchParams.get('projectState')?.trim().toUpperCase() || '';
  const projectState = /^[A-Z]{2}$/.test(projectStateCandidate) ? projectStateCandidate : '';

  return {
    ...INITIAL_FORM_DATA,
    projectCity,
    projectState,
    projectType: sitelinkPrefill?.projectType || '',
    timeline: sitelinkPrefill?.timeline || '',
  };
};

const getFirstQueryParam = (params: URLSearchParams, keys: string[]) => {
  for (const key of keys) {
    const value = params.get(key);
    if (value && value.trim()) return value.trim();
  }
  return '';
};

const fileListToArray = (fileList: FileList | null): File[] =>
  fileList ? Array.from(fileList) : [];

const buildLeadTransactionId = () => `LEAD${Date.now()}`;

const buildFileMetadata = (fileList: FileList | File[] | null): FileMetadata[] => {
  const fileArray = Array.isArray(fileList) ? fileList : fileListToArray(fileList);
  return fileArray.map((file) => ({
    name: file.name,
    type: file.type || 'unknown',
    size: file.size,
  }));
};

const fireLeadTrackingEvents = (transactionId: string, projectType: string, serviceInterest: string) => {
  // Google Ads conversion. This needs the Ads conversion label.
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'conversion', {
      send_to: GOOGLE_ADS_CONVERSION_ID,
      transaction_id: transactionId,
    });
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'quote_form_submit',
    transaction_id: transactionId,
    method: 'contact_form',
    page_path: window.location.pathname,
    project_type: projectType,
    service_interest: serviceInterest,
    original_landing: window.sessionStorage.getItem(LANDING_STORAGE_KEY) || window.location.href,
    original_referrer: window.sessionStorage.getItem(REFERRER_STORAGE_KEY) || document.referrer || '',
    landing_city: window.sessionStorage.getItem('td_landing_city') || '',
    landing_region: window.sessionStorage.getItem('td_landing_region') || '',
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
    utmMedium:
      getFirstQueryParam(searchParams, ['utm_medium']) ||
      window.sessionStorage.getItem('td_first_touch_utm_medium') ||
      storedParams.utmMedium ||
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

const buildFormSnapshot = (
  formData: ContactFormState,
  trackingParams: TrackingParams,
  uploadedFiles: FileList | File[] | null = null
): Record<string, string | boolean> => {
  const fileMetadata = buildFileMetadata(uploadedFiles);

  return {
    hasFullName: Boolean(formData.name.trim()),
    hasEmail: Boolean(formData.email.trim()),
    hasPhone: Boolean(formData.phone.trim()),
    projectType: formData.projectType,
    squareFootage: formData.squareFootage,
    projectCity: formData.projectCity.trim(),
    projectState: formData.projectState.trim(),
    timeline: formData.timeline,
    permitServices: formData.permitServices,
    description: formData.description.trim(),
    consentToText: formData.consent,
    keyword: trackingParams.keyword,
    gclid: trackingParams.gclid,
    gbraid: trackingParams.gbraid,
    wbraid: trackingParams.wbraid,
    campaignid: trackingParams.campaignid,
    utmSource: trackingParams.utmSource,
    utmMedium: trackingParams.utmMedium,
    utmCampaign: trackingParams.utmCampaign,
    utmTerm: trackingParams.utmTerm,
    filesProvided: fileMetadata.length > 0,
    fileCount: String(fileMetadata.length),
    fileNames: fileMetadata.map((file) => file.name).join(', '),
    landingPageUrl: window.location.href,
    referrer: document.referrer || '',
  };
};

const getRequiredFieldErrors = (formData: ContactFormState) => {
  const errors: Record<string, string> = {};
  const digitsOnly = formData.phone.replace(/\D/g, '');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (formData.website) errors.website = 'Spam detected.';
  if (formData.name.trim().length < 2) errors.name = 'Please enter your name.';
  if (digitsOnly.length < 10) errors.phone = 'Please enter a valid phone number (at least 10 digits).';
  if (!emailRegex.test(formData.email.trim())) errors.email = 'Please enter a valid email address.';
  if (!formData.projectCity.trim()) errors.projectCity = 'Please enter your project city.';
  if (!formData.projectState.trim()) errors.projectState = 'Please enter your project state.';
  if (!formData.projectType) errors.projectType = 'Please select what you are looking to do.';

  return errors;
};

const getMissingRequiredFields = (formData: ContactFormState) =>
  Object.keys(getRequiredFieldErrors(formData)).filter((field) => field !== 'website');

const getFirstRequiredFieldError = (formData: ContactFormState) => {
  const errors = getRequiredFieldErrors(formData);
  return Object.values(errors).find(Boolean) || '';
};

const buildLeadDraft = (
  formData: ContactFormState,
  trackingParams: TrackingParams,
  crmId?: string,
  uploadedFiles: FileList | File[] | null = null
): LeadDraft => {
  const fileMetadata = buildFileMetadata(uploadedFiles);
  const fieldStatus = {
    name: formData.name.trim() ? 'provided' : 'empty',
    email: formData.email.trim() ? 'provided' : 'empty',
    phone: formData.phone.trim() ? 'provided' : 'empty',
    projectCity: formData.projectCity.trim() ? 'provided' : 'empty',
    projectState: formData.projectState.trim() ? 'provided' : 'empty',
    projectType: formData.projectType ? 'provided' : 'empty',
    squareFootage: formData.squareFootage ? 'provided' : 'empty',
    timeline: formData.timeline ? 'provided' : 'empty',
    permitServices: formData.permitServices ? 'provided' : 'empty',
    description: formData.description.trim() ? 'provided' : 'empty',
    consent: formData.consent ? 'provided' : 'empty',
    files: fileMetadata.length > 0 ? 'provided' : 'empty',
  } satisfies LeadDraft['fieldStatus'];

  return {
    crmId,
    fields: {
      hasFullName: Boolean(formData.name.trim()),
      hasEmail: Boolean(formData.email.trim()),
      hasPhone: Boolean(formData.phone.trim()),
      projectType: formData.projectType,
      squareFootage: formData.squareFootage,
      projectCity: formData.projectCity.trim(),
      projectState: formData.projectState.trim(),
      timeline: formData.timeline,
      permitServices: formData.permitServices,
      description: formData.description.trim(),
      consentToText: formData.consent,
      keyword: trackingParams.keyword,
      campaignid: trackingParams.campaignid,
      fileCount: String(fileMetadata.length),
      fileNames: fileMetadata.map((file) => file.name).join(', '),
    },
    fieldStatus,
    missingRequiredFields: getMissingRequiredFields(formData),
  };
};

const readCrmLeadId = async (response: Response) => {
  const text = await response.text();
  if (!text.trim()) return '';

  try {
    const body = JSON.parse(text);
    return String(
      body.id ||
      body._id ||
      body.entityId ||
      body.entity_id ||
      body.data?.id ||
      body.data?._id ||
      body.imports?.[0]?.id ||
      ''
    );
  } catch {
    return '';
  }
};

const createExternalId = () =>
  `td-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

interface ContactFormProps {
  heading?: string;
  description?: string;
}

export default function ContactForm({ heading: headingOverride, description: descriptionOverride }: ContactFormProps = {}) {
  const [sitelinkPrefill] = useState<SitelinkPrefill | null>(() => getSitelinkPrefill());
  const [serviceInterest] = useState(() => getServiceInterest());
  const [formData, setFormData] = useState<ContactFormState>(() => getInitialFormData());
  const [trackingParams] = useState<TrackingParams>(() => readTrackingParams());

  const [submitted, setSubmitted] = useState(false);
  const [submittedLead, setSubmittedLead] = useState<SubmittedLead | null>(null);
  const [chatSessionId, setChatSessionId] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const externalIdRef = useRef(createExternalId());
  const draftLeadIdRef = useRef(`draft-${externalIdRef.current}`);
  const createCrmLeadPromiseRef = useRef<Promise<string> | null>(null);
  const createCrmLeadSucceededWithoutIdRef = useRef(false);
  const filesRef = useRef<File[]>([]);
  const formStartedRef = useRef(false);
  const originalLandingRef = useRef(window.sessionStorage.getItem(LANDING_STORAGE_KEY) || window.location.href);
  const originalReferrerRef = useRef(window.sessionStorage.getItem(REFERRER_STORAGE_KEY) || document.referrer || '');
  const selectedFileNames = files.map((file) => file.name);

  window.sessionStorage.setItem(LANDING_STORAGE_KEY, originalLandingRef.current);
  window.sessionStorage.setItem(REFERRER_STORAGE_KEY, originalReferrerRef.current);

  const markFormStarted = () => {
    if (formStartedRef.current) return;
    formStartedRef.current = true;
    pushTrackingEvent('quote_form_start', { form_name: 'project_quote', service_interest: serviceInterest });
  };

  const openChat = () => {
    pushTrackingEvent('chat_start', { placement: 'quote_form' });
    setChatOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = fileListToArray(e.target.files);
    if (nextFiles.length) pushTrackingEvent('file_upload', { file_count: nextFiles.length });
    filesRef.current = nextFiles;
    setFiles(nextFiles);
  };

  const handleChatFilesAdded = (nextChatFiles: File[]) => {
    const mergedFiles = [...filesRef.current, ...nextChatFiles];
    filesRef.current = mergedFiles;
    setFiles(mergedFiles);
    return mergedFiles;
  };

  const createCrmLead = async () => {
    if (submittedLead?.leadId) return submittedLead.leadId;
    if (createCrmLeadSucceededWithoutIdRef.current) {
      setErrorMessage('The lead was submitted, but the CRM id was not returned. Please refresh the CRM before trying another chat save.');
      return '';
    }
    if (createCrmLeadPromiseRef.current) {
      return createCrmLeadPromiseRef.current;
    }

    const createPromise = (async () => {
      const data = new FormData();
      const submittedFiles = files;
      const transactionId = buildLeadTransactionId();
      data.append('external_id', externalIdRef.current);
      data.append('transaction_id', transactionId);
      if (chatSessionId) data.append('openai_sid', chatSessionId);
      data.append('full_name', formData.name.trim());
      data.append('email', formData.email.trim());
      data.append('phone', formData.phone.trim());
      data.append('project_type', formData.projectType);
      data.append('approx_heated_sq_ft', formData.squareFootage.trim());
      data.append('service_interest', serviceInterest);
      data.append('project_city', formData.projectCity.trim());
      data.append('project_state', formData.projectState.trim());
      data.append('timeline', formData.timeline);
      data.append('permit_services', formData.permitServices);
      data.append('description', formData.description.trim());
      data.append('consent_to_text', String(formData.consent));
      data.append('website', formData.website);
      data.append('keyword', trackingParams.keyword);
      data.append('gclid', trackingParams.gclid);
      data.append('gbraid', trackingParams.gbraid);
      data.append('wbraid', trackingParams.wbraid);
      data.append('campaignid', trackingParams.campaignid);
      data.append('utm_source', trackingParams.utmSource);
      data.append('utm_medium', trackingParams.utmMedium);
      data.append('utm_campaign', trackingParams.utmCampaign);
      data.append('utm_term', trackingParams.utmTerm);
      data.append('adminEmail', ADMIN_EMAIL);
      data.append('landingPageUrl', originalLandingRef.current);
      data.append('landing_page', originalLandingRef.current);
      data.append('landing_city', window.sessionStorage.getItem('td_landing_city') || '');
      data.append('landing_region', window.sessionStorage.getItem('td_landing_region') || '');
      data.append('first_touch_utm_source', window.sessionStorage.getItem('td_first_touch_utm_source') || trackingParams.utmSource);
      data.append('first_touch_utm_medium', window.sessionStorage.getItem('td_first_touch_utm_medium') || trackingParams.utmMedium);
      data.append('first_touch_utm_campaign', window.sessionStorage.getItem('td_first_touch_utm_campaign') || trackingParams.utmCampaign);
      data.append('referrer', originalReferrerRef.current);

      if (submittedFiles.length > 0) {
        data.append(CRM_FILE_UPLOAD_KEY, JSON.stringify({ uploadKey: CRM_FILE_UPLOAD_KEY }));
        submittedFiles.forEach((file) => data.append(CRM_FILE_UPLOAD_KEY, file));
      }

      if (!LEAD_INTAKE_API_URL) {
        throw new Error('Missing lead intake configuration');
      }

      if (CRM_WEBHOOK_DRY_RUN) {
        return '';
      }

      const response = await fetch(LEAD_INTAKE_API_URL, {
        method: 'POST',
        body: data,
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      const leadId = await readCrmLeadId(response);
      const formSnapshot = buildFormSnapshot(formData, trackingParams, submittedFiles);
      const submittedLeadDraft = buildLeadDraft(formData, trackingParams, leadId, submittedFiles);

      fireLeadTrackingEvents(transactionId, formData.projectType, serviceInterest);

      setSubmitted(true);
      if (leadId) {
        setSubmittedLead({
          leadId,
          externalId: externalIdRef.current,
          formSnapshot,
          leadDraft: submittedLeadDraft,
        });
      } else {
        createCrmLeadSucceededWithoutIdRef.current = true;
        setSubmittedLead({
          leadId: '',
          externalId: externalIdRef.current,
          formSnapshot,
          leadDraft: submittedLeadDraft,
        });
        setErrorMessage('The lead was submitted, but the CRM id was not returned. Chat details will not be saved until the lead can be matched.');
      }
      return leadId;
    })();

    createCrmLeadPromiseRef.current = createPromise;

    try {
      return await createPromise;
    } catch (error) {
      console.error('Submission error:', error);
      pushTrackingEvent('quote_form_error', {
        form_name: 'project_quote',
        service_interest: serviceInterest,
        error_type: 'network_or_crm',
      });
      setErrorMessage('Something went wrong. Please try again or contact us directly.');
      return '';
    } finally {
      createCrmLeadPromiseRef.current = null;
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

    const validationMessage = getFirstRequiredFieldError(formData);
    if (validationMessage) {
      pushTrackingEvent('quote_form_validation_error', {
        form_name: 'project_quote',
        service_interest: serviceInterest,
        error_message: validationMessage,
      });
      setErrorMessage(validationMessage);
      setIsLoading(false);
      return;
    }

    await createCrmLead();
    setIsLoading(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    markFormStarted();
    const { name, type, value } = e.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleFieldPatches = (fieldPatches: FieldPatches) => {
    setFormData((current) => {
      const nextPatches = PATCHABLE_FORM_FIELDS.reduce<Partial<ContactFormState>>((patches, key) => {
        const value = fieldPatches[key];
        if (typeof value === 'string' && value.trim() && !current[key]) {
          patches[key] = value.trim();
        }
        return patches;
      }, {});

      return {
        ...current,
        ...nextPatches,
      };
    });
  };

  const ensureCrmLead = async () => {
    if (submittedLead?.leadId) return submittedLead.leadId;
    if (createCrmLeadSucceededWithoutIdRef.current) {
      setErrorMessage('The lead was submitted, but the CRM id was not returned. Please refresh the CRM before trying another chat save.');
      return '';
    }
    const missingRequiredFields = getMissingRequiredFields(formData);
    if (missingRequiredFields.length > 0 || formData.website) {
      return '';
    }
    return createCrmLead();
  };

  const heading = headingOverride || sitelinkPrefill?.heading || 'Tell Us About Your Project';
  const description = descriptionOverride || (sitelinkPrefill
    ? `${sitelinkPrefill.description} ${sitelinkPrefill.detail}`
    : 'Share a few details and any reference files you have. We\'ll follow up with next steps.');
  const currentFormSnapshot = buildFormSnapshot(formData, trackingParams, files);
  const activeChatLead: SubmittedLead = submittedLead?.leadId ? submittedLead : {
    leadId: draftLeadIdRef.current,
    externalId: externalIdRef.current,
    formSnapshot: currentFormSnapshot,
    leadDraft: buildLeadDraft(formData, trackingParams, undefined, files),
  };
  const leadDraft = submittedLead?.leadDraft || buildLeadDraft(formData, trackingParams, undefined, files);

  return (
    <section id="contact" className="section-space bg-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="plan-label mb-3">Start a project</p>
          <h2 className="font-display text-4xl font-bold uppercase text-ink sm:text-5xl mb-4">
            {heading}
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            {description}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} onFocus={markFormStarted} className="border border-steel/25 bg-white p-8 shadow-lg">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-blueprint">
                    Project lead form
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Complete the fields below, or use chat to add extra project context.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden text-sm font-medium text-slate-500 sm:inline">
                    AI Assistant
                  </span>
                  <button
                    type="button"
                    onClick={openChat}
                    aria-label="Open AI project chat"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-blueprint/20 bg-paper text-blueprint transition-colors hover:border-orange hover:text-orange focus:outline-none focus:ring-4 focus:ring-blueprint/10"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {serviceInterest && (
                <div className="mb-6 rounded border border-blueprint/20 bg-paper px-4 py-3 text-sm text-blueprint">
                  <strong>Service selected:</strong> {serviceInterest}. You can still choose the project
                  type that best describes the work below.
                </div>
              )}

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
                    className="w-full rounded border border-slate-300 px-4 py-3 outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20"
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
                    className="w-full rounded border border-slate-300 px-4 py-3 outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20"
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
                    className="w-full rounded border border-slate-300 px-4 py-3 outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20"
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
                    className="w-full rounded border border-slate-300 px-4 py-3 outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20"
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
                    className="w-full rounded border border-slate-300 px-4 py-3 outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20"
                    placeholder="UT"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="squareFootage" className="mb-2 block text-sm font-semibold text-slate-700">
                  Approx. heated sq ft <span className="ml-2 font-medium text-slate-500">Optional</span>
                </label>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  id="squareFootage"
                  name="squareFootage"
                  value={formData.squareFootage}
                  onChange={handleChange}
                  className="w-full rounded border border-slate-300 px-4 py-3 outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20"
                  placeholder="2,400"
                />
              </div>

              <div className="mb-6 grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="projectType" className="mb-2 block text-sm font-semibold text-slate-700">Project type *</label>
                  <select id="projectType" name="projectType" required value={formData.projectType} onChange={handleChange} className="w-full rounded border border-slate-300 bg-white px-4 py-3 outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20">
                    <option value="">Select a project type</option>
                    {PROJECT_TYPE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="timeline" className="mb-2 block text-sm font-semibold text-slate-700">Timeline <span className="ml-2 font-medium text-slate-500">Optional</span></label>
                  <select id="timeline" name="timeline" value={formData.timeline} onChange={handleChange} className="w-full rounded border border-slate-300 bg-white px-4 py-3 outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20">
                    <option value="">Select a timeline</option>
                    {TIMELINE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="permitServices" className="mb-2 block text-sm font-semibold text-slate-700">
                  Need permit services? <span className="ml-2 font-medium text-slate-500">Optional</span>
                </label>
                <select
                  id="permitServices"
                  name="permitServices"
                  value={formData.permitServices}
                  onChange={handleChange}
                  className="w-full rounded border border-slate-300 bg-white px-4 py-3 outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20"
                >
                  <option value="">Select one</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Not sure">Not sure</option>
                </select>
              </div>

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
                  className="w-full resize-none rounded border border-slate-300 px-4 py-3 text-slate-800 outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20"
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
                  onChange={handleFileChange}
                  className="w-full rounded border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none file:mr-4 file:rounded file:border-0 file:bg-blueprint file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-orange focus:border-orange focus:ring-2 focus:ring-orange/20"
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
                <div>
                  <div
                    role="status"
                    className="flex items-center gap-3 rounded border border-blueprint/25 bg-paper p-4"
                  >
                    <CheckCircle2 className="h-6 w-6 text-blueprint" />
                    <p className="font-medium text-blueprint">
                      Thank you. Your project details were sent successfully, and we&apos;ll follow up
                      soon.
                    </p>
                  </div>

                  {submittedLead && (
                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={openChat}
                        className="inline-flex items-center justify-center gap-2 rounded bg-orange px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#a94718]"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Add AI follow-up details
                      </button>
                    </div>
                  )}
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
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-orange focus:ring-orange"
                      />
                      <span className="leading-6">
                        I agree to receive SMS from Timpson Drafting about my inquiry,
                        updates, scheduling, and service-related communication. Message
                        frequency varies. Message and data rates may apply. Reply STOP to
                        opt out and HELP for help. Consent is not a condition of purchase.
                      </span>
                    </label>
                  </div>

                  <div className="border border-steel/30 bg-paper p-4 text-xs leading-5 text-steel">
                    TDD is a residential design and drafting firm, not a licensed architect or engineer. Our mechanical, electrical and plumbing plans are construction planning documents, not stamped engineering. Where your jurisdiction requires a licensed professional, our plans give them a detailed head start.
                  </div>

                  <p className="text-xs leading-5 text-slate-500">
                    By submitting this form, you confirm the phone number above is yours and,
                    if checked, you consent to receive SMS from Timpson Drafting. See our
                    {' '}
                    <a href="/privacy/" className="font-medium text-blueprint hover:text-orange">
                      Privacy Policy
                    </a>
                    {' '}
                    and
                    {' '}
                    <a
                      href="/terms/"
                      className="font-medium text-blueprint hover:text-orange"
                    >
                      Terms &amp; Conditions
                    </a>
                    .
                  </p>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-orange hover:bg-[#A94718] disabled:bg-orange/40 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {isLoading ? 'Sending...' : 'Send My Project'}
                    {!isLoading && <Send className="w-5 h-5" />}
                  </button>
                </div>
              )}
            </form>
          </div>

          <div className="space-y-6">
            <aside className="border border-blueprint/20 bg-blueprint p-8 text-white" aria-labelledby="quote-expectations-heading">
              <p className="plan-label text-[#F3A06F]">Project expectations</p>
              <h3 id="quote-expectations-heading" className="mt-2 font-display text-2xl font-bold uppercase">Clear numbers. Clear timing.</h3>
              <dl className="mt-7 grid gap-6">
                <div className="border-t border-white/20 pt-4"><dt className="text-xs font-bold uppercase tracking-[.12em] text-white/55">Pricing</dt><dd className="mt-2 font-semibold">$1.50/sq ft · $3,000 minimum · or by bid</dd></div>
                <div className="border-t border-white/20 pt-4"><dt className="text-xs font-bold uppercase tracking-[.12em] text-white/55">Initial concept</dt><dd className="mt-2 font-semibold">10 business days</dd></div>
                <div className="border-t border-white/20 pt-4"><dt className="text-xs font-bold uppercase tracking-[.12em] text-white/55">Construction drawings</dt><dd className="mt-2 font-semibold">Two weeks after approval</dd></div>
              </dl>
            </aside>

            <div className="border border-blueprint/20 bg-white p-8">
              <h3 className="mb-6 font-display text-xl font-bold uppercase text-ink">Talk with TDD</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-blueprint/10">
                    <Phone className="h-5 w-5 text-blueprint" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Phone</p>
                    <a href="tel:+14353195331" className="font-medium text-blueprint hover:text-orange">
                      (435) 319-5331
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-blueprint/10">
                    <Mail className="h-5 w-5 text-blueprint" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Email</p>
                    <a
                      href={`mailto:${PUBLIC_EMAIL}`}
                      className="text-slate-600 transition-colors hover:text-orange"
                    >
                      {PUBLIC_EMAIL}
                    </a>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {chatOpen && (
        <Suspense fallback={null}>
          <ChatIntake
            leadId={activeChatLead.leadId}
            externalId={activeChatLead.externalId}
            formSnapshot={activeChatLead.formSnapshot}
            leadDraft={leadDraft}
            sessionFiles={files}
            ensureCrmLead={ensureCrmLead}
            onSessionStarted={setChatSessionId}
            onFieldPatches={handleFieldPatches}
            onFilesAdded={handleChatFilesAdded}
            isOpen={chatOpen}
            onOpen={openChat}
            onClose={() => setChatOpen(false)}
          />
        </Suspense>
      )}
    </section>
  );
}
