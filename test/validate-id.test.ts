import { describe, it, expect } from 'vitest';
import { validateId } from '../src/config/constants.js';
import { AgrologAPIError } from '../src/errors.js';

describe('validateId', () => {
  it('accepts valid UUID-style IDs', () => {
    expect(validateId('abc-123-def')).toBe('abc-123-def');
  });

  it('accepts alphanumeric with underscores', () => {
    expect(validateId('silo_1')).toBe('silo_1');
  });

  it('accepts plain alphanumeric', () => {
    expect(validateId('abc123')).toBe('abc123');
  });

  it('throws AgrologAPIError for path traversal', () => {
    expect(() => validateId('../etc/passwd')).toThrow(AgrologAPIError);
    expect(() => validateId('../etc/passwd')).toThrow('Invalid entity ID format');
  });

  it('throws AgrologAPIError for URL-encoded characters', () => {
    expect(() => validateId('id%2F..%2Fetc')).toThrow(AgrologAPIError);
  });

  it('throws AgrologAPIError for spaces', () => {
    expect(() => validateId('id with spaces')).toThrow(AgrologAPIError);
  });

  it('throws AgrologAPIError for empty string', () => {
    expect(() => validateId('')).toThrow(AgrologAPIError);
  });

  it('throws AgrologAPIError for slashes', () => {
    expect(() => validateId('a/b')).toThrow(AgrologAPIError);
  });

  it('has REQUEST_FAILED error code', () => {
    try {
      validateId('bad/id');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AgrologAPIError);
      expect((err as AgrologAPIError).code).toBe('REQUEST_FAILED');
    }
  });
});
