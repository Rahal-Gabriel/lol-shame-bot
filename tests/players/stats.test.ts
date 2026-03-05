import { describe, it, expect } from 'vitest';
import { updateStats, formatStats, emptyStats } from '../../src/players/stats';

describe('emptyStats', () => {
  it('returns zeroed stats', () => {
    expect(emptyStats()).toEqual({ wins: 0, losses: 0, streak: 0 });
  });
});

describe('updateStats', () => {
  it('increments wins on victory', () => {
    const result = updateStats(emptyStats(), true);
    expect(result.wins).toBe(1);
    expect(result.losses).toBe(0);
  });

  it('increments losses on defeat', () => {
    const result = updateStats(emptyStats(), false);
    expect(result.losses).toBe(1);
    expect(result.wins).toBe(0);
  });

  it('increments win streak on consecutive wins', () => {
    let s = updateStats(emptyStats(), true);
    s = updateStats(s, true);
    s = updateStats(s, true);
    expect(s.streak).toBe(3);
  });

  it('increments loss streak on consecutive losses', () => {
    let s = updateStats(emptyStats(), false);
    s = updateStats(s, false);
    expect(s.streak).toBe(-2);
  });

  it('resets streak to 1 when win breaks a loss streak', () => {
    let s = updateStats(emptyStats(), false);
    s = updateStats(s, false);
    s = updateStats(s, true);
    expect(s.streak).toBe(1);
  });

  it('resets streak to -1 when loss breaks a win streak', () => {
    let s = updateStats(emptyStats(), true);
    s = updateStats(s, true);
    s = updateStats(s, false);
    expect(s.streak).toBe(-1);
  });

  it('does not mutate original stats', () => {
    const original = emptyStats();
    updateStats(original, true);
    expect(original.wins).toBe(0);
  });
});

describe('formatStats', () => {
  it('includes player name', () => {
    expect(formatStats('Gabriel', { wins: 5, losses: 5, streak: 1 })).toContain('Gabriel');
  });

  it('shows correct winrate', () => {
    expect(formatStats('Gabriel', { wins: 7, losses: 3, streak: 1 })).toContain('70%');
  });

  it('shows win streak', () => {
    expect(formatStats('Gabriel', { wins: 3, losses: 0, streak: 3 })).toContain('3');
  });

  it('shows loss streak', () => {
    expect(formatStats('Gabriel', { wins: 0, losses: 4, streak: -4 })).toContain('4');
  });

  it('shows 0% winrate when no matches played', () => {
    expect(formatStats('Gabriel', emptyStats())).toContain('0%');
  });
});
