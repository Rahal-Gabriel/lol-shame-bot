# Tech Lead — Memoria Persistente

## Estado atual do projeto
- **166 testes passando** · 0 warnings · build limpo
- Bot em producao no Railway, canal unico via env var
- Branch: master
- Ciclo 5 concluido: /history slash command
- ADR-0002 em andamento: shame.ts GREEN + riot/client.ts GREEN (parametro queue com default + BothQueues implementado)

## Estrutura de pastas (confirmada em 2026-03-06)
```
src/
  index.ts / config.ts / logger.ts   <- raiz
  riot/       client.ts, rateLimit.ts
  discord/    client.ts, embed.ts, commands.ts
  players/    players.ts, stats.ts
  queue/      queue.ts, matchWorker.ts
  watcher/    watcher.ts, shame.ts
  infra/      store.ts, retry.ts, health.ts, eventBus.ts
  handlers/   statsHandler.ts, discordHandler.ts, streakHandler.ts
tests/         espelha src/
.claude/plans/ ADRs e specs de features
```

## Decisoes de arquitetura registradas

### ADR-0002: Flex Queue Support (queue 440) — Proposto
- Ver `/Users/gabrielarcenio/lol-shame-bot/.claude/plans/ADR-0002-flex-queue-support.md`
- `MatchResult.queueId` ja existe — zero breaking change nesse campo
- Constantes `RANKED_FLEX=440`, `RANKED_QUEUES`, `isRankedMatch`, `queueLabel` adicionadas em `shame.ts`
- `isRankedDefeat` mantida sem mudanca (backward compatible)
- `riot/client.ts` GREEN: `getLastRankedMatchId(puuid, queue=420)`, `getLastNRankedMatchIds(puuid, count, queue=420)`, `getLastRankedMatchIdBothQueues`, `getLastNRankedMatchIdsBothQueues` — backward compatible (defaults preservam assinaturas anteriores)
- Embeds: field "Fila" adicionado internamente (assinaturas preservadas)
- `buildHistoryEmbed`: label por linha no value, antes do KDA
- Stats unificadas (Solo + Flex) — separacao por fila e backlog
- Dois `Promise.all` paralelos (um por queue) para deteccao e history

### ADR-0001: EventBus interno para match processing
- Ver `/Users/gabrielarcenio/lol-shame-bot/.claude/plans/ADR-0001-event-driven-architecture.md`
- Handlers em `src/handlers/` (novo dir), registrados em `src/index.ts` no boot
- `processMatchJob` pre-computa `statsAfter` antes de emitir — payload auto-contido
- Interface `ProcessMatchDeps` MUDA (remove `client`/`channelId`, adiciona `eventBus`) — mudanca de interface publica confirmada

## Padroes do projeto

### Injecao de dependencia
- Todo modulo com I/O recebe deps via parametro (`deps: XyzDeps`)
- Nunca importar modulos de I/O diretamente no corpo de funcoes testadas — receber via deps
- Pattern: `export interface XyzDeps { ... }` no mesmo arquivo do handler

### Redis / BotState
- `BotState` e mutavel e compartilhado por referencia entre worker e handlers
- BullMQ processa 1 job por vez (concurrency default = 1) — sem race condition enquanto isso se mantiver
- Nao introduzir imutabilidade sem solicitacao — debito tecnico aceito

### EventEmitter nativo
- `TypedEventEmitter` como subclasse de EventEmitter (nao wrapper)
- Singleton por modulo CommonJS (require() cacheado)
- `emit()` de listeners async retorna imediatamente — ordem de conclusao nao garantida
- Para garantir ordem de postagem no Discord: handlers teriam que ser chamados sequencialmente (nao via EventBus)

### EventEmitter — risco documentado e mitigado
- Se um listener sincrono lancar excecao, EventEmitter propaga e listeners subsequentes nao sao chamados
- Mitigacao implementada: todos os handlers em `src/handlers/` tem `try/catch` interno — funcoes async nunca lancam sincronamente
- Ordem de conclusao async nao garantida (stats pode persitir apos Discord enviar) — risco aceito para este caso de uso

### Limites de arquivos (pos-EventBus)
- `src/index.ts`: 215 linhas (2026-03-06) — margem de ~85 linhas antes do limite
- `src/watcher/shame.ts`: 97 linhas — pos ADR-0002 (constantes RANKED_FLEX/RANKED_QUEUES + isRankedMatch + queueLabel)
- `src/queue/matchWorker.ts`: 56 linhas — encolheu como esperado apos ADR-0001
- Novos handlers: 21-28 linhas cada — muito abaixo do limite
