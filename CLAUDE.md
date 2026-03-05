# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# lol-shame-bot — CLAUDE.md

## Guardrails permanentes

Estas regras não são opcionais. Valem para qualquer alteração neste repositório, independente do tamanho da tarefa.


### TDD — sem exceção
- **Teste antes do código de produção.** Se Claude escrever código de produção antes do teste, o humano deve recusar e pedir o teste primeiro.
- Ciclo obrigatório: escrever teste → ver falhar (RED) → implementar (GREEN) → CI verde → commit.
- Nunca commitar código sem testes cobrindo o comportamento novo.

### Cada commit é production-ready
- CI roda em cada commit: `lint → test → build`. Nenhum commit quebra o CI.
- Commits atômicos: um commit = uma mudança coesa. Não misturar feat + fix + refactor.
- Zero warnings de lint e TypeScript em cada commit.

### Limites de tamanho
- Nenhum arquivo ultrapassa 300 linhas. Se ultrapassar, refatorar antes de continuar.
- Funções com mais de uma responsabilidade são divididas.

### Documentação contínua
- Cada decisão de arquitetura relevante é documentada aqui no CLAUDE.md no momento em que acontece — não depois.
- Novos módulos entram na tabela de arquitetura abaixo.

### Divisão de responsabilidades
- **O humano decide o QUÊ.** Claude decide o COMO.
- Claude não inicia refactorings, renomeações ou "melhorias" não solicitadas.
- Mudanças destrutivas (delete de arquivo, alteração de interface pública) exigem confirmação explícita.

### Checklist antes de propor código
1. Li os arquivos relevantes antes de sugerir mudanças?
2. Há um teste cobrindo o comportamento novo?
3. O CI vai passar depois dessa mudança?
4. Algum arquivo vai ultrapassar 300 linhas?
5. O CLAUDE.md precisa ser atualizado?

---

## Overview

A Discord bot that integrates with the Riot Games API to post shame messages about League of Legends players in a Discord channel.

## Development

```bash
npm install          # instala deps e gera package-lock.json
npm run dev          # ts-node src/index.ts (requer .env)
npm run build        # compila para dist/
npm run test         # vitest run (uma vez)
npm run test:watch   # vitest em modo watch
npm run lint         # eslint src/

# Um único teste por nome:
npx vitest run --reporter=verbose -t "nome do teste"

# Docker
docker compose up --build
```

Copy `.env.example` to `.env`:
- `RIOT_API_KEY` — from https://developer.riotgames.com
- `DISCORD_TOKEN` — Discord bot token
- `DISCORD_CHANNEL_ID` — channel to post messages in

## Architecture

**Stack:** Node 20 · TypeScript (CommonJS) · discord.js v14 · axios · vitest

**Entry point:** `src/index.ts` — valida env vars e inicializa o bot.

**`src/config.ts`** — `requireEnv(key)`: única função utilitária para leitura de variáveis obrigatórias de ambiente. Testável de forma isolada.

**`tests/`** — testes vitest, fora do `rootDir` do TypeScript (processados pelo esbuild do vitest, não pelo tsc).

**CI:** `.github/workflows/ci.yml` roda `npm ci → lint → test` em cada push/PR.

### Módulos

**`src/config.ts`** — `requireEnv(key)`: leitura de variáveis obrigatórias de ambiente.

**`src/riot.ts`** — cliente da Riot API (região Americas/BR1):
- `getAccountByRiotId(gameName, tagLine)` → `{ puuid }`
- `getLastRankedMatchId(puuid)` → `string | null` (queue 420 = Ranked Solo/Duo)
- `getMatchResult(matchId, puuid)` → `MatchResult`

**`src/shame.ts`** — lógica pura de detecção:
- `isRankedDefeat(match: MatchResult)` → `boolean` (queue 420 + `won === false`)

**`tests/`** — vitest com axios mockado via `vi.mock('axios')` + `vi.mocked(axios.get)`.

