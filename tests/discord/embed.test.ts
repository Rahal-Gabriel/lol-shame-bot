import { describe, it, expect } from 'vitest';
import { buildLossEmbed, buildWinEmbed, buildHistoryEmbed, formatDuration } from '../../src/discord/embed';
import { MatchResult } from '../../src/watcher/shame';

const lossMatch: MatchResult = {
  matchId: 'BR1_1',
  won: false,
  queueId: 420,
  champion: 'Yasuo',
  kills: 2,
  deaths: 8,
  assists: 1,
  gameDurationSecs: 1832,
};

const winMatch: MatchResult = { ...lossMatch, won: true, kills: 10, deaths: 2 };

describe('formatDuration', () => {
  it('formats seconds into Xm00s', () => {
    expect(formatDuration(1832)).toBe('30m32s');
  });

  it('pads single digit seconds', () => {
    expect(formatDuration(605)).toBe('10m05s');
  });
});

describe('buildLossEmbed', () => {
  it('sets red color', () => {
    const embed = buildLossEmbed('Gabriel', lossMatch);
    expect(embed.data.color).toBe(0xff0000);
  });

  it('title contains player name', () => {
    const embed = buildLossEmbed('Gabriel', lossMatch);
    expect(embed.data.title).toContain('Gabriel');
  });

  it('includes champion field', () => {
    const embed = buildLossEmbed('Gabriel', lossMatch);
    const field = embed.data.fields?.find(f => f.value === 'Yasuo');
    expect(field).toBeDefined();
  });

  it('includes KDA field', () => {
    const embed = buildLossEmbed('Gabriel', lossMatch);
    const field = embed.data.fields?.find(f => f.value === '2/8/1');
    expect(field).toBeDefined();
  });

  it('includes duration field', () => {
    const embed = buildLossEmbed('Gabriel', lossMatch);
    const field = embed.data.fields?.find(f => f.value === '30m32s');
    expect(field).toBeDefined();
  });
});

describe('buildWinEmbed', () => {
  it('sets grey color', () => {
    const embed = buildWinEmbed('Gabriel', winMatch);
    expect(embed.data.color).toBe(0x808080);
  });

  it('title contains player name', () => {
    const embed = buildWinEmbed('Gabriel', winMatch);
    expect(embed.data.title).toContain('Gabriel');
  });

  it('includes KDA field', () => {
    const embed = buildWinEmbed('Gabriel', winMatch);
    const field = embed.data.fields?.find(f => f.value === '10/2/1');
    expect(field).toBeDefined();
  });
});

const historyWinMatch: MatchResult = {
  matchId: 'BR1_2',
  won: true,
  queueId: 420,
  champion: 'Yasuo',
  kills: 10,
  deaths: 2,
  assists: 1,
  gameDurationSecs: 1925,
};

const historyLossMatch: MatchResult = {
  matchId: 'BR1_1',
  won: false,
  queueId: 420,
  champion: 'Yasuo',
  kills: 2,
  deaths: 8,
  assists: 1,
  gameDurationSecs: 1832,
};

describe('buildHistoryEmbed', () => {
  it('sets neutral blue color 0x0099ff', () => {
    const embed = buildHistoryEmbed('GatoMakonha', 'T2F', [historyWinMatch, historyLossMatch]);
    expect(embed.data.color).toBe(0x0099ff);
  });

  it('title contains player name and tag', () => {
    const embed = buildHistoryEmbed('GatoMakonha', 'T2F', [historyWinMatch, historyLossMatch]);
    expect(embed.data.title).toContain('GatoMakonha#T2F');
  });

  it('title contains match count', () => {
    const embed = buildHistoryEmbed('GatoMakonha', 'T2F', [historyWinMatch, historyLossMatch]);
    expect(embed.data.title).toContain('Últimas 2 ranked');
  });

  it('first field name is "1. Yasuo"', () => {
    const embed = buildHistoryEmbed('GatoMakonha', 'T2F', [historyWinMatch, historyLossMatch]);
    expect(embed.data.fields?.[0].name).toBe('1. Yasuo');
  });

  it('win field value starts with "🟢 Win"', () => {
    const embed = buildHistoryEmbed('GatoMakonha', 'T2F', [historyWinMatch, historyLossMatch]);
    expect(embed.data.fields?.[0].value).toMatch(/^🟢 Win/);
  });

  it('loss field value starts with "🔴 Loss"', () => {
    const embed = buildHistoryEmbed('GatoMakonha', 'T2F', [historyWinMatch, historyLossMatch]);
    expect(embed.data.fields?.[1].value).toMatch(/^🔴 Loss/);
  });

  it('field value includes KDA formatted as "2/8/1"', () => {
    const embed = buildHistoryEmbed('GatoMakonha', 'T2F', [historyWinMatch, historyLossMatch]);
    expect(embed.data.fields?.[1].value).toContain('2/8/1');
  });

  it('field value includes duration formatted as "30m32s"', () => {
    const embed = buildHistoryEmbed('GatoMakonha', 'T2F', [historyWinMatch, historyLossMatch]);
    expect(embed.data.fields?.[1].value).toContain('30m32s');
  });
});
