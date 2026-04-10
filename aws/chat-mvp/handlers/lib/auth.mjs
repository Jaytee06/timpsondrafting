import { env } from './env.mjs';

export const isBridgeAuthorized = (headers = {}) => {
  const candidate =
    headers['x-bridge-secret'] ||
    headers['X-Bridge-Secret'] ||
    headers.authorization ||
    headers.Authorization;

  if (!env.bridgeSharedSecret) {
    return false;
  }

  return candidate === env.bridgeSharedSecret;
};
