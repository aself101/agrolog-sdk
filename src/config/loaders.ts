import dotenv from 'dotenv';
import type { AgrologConfig } from '../types.js';
import { AgrologAPIError } from '../errors.js';
import { DEFAULT_BASE_URL, DEFAULT_TIMEOUT, ERROR_CODES } from './constants.js';

// Load .env once per process to avoid repeated disk reads.
// dotenv.config() does not override existing env vars, so this is safe to call once.
let dotenvLoaded = false;

/** @internal Not part of the public API — use `AgrologConfig` instead. */
export interface ResolvedConfig {
  readonly username: string;
  readonly password: string;
  readonly baseUrl: string;
  readonly timeout: number;
  readonly log: ((message: string) => void) | null;
}

export function loadConfig(config?: AgrologConfig): ResolvedConfig {
  // Load .env once on first call (lazy, does not override existing env vars)
  if (!dotenvLoaded) {
    dotenv.config();
    dotenvLoaded = true;
  }

  const username = config?.username ?? process.env.AGROLOG_USERNAME;
  const password = config?.password ?? process.env.AGROLOG_PASSWORD;
  const baseUrl = config?.baseUrl ?? process.env.AGROLOG_THINGSBOARD_URL ?? DEFAULT_BASE_URL;
  const timeout = config?.timeout ?? DEFAULT_TIMEOUT;

  if (baseUrl.startsWith('http://') && !baseUrl.startsWith('http://localhost')) {
    process.emitWarning(
      `baseUrl "${baseUrl}" uses HTTP. Credentials will be sent in plaintext. Use HTTPS in production.`,
      'AgrologSecurityWarning',
    );
  }

  if (config?.debug && !config?.logger) {
    process.emitWarning(
      '`debug: true` is deprecated. Use `logger: (msg) => console.log(msg)` instead.',
      'DeprecationWarning',
    );
  }
  const log = config?.logger ?? (config?.debug ? console.log : null);

  if (!username) {
    throw new AgrologAPIError(
      'Agrolog username is required. Pass it via config or set AGROLOG_USERNAME env var.',
      ERROR_CODES.AUTH_FAILED,
    );
  }

  if (!password) {
    throw new AgrologAPIError(
      'Agrolog password is required. Pass it via config or set AGROLOG_PASSWORD env var.',
      ERROR_CODES.AUTH_FAILED,
    );
  }

  return { username, password, baseUrl, timeout, log };
}
