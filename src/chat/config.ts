export const CHAT_STORAGE_KEY = 'td_chat_session_id';

export const CHAT_SEND_URL = import.meta.env.VITE_CHAT_SEND_URL?.trim() || '';

export const CHAT_POLL_URL = import.meta.env.VITE_CHAT_POLL_URL?.trim() || '';

export const CHAT_TITLE = 'Project Planning Chat';

export const CHAT_WELCOME_MESSAGE =
  'Tell us a little about your project, and we can help you sort out the next step. You can keep chatting here, or request an email follow-up or call-back whenever that feels easier.';

export const CHAT_SUGGESTIONS = [
  'I need plans for a garage addition.',
  'What would you need to review my project?',
  'Can I send plans or sketches after we talk?',
];

export const createSessionId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Math.random().toString(36).slice(2, 10)}`;
};

export const getOrCreateSessionId = () => {
  if (typeof window === 'undefined') {
    return createSessionId();
  }

  const existing = window.localStorage.getItem(CHAT_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const sessionId = createSessionId();
  window.localStorage.setItem(CHAT_STORAGE_KEY, sessionId);
  return sessionId;
};
