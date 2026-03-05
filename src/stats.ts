export interface PlayerStats {
  wins: number;
  losses: number;
  streak: number; // positivo = sequência de vitórias, negativo = derrotas
}

export function emptyStats(): PlayerStats {
  return { wins: 0, losses: 0, streak: 0 };
}

export function updateStats(stats: PlayerStats, won: boolean): PlayerStats {
  return {
    wins: won ? stats.wins + 1 : stats.wins,
    losses: won ? stats.losses : stats.losses + 1,
    streak: won
      ? (stats.streak >= 0 ? stats.streak + 1 : 1)
      : (stats.streak <= 0 ? stats.streak - 1 : -1),
  };
}

export function formatStats(gameName: string, stats: PlayerStats): string {
  const total = stats.wins + stats.losses;
  const winrate = total > 0 ? Math.round((stats.wins / total) * 100) : 0;

  let streakText: string;
  if (stats.streak > 0) streakText = `🔥 ${stats.streak} vitória(s) seguida(s)`;
  else if (stats.streak < 0) streakText = `💀 ${Math.abs(stats.streak)} derrota(s) seguida(s)`;
  else streakText = 'Nenhuma sequência ainda';

  return `📊 **${gameName}** — ${stats.wins}V ${stats.losses}D (${winrate}% WR) | ${streakText}`;
}
