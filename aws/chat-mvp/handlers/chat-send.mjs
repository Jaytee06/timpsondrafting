import { enqueueChatJob } from './lib/sqs.mjs';
import { putTranscriptMessage, updateSessionMeta } from './lib/db.mjs';

export const handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const now = body.createdAt || new Date().toISOString();
  const transcript = body.payload?.transcript || [
    {
      id: body.payload?.requestId || crypto.randomUUID(),
      sender: 'visitor',
      text: body.payload?.text || '',
      createdAt: now,
    },
  ];
  const latestVisitorMessage =
    [...transcript].reverse().find((message) => message.sender === 'visitor') || transcript[0];

  await Promise.all(
    transcript.map((message) =>
      putTranscriptMessage({
        sessionId: body.sessionId,
        message,
      })
    )
  );

  await updateSessionMeta({
    sessionId: body.sessionId,
    updatedAt: now,
    leadContext: body.payload?.leadContext || {
      pageUrl: body.payload?.pageUrl || '',
      referrer: body.payload?.referrer || '',
      userAgent: body.payload?.userAgent || '',
    },
  });

  const jobId = crypto.randomUUID();
  await enqueueChatJob({
    jobId,
    sessionId: body.sessionId,
    createdAt: now,
    transcript,
    leadContext: body.payload?.leadContext || {
      pageUrl: body.payload?.pageUrl || '',
      referrer: body.payload?.referrer || '',
      userAgent: body.payload?.userAgent || '',
    },
    latestMessage: latestVisitorMessage,
  });

  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      type: 'send.response',
      sessionId: body.sessionId,
      createdAt: now,
      payload: {
        jobId,
      },
    }),
  };
};
