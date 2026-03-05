import 'dotenv/config';
import { join } from 'path';
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { requireEnv } from './config';
import { getAccountByRiotId } from './riot';
import { pollPlayer } from './watcher';
import { loadState, saveState } from './store';
import { loadPlayers, Player } from './players';
import { addPlayer, removePlayer, formatPlayerList } from './commands';
import { emptyStats, formatStats } from './stats';
import { writeFile } from 'fs/promises';

const token = requireEnv('DISCORD_TOKEN');
const channelId = requireEnv('DISCORD_CHANNEL_ID');
const intervalMs = parseInt(process.env.POLL_INTERVAL_MS ?? '60000', 10);

requireEnv('RIOT_API_KEY');

const STATE_FILE = join(process.cwd(), 'state.json');
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
].map(c => c.toJSON());

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function savePlayers(players: Player[]): Promise<void> {
  await writeFile(PLAYERS_FILE, JSON.stringify(players, null, 2), 'utf-8');
}

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

client.once('clientReady', async (c) => {
  const rest = new REST().setToken(token);
  await rest.put(Routes.applicationCommands(c.user.id), { body: slashCommands });

  let players = await loadPlayers(PLAYERS_FILE);
  console.log(`lol-shame-bot online — monitorando ${players.length} jogador(es)`);

  const botState = await loadState(STATE_FILE);

  const resolved = await Promise.all(
    players.map(async (p) => {
      const { puuid } = await getAccountByRiotId(p.gameName, p.tagLine);
      return { puuid, gameName: p.gameName, tagLine: p.tagLine };
    })
  );

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    players = await handleInteraction(interaction, players, botState.stats);
  });

  const tick = async () => {
    for (const { puuid, gameName, tagLine } of resolved) {
      try {
        const key = `${gameName}#${tagLine}`;
        const state = { lastMatchId: botState.byPuuid[puuid] ?? null };
        const playerStats = { current: botState.stats[key] ?? emptyStats() };
        await pollPlayer(client, channelId, puuid, gameName, state, playerStats);
        botState.byPuuid[puuid] = state.lastMatchId;
        botState.stats[key] = playerStats.current;
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
