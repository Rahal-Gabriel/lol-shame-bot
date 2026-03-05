import { describe, it, expect } from 'vitest';
import { hasNewMatch } from '../src/watcher';

describe('hasNewMatch', () => {
  it('returns true when there is a match and no previous match was seen', () => {
    expect(hasNewMatch(null, 'BR1_100')).toBe(true);
  });

  it('returns true when the current match differs from the last seen', () => {
    expect(hasNewMatch('BR1_99', 'BR1_100')).toBe(true);
  });

  it('returns false when current match is the same as last seen', () => {
    expect(hasNewMatch('BR1_100', 'BR1_100')).toBe(false);
  });

  it('returns false when there is no current match', () => {
    expect(hasNewMatch(null, null)).toBe(false);
  });
});
