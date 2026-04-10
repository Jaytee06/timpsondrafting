const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const env = {
  bridgeSharedSecret: process.env.BRIDGE_SHARED_SECRET || '',
  bridgeHeartbeatTtlSeconds: Number(process.env.BRIDGE_HEARTBEAT_TTL_SECONDS || 60),
  bridgeMaxRetryCount: Number(process.env.BRIDGE_MAX_RETRY_COUNT || 3),
  chatQueueUrl: required('CHAT_QUEUE_URL'),
  chatTableName: required('CHAT_TABLE_NAME'),
  chatTtlSeconds: Number(process.env.CHAT_TTL_SECONDS || 604800),
};
