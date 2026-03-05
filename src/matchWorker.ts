import { Worker } from 'bullmq';
import { Client } from 'discord.js';
import { getMatchResult } from './riot';
import { isRankedDefeat } from './shame';
import { buildLossEmbed, buildWinEmbed } from './embed';
import { sendMessage } from './discord';
import { withRetry } from './retry';
import { emptyStats, updateStats } from './stats';
import { saveState, BotState } from './store';
import { log } from './logger';
import { MatchJobData, QUEUE_NAME } from './queue';

const RIOT_RETRIES = 3;
const RIOT_RETRY_DELAY_MS = 2_000;

export interface ProcessMatchDeps {
  client: Client;
  channelId: string;
  botState: BotState;
}

export async function processMatchJob(data: MatchJobData, deps: ProcessMatchDeps): Promise<void> {
  const { puuid, matchId, gameName, tagLine } = data;
  const { client, channelId, botState } = deps;

  const match = await withRetry(
    () => getMatchResult(matchId, puuid),
    RIOT_RETRIES,
    RIOT_RETRY_DELAY_MS
  );

  const defeat = isRankedDefeat(match);
  const key = `${gameName}#${tagLine}`;
  botState.stats[key] = updateStats(botState.stats[key] ?? emptyStats(), !defeat);

  const embed = defeat
    ? buildLossEmbed(gameName, match)
    : buildWinEmbed(gameName, match);

  await sendMessage(client, channelId, embed);
  await saveState(botState);
}

export function createWorker(deps: ProcessMatchDeps): Worker<MatchJobData> {
  const worker = new Worker<MatchJobData>(
    QUEUE_NAME,
    async (job) => {
      await processMatchJob(job.data, deps);
    },
    { connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' } }
  );

  worker.on('failed', (job, err) => {
    log('error', `job ${job?.id ?? '?'} falhou`, { error: String(err) });
  });

  return worker;
}
