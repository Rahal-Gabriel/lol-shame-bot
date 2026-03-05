import { Client, TextChannel, EmbedBuilder } from 'discord.js';

export async function sendMessage(client: Client, channelId: string, message: string | EmbedBuilder): Promise<void> {
  const channel = await client.channels.fetch(channelId);
  if (!channel) throw new Error(`Channel ${channelId} not found`);
  const payload = typeof message === 'string' ? { content: message } : { embeds: [message] };
  await (channel as TextChannel).send(payload);
}
