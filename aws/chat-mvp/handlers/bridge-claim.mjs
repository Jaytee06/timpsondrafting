import { unauthorized, json } from './lib/http.mjs';
import { isBridgeAuthorized } from './lib/auth.mjs';
import { receiveChatJob } from './lib/sqs.mjs';

export const handler = async (event) => {
  if (!isBridgeAuthorized(event.headers)) {
    return unauthorized();
  }

  const message = await receiveChatJob();

  if (!message) {
    return json(200, { job: null });
  }

  return json(200, {
    job: {
      ...message.job,
      approximateReceiveCount: message.approximateReceiveCount,
      receiptHandle: message.receiptHandle,
    },
  });
};
