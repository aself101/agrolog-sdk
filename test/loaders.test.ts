import { describe, it, expect, afterEach } from 'vitest';
import { loadConfig } from '../src/config/loaders.js';
import { DEFAULT_BASE_URL, DEFAULT_TIMEOUT } from '../src/config/constants.js';
import { AgrologAPIError } from '../src/errors.js';
import { setTestEnv, clearTestEnv } from './test-setup.js';

describe('loadConfig', () => {
  afterEach(() => clearTestEnv());

  it('resolves credentials from environment variables', () => {
    setTestEnv();
    const config = loadConfig();

    expect(config.username).toBe('test@example.com');
    expect(config.password).toBe('test-password');
    expect(config.baseUrl).toBe('http://localhost:8080');
    expect(config.timeout).toBe(DEFAULT_TIMEOUT);
    expect(config.debug).toBe(false);
  });

  it('prefers config object over env vars', () => {
    setTestEnv();
    const config = loadConfig({
      username: 'override@test.com',
      password: 'override-pass',
      baseUrl: 'http://override:9090',
    });

    expect(config.username).toBe('override@test.com');
    expect(config.password).toBe('override-pass');
    expect(config.baseUrl).toBe('http://override:9090');
  });

  it('falls back to DEFAULT_BASE_URL when no baseUrl configured', () => {
    const config = loadConfig({ username: 'u', password: 'p' });
    expect(config.baseUrl).toBe(DEFAULT_BASE_URL);
  });

  it('throws when username is missing', () => {
    expect(() => loadConfig({ password: 'p' } as never)).toThrow(AgrologAPIError);
    expect(() => loadConfig({ password: 'p' } as never)).toThrow('username is required');
  });

  it('throws when password is missing', () => {
    expect(() => loadConfig({ username: 'u' } as never)).toThrow(AgrologAPIError);
    expect(() => loadConfig({ username: 'u' } as never)).toThrow('password is required');
  });
});
