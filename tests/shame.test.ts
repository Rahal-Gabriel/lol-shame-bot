import { describe, it, expect } from 'vitest';
import { isRankedDefeat } from '../src/shame';

describe('isRankedDefeat', () => {
  it('returns true when player lost a ranked solo game', () => {
    expect(isRankedDefeat({ matchId: 'BR1_1', won: false, queueId: 420 })).toBe(true);
  });

  it('returns false when player won a ranked game', () => {
    expect(isRankedDefeat({ matchId: 'BR1_1', won: true, queueId: 420 })).toBe(false);
  });

  it('returns false for non-ranked games even if lost', () => {
    expect(isRankedDefeat({ matchId: 'BR1_1', won: false, queueId: 400 })).toBe(false);
  });
});
