import 'dotenv/config';
import { requireEnv } from './config';

requireEnv('RIOT_API_KEY');
requireEnv('DISCORD_TOKEN');
requireEnv('DISCORD_CHANNEL_ID');

console.log('lol-shame-bot starting…');
