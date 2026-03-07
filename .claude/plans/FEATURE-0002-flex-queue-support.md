# FEATURE-0002: Flex Queue Support
**Status**: Concluído
**Prioridade**: Media
**Valor**: O grupo frequentemente joga Flex juntos. Hoje o bot ignora completamente essas partidas — vitórias e derrotas passam em branco. Monitorar Flex significa mais oportunidades de zoeira e mais cobertura real do dia a dia dos jogadores.

---

## O que o bot faz hoje

- `getLastRankedMatchId` e `getLastNRankedMatchIds` em `src/riot/client.ts` filtram apenas `queue: 420` (Ranked Solo/Duo) na chamada à Riot API.
- `isRankedDefeat` em `src/watcher/shame.ts` verifica `queueId === 420 && !won`.
- `pollPlayer` em `src/watcher/watcher.ts` chama `getLastRankedMatchId` — que já filtra por fila — e enfileira o job se houver partida nova.
- `processMatchJob` em `src/queue/matchWorker.ts` chama `isRankedDefeat` para decidir se é derrota ou vitória.
- Os embeds (`buildLossEmbed` / `buildWinEmbed`) e as estatísticas (`PlayerStats`) nao distinguem fila.
- `/history` busca as últimas N partidas com `getLastNRankedMatchIds`, que também filtra só queue 420.

Em resumo: partidas Flex (queue 440) são completamente invisíveis para o bot.

---

## O problema ou oportunidade

O grupo usa Flex para jogar junto. Uma derrota humilhante de 5 amigos num jogo Flex deveria render tanto ou mais zoeira do que uma derrota Solo. Hoje, nada disso chega ao Discord.

---

## Comportamento esperado (cenas)

**Cena 1 — Derrota em Flex:**
GatoMakonha perde uma partida Ranked Flex. O bot detecta a partida nova, processa e posta no canal do Discord um embed vermelho com a mensagem de shame, o campeo, KDA, duracao e a label **[Flex]** visivel no embed para diferenciar de Solo/Duo.

**Cena 2 — Vitoria em Flex:**
GatoMakonha ganha uma partida Ranked Flex. O bot posta embed cinza de parabens com a label **[Flex]** no embed.

**Cena 3 — Partida Solo/Duo (comportamento preservado):**
GatoMakonha perde uma partida Solo/Duo. O embed continua identico ao atual, agora com a label **[Solo/Duo]** visivel.

**Cena 4 — `/stats GatoMakonha#T2F`:**
O comando retorna as estatisticas unificadas (Solo + Flex somados), igual ao comportamento atual. A separacao por fila nas stats nao entra nesta entrega.

**Cena 5 — `/history GatoMakonha#T2F`:**
O comando busca as ultimas N partidas somando Solo/Duo e Flex. Cada linha do embed ja exibe o campeo, resultado e KDA — a fila aparece indicada por label em cada linha (ex: `[Solo/Duo]` ou `[Flex]`).

**Cena 6 — `/check-now GatoMakonha#T2F`:**
Forca a verificacao imediata. Se a ultima partida detectada for Flex ou Solo/Duo, o bot processa normalmente.

---

## User Stories

- Como jogador monitorado que joga Flex, quero que minhas derrotas e vitorias Flex sejam postadas no Discord, para que eu nao escape da zoeira por jogar numa fila diferente.
- Como membro do servidor Discord, quero ver no embed em qual fila a partida foi jogada (Solo/Duo ou Flex), para entender o contexto da partida.
- Como jogador monitorado, quero que o `/history` mostre partidas de ambas as filas, para ter uma visao completa do meu historico recente.

---

## Criterios de Aceite

### Deteccao de partidas

- [x] Dado que GatoMakonha termina uma partida Ranked Flex (queue 440), quando o polling rodar, entao o bot detecta e enfileira o job da partida.
- [x] Dado que GatoMakonha termina uma partida Ranked Solo/Duo (queue 420), quando o polling rodar, entao o bot detecta e enfileira o job — comportamento preservado.
- [x] Dado que GatoMakonha termina uma partida Normal (queue nao-ranked), quando o polling rodar, entao o bot ignora a partida — sem embed, sem stats.

### Classificacao de resultado

- [x] Dado `queueId === 440` e `won === false`, entao `isRankedMatch` retorna `true` e o evento eh classificado como derrota.
- [x] Dado `queueId === 440` e `won === true`, entao `isRankedMatch` retorna `true` e o evento eh classificado como vitoria.
- [x] Dado `queueId === 420` e qualquer resultado, entao o comportamento atual eh preservado sem regressao.
- [x] Dado `queueId` de fila nao-ranked (ex: 400, 450), entao `isRankedMatch` retorna `false` e o bot nao posta nada.

