import { useEffect, useRef, useState } from 'react';
import { CHAT_POLL_URL, CHAT_SEND_URL, CHAT_WELCOME_MESSAGE, getOrCreateSessionId } from './config';
import type {
  BridgeAvailability,
  ChatEnvelope,
  ChatMessage,
  ChatStatus,
  ChatTranscriptEntry,
} from './types';

const defaultBridgeAvailability: BridgeAvailability = {
  available: false,
  status: 'unknown',
  workerId: null,
  updatedAt: null,
  commandSource: 'unknown',
  message: 'Checking availability.',
};

const createMessage = (
  sender: ChatMessage['sender'],
  text: string,
  createdAt = new Date().toISOString()
): ChatMessage => ({
  id:
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${sender}-${createdAt}`,
  sender,
  text,
  createdAt,
});

const createOutgoingEnvelope = (
  sessionId: string,
  text: string,
  transcript: ChatTranscriptEntry[]
): ChatEnvelope => ({
  type: 'send.request',
  sessionId,
  createdAt: new Date().toISOString(),
  payload: {
    requestId:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `request-${Date.now()}`,
    text,
    pageUrl: window.location.href,
    referrer: document.referrer || '',
    userAgent: navigator.userAgent,
    transcript,
  },
});

export const useChatConnection = () => {
  const sessionIdRef = useRef(getOrCreateSessionId());
  const pollTimerRef = useRef<number | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage('system', CHAT_WELCOME_MESSAGE),
  ]);
  const [status, setStatus] = useState<ChatStatus>(
    CHAT_SEND_URL && CHAT_POLL_URL ? 'ready' : 'offline'
  );
  const [bridge, setBridge] = useState<BridgeAvailability>(defaultBridgeAvailability);
  const [isWaitingForReply, setIsWaitingForReply] = useState(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!CHAT_SEND_URL || !CHAT_POLL_URL) {
      setBridge({
        available: false,
        status: 'offline',
        workerId: null,
        updatedAt: null,
        commandSource: 'unknown',
        message: 'Chat is currently unavailable.',
      });
      setMessages((current) => [
        ...current,
        createMessage(
          'system',
          'Chat is currently unavailable. Please use the contact form below and we will follow up shortly.'
        ),
      ]);
      return;
    }

    const poll = async () => {
      try {
        const response = await fetch(CHAT_POLL_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
          }),
        });

        if (!response.ok) {
          throw new Error('Polling failed');
        }

        const envelope = (await response.json()) as ChatEnvelope;
        if (envelope.type !== 'poll.response') {
          return;
        }

        const merged = new Map<string, ChatMessage>();
        [...messagesRef.current, ...envelope.payload.messages].forEach((message) => {
          merged.set(message.id, message);
        });

        const nextMessages = [...merged.values()].sort((left, right) =>
          left.createdAt.localeCompare(right.createdAt)
        );

        setMessages(nextMessages);
        setBridge(envelope.payload.bridge || defaultBridgeAvailability);
        setStatus('ready');
        setIsWaitingForReply(
          nextMessages[nextMessages.length - 1]?.sender === 'visitor'
        );
      } catch {
        setStatus('error');
        setBridge((current) => ({
          ...current,
          status: 'unknown',
          available: false,
          message: 'Availability could not be refreshed.',
        }));
      }
    };

    poll();
    pollTimerRef.current = window.setInterval(poll, 2500);

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return false;
    }

    const visitorMessage = createMessage('visitor', trimmed);
    setMessages((current) => [...current, visitorMessage]);
    if (!CHAT_SEND_URL) {
      setMessages((current) => [
        ...current,
        createMessage('system', 'Chat is temporarily unavailable. Please try again or use the contact form below.'),
      ]);
      return false;
    }

    const transcript = [...messages, visitorMessage].map((message) => ({
      id: message.id,
      sender: message.sender,
      text: message.text,
      createdAt: message.createdAt,
    }));

    const envelope = createOutgoingEnvelope(sessionIdRef.current, trimmed, transcript);
    setStatus('sending');

    try {
      const response = await fetch(CHAT_SEND_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(envelope),
      });

      if (!response.ok) {
        throw new Error('Send failed');
      }

      setStatus('ready');
      setIsWaitingForReply(true);
      return true;
    } catch {
      setStatus('error');
      setMessages((current) => [
        ...current,
        createMessage('system', 'That message did not go through. Please try again in a moment.'),
      ]);
      return false;
    }
  };

  return {
    messages,
    sendMessage,
    status,
    isWaitingForReply,
    sessionId: sessionIdRef.current,
    isConfigured: Boolean(CHAT_SEND_URL && CHAT_POLL_URL),
    bridge,
  };
};
