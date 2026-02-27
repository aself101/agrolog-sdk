import { describe, it, expect, beforeAll } from 'vitest';
import nock from 'nock';
import { AgrologHttpClient } from '../src/http/http-client.js';
import { AgrologAPIError } from '../src/errors.js';

const BASE_URL = 'http://localhost:8080';

describe('AgrologHttpClient', () => {
  let client: AgrologHttpClient;

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
      client = new AgrologHttpClient(BASE_URL, 5000, null, 0);
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
      const retryClient = new AgrologHttpClient(BASE_URL, 5000, null, 0);
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
      const retryClient = new AgrologHttpClient(BASE_URL, 5000, null, 0);
      retryClient.setAuth(
        async () => 'bad-token',
        async () => { /* refresh doesn't help */ },
      );

      // Exactly 2 attempts: initial 401 triggers refresh, second 401 stops (no second refresh)
      const scope = nock(BASE_URL).get('/api/data').times(2).reply(401, { message: 'Unauthorized' });

      await expect(
        retryClient.request('GET', '/api/data'),
      ).rejects.toThrow('Authentication failed');

      expect(scope.isDone()).toBe(true);
    });

    it('maps timeout to AgrologAPIError with TIMEOUT code', async () => {
      const timeoutClient = new AgrologHttpClient(BASE_URL, 1, null, 0);
      timeoutClient.setAuth(
        async () => 'mock-token',
        async () => {},
      );

      nock(BASE_URL).get('/api/slow').times(4).delayConnection(50).reply(200, {});

      const error = await timeoutClient.request('GET', '/api/slow').catch((e: unknown) => e) as AgrologAPIError;
      expect(error).toBeInstanceOf(AgrologAPIError);
      expect(error.code).toBe('TIMEOUT');
    });

    it('maps network failure to AgrologAPIError with NETWORK_ERROR code', async () => {
      nock(BASE_URL).get('/api/down').times(4).replyWithError('connection refused');

      const error = await client.request('GET', '/api/down').catch((e: unknown) => e) as AgrologAPIError;
      expect(error).toBeInstanceOf(AgrologAPIError);
      expect(error.code).toBe('NETWORK_ERROR');
    });

    it('throws when 200 response body is not valid JSON', async () => {
      nock(BASE_URL).get('/api/text').reply(200, 'not-json', { 'Content-Type': 'text/plain' });

      const error = await client.request('GET', '/api/text').catch((e: unknown) => e) as AgrologAPIError;
      expect(error).toBeInstanceOf(AgrologAPIError);
    });

    it('does not send Content-Type header on GET requests', async () => {
      nock(BASE_URL, {
        badheaders: ['Content-Type'],
        reqheaders: { 'X-Authorization': 'Bearer mock-token' },
      })
        .get('/api/auth/user')
        .reply(200, { customerId: { id: 'cust-1' } });

      const result = await client.request<{ customerId: { id: string } }>('GET', '/api/auth/user');
      expect(result.customerId.id).toBe('cust-1');
    });
  });

  describe('AgrologAPIError', () => {
    it('isRetryable returns true for 502/503/504', () => {
      expect(new AgrologAPIError('msg', 'CODE', 502).isRetryable()).toBe(true);
      expect(new AgrologAPIError('msg', 'CODE', 503).isRetryable()).toBe(true);
      expect(new AgrologAPIError('msg', 'CODE', 504).isRetryable()).toBe(true);
    });

    it('isRetryable returns false for non-retryable status codes', () => {
      expect(new AgrologAPIError('msg', 'CODE', 400).isRetryable()).toBe(false);
      expect(new AgrologAPIError('msg', 'CODE', 500).isRetryable()).toBe(false);
    });

    it('isRetryable returns true for SERVICE_UNAVAILABLE code', () => {
      expect(new AgrologAPIError('msg', 'SERVICE_UNAVAILABLE').isRetryable()).toBe(true);
    });

    it('isAuthError returns true for 401/403', () => {
      expect(new AgrologAPIError('msg', 'CODE', 401).isAuthError()).toBe(true);
      expect(new AgrologAPIError('msg', 'CODE', 403).isAuthError()).toBe(true);
    });

    it('isAuthError returns false for non-auth status codes', () => {
      expect(new AgrologAPIError('msg', 'CODE', 500).isAuthError()).toBe(false);
    });

    it('isAuthError returns true for AUTH_FAILED and TOKEN_EXPIRED codes', () => {
      expect(new AgrologAPIError('msg', 'AUTH_FAILED').isAuthError()).toBe(true);
      expect(new AgrologAPIError('msg', 'TOKEN_EXPIRED').isAuthError()).toBe(true);
    });
  });
});
