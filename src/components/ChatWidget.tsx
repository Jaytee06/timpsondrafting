import { FormEvent, useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { CHAT_SUGGESTIONS, CHAT_TITLE } from '../chat/config';
import { useChatConnection } from '../chat/useChatConnection';

const connectionLabelMap = {
  idle: 'Available',
  sending: 'Sending',
  ready: 'Available',
  offline: 'Unavailable',
  error: 'Connection issue',
} as const;

const connectionToneMap = {
  idle: 'bg-slate-400',
  sending: 'bg-amber-400',
  ready: 'bg-emerald-400',
  offline: 'bg-slate-500',
  error: 'bg-rose-400',
} as const;

export default function ChatWidget() {
  const { messages, sendMessage, status, isWaitingForReply, bridge } = useChatConnection();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages, isWaitingForReply]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(draft).then((sent) => {
      if (sent) {
        setDraft('');
      }
    });
  };

  const waitingText = !bridge.available
    ? 'Your message is saved. If chat is unavailable, you can also use the contact form below.'
    : bridge.status === 'busy'
      ? 'Reviewing your message now.'
      : 'Preparing a reply...';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-3 rounded-full bg-slate-900 px-5 py-4 text-sm font-semibold text-white shadow-2xl ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
        <span>{isOpen ? 'Close chat' : 'Chat with us'}</span>
      </button>

      {isOpen ? (
        <section className="fixed bottom-24 right-5 z-50 flex h-[38rem] w-[min(25rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-2xl">
          <header className="bg-gradient-to-br from-slate-950 via-slate-900 to-stone-800 px-5 py-5 text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-200/80">Timpson Drafting</p>
                <h2 className="mt-1 text-lg font-semibold">{CHAT_TITLE}</h2>
              </div>
              <div className="flex flex-col items-end gap-2 text-xs">
                <div className="inline-flex items-center gap-2 text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${connectionToneMap[status]}`}></span>
                  <span>{connectionLabelMap[status]}</span>
                </div>
              </div>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,#fafaf9_0%,#f8fafc_100%)] px-4 py-4"
          >
            {messages.map((message) => (
              <article
                key={message.id}
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  message.sender === 'visitor'
                    ? 'ml-auto bg-slate-900 text-white'
                    : message.sender === 'assistant'
                      ? 'bg-white text-slate-900 ring-1 ring-stone-200'
                      : 'bg-stone-900 text-stone-100'
                }`}
              >
                {message.text}
              </article>
            ))}

            {isWaitingForReply ? (
              <article className="max-w-[85%] rounded-2xl bg-white px-4 py-3 text-sm text-slate-500 shadow-sm ring-1 ring-stone-200">
                {waitingText}
              </article>
            ) : null}
          </div>

          <div className="border-t border-stone-200 bg-white px-4 py-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {CHAT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setDraft(suggestion)}
                  className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-slate-700 transition hover:border-stone-300 hover:bg-white"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex items-end gap-3">
              <label className="sr-only" htmlFor="chat-message">
                Message
              </label>
              <textarea
                id="chat-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={3}
                placeholder="Tell us about your project or ask a question."
                className="min-h-[5.5rem] flex-1 resize-none rounded-2xl border border-stone-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-stone-200"
              />
              <button
                type="submit"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!draft.trim()}
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </section>
      ) : null}
    </>
  );
}
