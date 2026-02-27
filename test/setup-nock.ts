import { beforeAll, afterAll, afterEach } from 'vitest';
import nock from 'nock';

// Global nock lifecycle — prevents real HTTP requests in all test files.
// Removes the need for per-file beforeAll/afterAll/afterEach nock boilerplate.
beforeAll(() => nock.disableNetConnect());
afterAll(() => nock.enableNetConnect());
afterEach(() => nock.cleanAll());
