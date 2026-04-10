import { json, unauthorized } from './lib/http.mjs';
import { isBridgeAuthorized } from './lib/auth.mjs';
import { deleteChatJob, requeueChatJob } from './lib/sqs.mjs';
import { env } from './lib/env.mjs';

export const handler = async (event) => {
  if (!isBridgeAuthorized(event.headers)) {
    return unauthorized();
  }

  const body = JSON.parse(event.body || '{}');
  const approximateReceiveCount = Number(body.approximateReceiveCount || 1);
  const shouldRequeue = approximateReceiveCount < env.bridgeMaxRetryCount;

  if (body.receiptHandle) {
    if (shouldRequeue) {
      await requeueChatJob(body.receiptHandle);
    } else {
      await deleteChatJob(body.receiptHandle);
    }
  }

  return json(200, {
    ok: true,
    approximateReceiveCount,
    errorMessage: body.errorMessage || 'Unknown bridge failure',
    requeued: shouldRequeue,
  });
};
