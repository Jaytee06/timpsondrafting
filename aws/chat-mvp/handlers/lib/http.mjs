export const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'content-type': 'application/json',
  },
  body: JSON.stringify(body),
});

export const unauthorized = () =>
  json(401, {
    error: 'unauthorized',
  });
