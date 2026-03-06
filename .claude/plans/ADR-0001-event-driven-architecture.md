# ADR-0001: Event-Driven Architecture para Match Processing

**Status**: Aceito
**Data**: 2026-03-06
**Contexto**: FEATURE-0001 — adicionar streakHandler sem alongar `processMatchJob`

---

## Contexto

`processMatchJob` em `src/queue/matchWorker.ts` executa hoje um fluxo linear e acoplado de 5 passos: busca resultado na Riot API, atualiza stats, monta embed, posta no Discord, salva no Redis. Qualquer novo comportamento pós-partida exige editar essa mesma função.

A FEATURE-0001 introduz o `streakHandler` (mensagem de tilt quando streak <= -3). Adicionar isso como mais um `if` dentro de `processMatchJob` viola o princípio de responsabilidade única e cria precedente para crescimento descontrolado do arquivo.

A decisão é introduzir um EventBus interno baseado em `EventEmitter` nativo do Node.js para que `processMatchJob` apenas emita um evento após buscar e calcular o resultado, e handlers independentes reajam sem se conhecerem.

---

## Decisao 1 — Interface do Evento: `MatchFinishedEvent`

```typescript
export interface MatchFinishedEvent {
  gameName: string;       // Nome do jogador (ex: "GatoMakonha")
  tagLine: string;        // Tag do jogador (ex: "T2F")
  match: MatchResult;     // Dados brutos da partida (champion, KDA, duração)
  isDefeat: boolean;      // true se queueId === 420 && !won
  statsAfter: PlayerStats; // Stats já atualizadas (pós-updateStats)
}
```

**Justificativa de cada campo:**

- `gameName` + `tagLine`: identificam o jogador sem depender do puuid. Handlers de Discord e streak precisam do nome para mensagens e a chave `"gameName#tagLine"` para acessar stats. Separados (não concatenados) para preservar flexibilidade.
- `match: MatchResult`: o `discordHandler` precisa de `champion`, `kills`, `deaths`, `assists`, `gameDurationSecs` para montar o embed. Passar o objeto completo evita campos extras no evento.
- `isDefeat: boolean`: pré-computado no worker via `isRankedDefeat(match)`. Cada handler precisaria recalcular se não estivesse no payload — duplicação desnecessária.
- `statsAfter: PlayerStats`: **pre-computado pelo worker antes de emitir o evento** (ver Decisao 3). O `streakHandler` precisa de `statsAfter.streak` para decidir se dispara. Incluir no payload garante que handlers podem executar em qualquer ordem sem dependência entre si.

**O campo `puuid` nao entra no evento** porque nenhum handler precisa dele. Handlers operam sobre gameName/tagLine como chave de identidade do jogador no domínio de negócio.

---

## Decisao 2 — Estrutura de `src/infra/eventBus.ts`

O EventBus usa `EventEmitter` nativo do Node.js com tipagem forte via interface customizada. Zero `any`.

```typescript
// src/infra/eventBus.ts
import { EventEmitter } from 'events';
import type { MatchFinishedEvent } from '../queue/matchWorker';

// Interface para garantir tipagem forte no emit e on
export interface BotEventMap {
  'match:finished': [event: MatchFinishedEvent];
}

// TypedEventEmitter: subclasse com métodos tipados
export class TypedEventEmitter extends EventEmitter {
  emit<K extends keyof BotEventMap>(event: K, ...args: BotEventMap[K]): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof BotEventMap>(
    event: K,
    listener: (...args: BotEventMap[K]) => void
  ): this {
    return super.on(event, listener);
  }
}

// Singleton exportado — uma instância por processo
export const eventBus = new TypedEventEmitter();
```

**Decisoes de design:**

- `TypedEventEmitter` como subclasse (não wrapper) preserva compatibilidade com o `EventEmitter` nativo e não exige nenhuma dependência externa.
- Singleton por módulo: em CommonJS, `require()` cacheia o módulo — a mesma instância é retornada em todos os `require('../infra/eventBus')`. Não há necessidade de passar o bus como dependência em todos os módulos.
- `MatchFinishedEvent` é definido em `src/queue/matchWorker.ts` e re-exportado de lá. O `eventBus.ts` importa apenas o tipo (`import type`), sem dependência de runtime circular.
- Zero `any`: `BotEventMap` mapeia nome do evento para tupla de argumentos tipados.

