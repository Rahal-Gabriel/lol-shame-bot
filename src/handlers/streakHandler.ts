import { Client } from 'discord.js';
import type { MatchFinishedEvent } from '../infra/eventBus';
import { buildTiltMessage } from '../watcher/shame';
import { log } from '../logger';

export const STREAK_THRESHOLD = -3;

export interface StreakHandlerDeps {
  client: Client;
  channelId: string;
  sendMessage: (client: Client, channelId: string, msg: string) => Promise<void>;
}

export async function streakHandler(event: MatchFinishedEvent, deps: StreakHandlerDeps): Promise<void> {
  const { gameName, isDefeat, statsAfter } = event;
  const { client, channelId, sendMessage } = deps;

  if (!isDefeat || statsAfter.streak > STREAK_THRESHOLD) {
    return;
  }

  try {
    const message = buildTiltMessage(gameName, statsAfter.streak);
    await sendMessage(client, channelId, message);
  } catch (err) {
    log('error', '[streakHandler] erro ao enviar mensagem de tilt', { error: String(err) });
  }
}
