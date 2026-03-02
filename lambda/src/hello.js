/**
 * GET /hello?name=xxx
 * Response: { "message": "Hello, {name}!" }
 */
exports.handler = async (event) => {
  const name = event.queryStringParameters?.name ?? 'World';

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Hello, ${name}!` }),
  };
};
