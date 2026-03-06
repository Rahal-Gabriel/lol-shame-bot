import { Client, EmbedBuilder } from 'discord.js';
import type { MatchFinishedEvent } from '../infra/eventBus';
import type { MatchResult } from '../watcher/shame';
import { log } from '../logger';

export interface DiscordHandlerDeps {
  client: Client;
  channelId: string;
  sendMessage: (client: Client, channelId: string, msg: EmbedBuilder) => Promise<void>;
  buildLossEmbed: (gameName: string, match: MatchResult) => EmbedBuilder;
  buildWinEmbed: (gameName: string, match: MatchResult) => EmbedBuilder;
}

export async function discordHandler(event: MatchFinishedEvent, deps: DiscordHandlerDeps): Promise<void> {
  const { gameName, match, isDefeat } = event;
  const { client, channelId, sendMessage, buildLossEmbed, buildWinEmbed } = deps;

  try {
    const embed = isDefeat ? buildLossEmbed(gameName, match) : buildWinEmbed(gameName, match);
    await sendMessage(client, channelId, embed);
  } catch (err) {
    log('error', '[discordHandler] erro ao enviar mensagem', { error: String(err) });
  }
}
