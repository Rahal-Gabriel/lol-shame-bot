import { Worker } from 'bullmq';
import { getMatchResult } from '../riot/client';
import { isRankedMatch } from '../watcher/shame';
import { withRetry } from '../infra/retry';
import { emptyStats, updateStats } from '../players/stats';
import { BotState } from '../infra/store';
import { TypedEventEmitter } from '../infra/eventBus';
import { log } from '../logger';
import { MatchJobData, QUEUE_NAME } from './queue';

const RIOT_RETRIES = 3;
const RIOT_RETRY_DELAY_MS = 2_000;

export interface ProcessMatchDeps {
  botState: BotState;
  eventBus: TypedEventEmitter;
}

export async function processMatchJob(data: MatchJobData, deps: ProcessMatchDeps): Promise<void> {
  const { puuid, matchId, gameName, tagLine } = data;
  const { botState, eventBus } = deps;

  const match = await withRetry(
    () => getMatchResult(matchId, puuid),
    RIOT_RETRIES,
    RIOT_RETRY_DELAY_MS
  );

  if (!isRankedMatch(match)) return;

  const isDefeat = !match.won;
  const key = `${gameName}#${tagLine}`;
  const statsAfter = updateStats(botState.stats[key] ?? emptyStats(), !isDefeat);

  eventBus.emit('match:finished', {
    gameName,
    tagLine,
    match,
    isDefeat,
    statsAfter,
  });
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
