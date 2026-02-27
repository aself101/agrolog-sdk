import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenManager } from '../src/auth.js';
import { AgrologAPIError } from '../src/errors.js';
import { TOKEN_TTL_MS, TOKEN_REFRESH_BUFFER_MS } from '../src/config/constants.js';
import type { AgrologHttpClient } from '../src/http/http-client.js';

function createMockHttpClient(token = 'test-token'): AgrologHttpClient {
  return {
    requestNoAuth: vi.fn().mockResolvedValue({ token, refreshToken: 'refresh-token' }),
    request: vi.fn(),
    setAuth: vi.fn(),
  } as unknown as AgrologHttpClient;
}

describe('TokenManager', () => {
  let manager: TokenManager;

  beforeEach(() => {
    manager = new TokenManager('user@test.com', 'password');
  });

  it('acquires token on first call', async () => {
    const client = createMockHttpClient();
    const token = await manager.getValidToken(client);

    expect(token).toBe('test-token');
    expect(client.requestNoAuth).toHaveBeenCalledWith('POST', '/api/auth/login', {
      username: 'user@test.com',
      password: 'password',
    });
  });

  it('returns cached token on subsequent calls', async () => {
    const client = createMockHttpClient();
    const t1 = await manager.getValidToken(client);
    const t2 = await manager.getValidToken(client);

    expect(t1).toBe('test-token');
    expect(t2).toBe('test-token');
    expect(client.requestNoAuth).toHaveBeenCalledTimes(1);
  });

  it('refreshes token after clearToken()', async () => {
    const client = createMockHttpClient();
    await manager.getValidToken(client);

    manager.clearToken();
    await manager.getValidToken(client);

    expect(client.requestNoAuth).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent refresh calls', async () => {
    const client = createMockHttpClient();

    // Launch 3 concurrent token requests
    const [t1, t2, t3] = await Promise.all([
      manager.getValidToken(client),
      manager.getValidToken(client),
      manager.getValidToken(client),
    ]);

    expect(t1).toBe('test-token');
    expect(t2).toBe('test-token');
    expect(t3).toBe('test-token');
    // Only 1 actual login call
    expect(client.requestNoAuth).toHaveBeenCalledTimes(1);
  });

  it('re-acquires token when approaching expiry boundary', async () => {
    vi.useFakeTimers();
    try {
      const client = createMockHttpClient('first-token');
      await manager.getValidToken(client);
      expect(client.requestNoAuth).toHaveBeenCalledTimes(1);

      // Advance time to exactly the refresh boundary
      vi.advanceTimersByTime(TOKEN_TTL_MS - TOKEN_REFRESH_BUFFER_MS);

      (client.requestNoAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        token: 'refreshed-token',
        refreshToken: 'refresh-2',
      });

      const token = await manager.getValidToken(client);
      expect(token).toBe('refreshed-token');
      expect(client.requestNoAuth).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('refreshToken force re-acquires', async () => {
    const client = createMockHttpClient('token-1');
    await manager.getValidToken(client);

    (client.requestNoAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      token: 'token-2',
      refreshToken: 'refresh-2',
    });

    const token = await manager.refreshToken(client);
    expect(token).toBe('token-2');
  });

  it('throws AgrologAPIError when login response has no token', async () => {
    const client = {
      requestNoAuth: vi.fn().mockResolvedValue({ token: '', refreshToken: 'r' }),
      request: vi.fn(),
      setAuth: vi.fn(),
    } as unknown as AgrologHttpClient;

    await expect(manager.getValidToken(client)).rejects.toThrow(AgrologAPIError);
    await expect(manager.getValidToken(client)).rejects.toThrow('Login response missing valid token');
  });

  it('throws AgrologAPIError when login response token is not a string', async () => {
    const client = {
      requestNoAuth: vi.fn().mockResolvedValue({ token: 12345, refreshToken: 'r' }),
      request: vi.fn(),
      setAuth: vi.fn(),
    } as unknown as AgrologHttpClient;

    await expect(manager.getValidToken(client)).rejects.toThrow(AgrologAPIError);
  });

  it('returns cached token 1ms before the refresh boundary', async () => {
    vi.useFakeTimers();
    try {
      const client = createMockHttpClient('cached-token');
      await manager.getValidToken(client);

      // Advance to 1ms before the refresh boundary
      vi.advanceTimersByTime(TOKEN_TTL_MS - TOKEN_REFRESH_BUFFER_MS - 1);

      const token = await manager.getValidToken(client);
      expect(token).toBe('cached-token');
      // Still only 1 login call — no refresh triggered
      expect(client.requestNoAuth).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('refreshes token at full TTL expiry (well past refresh boundary)', async () => {
    vi.useFakeTimers();
    try {
      const client = createMockHttpClient('original-token');
      await manager.getValidToken(client);

      // Advance past full TTL — token is fully expired, not just approaching expiry
      vi.advanceTimersByTime(TOKEN_TTL_MS);

      (client.requestNoAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        token: 'expired-refresh-token',
        refreshToken: 'refresh-2',
      });

      const token = await manager.getValidToken(client);
      expect(token).toBe('expired-refresh-token');
      expect(client.requestNoAuth).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('refreshes token exactly at the refresh boundary', async () => {
    vi.useFakeTimers();
    try {
      const client = createMockHttpClient('first-token');
      await manager.getValidToken(client);

      // Advance to exactly the refresh boundary
      vi.advanceTimersByTime(TOKEN_TTL_MS - TOKEN_REFRESH_BUFFER_MS);

      (client.requestNoAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        token: 'boundary-token',
        refreshToken: 'refresh-2',
      });

      const token = await manager.getValidToken(client);
      expect(token).toBe('boundary-token');
      expect(client.requestNoAuth).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
