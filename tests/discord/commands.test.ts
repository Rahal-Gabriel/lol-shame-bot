import { describe, it, expect } from 'vitest';
import { addPlayer, removePlayer, formatPlayerList, resolveCheckNow } from '../../src/discord/commands';
import { Player } from '../../src/players/players';

const base: Player[] = [
  { gameName: 'GatoMakonha', tagLine: 'T2F' },
];

describe('addPlayer', () => {
  it('adds a new player to the list', () => {
    const result = addPlayer(base, { gameName: 'Faker', tagLine: 'KR1' });
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({ gameName: 'Faker', tagLine: 'KR1' });
  });

  it('does not add duplicate player', () => {
    const result = addPlayer(base, { gameName: 'GatoMakonha', tagLine: 'T2F' });
    expect(result).toHaveLength(1);
  });

  it('does not mutate the original list', () => {
    addPlayer(base, { gameName: 'Faker', tagLine: 'KR1' });
    expect(base).toHaveLength(1);
  });
});

describe('removePlayer', () => {
  it('removes an existing player by gameName and tagLine', () => {
    const result = removePlayer(base, 'GatoMakonha', 'T2F');
    expect(result).toHaveLength(0);
  });

  it('returns the same list when player is not found', () => {
    const result = removePlayer(base, 'Ninguem', 'BR1');
    expect(result).toHaveLength(1);
  });

  it('does not mutate the original list', () => {
    removePlayer(base, 'GatoMakonha', 'T2F');
    expect(base).toHaveLength(1);
  });
});

describe('formatPlayerList', () => {
  it('returns a formatted string with all players', () => {
    const result = formatPlayerList([
      { gameName: 'GatoMakonha', tagLine: 'T2F' },
      { gameName: 'Faker', tagLine: 'KR1' },
    ]);
    expect(result).toContain('GatoMakonha#T2F');
    expect(result).toContain('Faker#KR1');
  });

  it('returns a message when list is empty', () => {
    const result = formatPlayerList([]);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('resolveCheckNow', () => {
  const resolved = [
    { puuid: 'abc123', gameName: 'GatoMakonha', tagLine: 'T2F' },
    { puuid: 'def456', gameName: 'Faker', tagLine: 'KR1' },
  ];

  it('returns the player when found by gameName and tagLine', () => {
    const result = resolveCheckNow('GatoMakonha', 'T2F', resolved);
    expect(result).toEqual({ puuid: 'abc123', gameName: 'GatoMakonha', tagLine: 'T2F' });
  });

  it('returns null when the player is not in the list', () => {
    const result = resolveCheckNow('Ninguem', 'BR1', resolved);
    expect(result).toBeNull();
  });
});
