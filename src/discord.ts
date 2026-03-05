import { Client, TextChannel } from 'discord.js';

export async function sendMessage(client: Client, channelId: string, message: string): Promise<void> {
  const channel = await client.channels.fetch(channelId);
  if (!channel) throw new Error(`Channel ${channelId} not found`);
  await (channel as TextChannel).send(message);
}
