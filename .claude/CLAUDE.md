# CLAUDE.md — lol-shame-bot

Este arquivo governa o Claude Code neste repositório. Leia completamente antes de qualquer ação.

## Guardrails permanentes

Estas regras não são opcionais. Valem para qualquer alteração, independente do tamanho da tarefa.

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

## Time de Agentes Especializados

Este projeto usa subagentes em `.claude/agents/`. Este CLAUDE.md é o orquestrador — entende o pedido e delega ao especialista correto.

| Agente | Arquivo | Quando usar |
|--------|---------|-------------|
| Tech Lead | `tech-lead.md` | Arquitetura, decisões técnicas, ADRs, revisão de módulos |
| Backend Dev | `backend-dev.md` | Riot API, Redis, BullMQ, watcher, lógica de negócio |
| Discord Dev | `discord-dev.md` | discord.js, slash commands, embeds, mensagens |
| QA Tester | `qa-tester.md` | Testes vitest, casos de borda, cobertura, mocks |
| DevOps/SRE | `devops-sre.md` | Docker, Railway, Redis, CI/CD, health check |
| Product Owner | `product-owner.md` | Novas features, critérios de aceite, escopo |

### Sub-Agent Routing Rules

**Sequencial** (fluxo padrão para nova feature):
```
PO (especificação + critérios) → Tech Lead (design técnico) → Backend/Discord Dev (implementação) → QA (testes) → DevOps (deploy)
```

**Paralelo** (quando não há arquivos compartilhados):
- Backend Dev + Discord Dev podem trabalhar em paralelo em módulos distintos

**Background** (sem bloqueio):
- QA auditando cobertura enquanto dev implementa outra coisa

---

## Stack

- **Runtime:** Node 20 · TypeScript (CommonJS)
- **Discord:** discord.js v14
- **Riot API:** axios (região Americas / BR1, queue 420 = Ranked Solo/Duo)
- **Filas:** BullMQ (Redis-backed)
- **Persistência:** Redis via ioredis
- **Testes:** vitest (`npm run test` / `npm run test:watch`)
- **Deploy:** Railway + Docker multi-stage

## Comandos Essenciais

```bash
npm install          # instala deps
npm run dev          # ts-node src/index.ts (requer .env)
npm run build        # compila para dist/
npm run test         # vitest run (uma vez)
npm run test:watch   # vitest em modo watch
npm run lint         # eslint src/

npx vitest run --reporter=verbose -t "nome do teste"  # teste individual

docker compose up --build   # sobe redis + bot
```

## Arquitetura de Módulos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/index.ts` | Entry point — Discord client, polling loop, slash commands |
| `src/config.ts` | `requireEnv(key)` — leitura de env vars obrigatórias |
| `src/riot.ts` | Cliente Riot API: `getAccountByRiotId`, `getLastRankedMatchId`, `getMatchResult` |
| `src/watcher.ts` | `pollPlayer(queue, puuid, gameName, tagLine, state)` — producer de jobs |
| `src/shame.ts` | `isRankedDefeat(match)` — lógica pura de detecção |
| `src/embed.ts` | `buildLossEmbed` (vermelho #ff0000) / `buildWinEmbed` (cinza #808080) |
| `src/discord.ts` | `sendMessage(client, channelId, message: string \| EmbedBuilder)` |
| `src/players.ts` | `loadPlayers()` / `savePlayers(players)` — Redis key `bot:players` |
| `src/store.ts` | `loadState()` / `saveState(state)` — Redis key `bot:state` |
| `src/commands.ts` | Lógica pura dos slash commands (addPlayer, removePlayer, formatPlayerList, resolveCheckNow) |
| `src/stats.ts` | `emptyStats`, `updateStats`, `formatStats` — `PlayerStats: { wins, losses, streak }` |
| `src/queue.ts` | `createMatchQueue()` — BullMQ fila `match-results`, retry 3x exponencial (2s) |
| `src/matchWorker.ts` | `processMatchJob` / `createWorker(deps)` — consumer isolado |
| `src/retry.ts` | `withRetry(fn, retries, delayMs)` — backoff exponencial |
| `src/rateLimit.ts` | `RateLimiter(minIntervalMs)` — 50ms entre chamadas Riot API |
| `src/logger.ts` | Logs JSON estruturados (`timestamp`, `level`, `message`, meta) |
| `src/health.ts` | `GET /health` → `{ status: "ok", uptime: <número> }` na porta `PORT` (padrão 3000) |

## Redis — Chaves em Produção

| Chave | Conteúdo |
|-------|----------|
| `bot:state` | `BotState` — `byPuuid` + `stats` |
| `bot:players` | `Player[]` — lista de jogadores monitorados |

**Seed automático:** Na primeira boot, se `bot:players` estiver vazio, migra `players.json` do disco para Redis.

**BullMQ usa conexão Redis separada** (`maxRetriesPerRequest: null`) — não reutiliza instância ioredis de `store.ts`.

## Slash Commands

| Comando | Handler |
|---------|---------|
| `/add-player nome:Nome#Tag` | `addPlayer` em `commands.ts` |
| `/remove-player nome:Nome#Tag` | `removePlayer` em `commands.ts` |
| `/list-players` | `formatPlayerList` em `commands.ts` |
| `/stats nome:Nome#Tag` | `formatStats` em `stats.ts` |
| `/check-now nome:Nome#Tag` | `resolveCheckNow` em `commands.ts` + `pollPlayer` em `watcher.ts` |

## Estado atual do projeto

- **91 testes passando · 0 warnings · build limpo**
- Cobertura: config/riot/shame/watcher/commands/stats/embed = 100% | index.ts = 0% (entry point, esperado)
- Bot em produção no Railway monitorando jogadores reais
- Ciclo 3 concluído: Redis + BullMQ + `/check-now`
