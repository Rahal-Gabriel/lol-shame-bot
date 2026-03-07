# ADR-0002: Flex Queue Support (queue 440)
**Status**: Aceito
**Data**: 2026-03-06
**Contexto**: O bot monitora apenas partidas Ranked Solo/Duo (queue 420). O grupo frequentemente joga Flex (queue 440) junto — derrotas e vitórias Flex passam invisíveis. A FEATURE-0002 pede suporte a ambas as filas, mantendo stats unificadas e exibindo a label da fila nos embeds.

---

## Decisões

### 1. Constantes de queue: enum vs. constantes nomeadas

**Decisão**: Constantes nomeadas em `src/watcher/shame.ts`.

```ts
export const RANKED_SOLO_DUO = 420;
export const RANKED_FLEX     = 440;
export const RANKED_QUEUES   = [RANKED_SOLO_DUO, RANKED_FLEX] as const;
```

**Justificativa**: Enum TypeScript compila para um objeto de runtime extra e introduz um módulo novo sem benefício mensurável. As constantes já existem em `shame.ts` (hoje `RANKED_SOLO_DUO = 420` é local, não exportada); exportá-las junto às funções de classificação mantém a coesão — tudo que descreve "o que é uma partida ranked" fica num único lugar.

`client.ts` **não** recebe essas constantes. O módulo Riot não precisa saber o que é "ranked" — ele apenas aceita um array de queues como parâmetro. A semântica de domínio fica em `shame.ts`.

**Alternativa descartada**: Criar `src/infra/queues.ts` ou `src/riot/queues.ts`. Descartado porque criaria dependência cruzada (client ← shame ou infra ← shame) sem ganho real. O arquivo `shame.ts` tem hoje 84 linhas — exportar duas constantes e uma função de label não representa risco de ultrapassar 300 linhas.

---

### 2. MatchResult e queueId — situação atual

**Verificado nos arquivos lidos**: `MatchResult` em `src/watcher/shame.ts` **já possui** `queueId: number` (linha 4). `getMatchResult` em `src/riot/client.ts` já popula o campo `queueId: data.info.queueId` (linha 61).

**Conclusão**: não há breaking change no tipo `MatchResult`. O campo existe e já é propagado pelo payload `MatchFinishedEvent` via `match.queueId`. Nenhuma confirmação do humano é necessária para esse campo.

---

### 3. Como getLastRankedMatchId busca ambas as filas

**Situação atual**: `getLastRankedMatchId` faz uma chamada com `params: { queue: 420, start: 0, count: 1 }`. A Riot API aceita apenas um único valor de `queue` por chamada — não suporta array de queues no mesmo request.

**Decisão**: Duas chamadas paralelas com `Promise.all`, uma por queue, retornando a mais recente (pelo matchId mais alto lexicograficamente, ou pela posição relativa retornada pela API).

```
[matchId420, matchId440] = await Promise.all([
  getLastRankedMatchId(puuid, RANKED_SOLO_DUO),
  getLastRankedMatchId(puuid, RANKED_FLEX),
])
// retornar o mais recente dos dois non-null
```

A lógica de comparação para determinar "mais recente" usa a string do matchId. O formato da Riot é `BR1_<número inteiro crescente>` — comparação lexicográfica de inteiros com mesmo prefixo é suficiente. Se apenas um for non-null, retorna ele.

**Refatoração de assinatura**: `getLastRankedMatchId(puuid: string)` → `getLastRankedMatchId(puuid: string, queue: number)` (aceita um único queue como parâmetro). A função interna `pollPlayer` chama duas vezes e resolve o "mais recente".

**Alternativa A descartada**: Uma única chamada sem filtro de queue + filtro client-side. A API sem filtro retorna partidas de qualquer tipo (Normal, ARAM, etc.), aumentando o volume de dados e exigindo mais chamadas a `getMatchResult` para filtrar. Piora a pressão sobre o rate limit.

**Alternativa B descartada**: Uma chamada com lista `queue: [420, 440]`. A documentação da Riot API v5 não suporta múltiplos valores de `queue` num único parâmetro. Testar isso quebraria silenciosamente em produção.

**Impacto no rate limit**: duas chamadas em paralelo por jogador por tick. Com o limiter de 50ms mínimo entre chamadas, `Promise.all` resulta em duas requisições enfileiradas com 50ms de intervalo mínimo — não viola o limite de 20 req/s. Com 5 jogadores monitorados: 10 chamadas de IDs por tick, dentro da margem segura.

---

### 4. getLastNRankedMatchIds para /history

**Decisão**: Duas chamadas paralelas de N itens cada, merge, sort por matchId descendente, slice(0, N).

