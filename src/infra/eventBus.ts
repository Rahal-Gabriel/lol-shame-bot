import { EventEmitter } from 'events';
import type { MatchResult } from '../watcher/shame';
import type { PlayerStats } from '../players/stats';

export interface MatchFinishedEvent {
  gameName: string;
  tagLine: string;
  match: MatchResult;
  isDefeat: boolean;
  statsAfter: PlayerStats;
}

export interface BotEventMap {
  'match:finished': [event: MatchFinishedEvent];
}

export class TypedEventEmitter extends EventEmitter {
  emit<K extends keyof BotEventMap>(event: K, ...args: BotEventMap[K]): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof BotEventMap>(
    event: K,
    listener: (...args: BotEventMap[K]) => void
  ): this {
    return super.on(event, listener);
  }
}

export const eventBus = new TypedEventEmitter();
