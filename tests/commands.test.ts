import { describe, it, expect } from 'vitest';
import { addPlayer, removePlayer, formatPlayerList } from '../src/commands';
import { Player } from '../src/players';

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
