import axios, { type AxiosInstance, type AxiosRequestConfig, type Method } from 'axios';
import { AgrologAPIError } from '../errors.js';
import { BACKOFF_BASE_MS, ERROR_CODES, MAX_RETRIES } from '../config/constants.js';
import type { RequestOptions } from '../types.js';

export class AgrologHttpClient {
  private readonly client: AxiosInstance;
  private readonly debug: boolean;
  private readonly backoffBaseMs: number;
  private tokenGetter: (() => Promise<string>) | null = null;
  private tokenRefresher: (() => Promise<void>) | null = null;

  constructor(baseUrl: string, timeout: number, debug = false, backoffBaseMs = BACKOFF_BASE_MS) {
    this.debug = debug;
    this.backoffBaseMs = backoffBaseMs;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  setAuth(
    tokenGetter: () => Promise<string>,
    tokenRefresher: () => Promise<void>,
  ): void {
    this.tokenGetter = tokenGetter;
    this.tokenRefresher = tokenRefresher;
  }

  async request<T>(
    method: Method,
    endpoint: string,
    data?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    let lastError: AgrologAPIError | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const token = await this.getToken();
        const config: AxiosRequestConfig = {
          method,
          url: endpoint,
          data,
          headers: { 'X-Authorization': `Bearer ${token}` },
          params: options?.params,
          timeout: options?.timeout,
        };

        if (this.debug) {
          console.log(`[agrolog-sdk] ${method.toUpperCase()} ${endpoint} (attempt ${attempt + 1})`);
        }

        const response = await this.client.request<T>(config);
        return response.data;
      } catch (error) {
        lastError = this.transformError(error, endpoint);

        // On 401, attempt one token refresh then retry
        if (lastError.isAuthError() && attempt === 0 && this.tokenRefresher) {
          if (this.debug) {
            console.log('[agrolog-sdk] Auth error, refreshing token...');
          }
          await this.tokenRefresher();
          continue;
        }

        // Retry on retryable errors
        if (lastError.isRetryable() && attempt < MAX_RETRIES) {
          const delay = this.backoffBaseMs * Math.pow(2, attempt);
          if (this.debug) {
            console.log(`[agrolog-sdk] Retrying in ${delay}ms...`);
          }
          await sleep(delay);
          continue;
        }

        break;
      }
    }

    throw lastError!;
  }

  async requestNoAuth<T>(
    method: Method,
    endpoint: string,
    data?: unknown,
  ): Promise<T> {
    try {
      const response = await this.client.request<T>({
        method,
        url: endpoint,
        data,
      });
      return response.data;
    } catch (error) {
      throw this.transformError(error, endpoint);
    }
  }

  private async getToken(): Promise<string> {
    if (!this.tokenGetter) {
      throw new AgrologAPIError(
        'Auth not configured. Call setAuth() before making authenticated requests.',
        ERROR_CODES.AUTH_FAILED,
      );
    }
    return this.tokenGetter();
  }

  private transformError(error: unknown, endpoint: string): AgrologAPIError {
    if (error instanceof AgrologAPIError) return error;

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message ?? error.message;

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return new AgrologAPIError(
          `Request timed out: ${endpoint}`,
          ERROR_CODES.TIMEOUT,
          undefined,
          endpoint,
        );
      }

      if (!error.response) {
        return new AgrologAPIError(
          `Network error: ${error.message}`,
          ERROR_CODES.NETWORK_ERROR,
          undefined,
          endpoint,
        );
      }

      if (status === 401 || status === 403) {
        return new AgrologAPIError(
          `Authentication failed: ${message}`,
          ERROR_CODES.AUTH_FAILED,
          status,
          endpoint,
        );
      }

      if (status && status >= 500) {
        return new AgrologAPIError(
          `Server error: ${message}`,
          ERROR_CODES.SERVICE_UNAVAILABLE,
          status,
          endpoint,
        );
      }

      return new AgrologAPIError(
        `Request failed: ${message}`,
        ERROR_CODES.REQUEST_FAILED,
        status,
        endpoint,
      );
    }

    return new AgrologAPIError(
      `Unexpected error: ${String(error)}`,
      ERROR_CODES.REQUEST_FAILED,
      undefined,
      endpoint,
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