```
const [solo, flex] = await Promise.all([
  getLastNRankedMatchIds(puuid, count, RANKED_SOLO_DUO),
  getLastNRankedMatchIds(puuid, count, RANKED_FLEX),
])
// merge + sort desc + slice(0, count)
```

A assinatura muda: `getLastNRankedMatchIds(puuid: string, count: number)` → `getLastNRankedMatchIds(puuid: string, count: number, queue: number)`. A função nova (sem queue) que chama ambas e faz o merge pode ter um nome diferente, como `getLastNRankedMatchIdsAllQueues`, ou a lógica fica em `index.ts`.

**Decisão de local**: a lógica de merge fica **em `src/riot/client.ts`** como uma nova função exportada `getLastNRankedMatchIdsBothQueues(puuid, count)`. Isso mantém o `index.ts` livre de lógica de Riot API.

**Justificativa do N de cada**: buscar N de cada fila e depois slice(0, N) pode retornar no máximo N resultados corretos mesmo quando o jogador tem histórico desbalanceado entre filas. Buscar N/2 de cada criaria distorção quando o jogador joga predominantemente uma fila.

**Sort**: matchIds da Riot têm formato `BR1_<número>` — sort descendente por string é correto porque o prefixo é fixo e o sufixo é inteiro crescente.

---

### 5. PlayerStats — sem separação por fila nesta entrega

**Decisão explícita**: `PlayerStats` (`wins`, `losses`, `streak`) **não muda estruturalmente** neste ciclo.

- `isRankedDefeat` (ou sua substituta `isRankedMatch`) aceita queue 420 e 440 igualmente para classificar vitória/derrota.
- `updateStats` recebe `won: boolean` — não precisa saber de qual fila veio. Permanece inalterada.
- Streak é calculado sobre todas as ranked (Solo + Flex somados), sem distinção.
- O tilt (streak <= -3) dispara independentemente da fila.

Separar stats por fila é backlog explícito da spec — documentado em FEATURE-0002 como fora do escopo.

---

### 6. isRankedDefeat → renomeação e semântica

**Situação atual**: `isRankedDefeat(match)` retorna `match.queueId === 420 && !match.won`. Retorna `true` apenas para derrotas Solo/Duo.

**Problema**: o nome e a implementação conflitam com o novo comportamento — Flex é ranked, mas a função atual não a reconhece. Além disso, `matchWorker.ts` usa o retorno de `isRankedDefeat` tanto para decidir se deve processar a partida quanto para saber se foi derrota — isso é uma mistura de responsabilidades que se torna mais visível agora.

**Decisão**: introduzir duas funções com responsabilidades separadas:

```ts
// Retorna true se a partida é de uma fila ranked monitorada (420 ou 440)
export function isRankedMatch(match: MatchResult): boolean {
  return RANKED_QUEUES.includes(match.queueId as (typeof RANKED_QUEUES)[number]);
}

// Mantém isRankedDefeat por compatibilidade — delega para isRankedMatch
export function isRankedDefeat(match: MatchResult): boolean {
  return isRankedMatch(match) && !match.won;
}
```

`matchWorker.ts` passa a usar `isRankedMatch` para decidir se emite o evento, e calcula `isDefeat` com `!match.won` diretamente. A função `isRankedDefeat` é mantida para não quebrar testes existentes (zero breaking change nesta interface pública).

**Alternativa descartada**: modificar `isRankedDefeat` para retornar true para queue 440 também. Descartado porque muda a semântica da função existente (que hoje é usada para múltiplos propósitos) e quebraria o comportamento de processamento condicional em `matchWorker`.

---

### 7. queueLabel — localização e formato

**Decisão**: adicionar `queueLabel(queueId: number): string` em `src/watcher/shame.ts`.

```ts
export function queueLabel(queueId: number): string {
  if (queueId === RANKED_SOLO_DUO) return 'Solo/Duo';
  if (queueId === RANKED_FLEX)     return 'Flex';
  return 'Ranked';
}
```

A label derivada é `'Solo/Duo'` ou `'Flex'`. O emoji (🎯 ou 👥) é responsabilidade da camada de apresentação (embed), não da lógica de domínio.

---

### 8. buildLossEmbed / buildWinEmbed — label de fila

**Decisão**: adicionar um field inline "Fila" nos embeds de derrota e vitória.

Layout atual (3 fields inline):
```
| Campeão | KDA | Duração |
```

Layout novo (4 fields inline):
```
| Campeão | KDA | Duração | Fila |
```

**Mudança de assinatura**: as funções `buildLossEmbed` e `buildWinEmbed` já recebem `match: MatchResult` que contém `match.queueId`. Portanto **a assinatura não precisa mudar** — as funções derivam o label internamente via `queueLabel(match.queueId)`.

