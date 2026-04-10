import './load-env.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContextBundle } from './context-loader.mjs';
import { buildPrompt } from './prompt-builder.mjs';
import { generateReply, resolveAgentInvocation } from './agent-adapter.mjs';

const claimUrl = process.env.BRIDGE_CLAIM_URL?.trim();
const completeUrl = process.env.BRIDGE_COMPLETE_URL?.trim();
const failUrl = process.env.BRIDGE_FAIL_URL?.trim();
const heartbeatUrl = process.env.BRIDGE_HEARTBEAT_URL?.trim();
const workerId = process.env.BRIDGE_WORKER_ID || 'local-mac-worker';
const sharedSecret = process.env.BRIDGE_SHARED_SECRET || '';
const pollIntervalMs = Number(process.env.BRIDGE_POLL_INTERVAL_MS || 3000);
const heartbeatIntervalMs = Number(process.env.BRIDGE_HEARTBEAT_INTERVAL_MS || 10000);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (!claimUrl || !completeUrl || !failUrl || !sharedSecret) {
  console.error('Missing BRIDGE_CLAIM_URL, BRIDGE_COMPLETE_URL, BRIDGE_FAIL_URL, or BRIDGE_SHARED_SECRET.');
  process.exit(1);
}

const request = async (url, body) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-bridge-secret': sharedSecret,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Bridge API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildStatusMessage = (status, invocation, detail = '') => {
  if (detail) {
    return detail;
  }

  if (status === 'busy') {
    return 'Reviewing your message now.';
  }

  if (status === 'degraded') {
    return invocation.mode === 'stub'
      ? 'Chat is available with limited capacity.'
      : 'Chat is available with limited capacity.';
  }

  return 'Chat is available.';
};

const createHeartbeatReporter = (invocation) => {
  let lastHeartbeatAt = 0;
  let lastStatusSignature = '';

  return async ({ status, detail = '', force = false }) => {
    if (!heartbeatUrl) {
      return;
    }

    const statusMessage = buildStatusMessage(status, invocation, detail);
    const signature = `${status}:${statusMessage}`;
    const now = Date.now();
    if (!force && signature === lastStatusSignature && now - lastHeartbeatAt < heartbeatIntervalMs) {
      return;
    }

    lastHeartbeatAt = now;
    lastStatusSignature = signature;

    try {
      await request(heartbeatUrl, {
        workerId,
        status,
        statusMessage,
        commandSource: invocation.source,
        repoRoot,
        updatedAt: new Date(now).toISOString(),
      });
    } catch (error) {
      console.error('Failed to publish bridge heartbeat.', error);
    }
  };
};

const workOnce = async ({ contextFiles, invocation, reportHeartbeat }) => {
  const claim = await request(claimUrl, { workerId });
  if (!claim.job) {
    await reportHeartbeat({
      status: invocation.mode === 'stub' ? 'degraded' : 'online',
    });
    return false;
  }

  await reportHeartbeat({
    status: 'busy',
    force: true,
    detail: `Processing your message.`,
  });

  const prompt = buildPrompt({
    job: claim.job,
    contextFiles,
  });

  try {
    const replyText = await generateReply({
      prompt,
      job: claim.job,
      invocation,
    });

    await request(completeUrl, {
      workerId,
      receiptHandle: claim.job.receiptHandle,
      sessionId: claim.job.sessionId,
      leadContext: claim.job.leadContext,
      replyText,
      summary: {
        source: 'local-bridge',
      },
    });

    await reportHeartbeat({
      status: invocation.mode === 'stub' ? 'degraded' : 'online',
      force: true,
    });
  } catch (error) {
    const failResult = await request(failUrl, {
      workerId,
      approximateReceiveCount: claim.job.approximateReceiveCount,
      receiptHandle: claim.job.receiptHandle,
      errorMessage: error instanceof Error ? error.message : 'Unknown local bridge error',
    });

    console.error('Bridge job failed.', {
      sessionId: claim.job.sessionId,
      approximateReceiveCount: claim.job.approximateReceiveCount,
      requeued: failResult.requeued,
      errorMessage: error instanceof Error ? error.message : 'Unknown local bridge error',
    });

    await reportHeartbeat({
      status: 'degraded',
      force: true,
      detail: failResult.requeued
        ? 'Chat is temporarily retrying your message.'
        : 'Chat is temporarily unavailable. Please try again later or use the contact form.',
    });
  }

  return true;
};

const main = async () => {
  const contextFiles = await loadContextBundle();
  const invocation = await resolveAgentInvocation();
  const reportHeartbeat = createHeartbeatReporter(invocation);
  let shuttingDown = false;

  const shutdown = async (signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    await reportHeartbeat({
      status: 'offline',
      force: true,
      detail: `Worker stopped on ${signal}.`,
    });
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  await reportHeartbeat({
    status: invocation.mode === 'stub' ? 'degraded' : 'online',
    force: true,
  });

  for (;;) {
    try {
      const processedJob = await workOnce({
        contextFiles,
        invocation,
        reportHeartbeat,
      });
      if (!processedJob) {
        await sleep(pollIntervalMs);
      }
    } catch (error) {
      console.error(error);
      await reportHeartbeat({
        status: 'degraded',
        force: true,
        detail: error instanceof Error ? error.message : 'Unknown local bridge error',
      });
      await sleep(pollIntervalMs);
    }
  }
};

main();
