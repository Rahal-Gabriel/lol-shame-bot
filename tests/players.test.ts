import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'path';
import { writeFile, rm } from 'fs/promises';
import { loadPlayers } from '../src/players';

const TEST_FILE = join('/tmp', 'lol-shame-bot-test-players.json');

afterEach(() => rm(TEST_FILE, { force: true }));

describe('loadPlayers', () => {
  it('returns the list of players from the file', async () => {
    await writeFile(TEST_FILE, JSON.stringify([
      { gameName: 'GatoMakonha', tagLine: 'T2F' },
      { gameName: 'Faker', tagLine: 'KR1' },
    ]));

    const players = await loadPlayers(TEST_FILE);

    expect(players).toHaveLength(2);
    expect(players[0]).toEqual({ gameName: 'GatoMakonha', tagLine: 'T2F' });
    expect(players[1]).toEqual({ gameName: 'Faker', tagLine: 'KR1' });
  });

  it('throws when file does not exist', async () => {
    await expect(loadPlayers('/tmp/nao-existe.json')).rejects.toThrow();
  });

  it('throws when list is empty', async () => {
    await writeFile(TEST_FILE, JSON.stringify([]));
    await expect(loadPlayers(TEST_FILE)).rejects.toThrow('players.json está vazio');
  });

  it('throws when a player is missing gameName', async () => {
    await writeFile(TEST_FILE, JSON.stringify([{ tagLine: 'BR1' }]));
    await expect(loadPlayers(TEST_FILE)).rejects.toThrow('gameName');
  });

  it('throws when a player is missing tagLine', async () => {
    await writeFile(TEST_FILE, JSON.stringify([{ gameName: 'Foo' }]));
    await expect(loadPlayers(TEST_FILE)).rejects.toThrow('tagLine');
  });
});