---

## Decisao 3 — Pre-computo de `statsAfter` no Worker (nao no statsHandler)

**O worker calcula `statsAfter` antes de emitir o evento. O `statsHandler` apenas persiste esse valor no Redis.**

Fluxo:

```
processMatchJob:
  1. busca match na Riot API
  2. calcula isDefeat = isRankedDefeat(match)
  3. calcula statsAfter = updateStats(botState.stats[key] ?? emptyStats(), !isDefeat)
  4. emite 'match:finished' com { gameName, tagLine, match, isDefeat, statsAfter }

statsHandler (ouvindo 'match:finished'):
  - atualiza botState.stats[key] = statsAfter   (atribuição, sem recalcular)
  - chama saveState(botState)

streakHandler (ouvindo 'match:finished'):
  - usa statsAfter.streak diretamente (já calculado)
  - decide se posta mensagem de tilt
```

**Por que nao delegar o calculo ao statsHandler?**

O `streakHandler` depende de `statsAfter.streak`. Se o calculo ficasse no `statsHandler`, seria necessário garantir que ele executa antes do `streakHandler`. `EventEmitter.emit()` chama listeners de forma síncrona e na ordem de registro — mas isso cria acoplamento implícito de ordem que não está documentado no código e quebraria se alguém trocasse a ordem de registro.

Pre-computar no worker torna o payload auto-contido: qualquer handler pode executar em qualquer ordem sem depender do resultado de outro handler.

**Desvantagem aceita:** o worker agora conhece `updateStats`. Isso é aceitável porque o worker já conhecia `emptyStats` e `updateStats` antes desta refatoração — a diferença é que agora ele não persiste o estado, apenas calcula.

---

## Decisao 4 — Estrutura dos Handlers

### Caminhos dos arquivos

Os handlers ficam em `src/handlers/` (novo diretório, paralelo a `queue/`, `discord/`, etc.):

```
src/
  handlers/
    statsHandler.ts
    discordHandler.ts
    streakHandler.ts
tests/
  handlers/
    statsHandler.test.ts
    discordHandler.test.ts
    streakHandler.test.ts
```

**Por que `src/handlers/` e nao `src/queue/`?**

Os handlers não são parte da fila BullMQ. Eles reagem a eventos internos. Colocá-los em `src/queue/` seria enganoso sobre sua natureza. Um diretório próprio deixa claro que são reaction handlers do EventBus — um conceito distinto de producers/consumers de fila.

### Assinaturas dos handlers

Cada handler é uma função assíncrona que recebe o payload do evento e um objeto `deps` com injeção de dependência. Nenhum handler importa módulos com I/O diretamente no escopo do módulo — recebe tudo via `deps`.

```typescript
// src/handlers/statsHandler.ts
import type { MatchFinishedEvent } from '../queue/matchWorker';
import type { BotState } from '../infra/store';

export interface StatsHandlerDeps {
  botState: BotState;
  saveState: (state: BotState) => Promise<void>;
}

export async function statsHandler(
  event: MatchFinishedEvent,
  deps: StatsHandlerDeps
): Promise<void>
```

```typescript
// src/handlers/discordHandler.ts
import type { MatchFinishedEvent } from '../queue/matchWorker';
import type { Client } from 'discord.js';

export interface DiscordHandlerDeps {
  client: Client;
  channelId: string;
  sendMessage: (client: Client, channelId: string, msg: unknown) => Promise<void>;
  buildLossEmbed: (gameName: string, match: MatchResult) => EmbedBuilder;
  buildWinEmbed: (gameName: string, match: MatchResult) => EmbedBuilder;
}

export async function discordHandler(
  event: MatchFinishedEvent,
  deps: DiscordHandlerDeps
): Promise<void>
```

