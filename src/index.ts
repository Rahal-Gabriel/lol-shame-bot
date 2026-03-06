import 'dotenv/config';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { requireEnv } from './config';
import { getAccountByRiotId } from './riot/client';
import { pollPlayer } from './watcher/watcher';
import { loadState, saveState } from './infra/store';
import { loadPlayers, savePlayers, Player } from './players/players';
import { addPlayer, removePlayer, formatPlayerList, resolveCheckNow } from './discord/commands';
import { emptyStats, formatStats } from './players/stats';
import { createMatchQueue } from './queue/queue';
import { createWorker } from './queue/matchWorker';
import { eventBus } from './infra/eventBus';
import { statsHandler } from './handlers/statsHandler';
import { discordHandler } from './handlers/discordHandler';
import { streakHandler } from './handlers/streakHandler';
import { buildLossEmbed, buildWinEmbed } from './discord/embed';
import { sendMessage } from './discord/client';
import { log } from './logger';
import { startHealthServer } from './infra/health';

const HEALTH_PORT = parseInt(process.env.PORT ?? '3000', 10);

const token = requireEnv('DISCORD_TOKEN');
const channelId = requireEnv('DISCORD_CHANNEL_ID');
const intervalMs = parseInt(process.env.POLL_INTERVAL_MS ?? '60000', 10);

requireEnv('RIOT_API_KEY');

const PLAYERS_FILE = join(process.cwd(), 'players.json');

const slashCommands = [
  new SlashCommandBuilder()
    .setName('add-player')
    .setDescription('Adiciona um jogador para monitorar')
    .addStringOption(o => o.setName('nome').setDescription('Nome#Tag (ex: GatoMakonha#T2F)').setRequired(true)),
  new SlashCommandBuilder()
    .setName('remove-player')
    .setDescription('Remove um jogador do monitoramento')
    .addStringOption(o => o.setName('nome').setDescription('Nome#Tag (ex: GatoMakonha#T2F)').setRequired(true)),
  new SlashCommandBuilder()
    .setName('list-players')
    .setDescription('Lista todos os jogadores monitorados'),
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Mostra estatísticas de um jogador')
    .addStringOption(o => o.setName('nome').setDescription('Nome#Tag (ex: GatoMakonha#T2F)').setRequired(true)),
  new SlashCommandBuilder()
    .setName('check-now')
    .setDescription('Verifica imediatamente a última partida de um jogador')
    .addStringOption(o => o.setName('nome').setDescription('Nome#Tag (ex: GatoMakonha#T2F)').setRequired(true)),
].map(c => c.toJSON());

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

function parseNomeTag(input: string): { gameName: string; tagLine: string } | null {
  const [gameName, tagLine] = input.split('#');
  if (!gameName || !tagLine) return null;
  return { gameName, tagLine };
}

async function handleInteraction(
  interaction: ChatInputCommandInteraction,
  players: Player[],
  statsMap: Record<string, ReturnType<typeof emptyStats>>
): Promise<Player[]> {
  if (interaction.commandName === 'list-players') {
    await interaction.reply({ content: formatPlayerList(players), ephemeral: true });
    return players;
  }

  const input = interaction.options.getString('nome', true);
  const parsed = parseNomeTag(input);

  if (!parsed) {
    await interaction.reply({ content: 'Formato inválido. Use Nome#Tag (ex: GatoMakonha#T2F)', ephemeral: true });
    return players;
  }

  const key = `${parsed.gameName}#${parsed.tagLine}`;

  if (interaction.commandName === 'stats') {
    const s = statsMap[key] ?? emptyStats();
    await interaction.reply({ content: formatStats(key, s), ephemeral: true });
    return players;
  }

  if (interaction.commandName === 'add-player') {
    const updated = addPlayer(players, parsed);
    if (updated.length === players.length) {
      await interaction.reply({ content: `${input} já está na lista.`, ephemeral: true });
    } else {
      await savePlayers(updated);
      await interaction.reply({ content: `✅ ${input} adicionado!`, ephemeral: true });
    }
    return updated;
  }

  if (interaction.commandName === 'remove-player') {
    const updated = removePlayer(players, parsed.gameName, parsed.tagLine);
    if (updated.length === players.length) {
      await interaction.reply({ content: `${input} não encontrado na lista.`, ephemeral: true });
    } else {
      await savePlayers(updated);
      await interaction.reply({ content: `🗑️ ${input} removido.`, ephemeral: true });
    }
    return updated;
  }

  return players;
}

