# QA Tester — Memória do Projeto lol-shame-bot

## Cobertura por módulo (estado verificado)

| Arquivo | Cobertura | Observacao |
|---------|-----------|------------|
| `src/players/stats.ts` | 100% stmts/branches/funcs/lines | 13 testes, auditado em 2026-03-06 |
| `src/config.ts` | 100% (suite isolada) | |
| `src/riot/client.ts` | 100% (suite isolada) | axios mockado via vi.mock('axios') |
| `src/watcher/shame.ts` | 100% (suite isolada) | modulo puro |
| `src/watcher/watcher.ts` | 100% (suite isolada) | BullMQ mockado |
| `src/discord/commands.ts` | 100% (suite isolada) | modulo puro |
| `src/discord/embed.ts` | 100% (suite isolada) | EmbedBuilder mockado |
| `src/index.ts` | 0% | entry point com env vars — esperado |

## Casos de borda cobertos em stats.ts

- emptyStats() retorna zeros
- updateStats: vitoria incrementa wins, defeat incrementa losses
- updateStats: streak positivo crescendo (3 vitorias seguidas = streak 3)
- updateStats: streak negativo crescendo (2 derrotas seguidas = streak -2)
- updateStats: vitoria quebra streak negativo (volta para 1)
- updateStats: derrota quebra streak positivo (volta para -1)
- updateStats: nao muta o objeto original (imutabilidade)
- formatStats: inclui nome do jogador
- formatStats: winrate correto (70% = 7V 3D)
- formatStats: texto de win streak visivel
- formatStats: texto de loss streak visivel
- formatStats: 0% WR quando sem partidas (divisao por zero protegida)

## Casos de borda NAO cobertos em stats.ts (lacunas identificadas)

Ver detalhes em `stats-gaps.md`

## Padroes de mock confirmados no projeto

Ver `mock-patterns.md`