```typescript
// src/handlers/streakHandler.ts
import type { MatchFinishedEvent } from '../queue/matchWorker';
import type { Client } from 'discord.js';

export interface StreakHandlerDeps {
  client: Client;
  channelId: string;
  sendMessage: (client: Client, channelId: string, msg: string) => Promise<void>;
}

export const STREAK_THRESHOLD = -3; // hardcoded nesta entrega

export async function streakHandler(
  event: MatchFinishedEvent,
  deps: StreakHandlerDeps
): Promise<void>
```

**Regra de isolamento de falhas:** cada handler envolve seu corpo em `try/catch` e loga o erro com `log('error', '[nomeDoHandler] erro', { error: String(err) })` sem re-lançar. O worker não captura erros dos handlers individualmente — os handlers são responsáveis por não propagar.

### Como handlers sao registrados

Os handlers são registrados em `src/index.ts` durante o boot, após a instância do `client` Discord estar pronta mas antes do primeiro `tick()`. Veja Decisao 6 para a justificativa completa.

---

## Decisao 5 — Mudancas em `matchWorker.ts`

### ANTES (fluxo atual)

```
processMatchJob(data, deps):
  match = await withRetry(() => getMatchResult(matchId, puuid))
  defeat = isRankedDefeat(match)
  key = `${gameName}#${tagLine}`
  botState.stats[key] = updateStats(botState.stats[key] ?? emptyStats(), !defeat)
  embed = defeat ? buildLossEmbed(...) : buildWinEmbed(...)
  await sendMessage(client, channelId, embed)
  await saveState(botState)
```

`processMatchJob` faz tudo: Riot API + stats + embed + Discord + Redis.

### DEPOIS (pós-refatoração)

```
processMatchJob(data, deps):
  match = await withRetry(() => getMatchResult(matchId, puuid))
  isDefeat = isRankedDefeat(match)
  key = `${gameName}#${tagLine}`
  statsAfter = updateStats(deps.botState.stats[key] ?? emptyStats(), !isDefeat)

  deps.eventBus.emit('match:finished', {
    gameName,
    tagLine,
    match,
    isDefeat,
    statsAfter,
  })
```

**O que fica no worker:**
- Chamada à Riot API com `withRetry`
- Calculo de `isDefeat` via `isRankedDefeat`
- Calculo de `statsAfter` via `updateStats` (sem persistir)
- Emissao do evento

**O que vai para handlers:**
- Atualizar `botState.stats[key]` e chamar `saveState` → `statsHandler`
- Montar embed e chamar `sendMessage` → `discordHandler`
- Decidir se posta mensagem de tilt → `streakHandler`

**O worker ainda salva estado?** Nao. `saveState` vai para o `statsHandler`. O worker nao persiste mais nada diretamente.

### Mudanca na interface de `ProcessMatchDeps`

```typescript
// ANTES
export interface ProcessMatchDeps {
  client: Client;
  channelId: string;
  botState: BotState;
}

// DEPOIS
export interface ProcessMatchDeps {
  botState: BotState;
  eventBus: TypedEventEmitter;
}
```

`client` e `channelId` saem de `ProcessMatchDeps` e vao para `DiscordHandlerDeps` e `StreakHandlerDeps`. O worker nao precisa mais conhecer o Discord.

**Esta e uma mudanca de interface publica de `matchWorker.ts`. O humano deve confirmar antes da implementacao.**

Os testes de `matchWorker.test.ts` precisam ser atualizados para:
- Verificar que `eventBus.emit('match:finished', payload)` é chamado com os dados corretos
- Remover mocks de `discord.sendMessage` e `store.saveState` (que agora pertencem aos handlers)
- Adicionar mock de `eventBus`

---

## Decisao 6 — Registro dos Handlers em `src/index.ts` (nao em `createWorker`)

**Os handlers sao registrados em `src/index.ts`, no boot, dentro do callback `clientReady`.**

Codigo de registro (em `src/index.ts`, após `createWorker`):

```typescript
// src/index.ts — dentro de client.once('clientReady', ...)
const queue = createMatchQueue();
createWorker({ botState, eventBus });

