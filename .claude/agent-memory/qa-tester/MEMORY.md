# QA Tester — Memória do Projeto lol-shame-bot

## Cobertura por módulo (estado verificado)

| Arquivo | Cobertura | Observacao |
|---------|-----------|------------|
| `src/players/stats.ts` | 100% | auditado em 2026-03-06 |
| `src/config.ts` | 100% | |
| `src/riot/client.ts` | 100% | axios mockado via vi.mock('axios') |
| `src/watcher/shame.ts` | 100% | inclui TILT_MESSAGES e buildTiltMessage |
| `src/watcher/watcher.ts` | 100% | BullMQ mockado |
| `src/discord/commands.ts` | 100% | modulo puro |
| `src/discord/embed.ts` | 100% | EmbedBuilder mockado |
| `src/infra/eventBus.ts` | 100% | auditado em 2026-03-06 |
| `src/handlers/statsHandler.ts` | 100% | auditado em 2026-03-06 |
| `src/handlers/discordHandler.ts` | 100% | auditado em 2026-03-06 |
| `src/handlers/streakHandler.ts` | 100% | auditado em 2026-03-06 |
| `src/queue/matchWorker.ts` | 100% | refatorado para eventBus, auditado em 2026-03-06 |
| `src/index.ts` | 0% | entry point com env vars — esperado |

## Total de testes: 177 (177 passando — todos GREEN em 2026-03-07)
## Testes GREEN antes da feature BothQueues: 158
## Testes GREEN antes da feature ranked match guard (matchWorker): 168
## Testes GREEN antes da feature watcher BothQueues: 173
## Testes GREEN apos implementacao completa da FEATURE-0002: 177
## Testes RED criados para FEATURE-0003 (Player Lifecycle Events): +10 testes
##   - 5 em tests/handlers/playerLifecycleHandler.test.ts (RED: modulo nao existe)
##   - 5 em tests/infra/eventBus.test.ts (GREEN: TypedEventEmitter aceita strings livres via super.emit)
##   NOTA: os 5 novos casos do eventBus.test.ts passaram imediatamente porque o Node EventEmitter
##   nao valida chaves em tempo de execucao — apenas o TypeScript valida via BotEventMap.
##   A validacao de tipo so ficara RED apos adicionar PlayerChangedEvent ao BotEventMap.
##   Para forcar RED de compilacao basta que PlayerChangedEvent nao exista como export de eventBus.ts.

## Casos de borda cobertos — EventBus feature

**streakHandler (STREAK_THRESHOLD = -3, condicao: !isDefeat || streak > -3):**
- streak -3 → dispara (limiar exato, -3 > -3 é false)
- streak -4 → dispara (abaixo do limiar)
- streak -10 → dispara (tilt profundo)
- streak -2 → NAO dispara (-2 > -3 é true)
- streak -1 → NAO dispara
- streak 0 → NAO dispara
- streak positivo → NAO dispara
- isDefeat=false com streak -5 → NAO dispara (!isDefeat=true, sai cedo)
- sendMessage falha → nao propaga (try/catch)
- mensagem contem nome do jogador e é string pura

**statsHandler:**
- atualiza botState.stats[key] na derrota
- atualiza botState.stats[key] na vitoria
- chama saveState com botState atualizado
- key usada é gameName#tagLine
- sobrescreve stats existentes com statsAfter
- saveState falha → nao propaga (try/catch)

**discordHandler:**
- isDefeat=true → buildLossEmbed chamado, buildWinEmbed NAO
- isDefeat=false → buildWinEmbed chamado, buildLossEmbed NAO
- channelId correto passado ao sendMessage
- sendMessage falha → nao propaga (try/catch)
- sendMessage chamado exatamente uma vez por evento

**matchWorker (refatorado):**
- emite match:finished com payload completo (derrota e vitoria)
- statsAfter pre-computado com stats do botState (zeroed e existentes)
- NAO chama sendMessage diretamente
- NAO chama saveState diretamente (ProcessMatchDeps so tem botState + eventBus)
- emite exatamente uma vez por job

**eventBus (TypedEventEmitter):**
- listener recebe payload correto
- multiplos listeners chamados na ordem de registro
- listener nao chamado se nenhum evento emitido
- singleton é instancia de TypedEventEmitter
- DESCOBERTA: Node EventEmitter NAO isola erros entre listeners — se um listener
  joga excecao, os listeners subsequentes NAO sao chamados. Os handlers do projeto
  usam try/catch internamente para evitar propagar erros, o que é a solucao correta.

