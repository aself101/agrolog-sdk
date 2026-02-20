const RETRYABLE_HTTP_STATUSES = new Set([502, 503, 504]);
const AUTH_ERROR_HTTP_STATUSES = new Set([401, 403]);

/**
 * Error thrown by all AgrologClient methods on failure.
 * Check `code` against `ERROR_CODES` for programmatic handling,
 * or use `isRetryable()` / `isAuthError()` for common classification.
 *
 * @example
 * try {
 *   await client.connect();
 * } catch (err) {
 *   if (err instanceof AgrologAPIError) {
 *     console.error(err.code, err.message);
 *     // err.httpStatus — HTTP status code (if applicable)
 *     // err.endpoint — API endpoint that failed
 *     if (err.isRetryable()) { // safe to retry }
 *   }
 * }
 */
export class AgrologAPIError extends Error {
  /** Machine-readable error code from `ERROR_CODES`. */
  readonly code: string;
  /** HTTP status code if this error came from an HTTP response. */
  readonly httpStatus?: number;
  /** The API endpoint that produced this error. */
  readonly endpoint?: string;

  constructor(
    message: string,
    code: string,
    httpStatus?: number,
    endpoint?: string,
  ) {
    super(message);
    this.name = 'AgrologAPIError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.endpoint = endpoint;
  }

  /**
   * Returns true if this error is safe to retry (5xx server errors,
   * network timeouts, SERVICE_UNAVAILABLE).
   *
   * Note: HTTP 500 is also retryable because `http-client.ts` maps it to
   * the `SERVICE_UNAVAILABLE` error code, which is matched by the code check below.
   */
  isRetryable(): boolean {
    if (this.httpStatus && RETRYABLE_HTTP_STATUSES.has(this.httpStatus)) {
      return true;
    }
    return this.code === 'SERVICE_UNAVAILABLE';
  }

  /**
   * Returns true if this error is due to authentication failure
   * (HTTP 401/403, AUTH_FAILED, TOKEN_EXPIRED).
   */
  isAuthError(): boolean {
    if (this.httpStatus && AUTH_ERROR_HTTP_STATUSES.has(this.httpStatus)) {
      return true;
    }
    return this.code === 'AUTH_FAILED' || this.code === 'TOKEN_EXPIRED';
  }
}