### Embeds no Discord

- [x] Dado uma derrota Flex, quando o embed de derrota for postado, entao ele exibe a label `[Flex]` no titulo ou num campo dedicado.
- [x] Dado uma vitoria Flex, quando o embed de vitoria for postado, entao ele exibe a label `[Flex]`.
- [x] Dado uma derrota Solo/Duo, quando o embed de derrota for postado, entao ele exibe a label `[Solo/Duo]`.
- [x] Dado uma vitoria Solo/Duo, quando o embed de vitoria for postado, entao ele exibe a label `[Solo/Duo]`.
- [x] Os campos existentes (campeo, KDA, duracao) continuam presentes e inalterados em todos os embeds.

### Historico (`/history`)

- [x] Dado que GatoMakonha tem partidas de ambas as filas, quando `/history` for executado, entao o embed lista partidas de Solo/Duo e Flex misturadas por ordem cronologica inversa (as mais recentes primeiro).
- [x] Cada linha do historico exibe a fila da partida (`[Solo/Duo]` ou `[Flex]`).

### Streak e tilt

- [x] O streak eh calculado sobre todas as partidas ranked (Solo + Flex somadas), sem separacao por fila.
- [x] O tilt (streak <= -3) dispara normalmente independente de qual fila gerou a derrota.

### Ausencia de regressao

- [x] Todos os 146 testes existentes continuam passando apos a implementacao (177 testes passando no total).
- [x] `npm run lint` e `npm run build` passam sem erros ou warnings.

---

## Fora do Escopo desta Entrega

- **Estatisticas separadas por fila**: `/stats` continua exibindo totais unificados (Solo + Flex). Separar por fila eh backlog.
- **Ativar/desativar Flex por jogador ou por servidor**: todos os jogadores monitorados passam a ter Flex monitorado automaticamente.
- **Migrar historico antigo**: partidas Flex anteriores ao deploy desta feature nao sao retroativamente processadas. Stats comecam a contar a partir do momento em que a feature entrar em producao.
- **Suporte a outras filas**: apenas Solo/Duo (420) e Flex (440) sao suportadas. Normal, ARAM, Arena e outras filas continuam ignoradas.
- **Filtro de fila no `/history`**: o comando nao ganha parametro de filtro por fila nesta entrega.
- **Mensagens diferenciadas por fila**: o pool de `SHAME_MESSAGES`, `WIN_MESSAGES` e `TILT_MESSAGES` eh compartilhado entre as duas filas.

---

## Impacto em modulos existentes

| Arquivo | Mudanca necessaria |
|---------|-------------------|
| `src/riot/client.ts` | `getLastRankedMatchId` e `getLastNRankedMatchIds` devem buscar tanto queue 420 quanto 440 (remover filtro fixo ou aceitar lista de queues). Considerar nova funcao `getLastRankedMatchIdAnyQueue`. |
| `src/watcher/shame.ts` | Substituir `isRankedDefeat` por `isRankedMatch(match)` que aceita queueId 420 e 440; manter semantica de derrota separada. Adicionar `RANKED_QUEUES = [420, 440]` e `queueLabel(queueId)` para retornar `"Solo/Duo"` ou `"Flex"`. |
| `src/watcher/watcher.ts` | `pollPlayer` usa `getLastRankedMatchId` — precisa usar a versao que detecta ambas as filas. |
| `src/discord/embed.ts` | `buildLossEmbed` e `buildWinEmbed` devem aceitar o label da fila e exibi-lo no embed (titulo ou campo). `buildHistoryEmbed` deve exibir a fila por linha. |
| `src/queue/matchWorker.ts` | Ajustar chamada de `isRankedDefeat` para a nova funcao. O evento `match:finished` ja carrega `queueId` via `MatchResult` — verificar se `MatchFinishedEvent` precisa expor `queueLabel` ou se os handlers o derivam de `match.queueId`. |
| `src/handlers/discordHandler.ts` | Receber ou derivar o label da fila e repassar para os builders de embed. |
| `tests/` | Novos testes cobrindo queue 440 em todos os modulos afetados; testes de regressao para queue 420. |

---

## Metricas de Sucesso

A feature estara corretamente entregue quando:

1. Uma partida Ranked Flex real de um jogador monitorado gerar um embed no canal do Discord com o label `[Flex]`.
2. Uma partida Ranked Solo/Duo continuar gerando embed com o label `[Solo/Duo]` — sem quebra de comportamento.
3. `/history` listar partidas de ambas as filas com identificacao por linha.
4. Nenhum teste existente quebrar.
5. O CI (lint + test + build) passar 100% apos o merge.
