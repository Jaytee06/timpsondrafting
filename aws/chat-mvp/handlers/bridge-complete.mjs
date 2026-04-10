import { json, unauthorized } from './lib/http.mjs';
import { isBridgeAuthorized } from './lib/auth.mjs';
import { deleteChatJob } from './lib/sqs.mjs';
import { putTranscriptMessage, updateSessionMeta } from './lib/db.mjs';

export const handler = async (event) => {
  if (!isBridgeAuthorized(event.headers)) {
    return unauthorized();
  }

  const body = JSON.parse(event.body || '{}');
  const createdAt = new Date().toISOString();
  await putTranscriptMessage({
    sessionId: body.sessionId,
    message: {
      id: crypto.randomUUID(),
      sender: 'assistant',
      text: body.replyText || '',
      createdAt,
    },
  });

  await updateSessionMeta({
    sessionId: body.sessionId,
    updatedAt: createdAt,
    leadContext: body.leadContext || {},
  });

  if (body.receiptHandle) {
    await deleteChatJob(body.receiptHandle);
  }

  return json(200, { ok: true });
};