## Padrão mock eventBus no matchWorker

```typescript
function makeEventBus(): TypedEventEmitter {
  return { emit: vi.fn() } as unknown as TypedEventEmitter;
}
```

## Casos de borda cobertos em stats.ts

Ver detalhes anteriores (13+ testes cobrindo streak, winrate, imutabilidade)

## Casos de borda cobertos — FEATURE-0002 (todos GREEN em 2026-03-07)

**getLastRankedMatchId com parametro queue opcional:**
- queue: 440 → params.queue: 440 na chamada axios
- sem queue → backward compat: params.queue: 420

**getLastRankedMatchIdBothQueues:**
- BR1_200 > BR1_100 → retorna BR1_200 (comparacao por sufixo numerico)
- uma fila vazia → retorna o id da fila com partidas
- ambas vazias → retorna null
- chama axios exatamente 2x: uma com queue 420, outra com 440

**getLastNRankedMatchIdsBothQueues:**
- merge + sort desc + slice(0, count): ['BR1_5','BR1_3'] + ['BR1_4','BR1_2'] → ['BR1_5','BR1_4','BR1_3'] (count=3)
- uma fila vazia → retorna apenas os da outra fila
- ambas vazias → []

**ranked match guard no matchWorker:**
- Flex defeat (queueId 440) → emite match:finished com isDefeat: true
- Flex victory (queueId 440) → emite match:finished com isDefeat: false
- ARAM (queueId 450) → NAO emite evento
- unknown queue (queueId 999) → NAO emite evento

**pollPlayer com getLastRankedMatchIdBothQueues:**
- new match detected → queue.add com matchId correto
- match already seen → queue.add NAO chamado
- no match (null) → queue.add NAO chamado
- Flex match (BR1_300) → queue.add chamado

**Embeds com label de fila:**
- buildLossEmbed: campo "Fila" = "Solo/Duo" para queueId 420, "Flex" para queueId 440
- buildWinEmbed: campo "Fila" = "Solo/Duo" para queueId 420, "Flex" para queueId 440
- buildHistoryEmbed: label "Solo/Duo" na linha de win para queueId 420, "Flex" para queueId 440

**Lacunas de baixo risco identificadas (nao bloqueantes):**
- isRankedMatch: sem teste unitario explicito para { won: true, queueId: 440 } (coberto indiretamente pelo matchWorker)
- buildHistoryEmbed: sem teste para loss Flex (queueId 440) — logica usa queueLabel identicamente para win e loss

**NOTA DE MOCK:** Para funcoes que usam Promise.all internamente, a ordem dos
mockResolvedValueOnce deve corresponder a ordem em que as promises sao iniciadas
(normalmente a ordem dos argumentos do Promise.all).

## Casos de borda cobertos — FEATURE-0003 (RED em 2026-03-07)

**playerLifecycleHandler:**
- eventName='player:added' → log('info', 'player:added', { gameName, tagLine })
- eventName='player:removed' → log('info', 'player:removed', { gameName, tagLine })
- meta fields corretos (gameName e tagLine do evento)
- log lanca excecao em player:added → nao propaga (try/catch)
- log lanca excecao em player:removed → nao propaga (try/catch)

**eventBus (novos casos player lifecycle):**
- bus.emit('player:added', event) → listener recebe payload com gameName e tagLine
- bus.emit('player:removed', event) → listener recebe payload com gameName e tagLine
- player:added payload: gameName e tagLine corretos
- player:removed payload: gameName e tagLine corretos
- listener de player:added NAO é chamado quando player:removed é emitido

**NOTA ARQUITETURAL sobre RED dos testes do eventBus:**
Os 5 novos casos no eventBus.test.ts passam em runtime imediatamente (Node EventEmitter
nao valida chaves), mas a importacao `import type { PlayerChangedEvent }` falha em
compilacao quando PlayerChangedEvent nao existe em eventBus.ts. O RED real é o modulo
playerLifecycleHandler.ts que nao existe, causando falha de suite inteira.

**Padrão playerLifecycleHandler — deps injetadas:**
```typescript
interface PlayerLifecycleHandlerDeps {
  log: (level: string, message: string, meta?: object) => void;
}
```
O `log` é injetado (nao importado do logger), tornando o handler 100% testavel sem mock de modulo.

## Padroes de mock confirmados no projeto

Ver `mock-patterns.md`
