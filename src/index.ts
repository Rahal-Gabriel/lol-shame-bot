import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { requireEnv } from './config';
import { getAccountByRiotId } from './riot';
import { pollPlayer } from './watcher';

const token = requireEnv('DISCORD_TOKEN');
const channelId = requireEnv('DISCORD_CHANNEL_ID');
const gameName = requireEnv('PLAYER_GAME_NAME');
const tagLine = requireEnv('PLAYER_TAG_LINE');
const intervalMs = parseInt(process.env.POLL_INTERVAL_MS ?? '60000', 10);

requireEnv('RIOT_API_KEY');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`lol-shame-bot online — monitorando ${gameName}#${tagLine}`);

  const { puuid } = await getAccountByRiotId(gameName, tagLine);
  const state: { lastMatchId: string | null } = { lastMatchId: null };

  const tick = async () => {
    try {
      await pollPlayer(client, channelId, puuid, gameName, state);
    } catch (err) {
      console.error('Erro no poll:', err);
    }
  };

  await tick();
  setInterval(tick, intervalMs);
});

client.login(token);