**Alternativa descartada**: embutir o label no título (ex: `"🔴 GatoMakonha perdeu uma ranked Flex!"` ou alterar `buildShameMessage`). Descartado porque tornaria as mensagens de shame/win parametrizadas por fila, exigindo mudar `buildShameMessage` e `buildWinMessage` — que são texto de zoeira, não de contexto. Misturaria responsabilidades. Um field dedicado é mais limpo e extensível.

**Alternativa descartada**: passar label como parâmetro extra `buildLossEmbed(gameName, match, label)`. Descartado porque `match.queueId` já está disponível — calcular o label externamente e repassar seria redundância desnecessária.

---

### 9. buildHistoryEmbed — label de fila por partida

**Decisão**: incluir o label da fila no `value` de cada field, separado por `|`.

Layout atual:
```
1. Campeão
🟢 Win  |  5/2/10  |  32m05s
```

Layout novo:
```
1. Campeão
🟢 Win  |  Solo/Duo  |  5/2/10  |  32m05s
```

**Justificativa**: manter consistência visual com os outros embeds (label como texto, sem emoji de fila). O label fica na segunda posição, antes do KDA, para que o contexto da partida (qual fila) apareça logo após o resultado.

A assinatura de `buildHistoryEmbed(gameName, tagLine, matches: MatchResult[])` **não muda** — `MatchResult` já tem `queueId`.

---

### 10. pollPlayer e watcher.ts — mudança de lógica

**Situação atual**: `pollPlayer` chama `getLastRankedMatchId(puuid)` que busca apenas queue 420. A função retorna o matchId mais recente de Solo/Duo.

**Decisão**: `pollPlayer` passa a chamar uma nova função auxiliar (ou a versão refatorada de `getLastRankedMatchId`) que busca o mais recente entre as duas filas. O contrato externo de `pollPlayer` **não muda** — a assinatura permanece a mesma.

Internamente, `pollPlayer` fará:
```ts
const currentMatchId = await withRetry(
  () => getLastRankedMatchIdBothQueues(puuid),  // nova função interna
  RIOT_RETRIES,
  RIOT_RETRY_DELAY_MS
);
```

`watcher.ts` importará a nova função exportada de `client.ts`.

---

## Consequências

### Arquivos modificados e impacto

| Arquivo | Tipo de mudança | Breaking? |
|---------|----------------|-----------|
| `src/watcher/shame.ts` | Adiciona `RANKED_FLEX`, `RANKED_QUEUES`, `isRankedMatch`, `queueLabel`; mantém `isRankedDefeat` | Nao |
| `src/riot/client.ts` | `getLastRankedMatchId(puuid, queue)` — adiciona parâmetro `queue`; adiciona `getLastRankedMatchIdBothQueues(puuid)`; `getLastNRankedMatchIds(puuid, count, queue)` — adiciona parâmetro `queue`; adiciona `getLastNRankedMatchIdsBothQueues(puuid, count)` | **SIM** — veja secao abaixo |
| `src/watcher/watcher.ts` | Usa `getLastRankedMatchIdBothQueues` em vez de `getLastRankedMatchId` | Nao (mudanca interna) |
| `src/queue/matchWorker.ts` | Usa `isRankedMatch` para decidir se emite evento; `isDefeat` calculado com `!match.won` | Nao |
| `src/discord/embed.ts` | `buildLossEmbed`, `buildWinEmbed`, `buildHistoryEmbed` adicionam field/label de fila | Nao (assinaturas preservadas) |
| `src/handlers/discordHandler.ts` | Nenhuma mudanca — `buildLossEmbed`/`buildWinEmbed` recebem o `match` com `queueId` | Nao |
| `src/index.ts` | `/history` passa a chamar `getLastNRankedMatchIdsBothQueues` em vez de `getLastNRankedMatchIds` | Nao (mudanca local) |
| `tests/` | Novos testes para queue 440 em todos os modulos afetados; testes de regressao queue 420 | Nao |

### Redis e BullMQ

Nenhuma mudança em chaves Redis, formato de `BotState`, `MatchJobData` ou na estrutura de jobs BullMQ. O payload `MatchFinishedEvent` já carrega `match.queueId` — handlers existentes funcionam sem modificação.

### Deploy

Nenhuma variável de ambiente nova. O deploy no Railway é transparente — nenhuma migração de dados.

---

## Ordem de implementação

A ordem abaixo minimiza o risco de quebra em cada commit e garante que o CI passe em cada etapa.

