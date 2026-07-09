import { useEffect, useRef, useState } from 'react';
import { Bot, CheckCircle2, Loader2, MessageCircle, Paperclip, Send, X, XCircle } from 'lucide-react';

const AI_CHAT_API_URL = import.meta.env.VITE_AI_CHAT_API_URL;
const COMPANY_ID = import.meta.env.VITE_COMPANY_ID || 'timpson-drafting-design';
const LEAD_INTAKE_UPDATE_API_URL =
  import.meta.env.VITE_LEAD_INTAKE_UPDATE_API_URL ||
  'https://n2s6trcvfc.execute-api.us-west-2.amazonaws.com/default/lead-intake/tdd/update';
const CRM_WEBHOOK_DRY_RUN = import.meta.env.VITE_CRM_WEBHOOK_DRY_RUN === 'true';
const BUSINESS_TIME_ZONE = 'America/Denver';
const CRM_FILE_UPLOAD_KEY = 'files';

type ChatStatus = 'idle' | 'connecting' | 'connected' | 'thinking' | 'error' | 'completed';

type ChatMessage = {
  role: 'assistant' | 'user';
  content: string;
};

type EnrichmentPayload = {
  id: string;
  _id: string;
  description: string;
  ai_chat_status?: string;
  ai_chat_summary?: string;
  ai_chat_collected_context?: Record<string, unknown>;
  ai_chat_transcript?: string;
  ai_chat_updated_at?: string;
  ai_chat_completed_at?: string;
};

type LeadDraft = {
  crmId?: string;
  fields: Record<string, string | boolean>;
  fieldStatus: Record<string, 'empty' | 'provided'>;
  missingRequiredFields: string[];
};

type FieldPatches = Partial<{
  name: string;
  projectType: string;
  projectCity: string;
  projectState: string;
  timeline: string;
  description: string;
}>;

