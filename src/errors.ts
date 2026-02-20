export class AgrologAPIError extends Error {
  readonly code: string;
  readonly httpStatus?: number;
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

  isRetryable(): boolean {
    if (this.httpStatus && [502, 503, 504].includes(this.httpStatus)) {
      return true;
    }
    return this.code === 'SERVICE_UNAVAILABLE';
  }

  isAuthError(): boolean {
    if (this.httpStatus && [401, 403].includes(this.httpStatus)) {
      return true;
    }
    return this.code === 'AUTH_FAILED' || this.code === 'TOKEN_EXPIRED';
  }
}
