import { describe, it, expect } from 'vitest';
import { isRankedDefeat, buildShameMessage, buildWinMessage, SHAME_MESSAGES, WIN_MESSAGES, TILT_MESSAGES, buildTiltMessage } from '../../src/watcher/shame';

const base = { matchId: 'BR1_1', champion: 'Yasuo', kills: 2, deaths: 8, assists: 1, gameDurationSecs: 1800 };

describe('isRankedDefeat', () => {
  it('returns true when player lost a ranked solo game', () => {
    expect(isRankedDefeat({ ...base, won: false, queueId: 420 })).toBe(true);
  });

  it('returns false when player won a ranked game', () => {
    expect(isRankedDefeat({ ...base, won: true, queueId: 420 })).toBe(false);
  });

  it('returns false for non-ranked games even if lost', () => {
    expect(isRankedDefeat({ ...base, won: false, queueId: 400 })).toBe(false);
  });
});

describe('buildShameMessage', () => {
  it('includes the player name in the message', () => {
    const msg = buildShameMessage('Gabriel');
    expect(msg).toContain('Gabriel');
  });

  it('contains one of the shame phrases', () => {
    const msg = buildShameMessage('Faker');
    expect(SHAME_MESSAGES.some(phrase => msg.includes(phrase))).toBe(true);
  });

  it('has at least 19 shame phrases', () => {
    expect(SHAME_MESSAGES.length).toBeGreaterThanOrEqual(19);
  });
});

describe('buildWinMessage', () => {
  it('includes the player name in the message', () => {
    const msg = buildWinMessage('Gabriel');
    expect(msg).toContain('Gabriel');
  });

  it('contains one of the win phrases', () => {
    const msg = buildWinMessage('Faker');
    expect(WIN_MESSAGES.some((phrase: string) => msg.includes(phrase))).toBe(true);
  });

  it('has at least 15 win phrases', () => {
    expect(WIN_MESSAGES.length).toBeGreaterThanOrEqual(15);
  });
});

describe('TILT_MESSAGES', () => {
  it('has at least 5 tilt phrases', () => {
    expect(TILT_MESSAGES.length).toBeGreaterThanOrEqual(5);
  });

  it('contains only non-empty strings', () => {
    for (const msg of TILT_MESSAGES) {
      expect(typeof msg).toBe('string');
      expect(msg.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('buildTiltMessage', () => {
  it('includes the player name in the message', () => {
    const msg = buildTiltMessage('GatoMakonha', -3);
    expect(msg).toContain('GatoMakonha');
  });

  it('contains one of the tilt phrases', () => {
    const msg = buildTiltMessage('Faker', -5);
    expect(TILT_MESSAGES.some((phrase: string) => msg.includes(phrase))).toBe(true);
  });

  it('includes the absolute value of streak in the message', () => {
    const msg = buildTiltMessage('Gabriel', -4);
    expect(msg).toContain('4');
  });

  it('works for streak -3 (threshold)', () => {
    const msg = buildTiltMessage('Test', -3);
    expect(msg).toContain('Test');
    expect(msg).toContain('3');
  });

  it('works for streak -10 (deep tilt)', () => {
    const msg = buildTiltMessage('Test', -10);
    expect(msg).toContain('10');
  });
});
