import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenManager } from '../src/auth.js';
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
    await manager.getValidToken(client);
    await manager.getValidToken(client);

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
});