**Etapa 1 — `src/watcher/shame.ts` (lógica pura, zero I/O)**
- Exportar `RANKED_FLEX`, `RANKED_QUEUES`
- Adicionar `isRankedMatch(match)`
- Adicionar `queueLabel(queueId)`
- `isRankedDefeat` mantida sem mudança
- Testes RED → GREEN antes de qualquer outro arquivo

**Etapa 2 — `src/riot/client.ts` (I/O, breaking change confirmada)**
- `getLastRankedMatchId(puuid, queue)` — adiciona parâmetro com default `RANKED_SOLO_DUO` (backward compatible nos testes existentes)
- `getLastRankedMatchIdBothQueues(puuid)` — nova funcao exportada
- `getLastNRankedMatchIds(puuid, count, queue)` — adiciona parâmetro com default
- `getLastNRankedMatchIdsBothQueues(puuid, count)` — nova funcao exportada
- Testes RED → GREEN antes de avançar

**Etapa 3 — `src/discord/embed.ts` (puro, zero I/O)**
- `buildLossEmbed`, `buildWinEmbed` adicionam field "Fila" via `queueLabel`
- `buildHistoryEmbed` adiciona label por linha
- Testes RED → GREEN antes de avançar

**Etapa 4 — `src/queue/matchWorker.ts`**
- Substituir `isRankedDefeat` por `isRankedMatch` na guarda de processamento
- Calcular `isDefeat = !match.won` explicitamente
- Verificar que partidas de fila nao-ranked nao emitem evento
- Testes RED → GREEN

**Etapa 5 — `src/watcher/watcher.ts`**
- Substituir `getLastRankedMatchId` por `getLastRankedMatchIdBothQueues`
- Testes RED → GREEN

**Etapa 6 — `src/index.ts`**
- Substituir `getLastNRankedMatchIds` por `getLastNRankedMatchIdsBothQueues` no handler de `/history`
- Smoke test manual do comando `/history`

---

## Alternativas consideradas e descartadas

| Alternativa | Motivo do descarte |
|-------------|-------------------|
| Enum `QueueType` | Runtime overhead, sem ganho para 2 valores; constantes simples sao suficientes |
| Filtro client-side (sem parametro de queue na API) | Aumenta volume de dados e pressao no rate limit |
| Modificar `isRankedDefeat` diretamente | Quebra semantica da funcao existente; mistura "e ranked?" com "e derrota?" |
| Label de fila no titulo do embed | Misturaria logica de zoeira com contexto de fila; field dedicado e mais extensivel |
| `N/2` de cada fila no `/history` | Distorce historico de jogadores com uso desbalanceado de filas |
| Novo arquivo `src/infra/queues.ts` | Dependencia cruzada sem beneficio; constantes pertencem ao dominio de shame.ts |

---

## Pontos para confirmacao do humano

As seguintes mudancas alteram interfaces publicas exportadas e precisam de confirmacao explicita antes da implementacao:

### BREAKING — `src/riot/client.ts`

**1. `getLastRankedMatchId`**
- Assinatura atual: `getLastRankedMatchId(puuid: string): Promise<string | null>`
- Assinatura proposta: `getLastRankedMatchId(puuid: string, queue: number): Promise<string | null>`
- Impacto: `watcher.ts` e qualquer teste que chame a funcao diretamente precisam passar o segundo argumento
- Mitigacao proposta: default `queue = RANKED_SOLO_DUO` — backward compatible nos testes existentes, mas tecnicamente a assinatura muda

**2. `getLastNRankedMatchIds`**
- Assinatura atual: `getLastNRankedMatchIds(puuid: string, count: number): Promise<string[]>`
- Assinatura proposta: `getLastNRankedMatchIds(puuid: string, count: number, queue: number): Promise<string[]>`
- Impacto: `index.ts` usa essa funcao no handler de `/history` — precisara ser atualizado
- Mitigacao proposta: default `queue = RANKED_SOLO_DUO` — backward compatible, mas tecnicamente a assinatura muda

**Pergunta ao humano**: voce aprova adicionar o parâmetro `queue` com default `RANKED_SOLO_DUO` nessas duas funcoes (backward compatible, sem quebra de chamadores existentes), E adicionar as funcoes `getLastRankedMatchIdBothQueues` e `getLastNRankedMatchIdsBothQueues` como novas exportacoes?

### Nao-breaking (informativo)
- `isRankedMatch` e `queueLabel` sao novas exportacoes em `shame.ts` — additive only
- `buildLossEmbed`, `buildWinEmbed`, `buildHistoryEmbed` preservam assinaturas identicas — mudancas sao internas
- `isRankedDefeat` e `MatchResult` nao mudam
- `MatchFinishedEvent` nao muda — `match.queueId` ja existe no payload