// Registro dos handlers — ordem: stats → discord → streak
eventBus.on('match:finished', async (event) => {
  await statsHandler(event, { botState, saveState });
});

eventBus.on('match:finished', async (event) => {
  await discordHandler(event, { client, channelId, sendMessage, buildLossEmbed, buildWinEmbed });
});

eventBus.on('match:finished', async (event) => {
  await streakHandler(event, { client, channelId, sendMessage });
});
```

**Por que `src/index.ts` e nao dentro de `createWorker`?**

`createWorker` é o factory do BullMQ Worker — sua responsabilidade é configurar o consumer da fila. Registrar handlers de EventBus dentro dele viola responsabilidade única e tornaria `createWorker` dependente de `client`, `channelId`, `saveState` e outros deps que não pertencem ao escopo de fila. Além disso, ao registrar em `createWorker`, os handlers se tornariam invisíveis para quem lê `src/index.ts`, dificultando entender o ciclo de vida do bot.

Em `src/index.ts`, o registro é explícito e próximo do boot — quem lê o entry point vê toda a "orquestração" de handlers em um lugar.

**A ordem de registro importa?** Tecnicamente nao para isolamento de falhas (cada handler tem try/catch independente). Mas a ordem recomendada é `stats → discord → streak` porque:
1. `statsHandler` persiste o estado — executar cedo minimiza janela de inconsistência se o processo morrer
2. `discordHandler` posta o embed principal
3. `streakHandler` posta mensagem complementar — deve aparecer depois do embed no canal

O `EventEmitter` nativo executa listeners síncronos na ordem de registro. Como os listeners são funções `async`, o `emit` retorna imediatamente após disparar cada listener (não aguarda o `await` interno). A ordem de conclusão não é garantida. Para os requisitos desta feature, isso é aceitável — a cena 2 da spec diz "embed primeiro, mensagem de streak depois", mas isso é melhor-esforço dado que o Discord pode reordenar mensagens chegando em rápida sucessão.

**Se a ordem de postagem no Discord se tornar critica no futuro**, o design deve ser revisado para execução sequencial explícita (handlers em cadeia, não listeners paralelos).

---

## Decisao 7 — `TILT_MESSAGES` e `buildTiltMessage` em `src/watcher/shame.ts`

```typescript
// src/watcher/shame.ts — adições
export const TILT_MESSAGES: string[] = [
  // mínimo 5 mensagens (o dev escreve o conteúdo)
];

