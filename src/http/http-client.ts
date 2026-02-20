import { AgrologAPIError } from '../errors.js';
import { BACKOFF_BASE_MS, ERROR_CODES, MAX_RETRIES } from '../config/constants.js';
import type { RequestOptions } from '../types-internal.js';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// ─── Internal sentinel errors (not exported) ────────────────────

class FetchHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly endpoint: string,
  ) {
    super(message);
    this.name = 'FetchHttpError';
  }
}

class FetchTimeoutError extends Error {
  constructor(readonly endpoint: string) {
    super(`Request timed out: ${endpoint}`);
    this.name = 'FetchTimeoutError';
  }
}

class FetchNetworkError extends Error {
  constructor(message: string, readonly endpoint: string) {
    super(message);
    this.name = 'FetchNetworkError';
  }
}

// ─── HTTP Client ────────────────────────────────────────────────

export class AgrologHttpClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly defaultHeaders: Record<string, string>;
  private readonly debug: boolean;
  private readonly backoffBaseMs: number;
  private tokenGetter: (() => Promise<string>) | null = null;
  private tokenRefresher: (() => Promise<void>) | null = null;

  constructor(baseUrl: string, timeout: number, debug = false, backoffBaseMs = BACKOFF_BASE_MS) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    this.debug = debug;
    this.backoffBaseMs = backoffBaseMs;
  }

  setAuth(
    tokenGetter: () => Promise<string>,
    tokenRefresher: () => Promise<void>,
  ): void {
    this.tokenGetter = tokenGetter;
    this.tokenRefresher = tokenRefresher;
  }

  /** @typeParam T - Expected JSON response shape (cast, not validated at runtime) */
  async request<T>(
    method: HttpMethod,
    endpoint: string,
    data?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    let lastError: AgrologAPIError | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const token = await this.getToken();

        if (this.debug) {
          console.log(`[agrolog-sdk] ${method.toUpperCase()} ${endpoint} (attempt ${attempt + 1})`);
        }

        return await this.doFetch<T>(
          method,
          endpoint,
          data,
          { 'X-Authorization': `Bearer ${token}` },
          options?.params,
          options?.timeout,
        );
      } catch (error) {
        lastError = this.transformError(error, endpoint);

        // Only refresh auth on the first attempt to prevent infinite refresh loops
        if (lastError.isAuthError() && attempt === 0 && this.tokenRefresher) {
          if (this.debug) {
            console.log('[agrolog-sdk] Auth error, refreshing token...');
          }
          await this.tokenRefresher();
          continue;
        }

        // Retry on retryable errors
        if (lastError.isRetryable() && attempt < MAX_RETRIES) {
          const baseDelay = this.backoffBaseMs * (2 ** attempt);
          const delay = baseDelay > 0 ? baseDelay * (0.75 + Math.random() * 0.5) : 0;
          if (this.debug) {
            console.log(`[agrolog-sdk] Retrying in ${delay}ms...`);
          }
          await sleep(delay);
          continue;
        }

        break;
      }
    }

    throw lastError ?? new AgrologAPIError('Request failed after retries', ERROR_CODES.REQUEST_FAILED);
  }

  /** @typeParam T - Expected JSON response shape (cast, not validated at runtime) */
  async requestNoAuth<T>(
    method: HttpMethod,
    endpoint: string,
    data?: unknown,
  ): Promise<T> {
    try {
      return await this.doFetch<T>(method, endpoint, data);
    } catch (error) {
      throw this.transformError(error, endpoint);
    }
  }

  private async doFetch<T>(
    method: HttpMethod,
    endpoint: string,
    data?: unknown,
    headers?: Record<string, string>,
    params?: Record<string, string | number>,
    perRequestTimeout?: number,
  ): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
      }
    }

    const mergedHeaders: Record<string, string> = { ...this.defaultHeaders, ...headers };

    // Don't send Content-Type on bodiless requests
    if (data === undefined) {
      delete mergedHeaders['Content-Type'];
    }

    const timeoutMs = perRequestTimeout ?? this.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: mergedHeaders,
        body: data !== undefined ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMessage: string | undefined;
        try {
          const errorBody = await response.json() as Record<string, unknown>;
          errorMessage = typeof errorBody.message === 'string' ? errorBody.message : undefined;
        } catch {
          // Body wasn't JSON — fall through to statusText
        }
        throw new FetchHttpError(errorMessage ?? response.statusText, response.status, endpoint);
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof FetchHttpError) throw error;

      if (error instanceof Error && error.name === 'AbortError') {
        throw new FetchTimeoutError(endpoint);
      }

      // TypeError from fetch = network error (DNS failure, connection refused, etc.)
      // Also catch any other unrecognized error as network error
      throw new FetchNetworkError(
        error instanceof Error ? error.message : String(error),
        endpoint,
      );
    } finally {
      clearTimeout(timeoutId);
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

    if (error instanceof FetchTimeoutError) {
      return new AgrologAPIError(
        `Request timed out: ${endpoint}`,
        ERROR_CODES.TIMEOUT,
        undefined,
        endpoint,
      );
    }

    if (error instanceof FetchNetworkError) {
      return new AgrologAPIError(
        `Network error: ${error.message}`,
        ERROR_CODES.NETWORK_ERROR,
        undefined,
        endpoint,
      );
    }

    if (error instanceof FetchHttpError) {
      const { status, message } = error;

      if (status === 401 || status === 403) {
        return new AgrologAPIError(
          `Authentication failed: ${message}`,
          ERROR_CODES.AUTH_FAILED,
          status,
          endpoint,
        );
      }

      if (status >= 500) {
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
