import 'dotenv/config';
import { join } from 'path';
import { Client, GatewayIntentBits } from 'discord.js';
import { requireEnv } from './config';
import { getAccountByRiotId } from './riot';
import { pollPlayer } from './watcher';
import { loadState, saveState } from './store';
import { loadPlayers } from './players';

const token = requireEnv('DISCORD_TOKEN');
const channelId = requireEnv('DISCORD_CHANNEL_ID');
const intervalMs = parseInt(process.env.POLL_INTERVAL_MS ?? '60000', 10);

requireEnv('RIOT_API_KEY');

const STATE_FILE = join(process.cwd(), 'state.json');
const PLAYERS_FILE = join(process.cwd(), 'players.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', async () => {
  const players = await loadPlayers(PLAYERS_FILE);
  console.log(`lol-shame-bot online — monitorando ${players.length} jogador(es)`);

  const botState = await loadState(STATE_FILE);

  const resolved = await Promise.all(
    players.map(async (p) => {
      const { puuid } = await getAccountByRiotId(p.gameName, p.tagLine);
      return { puuid, gameName: p.gameName };
    })
  );

  const tick = async () => {
    for (const { puuid, gameName } of resolved) {
      try {
        const state = { lastMatchId: botState.byPuuid[puuid] ?? null };
        await pollPlayer(client, channelId, puuid, gameName, state);
        botState.byPuuid[puuid] = state.lastMatchId;
      } catch (err) {
        console.error(`Erro no poll de ${gameName}:`, err);
      }
    }
    await saveState(STATE_FILE, botState);
  };

  await tick();
  setInterval(tick, intervalMs);
});

client.login(token);
