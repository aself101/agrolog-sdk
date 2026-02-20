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
  });
});
