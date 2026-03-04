import { describe, it, expect, afterEach } from 'vitest';
import { requireEnv } from '../src/config';

describe('requireEnv', () => {
  afterEach(() => {
    delete process.env.__TEST_VAR__;
  });

  it('returns value when env var is set', () => {
    process.env.__TEST_VAR__ = 'hello';
    expect(requireEnv('__TEST_VAR__')).toBe('hello');
  });

  it('throws when env var is missing', () => {
    expect(() => requireEnv('__TEST_VAR__')).toThrow(
      'Missing required environment variable: __TEST_VAR__'
    );
  });
});
