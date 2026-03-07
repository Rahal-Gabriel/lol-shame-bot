import type { PlayerChangedEvent } from '../infra/eventBus';

export interface PlayerLifecycleHandlerDeps {
  log: (level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) => void;
}

export async function playerLifecycleHandler(
  eventName: 'player:added' | 'player:removed',
  event: PlayerChangedEvent,
  deps: PlayerLifecycleHandlerDeps
): Promise<void> {
  try {
    deps.log('info', eventName, { gameName: event.gameName, tagLine: event.tagLine });
  } catch (err) {
    try {
      deps.log('error', '[playerLifecycleHandler] erro ao logar evento', { error: String(err) });
    } catch { /* log também falhou, ignora */ }
  }
}
