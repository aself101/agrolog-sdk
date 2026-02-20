/** Custom error class thrown by all agrolog-sdk operations. */
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
   */
  isRetryable(): boolean {
    if (this.httpStatus && [502, 503, 504].includes(this.httpStatus)) {
      return true;
    }
    return this.code === 'SERVICE_UNAVAILABLE';
  }

  /**
   * Returns true if this error is due to authentication failure
   * (HTTP 401/403, AUTH_FAILED, TOKEN_EXPIRED).
   */
  isAuthError(): boolean {
    if (this.httpStatus && [401, 403].includes(this.httpStatus)) {
      return true;
    }
    return this.code === 'AUTH_FAILED' || this.code === 'TOKEN_EXPIRED';
  }
}