type ChatIntakeProps = {
  leadId: string;
  externalId: string;
  formSnapshot: Record<string, string | boolean>;
  leadDraft: LeadDraft;
  sessionFiles: File[];
  skipCrmUpdate?: boolean;
  testMode?: boolean;
  ensureCrmLead: () => Promise<string>;
  onSessionStarted?: (sessionId: string) => void;
  onFieldPatches: (fieldPatches: FieldPatches) => void;
  onFilesAdded: (files: File[]) => File[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

const statusLabels: Record<ChatStatus, string> = {
  idle: 'Not connected',
  connecting: 'Connecting',
  connected: 'Connected',
  thinking: 'AI is writing',
  error: 'Connection issue',
  completed: 'Context saved',
};

const getStatusClass = (status: ChatStatus) => {
  if (status === 'connected' || status === 'completed') return 'bg-emerald-500';
  if (status === 'thinking' || status === 'connecting') return 'bg-amber-400';
  if (status === 'error') return 'bg-red-500';
  return 'bg-slate-300';
};

const TypingDots = () => (
  <span className="inline-flex items-center gap-1" aria-label="Assistant is writing">
    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
  </span>
);

const getVisitorTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';

const formatDateForInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateTimeForZone = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(date);

const buildCallbackPreference = (dateValue: string, timeValue: string) => {
  const localDate = new Date(`${dateValue}T${timeValue}:00`);
  if (Number.isNaN(localDate.getTime())) {
    return `${dateValue} at ${timeValue}`;
  }

  const visitorTimeZone = getVisitorTimeZone();
  const mountainTime = formatDateTimeForZone(localDate, BUSINESS_TIME_ZONE);
  const visitorTime = formatDateTimeForZone(localDate, visitorTimeZone);
  return `${mountainTime} (${BUSINESS_TIME_ZONE}); visitor selected ${visitorTime} (${visitorTimeZone})`;
};

const getNearestQuarterTime = () => {
  const now = new Date();
  const roundedMinutes = Math.round(now.getMinutes() / 15) * 15;
  now.setMinutes(roundedMinutes);
  now.setSeconds(0);

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const isCallbackOption = (option: string) => /callback|schedule call|call me asap/i.test(option);
const isDirectCallOption = (option: string) => /^call\s+\d/i.test(option);
const isSoftGoodbyeOption = (option: string) => /no thanks|that'?s all|done for now|nothing else/i.test(option);

const toTrimmedString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const fileListToArray = (fileList: FileList | null): File[] =>
  fileList ? Array.from(fileList) : [];

const normalizeForComparison = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

const appendUniqueSection = (sections: string[], nextSection: string) => {
  const normalizedNext = normalizeForComparison(nextSection);
  if (!normalizedNext) return;

  const alreadyIncluded = sections.some((section) => {
    const normalizedSection = normalizeForComparison(section);
    return normalizedSection === normalizedNext || normalizedSection.includes(normalizedNext);
  });

  if (!alreadyIncluded) {
    sections.push(nextSection.trim());
  }
};

const buildMergedDescription = ({
  originalDescription,
  aiDescription,
  callbackPreference,
}: {
  originalDescription: string;
  aiDescription: string;
  callbackPreference: string;
}) => {
  const sections: string[] = [];
  const normalizedAi = normalizeForComparison(aiDescription);
  const normalizedOriginal = normalizeForComparison(originalDescription);

  if (originalDescription && (!normalizedAi || !normalizedAi.includes(normalizedOriginal))) {
    appendUniqueSection(sections, originalDescription);
  }

  appendUniqueSection(sections, aiDescription);

  if (callbackPreference) {
    appendUniqueSection(sections, `Preferred callback time: ${callbackPreference}`);
  }

  return sections.join('\n\n');
};

export default function ChatIntake({
  leadId,
  externalId,
  formSnapshot,
  leadDraft,
  sessionFiles,
  skipCrmUpdate = false,
  ensureCrmLead,
  onSessionStarted,
  onFieldPatches,
  onFilesAdded,
  isOpen,
  onOpen,
  onClose,
}: ChatIntakeProps) {
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeLeadId, setActiveLeadId] = useState(leadId);
  const [responseOptions, setResponseOptions] = useState<string[]>([]);
  const [showCallbackPicker, setShowCallbackPicker] = useState(false);
  const [callbackDate, setCallbackDate] = useState(formatDateForInput(new Date()));
  const [callbackTime, setCallbackTime] = useState(getNearestQuarterTime());
  const [callbackNote, setCallbackNote] = useState('');
  const [selectedCallbackPreference, setSelectedCallbackPreference] = useState('');
  const [fileSyncStatus, setFileSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'local' | 'error'>('idle');
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastBlockedSyncRef = useRef('');
  const lastSyncedDescriptionRef = useRef('');
  const lastSyncedSessionIdRef = useRef('');
  const fileCountLabel =
    sessionFiles.length === 1 ? '1 file attached' : `${sessionFiles.length} files attached`;

  useEffect(() => {
    setActiveLeadId(leadId);
  }, [leadId]);

  useEffect(() => {
    if (!isOpen || !messageScrollRef.current) return;

    messageScrollRef.current.scrollTo({
      top: messageScrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [isOpen, messages, status, errorMessage, responseOptions, showCallbackPicker]);

  const applyResponseOptions = (options: unknown) => {
    const normalized = Array.isArray(options)
      ? options.filter((option): option is string => typeof option === 'string' && option.trim().length > 0)
      : [];
    setResponseOptions(normalized);
  };

  const startSession = async () => {
    if (!AI_CHAT_API_URL) {
      setStatus('error');
      setErrorMessage('AI chat is not configured yet.');
      return;
    }

    setStatus('connecting');
    setErrorMessage('');

    try {
      const response = await fetch(`${AI_CHAT_API_URL}/chat/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: COMPANY_ID,
          leadId: activeLeadId,
          formSnapshot,
          leadDraft,
          skipCrmUpdate,
        }),
      });

      if (!response.ok) {
        throw new Error('Unable to start chat.');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      if (data.sessionId) {
        onSessionStarted?.(data.sessionId);
        if (!skipCrmUpdate && activeLeadId && !activeLeadId.startsWith('draft-')) {
          await sendCrmSessionIdUpdate(data.sessionId, activeLeadId);
        }
      }
      setMessages([
        {
          role: 'assistant',
          content: data.reply || data.assistantGreeting || 'What kind of project do you need plans for?',
        },
      ]);
      applyResponseOptions(data.responseOptions);
      setStatus('connected');
    } catch (error) {
      console.error('AI chat session error:', error);
      setStatus('error');
      setErrorMessage('AI chat is unavailable right now.');
    }
  };

  const sendMessage = async (e?: React.FormEvent, overrideMessage?: string) => {
    e?.preventDefault();
    const message = (overrideMessage || draft).trim();
    if (!message || !sessionId || status === 'thinking') return;

    setDraft('');
    setResponseOptions([]);
    setShowCallbackPicker(false);
    setStatus('thinking');
    setMessages((current) => [...current, { role: 'user', content: message }]);

    try {
      const response = await fetch(`${AI_CHAT_API_URL}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message,
          leadId: activeLeadId,
          formSnapshot,
          leadDraft,
          skipCrmUpdate,
        }),
      });

      if (!response.ok) {
        throw new Error('Unable to send message.');
      }

      const data = await response.json();
      if (data.fieldPatches) {
        onFieldPatches(data.fieldPatches);
      }
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: data.reply || 'Thanks. I saved that project context.',
        },
      ]);
      applyResponseOptions(data.responseOptions);
      setStatus(data.shouldFinalize ? 'completed' : 'connected');
      if (data.isUsefulCrmUpdate !== false) {
        await sendCrmUpdate(data.enrichmentPayload);
      }
    } catch (error) {
      console.error('AI chat message error:', error);
      setStatus('error');
      setErrorMessage('The chat worked, but the latest project context may not have saved to the lead.');
    }
  };

  const handleResponseOption = (option: string) => {
    if (isDirectCallOption(option)) {
      void sendMessage(undefined, `${option}. I may call that number to get started.`);
      return;
    }
    if (isSoftGoodbyeOption(option)) {
      void finalizeSession(option);
      return;
    }
    if (isCallbackOption(option)) {
      setMessages((current) => [...current, { role: 'user', content: option }]);
      setResponseOptions([]);
      setShowCallbackPicker(true);
      setCallbackTime(/asap/i.test(option) ? '' : getNearestQuarterTime());
      return;
    }
    void sendMessage(undefined, option);
  };

  const handleDraftKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    if (!draft.trim() || status === 'thinking') return;
    void sendMessage();
  };

  const submitCallbackPreference = (mode: 'asap' | 'custom') => {
    let preference = 'ASAP / within the next 2 minutes';
    if (mode === 'custom') {
      if (!callbackDate || !callbackTime) {
        setCallbackNote('Choose a date and time, or use ASAP.');
        return;
      }
      preference = buildCallbackPreference(callbackDate, callbackTime);
    }
    setSelectedCallbackPreference(preference);
    setShowCallbackPicker(false);
    setCallbackNote('');
    void sendMessage(undefined, `Preferred callback time: ${preference}`);
  };

  const handleChatFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = fileListToArray(event.target.files);
    event.target.value = '';
    if (selectedFiles.length === 0) return;

    const nextSessionFiles = onFilesAdded(selectedFiles);

    if (activeLeadId.startsWith('draft-')) {
      setFileSyncStatus('local');
      return;
    }

    setFileSyncStatus('saving');
    try {
      await sendCrmUpdate(undefined, nextSessionFiles);
      setFileSyncStatus('saved');
    } catch (error) {
      console.error('AI chat file update error:', error);
      setFileSyncStatus('error');
      setErrorMessage('The file was added here, but it did not save to the CRM lead.');
    }
  };

  const finalizeSession = async (displayMessage?: string) => {
    if (!sessionId || status === 'completed') return;

    if (displayMessage) {
      setMessages((current) => [...current, { role: 'user', content: displayMessage }]);
      setResponseOptions([]);
      setShowCallbackPicker(false);
    }

    setStatus('thinking');
    try {
      const response = await fetch(`${AI_CHAT_API_URL}/chat/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          reason: displayMessage || 'user_done',
          leadId: activeLeadId,
          formSnapshot,
          leadDraft,
          skipCrmUpdate,
        }),
      });

      if (!response.ok) {
        throw new Error('Unable to finalize chat.');
      }

      const data = await response.json();
      await sendCrmUpdate(data.enrichmentPayload);
      setStatus('completed');
    } catch (error) {
      console.error('AI chat finalize error:', error);
      setStatus('error');
      setErrorMessage('The chat context could not be finalized or saved to the lead.');
    }
  };

  const sendCrmUpdate = async (
    payload: EnrichmentPayload | null | undefined,
    filesForUpdate: File[] = []
  ) => {
    const hasFileUpdate = filesForUpdate.length > 0;
    if (!payload && !hasFileUpdate) {
      return;
    }
    if (skipCrmUpdate) {
      return;
    }
    const isDraftLead = activeLeadId.startsWith('draft-');
    const missingRequiredFields = leadDraft.missingRequiredFields;
    const blockedSyncKey = `${activeLeadId}:${payload?.description || ''}:${missingRequiredFields.join(',')}`;

    if (isDraftLead && missingRequiredFields.length > 0) {
      if (CRM_WEBHOOK_DRY_RUN && lastBlockedSyncRef.current !== blockedSyncKey) {
        lastBlockedSyncRef.current = blockedSyncKey;
      }
      return;
    }

    const crmLeadId = isDraftLead ? await ensureCrmLead() : activeLeadId;
    if (!crmLeadId) {
      throw new Error('CRM lead was created or requested, but no lead id was available for the update');
    }
    setActiveLeadId(crmLeadId);

    if (!LEAD_INTAKE_UPDATE_API_URL) {
      throw new Error('Missing lead intake update configuration');
    }

    const description = payload
      ? buildMergedDescription({
          originalDescription: toTrimmedString(formSnapshot.description || leadDraft.fields.description),
          aiDescription: toTrimmedString(payload.description),
          callbackPreference: selectedCallbackPreference,
        })
      : '';

    if (
      !hasFileUpdate &&
      lastSyncedDescriptionRef.current === description &&
      (!sessionId || lastSyncedSessionIdRef.current === sessionId)
    ) {
      return;
    }

    const data = new FormData();
    data.append('_id', crmLeadId);
    data.append('external_id', externalId);
    if (sessionId) data.append('openai_sid', sessionId);
    if (description) data.append('description', description);
    if (hasFileUpdate) {
      data.append(CRM_FILE_UPLOAD_KEY, JSON.stringify({ uploadKey: CRM_FILE_UPLOAD_KEY }));
      filesForUpdate.forEach((file) => data.append(CRM_FILE_UPLOAD_KEY, file));
    } else {
      data.append(CRM_FILE_UPLOAD_KEY, JSON.stringify([]));
    }

    if (CRM_WEBHOOK_DRY_RUN) {
      lastSyncedDescriptionRef.current = description;
      if (sessionId) lastSyncedSessionIdRef.current = sessionId;
      return;
    }

    const response = await fetch(LEAD_INTAKE_UPDATE_API_URL, {
      method: 'POST',
      body: data,
    });

    if (!response.ok) {
      throw new Error('Failed to update CRM lead context');
    }

    if (description) lastSyncedDescriptionRef.current = description;
    if (sessionId) lastSyncedSessionIdRef.current = sessionId;
  };

  const sendCrmSessionIdUpdate = async (nextSessionId: string, crmLeadId: string) => {
    if (!nextSessionId || lastSyncedSessionIdRef.current === nextSessionId) return;
    if (!LEAD_INTAKE_UPDATE_API_URL) {
      throw new Error('Missing lead intake update configuration');
    }

    const data = new FormData();
    data.append('_id', crmLeadId);
    data.append('external_id', externalId);
    data.append('openai_sid', nextSessionId);
    data.append(CRM_FILE_UPLOAD_KEY, JSON.stringify([]));

    if (CRM_WEBHOOK_DRY_RUN) {
      lastSyncedSessionIdRef.current = nextSessionId;
      return;
    }

    const response = await fetch(LEAD_INTAKE_UPDATE_API_URL, {
      method: 'POST',
      body: data,
    });

    if (!response.ok) {
      throw new Error('Failed to update CRM lead chat session id');
    }

    lastSyncedSessionIdRef.current = nextSessionId;
  };

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open AI project chat"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-900/20 transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <button
            type="button"
            aria-label="Close AI project chat backdrop"
            onClick={onClose}
            className="absolute inset-0 hidden bg-slate-950/20 pointer-events-auto sm:block"
          />
          <aside className="absolute bottom-0 right-0 top-auto flex h-[min(760px,calc(100dvh-1.5rem))] w-full max-w-[440px] flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl pointer-events-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[min(720px,calc(100dvh-3rem))] sm:rounded-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-emerald-700" />
                  <h3 className="font-bold text-slate-900">Project chat</h3>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Share extra details that may help the drafting team.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close AI project chat"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                <span className={`h-2.5 w-2.5 rounded-full ${getStatusClass(status)}`} />
                {statusLabels[status]}
                {status === 'connecting' && <TypingDots />}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                {fileSyncStatus === 'saving' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Paperclip className="h-3.5 w-3.5" />
                )}
                {fileCountLabel}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.dwg"
                onChange={handleChatFilesSelected}
              />
            </div>

            <div ref={messageScrollRef} className="min-h-0 flex-1 overflow-y-auto p-5">
              {!sessionId ? (
                <div className="flex min-h-[260px] flex-col items-start justify-center rounded-xl bg-slate-50 p-5">
                  <p className="text-base font-semibold text-slate-900">Add details with AI</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    The assistant can ask a few project questions and summarize the useful context
                    for the drafting team.
                  </p>
                  <button
                    type="button"
                    onClick={startSession}
                    disabled={status === 'connecting'}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  >
                    {status === 'connecting' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {status === 'connecting' ? 'Connecting' : 'Start chat'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {messages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <p
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6 ${
                            message.role === 'user'
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-200 bg-slate-50 text-slate-700'
                          }`}
                        >
                          {message.content}
                        </p>
                      </div>
                    ))}
                    {status === 'thinking' && (
                      <div className="flex justify-start">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                          <TypingDots />
                        </div>
                      </div>
                    )}
                  </div>

                  {errorMessage && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      <XCircle className="h-4 w-4" />
                      {errorMessage}
                    </div>
                  )}

                  {responseOptions.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-2">
                      {responseOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleResponseOption(option)}
                          disabled={status === 'thinking'}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-right text-xs font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}

                  {showCallbackPicker && (
                    <div className="ml-auto grid w-full max-w-[360px] gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-slate-700">
                      <div>
                        <p className="font-semibold text-slate-900">Preferred callback time</p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          Choose a time in your local timezone ({getVisitorTimeZone()}). We will send
                          it to the team in Mountain Time.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => submitCallbackPreference('asap')}
                        className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                      >
                        ASAP / within 2 minutes
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="grid gap-1 text-xs font-semibold text-slate-600">
                          Date
                          <input
                            type="date"
                            min={formatDateForInput(new Date())}
                            value={callbackDate}
                            onChange={(event) => setCallbackDate(event.target.value)}
                            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                          />
                        </label>
                        <label className="grid gap-1 text-xs font-semibold text-slate-600">
                          Time
                          <input
                            type="time"
                            value={callbackTime}
                            onChange={(event) => setCallbackTime(event.target.value)}
                            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                          />
                        </label>
                      </div>
                      {callbackNote && <p className="text-xs font-medium text-red-700">{callbackNote}</p>}
                      <button
                        type="button"
                        onClick={() => submitCallbackPreference('custom')}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Send preferred time
                      </button>
                    </div>
                  )}

                  {status === 'completed' && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                      <CheckCircle2 className="h-4 w-4" />
                      Extra project context was saved.
                    </div>
                  )}
                </div>
              )}
            </div>

            {sessionId && status !== 'completed' && (
              <form onSubmit={sendMessage} className="border-t border-slate-200 p-4">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleDraftKeyDown}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  placeholder={
                    messages.some((message) => message.role === 'user')
                      ? 'Type here...'
                      : 'Example: We already have sketches, but the city has not reviewed anything yet.'
                  }
                />
                <div className="mt-3 flex gap-3">
                  <button
                    type="submit"
                    disabled={!draft.trim() || status === 'thinking'}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  >
                    {status === 'thinking' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={status === 'thinking' || fileSyncStatus === 'saving'}
                    aria-label="Attach project files"
                    className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {fileSyncStatus === 'saving' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => finalizeSession()}
                    disabled={status === 'thinking'}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Done
                  </button>
                </div>
              </form>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
