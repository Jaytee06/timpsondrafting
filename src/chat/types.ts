export type ChatSender = 'visitor' | 'assistant' | 'system';

export type ChatStatus = 'idle' | 'sending' | 'ready' | 'offline' | 'error';
export type BridgeStatus = 'online' | 'busy' | 'offline' | 'degraded' | 'unknown';

export type ChatMessage = {
  id: string;
  sender: ChatSender;
  text: string;
  createdAt: string;
};

export type ChatTranscriptEntry = {
  id: string;
  sender: ChatSender;
  text: string;
  createdAt: string;
};

export type BridgeAvailability = {
  available: boolean;
  status: BridgeStatus;
  workerId: string | null;
  updatedAt: string | null;
  commandSource: string;
  message: string;
};

export type ChatEnvelope =
  | {
      type: 'send.request';
      sessionId: string;
      createdAt: string;
      payload: {
        requestId: string;
        text: string;
        pageUrl: string;
        referrer: string;
        userAgent: string;
        transcript: ChatTranscriptEntry[];
        leadContext?: Record<string, unknown>;
      };
    }
  | {
      type: 'poll.response';
      sessionId: string;
      createdAt: string;
      payload: {
        messages: ChatMessage[];
        bridge: BridgeAvailability;
      };
    }
  | {
      type: 'send.response';
      sessionId: string;
      createdAt: string;
      payload: {
        jobId: string;
      };
    }
  | {
      type: 'error';
      sessionId?: string;
      createdAt: string;
      payload: {
        message: string;
      };
    };