**`src/watcher.ts`** — orquestração do loop de polling:
- `hasNewMatch(lastId, currentId)` → `boolean`
- `checkPlayer(puuid, gameName, lastMatchId)` → `string | null` (retorna a mensagem de shame ou null)

## Checkpoint Dia 4 — Revisão de Saúde (2026-03-05)

### Cobertura de testes
| Arquivo       | Stmts | Branch | Funcs | Lines |
|---------------|-------|--------|-------|-------|
| config.ts     | 100%  | 100%   | 100%  | 100%  |
| riot.ts       | 100%  | 100%   | 100%  | 100%  |
| shame.ts      | 100%  | 100%   | 100%  | 100%  |
| watcher.ts    | 100%  | 100%   | 100%  | 100%  |
| index.ts      | 0%    | 0%     | 0%    | 0%    |
| **Total**     | **91%** | **95%** | **90%** | **91%** |

`index.ts` com 0% é esperado — é o entry point que depende de env vars e Discord; será coberto no Dia 5.

### Tamanho dos arquivos (limite: 300 linhas)
Nenhum arquivo acima de 100 linhas. Zero risco de refatoração obrigatória.

### Total de testes: 21 — todos passando.

## Dia 6 — Hardening ✓

- `src/retry.ts` — `withRetry(fn, retries, delayMs)` com TDD
- Timeout de 10s em todas as chamadas Riot API
- Retry 3x com backoff de 2s no poll
- Deprecation `ready` → `clientReady` corrigido
- 32 testes, 0 warnings, build limpo

## Dia 7 — Deploy em Produção ✓

- Dockerfile multi-stage: build com tsc, runtime sem devDeps
- Deploy no Railway via GitHub
- Bot ativo e disparando mensagens no Discord
- **Primeiro uso real documentado:** GatoMakonha#T2F monitorado em produção

## Dia 5 — Interface de Saída (Bot Discord) ✓

- `src/discord.ts` — `sendMessage(client, channelId, message)`
- `src/watcher.ts` — `pollPlayer` com state tracking
- `src/index.ts` — bot inicializado com poll imediato no startup + loop de 60s
- Mensagem de shame na derrota ranked
- Mensagem de tristeza na vitória ranked
- **Critério de saída:** Bot respondendo no servidor de teste ✓

---

## Ciclo 2 — Evolução em 7 Dias

### Ciclo 2 — Dia 1: Persistência de Estado ✓

- `src/store.ts` — `loadState` / `saveState` persistem `BotState` em `state.json`
- `state.json` é gitignored (gerado em runtime); `players.json` é commitado
- **BotState:**
  ```ts
  { byPuuid: Record<string, string | null>, stats: Record<string, PlayerStats> }
  ```
- 47 testes, 0 warnings

### Ciclo 2 — Dia 2: Multi-player ✓

- `src/players.ts` — `loadPlayers(filePath)` carrega e valida `players.json`
- `players.json` copiado para imagem Docker: `COPY --from=builder /app/players.json ./players.json`
- Formato: `[{ "gameName": "GatoMakonha", "tagLine": "T2F" }]`
- **Bug corrigido:** `ENOENT players.json` no Railway — arquivo estava no `.gitignore`

### Ciclo 2 — Dia 3: Slash Commands ✓

- `src/commands.ts` — `addPlayer`, `removePlayer`, `formatPlayerList` (lógica pura)
- Slash commands registrados: `/add-player`, `/remove-player`, `/list-players`, `/stats`
- Parâmetro `nome:Nome#Tag` em todos os comandos que precisam de um jogador

### Ciclo 2 — Dia 4: Rich Embeds ✓

- `src/embed.ts` — `buildLossEmbed` (vermelho `#ff0000`), `buildWinEmbed` (cinza `#808080`)
- Embeds mostram: champion, KDA, duração (`formatDuration` → `"30m32s"`)
- `src/discord.ts` — `sendMessage` aceita `string | EmbedBuilder`