export function buildTiltMessage(gameName: string): string {
  const phrase = TILT_MESSAGES[Math.floor(Math.random() * TILT_MESSAGES.length)];
  return `${gameName} ${phrase}`;
}
```

`shame.ts` já é o módulo de mensagens de shame/win. `TILT_MESSAGES` pertence ao mesmo domínio — mensagens de zoeira. Adicionar aqui evita criar um novo módulo só para strings.

O `streakHandler` importa `buildTiltMessage` de `src/watcher/shame.ts` e passa o resultado para `sendMessage` como string simples (não embed).

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Handlers async sem await no emit — ordem de postagem no Discord nao garantida | Media | Baixo (cosmético) | Aceito nesta entrega; revisitar se vira problema em producao |
| Erro silencioso em handler — try/catch engole erro sem ser notado | Media | Medio | Log obrigatório com nome do handler; monitorar Railway logs |
| `botState` mutavel compartilhado entre worker e statsHandler — race condition se dois jobs processarem em paralelo | Media | Alto | BullMQ por padrão processa 1 job por vez (`concurrency: 1`). Confirmar que `createWorker` nao sobe concurrency > 1 |
| Mudanca de interface de `ProcessMatchDeps` quebra testes existentes do matchWorker | Alta | Medio | Testes do matchWorker precisam ser atualizados no mesmo commit da refatoracao |
| Evento emitido mas nenhum handler registrado (bug de ordem de boot) | Baixa | Alto | Registro de handlers acontece antes do primeiro `tick()` em `clientReady` — mesma garantia que `createWorker` ja tem |
| `shame.ts` ultrapassar 300 linhas apos adicao de TILT_MESSAGES | Baixa | Baixo | Verificar antes de commitar: arquivo tem 67 linhas hoje, 5+ mensagens nao chegam perto do limite |

---

## Arquivos a Criar/Modificar

| Arquivo | Tipo | Responsabilidade |
|---------|------|-----------------|
| `src/infra/eventBus.ts` | Novo | `TypedEventEmitter`, `BotEventMap`, instancia `eventBus` singleton |
| `src/handlers/statsHandler.ts` | Novo | Persiste `statsAfter` no Redis via `saveState` |
| `src/handlers/discordHandler.ts` | Novo | Monta e posta embed (loss/win) no Discord |
| `src/handlers/streakHandler.ts` | Novo | Posta mensagem de tilt se streak <= -3 |
| `src/queue/matchWorker.ts` | Modificado | Remove logica inline; emite `match:finished`; muda `ProcessMatchDeps` |
| `src/watcher/shame.ts` | Modificado | Adiciona `TILT_MESSAGES` e `buildTiltMessage` |
| `src/index.ts` | Modificado | Registra handlers no boot; passa `eventBus` para `createWorker` |
| `tests/handlers/statsHandler.test.ts` | Novo | Testes unitarios do statsHandler |
| `tests/handlers/discordHandler.test.ts` | Novo | Testes unitarios do discordHandler |
| `tests/handlers/streakHandler.test.ts` | Novo | Testes unitarios do streakHandler |
| `tests/queue/matchWorker.test.ts` | Modificado | Verifica emissao de evento; remove mocks de Discord/store |
| `tests/watcher/shame.test.ts` | Modificado | Adiciona casos para TILT_MESSAGES e buildTiltMessage |

---

## Alternativas Consideradas

### Alternativa A — Continuar adicionando `if` em `processMatchJob`

Descartada. Viola responsabilidade única. A cada nova feature pós-partida, `processMatchJob` cresce. Sem mecanismo de extensão, o arquivo tende ao crescimento descontrolado.

### Alternativa B — Chamar handlers sequencialmente dentro do worker (sem EventBus)

```typescript
// sem eventBus
await statsHandler(event, statsDeps);
await discordHandler(event, discordDeps);
await streakHandler(event, streakDeps);
```

Mais simples. O problema: adicionar um novo handler ainda exige modificar `processMatchJob`. Não resolve o problema de acoplamento. Descartada.

### Alternativa C — EventBus distribuido com Redis Pub/Sub

Descartada. Over-engineering para o problema atual. O bot roda em processo único no Railway. Redis Pub/Sub adicionaria latência, complexidade de serialização e um ponto extra de falha. A spec do PO explicitamente coloca isso fora do escopo.

### Alternativa D — Calcular `statsAfter` no statsHandler e usar emissor de evento em cadeia

`processMatchJob` emite evento → `statsHandler` calcula e re-emite `match:stats-updated` → `streakHandler` ouve o segundo evento.

Descartada. Dois eventos, duas cadeias de registro, mais complexidade de teste. O pre-computo no worker é mais simples e elimina a dependência de ordem entre handlers.

---

## Consequencias

**Positivas:**
- Adicionar novo comportamento pós-partida = criar novo handler em `src/handlers/` + registrar em `src/index.ts`. Zero modificação no worker.
- Cada handler é testável de forma completamente isolada com mocks por injeção de dependência.
- Falha em um handler não afeta os outros.
- `processMatchJob` fica com ~15 linhas (de ~20 hoje, mas com responsabilidade muito mais clara).

**Negativas/Atencao:**
- Interface pública de `ProcessMatchDeps` muda — requer confirmação do humano e atualização dos testes do worker no mesmo commit.
- O `src/index.ts` cresce com o registro dos handlers. Monitorar tamanho (hoje com 197 linhas — adicionando ~15 linhas de registro, continua abaixo de 300).
- A mutabilidade de `botState` compartilhado entre worker e handlers via referência continua sendo o modelo de persistência in-memory. Não introduzimos imutabilidade — aceito como débito técnico existente.
