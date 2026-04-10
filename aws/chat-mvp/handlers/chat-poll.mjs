import { listBridgeWorkers, listSessionMessages } from './lib/db.mjs';

const defaultBridgeMessage = {
  online: 'Chat is available.',
  busy: 'Reviewing your message now.',
  degraded: 'Chat is available with limited capacity.',
  offline: 'Chat is currently offline.',
  unknown: 'Checking chat availability.',
};

const summarizeBridge = (workers) => {
  const nowEpochSeconds = Math.floor(Date.now() / 1000);
  const activeWorker = workers.find((worker) => worker.ttl > nowEpochSeconds);

  if (!activeWorker) {
    return {
      available: false,
      status: 'offline',
      workerId: null,
      updatedAt: null,
      commandSource: 'unknown',
      message: defaultBridgeMessage.offline,
    };
  }

  return {
    available: activeWorker.status === 'online' || activeWorker.status === 'busy',
    status: activeWorker.status,
    workerId: activeWorker.workerId,
    updatedAt: activeWorker.updatedAt,
    commandSource: activeWorker.commandSource || 'unknown',
    message: activeWorker.statusMessage || defaultBridgeMessage[activeWorker.status] || defaultBridgeMessage.unknown,
  };
};

export const handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const [messages, bridgeWorkers] = await Promise.all([
    listSessionMessages(body.sessionId),
    listBridgeWorkers(),
  ]);

  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      type: 'poll.response',
      sessionId: body.sessionId,
      createdAt: new Date().toISOString(),
      payload: {
        messages,
        bridge: summarizeBridge(bridgeWorkers),
      },
    }),
  };
};