### Ciclo 2 — Dia 5: Rate Limiting ✓

- `src/rateLimit.ts` — `RateLimiter(minIntervalMs)`: fila com 50ms entre chamadas Riot API
- Timeout de 10s em todas as requisições axios

### Ciclo 2 — Dia 6: Estatísticas ✓

- `src/stats.ts` — `emptyStats`, `updateStats`, `formatStats`
- `PlayerStats`: `{ wins, losses, streak }` — streak positivo = vitórias, negativo = derrotas
- `/stats` exibe: `"📊 Nome — 3V 7D (30% WR) | 💀 3 derrota(s)"`
- Conta partidas a partir do início do monitoramento (sem backfill histórico — comportamento confirmado pelo usuário)

### Ciclo 2 — Dia 7: Observabilidade ✓

- `src/logger.ts` — logs JSON estruturados (`timestamp`, `level`, `message`, meta) → stdout/stderr
- `src/health.ts` — `GET /health` → `{ status: "ok", uptime: <número> }` na porta `PORT` (padrão 3000)
- Alerta no canal Discord quando bot reconecta (`shardResume`)
- **83 testes passando · 0 warnings · build limpo**

## Ciclo 3 — Migração para Redis

### Persistência: `state.json` → Redis ✓

- `src/store.ts` reescrito com `ioredis`: `loadState(): Promise<BotState>`, `saveState(state): Promise<void>`
- Cliente Redis criado no nível do módulo via `REDIS_URL` (padrão `redis://localhost:6379`)
- Chave Redis: `'bot:state'`
- Fallback gracioso em ambas as funções — erros são logados, nunca relançados
- `src/index.ts`: `STATE_FILE` removido; call sites atualizados para as novas assinaturas sem `filePath`
- `docker-compose.yml`: serviço `redis:7-alpine` adicionado; `bot` recebe `REDIS_URL=redis://redis:6379` e `depends_on: redis`
- `.env.example`: `REDIS_URL=redis://localhost:6379` adicionado
- **Railway:** adicionar addon Redis → `REDIS_URL` injetado automaticamente

### Persistência: `players.json` → Redis ✓

- `src/players.ts` reescrito com `ioredis`: `loadPlayers(): Promise<Player[]>`, `savePlayers(players): Promise<void>`
- Chave Redis: `'bot:players'`
- Fallback gracioso: erros retornam `[]` e são logados, nunca relançados
- **Seed automático na primeira boot:** se Redis estiver vazio, lê `players.json` do disco, persiste no Redis e loga `"players.json migrado para Redis"` — zero intervenção manual no redeploy
- `src/index.ts`: função local `savePlayers` removida; import de `savePlayers` de `./players`; lógica de seed inline após `loadPlayers()`
- **83 testes passando · 0 warnings · build limpo**

### Chaves Redis em produção
| Chave | Conteúdo |
|-------|----------|
| `bot:state` | `BotState` — `byPuuid` + `stats` |
| `bot:players` | `Player[]` — lista de jogadores monitorados |

## Ciclo 3 — Dia 2: Integração BullMQ ✓

- `src/queue.ts` — `createMatchQueue()`: fila BullMQ `match-results`, retry 3x exponencial (2s), dead-letter 100 falhas
- `src/matchWorker.ts` — `processMatchJob(data, deps)`: consumer isolado (riot → stats → embed → sendMessage → saveState); `createWorker(deps)`: BullMQ Worker com log de falhas
- `src/watcher.ts` — `pollPlayer` nova assinatura: `(queue, puuid, gameName, tagLine, state)` — só enfileira job (producer); remove lógica de processamento
- `src/index.ts` — inicializa queue e worker no `clientReady`; tick loop simplificado
- **BullMQ usa conexão Redis separada** (`maxRetriesPerRequest: null` internamente) — não reutiliza instância ioredis de `store.ts`
- **89 testes passando · 0 warnings · build limpo**