client.on('warn', (msg) => log('warn', msg));
client.on('error', (err) => log('error', err.message));
client.on('shardReconnecting', () => log('warn', 'reconectando ao Discord...'));
client.on('shardResume', () => {
  log('info', 'reconectado ao Discord');
});

client.once('clientReady', async (c) => {
  startHealthServer(HEALTH_PORT);

  const rest = new REST().setToken(token);
  await rest.put(Routes.applicationCommands(c.user.id), { body: slashCommands });

  let players = await loadPlayers();

  // Seed do Redis a partir do players.json na primeira boot
  if (players.length === 0) {
    try {
      const raw = await readFile(PLAYERS_FILE, 'utf-8');
      const seeded = JSON.parse(raw) as Player[];
      if (seeded.length > 0) {
        await savePlayers(seeded);
        players = seeded;
        log('info', 'players.json migrado para Redis', { players: players.length });
      }
    } catch { /* arquivo não existe, começa vazio */ }
  }

  log('info', 'bot online', { players: players.length });

  const botState = await loadState();

  const queue = createMatchQueue();

  eventBus.on('match:finished', async (event) => {
    await statsHandler(event, { botState, saveState });
  });

  eventBus.on('match:finished', async (event) => {
    await discordHandler(event, { client, channelId, sendMessage, buildLossEmbed, buildWinEmbed });
  });

  eventBus.on('match:finished', async (event) => {
    await streakHandler(event, { client, channelId, sendMessage });
  });

  createWorker({ botState, eventBus });

  const resolved = await Promise.all(
    players.map(async (p) => {
      const { puuid } = await getAccountByRiotId(p.gameName, p.tagLine);
      return { puuid, gameName: p.gameName, tagLine: p.tagLine };
    })
  );

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'check-now') {
      await interaction.deferReply({ ephemeral: true });
      const input = interaction.options.getString('nome', true);
      const parsed = parseNomeTag(input);
      if (!parsed) {
        await interaction.followUp({ content: 'Formato inválido. Use Nome#Tag (ex: GatoMakonha#T2F)', ephemeral: true });
        return;
      }
      const player = resolveCheckNow(parsed.gameName, parsed.tagLine, resolved);
      if (!player) {
        await interaction.followUp({ content: `Jogador ${input} não está sendo monitorado.`, ephemeral: true });
        return;
      }
      const state = { lastMatchId: botState.byPuuid[player.puuid] ?? null };
      const jobAdded = await pollPlayer(queue, player.puuid, player.gameName, player.tagLine, state);
      botState.byPuuid[player.puuid] = state.lastMatchId;
      if (jobAdded) {
        await interaction.followUp({ content: `Verificando última partida de ${player.gameName}... resultado em breve!`, ephemeral: true });
      } else {
        await interaction.followUp({ content: `Nenhuma partida nova para ${input}.`, ephemeral: true });
      }
      return;
    }

    players = await handleInteraction(interaction, players, botState.stats);
  });

  const tick = async () => {
    for (const { puuid, gameName, tagLine } of resolved) {
      try {
        const state = { lastMatchId: botState.byPuuid[puuid] ?? null };
        await pollPlayer(queue, puuid, gameName, tagLine, state);
        botState.byPuuid[puuid] = state.lastMatchId;
      } catch (err) {
        log('error', `erro no poll de ${gameName}`, { error: String(err) });
      }
    }
  };

  await tick();
  setInterval(tick, intervalMs);
});

client.login(token);
