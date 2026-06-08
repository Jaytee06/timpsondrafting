import { useEffect, useRef, useState } from 'react';
import { Bot, CheckCircle2, Loader2, MessageCircle, Send, X, XCircle } from 'lucide-react';

const AI_CHAT_API_URL = import.meta.env.VITE_AI_CHAT_API_URL;
const COMPANY_ID = import.meta.env.VITE_COMPANY_ID || 'timpson-drafting-design';
const CRM_WEBHOOK_URL = import.meta.env.VITE_CRM_WEBHOOK_URL;
const CRM_UPDATE_WEBHOOK_API_KEY = import.meta.env.VITE_CRM_UPDATE_WEBHOOK_API_KEY;
const CRM_WEBHOOK_DRY_RUN = import.meta.env.VITE_CRM_WEBHOOK_DRY_RUN === 'true';

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
  formSnapshot: Record<string, string | boolean>;
  leadDraft: LeadDraft;
  skipCrmUpdate?: boolean;
  testMode?: boolean;
  ensureCrmLead: () => Promise<string>;
  onFieldPatches: (fieldPatches: FieldPatches) => void;
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

const appendPayloadValue = (data: FormData, key: string, value: unknown) => {
  if (value === undefined || value === null) return;
  data.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
};

export default function ChatIntake({
  leadId,
  formSnapshot,
  leadDraft,
  skipCrmUpdate = false,
  ensureCrmLead,
  onFieldPatches,
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
  const messageScrollRef = useRef<HTMLDivElement | null>(null);
  const lastBlockedSyncRef = useRef('');
  const lastSyncedDescriptionRef = useRef('');

  useEffect(() => {
    setActiveLeadId(leadId);
  }, [leadId]);

  useEffect(() => {
    if (!isOpen || !messageScrollRef.current) return;

    messageScrollRef.current.scrollTo({
      top: messageScrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [isOpen, messages, status, errorMessage]);

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
      setMessages([
        {
          role: 'assistant',
          content: data.reply || data.assistantGreeting || 'What kind of project do you need plans for?',
        },
      ]);
      setStatus('connected');
    } catch (error) {
      console.error('AI chat session error:', error);
      setStatus('error');
      setErrorMessage('AI chat is unavailable right now.');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = draft.trim();
    if (!message || !sessionId || status === 'thinking') return;

    setDraft('');
    setStatus('thinking');
    setMessages((current) => [...current, { role: 'user', content: message }]);

    try {
      const response = await fetch(`${AI_CHAT_API_URL}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message, leadId: activeLeadId, formSnapshot, leadDraft, skipCrmUpdate }),
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

  const finalizeSession = async () => {
    if (!sessionId || status === 'completed') return;

    setStatus('thinking');
    try {
      const response = await fetch(`${AI_CHAT_API_URL}/chat/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, reason: 'user_done', leadId: activeLeadId, formSnapshot, leadDraft, skipCrmUpdate }),
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

  const sendCrmUpdate = async (payload: EnrichmentPayload | null | undefined) => {
    if (!payload) {
      return;
    }
    if (skipCrmUpdate) {
      return;
    }
    const isDraftLead = activeLeadId.startsWith('draft-');
    const missingRequiredFields = leadDraft.missingRequiredFields;
    const blockedSyncKey = `${activeLeadId}:${payload.description}:${missingRequiredFields.join(',')}`;

    if (isDraftLead && missingRequiredFields.length > 0) {
      if (CRM_WEBHOOK_DRY_RUN && lastBlockedSyncRef.current !== blockedSyncKey) {
        lastBlockedSyncRef.current = blockedSyncKey;
      }
      return;
    }

    const crmLeadId = isDraftLead ? await ensureCrmLead() : activeLeadId;
    if (!crmLeadId) {
      return;
    }
    setActiveLeadId(crmLeadId);

    if (!CRM_WEBHOOK_URL || !CRM_UPDATE_WEBHOOK_API_KEY) {
      throw new Error('Missing CRM update webhook configuration');
    }

    if (lastSyncedDescriptionRef.current === payload.description) {
      return;
    }

    const apiEndpoint = new URL(CRM_WEBHOOK_URL);
    apiEndpoint.searchParams.set('apiKey', CRM_UPDATE_WEBHOOK_API_KEY);

    const data = new FormData();
    Object.entries({
      ...payload,
      id: crmLeadId,
      _id: crmLeadId,
    }).forEach(([key, value]) => appendPayloadValue(data, key, value));

    if (CRM_WEBHOOK_DRY_RUN) {
      lastSyncedDescriptionRef.current = payload.description;
      return;
    }

    const response = await fetch(apiEndpoint.toString(), {
      method: 'POST',
      body: data,
    });

    if (!response.ok) {
      throw new Error('Failed to update CRM lead context');
    }

    lastSyncedDescriptionRef.current = payload.description;
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
              </div>
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
                    className="mt-4 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
                  >
                    Start AI chat
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
                  </div>

                  {errorMessage && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      <XCircle className="h-4 w-4" />
                      {errorMessage}
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
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  placeholder="Example: We already have sketches, but the city has not reviewed anything yet."
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
                    onClick={finalizeSession}
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
