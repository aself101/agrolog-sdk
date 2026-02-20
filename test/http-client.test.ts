import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import nock from 'nock';
import { AgrologHttpClient } from '../src/http/http-client.js';
import { AgrologAPIError } from '../src/errors.js';

const BASE_URL = 'http://localhost:8080';

describe('AgrologHttpClient', () => {
  let client: AgrologHttpClient;

  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('requestNoAuth', () => {
    beforeAll(() => {
      client = new AgrologHttpClient(BASE_URL, 5000);
    });

    it('makes unauthenticated POST request', async () => {
      nock(BASE_URL)
        .post('/api/auth/login', { username: 'user', password: 'pass' })
        .reply(200, { token: 'jwt-token' });

      const result = await client.requestNoAuth<{ token: string }>(
        'POST', '/api/auth/login', { username: 'user', password: 'pass' }
      );

      expect(result).toEqual({ token: 'jwt-token' });
    });

    it('transforms HTTP errors to AgrologAPIError', async () => {
      nock(BASE_URL)
        .post('/api/auth/login')
        .reply(401, { message: 'Invalid credentials' });

      await expect(
        client.requestNoAuth('POST', '/api/auth/login', {})
      ).rejects.toThrow(AgrologAPIError);
    });
  });

  describe('request (authenticated)', () => {
    beforeAll(() => {
      // Use 0ms backoff so retry tests complete instantly
      client = new AgrologHttpClient(BASE_URL, 5000, false, 0);
      client.setAuth(
        async () => 'mock-token',
        async () => { /* no-op */ },
      );
    });

    it('injects X-Authorization header', async () => {
      nock(BASE_URL, {
        reqheaders: { 'X-Authorization': 'Bearer mock-token' },
      })
        .get('/api/auth/user')
        .reply(200, { customerId: { id: 'cust-1' } });

      const result = await client.request<{ customerId: { id: string } }>('GET', '/api/auth/user');
      expect(result.customerId.id).toBe('cust-1');
    });

    it('throws AgrologAPIError on 500', async () => {
      // Need enough retries (4 total = initial + 3 retries)
      nock(BASE_URL).get('/api/auth/user').times(4).reply(500, { message: 'Internal error' });

      await expect(client.request('GET', '/api/auth/user')).rejects.toThrow(AgrologAPIError);
    });

    it('throws NOT_CONNECTED if auth not configured', async () => {
      const unauthClient = new AgrologHttpClient(BASE_URL, 5000);
      await expect(unauthClient.request('GET', '/api/auth/user')).rejects.toThrow('Auth not configured');
    });

    it('refreshes token on 401 and retries the request', async () => {
      let tokenCallCount = 0;
      const retryClient = new AgrologHttpClient(BASE_URL, 5000, false, 0);
      retryClient.setAuth(
        async () => {
          tokenCallCount++;
          return tokenCallCount === 1 ? 'stale-token' : 'fresh-token';
        },
        async () => { /* refresh is called, next getToken returns fresh-token */ },
      );

      // First request returns 401, second (after refresh) returns 200
      nock(BASE_URL, { reqheaders: { 'X-Authorization': 'Bearer stale-token' } })
        .get('/api/data')
        .reply(401, { message: 'Token expired' });
      nock(BASE_URL, { reqheaders: { 'X-Authorization': 'Bearer fresh-token' } })
        .get('/api/data')
        .reply(200, { result: 'ok' });

      const result = await retryClient.request<{ result: string }>('GET', '/api/data');
      expect(result).toEqual({ result: 'ok' });
      expect(tokenCallCount).toBe(2);
    });

    it('does not retry auth refresh on second 401', async () => {
      const retryClient = new AgrologHttpClient(BASE_URL, 5000, false, 0);
      retryClient.setAuth(
        async () => 'bad-token',
        async () => { /* refresh doesn't help */ },
      );

      // All attempts return 401
      nock(BASE_URL).get('/api/data').times(4).reply(401, { message: 'Unauthorized' });

      await expect(
        retryClient.request('GET', '/api/data'),
      ).rejects.toThrow('Authentication failed');
    });
  });
});
