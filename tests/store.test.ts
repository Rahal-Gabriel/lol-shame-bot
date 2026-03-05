import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { rm } from 'fs/promises';
import { loadState, saveState } from '../src/store';

const TEST_FILE = join('/tmp', 'lol-shame-bot-test-state.json');

beforeEach(() => rm(TEST_FILE, { force: true }));
afterEach(() => rm(TEST_FILE, { force: true }));

describe('loadState', () => {
  it('returns empty byPuuid when file does not exist', async () => {
    const state = await loadState(TEST_FILE);
    expect(state.byPuuid).toEqual({});
  });

  it('returns saved state when file exists', async () => {
    await saveState(TEST_FILE, { byPuuid: { 'puuid-1': 'BR1_999' } });
    const state = await loadState(TEST_FILE);
    expect(state.byPuuid['puuid-1']).toBe('BR1_999');
  });
});

describe('saveState', () => {
  it('persists byPuuid to disk', async () => {
    await saveState(TEST_FILE, { byPuuid: { 'puuid-1': 'BR1_123' } });
    const state = await loadState(TEST_FILE);
    expect(state.byPuuid['puuid-1']).toBe('BR1_123');
  });

  it('persists multiple players', async () => {
    await saveState(TEST_FILE, { byPuuid: { 'puuid-1': 'BR1_100', 'puuid-2': 'BR1_200' } });
    const state = await loadState(TEST_FILE);
    expect(state.byPuuid['puuid-1']).toBe('BR1_100');
    expect(state.byPuuid['puuid-2']).toBe('BR1_200');
  });

  it('overwrites previous state', async () => {
    await saveState(TEST_FILE, { byPuuid: { 'puuid-1': 'BR1_100' } });
    await saveState(TEST_FILE, { byPuuid: { 'puuid-1': 'BR1_200' } });
    const state = await loadState(TEST_FILE);
    expect(state.byPuuid['puuid-1']).toBe('BR1_200');
  });
});
