import type { MatchFinishedEvent } from '../infra/eventBus';
import type { BotState } from '../infra/store';
import { log } from '../logger';

export interface StatsHandlerDeps {
  botState: BotState;
  saveState: (state: BotState) => Promise<void>;
}

export async function statsHandler(event: MatchFinishedEvent, deps: StatsHandlerDeps): Promise<void> {
  const { gameName, tagLine, statsAfter } = event;
  const { botState, saveState } = deps;

  try {
    const key = `${gameName}#${tagLine}`;
    botState.stats[key] = statsAfter;
    await saveState(botState);
  } catch (err) {
    log('error', '[statsHandler] erro ao salvar estado', { error: String(err) });
  }
}
