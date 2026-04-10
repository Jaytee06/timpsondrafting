import { json, unauthorized } from './lib/http.mjs';
import { isBridgeAuthorized } from './lib/auth.mjs';
import { putBridgeHeartbeat } from './lib/db.mjs';

export const handler = async (event) => {
  if (!isBridgeAuthorized(event.headers)) {
    return unauthorized();
  }

  const body = JSON.parse(event.body || '{}');
  const updatedAt = body.updatedAt || new Date().toISOString();

  await putBridgeHeartbeat({
    workerId: body.workerId || 'local-mac-worker',
    status: body.status || 'unknown',
    statusMessage: body.statusMessage || '',
    commandSource: body.commandSource || 'unknown',
    updatedAt,
  });

  return json(200, {
    ok: true,
    updatedAt,
  });
};
