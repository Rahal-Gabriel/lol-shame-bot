import { Queue } from 'bullmq';

export interface MatchJobData {
  puuid: string;
  matchId: string;
  gameName: string;
  tagLine: string;
}

export const QUEUE_NAME = 'match-results';

export function createMatchQueue(): Queue<MatchJobData> {
  return new Queue<MatchJobData>(QUEUE_NAME, {
    connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: true,
      removeOnFail: 100,
    },
  });
}
