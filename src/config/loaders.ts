import dotenv from 'dotenv';
import type { AgrologConfig } from '../types.js';
import { DEFAULT_BASE_URL, DEFAULT_TIMEOUT } from './constants.js';

let dotenvLoaded = false;

export interface ResolvedConfig {
  readonly username: string;
  readonly password: string;
  readonly baseUrl: string;
  readonly timeout: number;
  readonly debug: boolean;
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
  const debug = config?.debug ?? false;

  if (!username) {
    throw new Error(
      'Agrolog username is required. Pass it via config or set AGROLOG_USERNAME env var.',
    );
  }

  if (!password) {
    throw new Error(
      'Agrolog password is required. Pass it via config or set AGROLOG_PASSWORD env var.',
    );
  }

  return { username, password, baseUrl, timeout, debug };
}
