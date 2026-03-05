import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { rm } from 'fs/promises';
import { loadState, saveState } from '../src/store';

const TEST_FILE = join('/tmp', 'lol-shame-bot-test-state.json');

beforeEach(() => rm(TEST_FILE, { force: true }));
afterEach(() => rm(TEST_FILE, { force: true }));

describe('loadState', () => {
  it('returns null lastMatchId when file does not exist', async () => {
    const state = await loadState(TEST_FILE);
    expect(state.lastMatchId).toBeNull();
  });

  it('returns saved lastMatchId when file exists', async () => {
    await saveState(TEST_FILE, { lastMatchId: 'BR1_999' });
    const state = await loadState(TEST_FILE);
    expect(state.lastMatchId).toBe('BR1_999');
  });
});

describe('saveState', () => {
  it('persists lastMatchId to disk', async () => {
    await saveState(TEST_FILE, { lastMatchId: 'BR1_123' });
    const state = await loadState(TEST_FILE);
    expect(state.lastMatchId).toBe('BR1_123');
  });

  it('overwrites previous state', async () => {
    await saveState(TEST_FILE, { lastMatchId: 'BR1_100' });
    await saveState(TEST_FILE, { lastMatchId: 'BR1_200' });
    const state = await loadState(TEST_FILE);
    expect(state.lastMatchId).toBe('BR1_200');
  });
});
