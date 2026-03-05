# lol-shame-bot

Bot do Discord que monitora jogadores de League of Legends e posta mensagens de zoeira quando eles perdem uma ranked — e de parabéns quando vencem.

## Funcionalidades

- Monitora múltiplos jogadores simultaneamente
- Detecta partidas ranked (Solo/Duo) via Riot API
- Posta embeds no Discord com champion, KDA e duração da partida
- Rastreia estatísticas por jogador (vitórias, derrotas, streak)
- Slash commands para gerenciar jogadores em tempo real
- Estado persistido em Redis — sobrevive a redeploys

## Slash Commands

| Comando | Descrição |
|---------|-----------|
| `/add-player nome:Nome#Tag` | Adiciona um jogador para monitorar |
| `/remove-player nome:Nome#Tag` | Remove um jogador do monitoramento |
| `/list-players` | Lista todos os jogadores monitorados |
| `/stats nome:Nome#Tag` | Mostra estatísticas do jogador |

## Stack

- **Runtime:** Node 20 + TypeScript
- **Discord:** discord.js v14
- **Riot API:** axios (região Americas / BR1)
- **Persistência:** Redis via ioredis
- **Testes:** vitest
- **Deploy:** Railway + Docker

## Configuração local

```bash
# 1. Instalar dependências
npm install

# 2. Copiar e preencher variáveis de ambiente
cp .env.example .env
```

**.env:**
```
RIOT_API_KEY=        # https://developer.riotgames.com
DISCORD_TOKEN=       # token do bot no Discord Developer Portal
DISCORD_CHANNEL_ID=  # ID do canal onde o bot vai postar
POLL_INTERVAL_MS=60000
REDIS_URL=redis://localhost:6379
```

```bash
# 3. Subir Redis + bot com Docker Compose
docker compose up --build
```

## Desenvolvimento

```bash
npm run dev        # executa com ts-node (requer .env)
npm run test       # roda todos os testes
npm run test:watch # modo watch
npm run lint       # ESLint
npm run build      # compila para dist/
```

## Deploy no Railway

1. Conecte o repositório no [Railway](https://railway.app)
2. Adicione o addon **Redis** no projeto — `REDIS_URL` é injetado automaticamente
3. Configure as variáveis de ambiente: `RIOT_API_KEY`, `DISCORD_TOKEN`, `DISCORD_CHANNEL_ID`
4. Railway faz redeploy automático a cada push na `master`

## Redis

O bot persiste dois valores no Redis:

| Chave | Conteúdo |
|-------|----------|
| `bot:state` | Último match ID e estatísticas por jogador |
| `bot:players` | Lista de jogadores monitorados |

Na primeira boot, se `bot:players` estiver vazio, o bot migra automaticamente do `players.json` para o Redis.

Para inspecionar os dados:
```bash
# local
docker compose exec redis redis-cli
GET bot:players
GET bot:state

# Railway (via redis-cli remoto)
redis-cli -u $REDIS_URL
```

## Arquitetura

```
src/
├── index.ts       # entry point — Discord client, polling loop, slash commands
├── config.ts      # requireEnv() — leitura de env vars obrigatórias
├── riot.ts        # cliente Riot API
├── watcher.ts     # orquestra poll por jogador
├── shame.ts       # lógica de detecção de derrota e geração de mensagens
├── embed.ts       # Discord embeds (loss = vermelho, win = cinza)
├── discord.ts     # sendMessage()
├── players.ts     # loadPlayers / savePlayers — Redis
├── store.ts       # loadState / saveState — Redis
├── commands.ts    # lógica pura dos slash commands
├── stats.ts       # estatísticas por jogador
├── retry.ts       # withRetry() com backoff
├── rateLimit.ts   # RateLimiter — 50ms entre chamadas Riot API
├── logger.ts      # logs JSON estruturados
└── health.ts      # GET /health
```
