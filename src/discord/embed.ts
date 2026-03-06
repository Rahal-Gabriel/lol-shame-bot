import { EmbedBuilder } from 'discord.js';
import { MatchResult } from '../watcher/shame';
import { buildShameMessage, buildWinMessage } from '../watcher/shame';

export function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m${s.toString().padStart(2, '0')}s`;
}

export function buildLossEmbed(gameName: string, match: MatchResult): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle(buildShameMessage(gameName))
    .addFields(
      { name: 'Campeão', value: match.champion, inline: true },
      { name: 'KDA', value: `${match.kills}/${match.deaths}/${match.assists}`, inline: true },
      { name: 'Duração', value: formatDuration(match.gameDurationSecs), inline: true },
    );
}

export function buildWinEmbed(gameName: string, match: MatchResult): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x808080)
    .setTitle(buildWinMessage(gameName))
    .addFields(
      { name: 'Campeão', value: match.champion, inline: true },
      { name: 'KDA', value: `${match.kills}/${match.deaths}/${match.assists}`, inline: true },
      { name: 'Duração', value: formatDuration(match.gameDurationSecs), inline: true },
    );
}

export function buildHistoryEmbed(gameName: string, tagLine: string, matches: MatchResult[]): EmbedBuilder {
  const fields = matches.map((match, index) => {
    const outcome = match.won ? '🟢 Win' : '🔴 Loss';
    const kda = `${match.kills}/${match.deaths}/${match.assists}`;
    const duration = formatDuration(match.gameDurationSecs);
    return {
      name: `${index + 1}. ${match.champion}`,
      value: `${outcome}  |  ${kda}  |  ${duration}`,
      inline: false,
    };
  });

  return new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle(`Últimas ${matches.length} ranked de ${gameName}#${tagLine}`)
    .addFields(...fields);
}
