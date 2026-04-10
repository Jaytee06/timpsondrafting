export const createErrorEnvelope = ({ sessionId, text, createdAt }) => ({
  type: 'error',
  sessionId,
  createdAt,
  payload: {
    text,
  },
});
