import { describe, it, expect } from 'vitest';
import {
  isRankedDefeat,
  buildShameMessage,
  buildWinMessage,
  SHAME_MESSAGES,
  WIN_MESSAGES,
  TILT_MESSAGES,
  buildTiltMessage,
  isRankedMatch,
  queueLabel,
  RANKED_FLEX,
  RANKED_QUEUES,
  RANKED_SOLO_DUO,
} from '../../src/watcher/shame';

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

  it('returns false for Flex win (not a defeat)', () => {
    expect(isRankedDefeat({ ...base, won: true, queueId: 440 })).toBe(false);
  });

  it('returns true for Flex defeat (ranked defeat)', () => {
    expect(isRankedDefeat({ ...base, won: false, queueId: 440 })).toBe(true);
  });
});

describe('isRankedMatch', () => {
  it('returns true for Solo/Duo loss (queueId 420, won false)', () => {
    expect(isRankedMatch({ ...base, won: false, queueId: 420 })).toBe(true);
  });

  it('returns true for Solo/Duo win (queueId 420, won true)', () => {
    expect(isRankedMatch({ ...base, won: true, queueId: 420 })).toBe(true);
  });

  it('returns true for Flex defeat (queueId 440, won false)', () => {
    expect(isRankedMatch({ ...base, won: false, queueId: 440 })).toBe(true);
  });

  it('returns false for ARAM (queueId 450)', () => {
    expect(isRankedMatch({ ...base, won: false, queueId: 450 })).toBe(false);
  });
});

describe('queueLabel', () => {
  it("returns 'Solo/Duo' for queueId 420", () => {
    expect(queueLabel(420)).toBe('Solo/Duo');
  });

  it("returns 'Flex' for queueId 440", () => {
    expect(queueLabel(440)).toBe('Flex');
  });

  it("returns 'Ranked' for unknown queueId (ex: 450)", () => {
    expect(queueLabel(450)).toBe('Ranked');
  });
});

describe('RANKED_FLEX e RANKED_QUEUES', () => {
  it('RANKED_FLEX is equal to 440', () => {
    expect(RANKED_FLEX).toBe(440);
  });

  it('RANKED_QUEUES contains both 420 and 440', () => {
    expect(RANKED_QUEUES).toContain(420);
    expect(RANKED_QUEUES).toContain(440);
  });
});

describe('RANKED_SOLO_DUO export', () => {
  it('RANKED_SOLO_DUO is equal to 420', () => {
    expect(RANKED_SOLO_DUO).toBe(420);
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
