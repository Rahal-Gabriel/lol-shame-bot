import { describe, it, expect } from 'vitest';
import { isRankedDefeat, buildShameMessage, buildWinMessage, SHAME_MESSAGES, WIN_MESSAGES } from '../src/shame';

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

  it('contains one of the shame phrases', () => {
    const msg = buildShameMessage('Faker', { matchId: 'BR1_1', won: false, queueId: 420 });
    expect(SHAME_MESSAGES.some(phrase => msg.includes(phrase))).toBe(true);
  });

  it('has at least 19 shame phrases', () => {
    expect(SHAME_MESSAGES.length).toBeGreaterThanOrEqual(19);
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

  it('contains one of the win phrases', () => {
    const msg = buildWinMessage('Faker', { matchId: 'BR1_1', won: true, queueId: 420 });
    expect(WIN_MESSAGES.some((phrase: string) => msg.includes(phrase))).toBe(true);
  });

  it('has at least 5 win phrases', () => {
    expect(WIN_MESSAGES.length).toBeGreaterThanOrEqual(5);
  });
});
