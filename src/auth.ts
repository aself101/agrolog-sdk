import type { AgrologHttpClient } from './http/http-client.js';
import { API_PATHS, TOKEN_TTL_MS, TOKEN_REFRESH_BUFFER_MS, ERROR_CODES } from './config/constants.js';
import { AgrologAPIError } from './errors.js';

interface LoginResponse {
  readonly token: string;
  readonly refreshToken: string;
}

export class TokenManager {
  private token: string | null = null;
  private tokenAcquiredAt = 0;
  private refreshPromise: Promise<string> | null = null;
  private readonly username: string;
  private readonly password: string;

  /** Creates a new token manager bound to the given credentials. */
  constructor(username: string, password: string) {
    this.username = username;
    this.password = password;
  }

  /** Returns a valid token, refreshing automatically if expiry is approaching. */
  async getValidToken(httpClient: AgrologHttpClient): Promise<string> {
    if (this.token && !this.isExpiringSoon()) {
      return this.token;
    }
    return this.refreshToken(httpClient);
  }

  /** Forces a token refresh regardless of current token state. Deduplicates concurrent calls. */
  async refreshToken(httpClient: AgrologHttpClient): Promise<string> {
    // Deduplicate concurrent refresh calls
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doLogin(httpClient);

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  /** Clears the cached token, forcing re-authentication on the next request. */
  clearToken(): void {
    this.token = null;
    this.tokenAcquiredAt = 0;
  }

  private async doLogin(httpClient: AgrologHttpClient): Promise<string> {
    const response = await httpClient.requestNoAuth<LoginResponse>(
      'POST',
      API_PATHS.LOGIN,
      { username: this.username, password: this.password },
    );

    if (!response.token || typeof response.token !== 'string') {
      throw new AgrologAPIError(
        'Login response missing valid token',
        ERROR_CODES.AUTH_FAILED,
      );
    }

    this.token = response.token;
    this.tokenAcquiredAt = Date.now();
    return this.token;
  }

  private isExpiringSoon(): boolean {
    const elapsed = Date.now() - this.tokenAcquiredAt;
    return elapsed >= TOKEN_TTL_MS - TOKEN_REFRESH_BUFFER_MS;
  }
}
