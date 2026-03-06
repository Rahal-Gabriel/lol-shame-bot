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

## Total de testes: 135 (estado em 2026-03-06)

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

## Padroes de mock confirmados no projeto

Ver `mock-patterns.md`
