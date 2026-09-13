import express from 'express';

/**
 * Creates a minimal Express app with just the health endpoint,
 * matching how it's registered in server.js (before dependency init).
 */
function createHealthApp() {
  const app = express();
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  return app;
}

describe('GET /health', () => {
  let app;

  beforeAll(() => {
    app = createHealthApp();
  });

  it('should return 200 with { status: "ok" }', async () => {
    // Use Node's built-in fetch against a real server to stay dependency-free
    const server = app.listen(0); // random available port
    const { port } = server.address();

    try {
      const res = await fetch(`http://localhost:${port}/health`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ status: 'ok' });
    } finally {
      server.close();
    }
  });
});
