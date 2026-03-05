import { describe, it, expect } from 'vitest';
import { isRankedDefeat, buildShameMessage, buildWinMessage } from '../src/shame';

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

describe('buildShameMessage', () => {
  it('includes the player name in the message', () => {
    const msg = buildShameMessage('Gabriel', { matchId: 'BR1_1', won: false, queueId: 420 });
    expect(msg).toContain('Gabriel');
  });

  it('includes the match id in the message', () => {
    const msg = buildShameMessage('Gabriel', { matchId: 'BR1_999', won: false, queueId: 420 });
    expect(msg).toContain('BR1_999');
  });

  it('returns a non-empty string', () => {
    const msg = buildShameMessage('Faker', { matchId: 'BR1_1', won: false, queueId: 420 });
    expect(msg.length).toBeGreaterThan(0);
  });
});

describe('buildWinMessage', () => {
  it('includes the player name in the message', () => {
    const msg = buildWinMessage('Gabriel', { matchId: 'BR1_1', won: true, queueId: 420 });
    expect(msg).toContain('Gabriel');
  });

  it('includes the match id in the message', () => {
    const msg = buildWinMessage('Gabriel', { matchId: 'BR1_999', won: true, queueId: 420 });
    expect(msg).toContain('BR1_999');
  });

  it('returns a non-empty string', () => {
    const msg = buildWinMessage('Faker', { matchId: 'BR1_1', won: true, queueId: 420 });
    expect(msg.length).toBeGreaterThan(0);
  });
});
