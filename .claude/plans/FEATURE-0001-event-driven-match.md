# FEATURE-0001: Event-Driven Match Processing

**Status:** Pronto para Dev
**Prioridade:** Media
**Valor:** Desacopla responsabilidades no matchWorker, tornando trivial adicionar novos comportamentos (ex: novos handlers) sem tocar em codigo existente. Entrega como brinde o streakHandler, que posta mensagem especial quando o jogador tiltou (-3 seguidas).

---

## O que o bot faz hoje

`processMatchJob` em `src/queue/matchWorker.ts` executa um fluxo linear e acoplado:

1. Busca resultado da partida na Riot API (`getMatchResult`)
2. Atualiza stats do jogador (`updateStats`)
3. Monta embed (`buildLossEmbed` / `buildWinEmbed`)
4. Posta no Discord (`sendMessage`)
5. Salva estado no Redis (`saveState`)

Qualquer novo comportamento pos-partida exige editar esse mesmo arquivo e alongar a funcao.

---

## O problema ou oportunidade

Queremos adicionar o **streakHandler**: quando um jogador acumula 3 ou mais derrotas consecutivas, o bot posta uma mensagem extra de "tiltar" alem do embed normal de derrota. Hoje isso seria mais um `if` dentro de `processMatchJob`, acoplando mais uma responsabilidade.

A oportunidade e introducir um **EventBus interno** (Node.js `EventEmitter` nativo) para que `processMatchJob` apenas emita um evento `"match:finished"` com os dados da partida, e handlers independentes reajam a esse evento sem se conhecerem.

---

## Comportamento esperado (cenas)

### Cena 1 — Jogador perde, streak < -3 ainda nao atingido

GatoMakonha termina uma ranked e perde. E sua segunda derrota consecutiva (streak = -2).

O bot posta o embed vermelho normal de shame. Nenhuma mensagem adicional aparece.

### Cena 2 — Jogador perde, streak atinge exatamente -3

GatoMakonha perde mais uma. Agora streak = -3.

O bot posta o embed vermelho de shame **e logo em seguida** posta uma mensagem de texto simples de "tiltar" no mesmo canal. A ordem e: embed primeiro, mensagem de streak depois.

### Cena 3 — Jogador continua perdendo alem de -3

GatoMakonha perde a quarta consecutiva (streak = -4), depois a quinta (-5), e assim por diante.

O bot posta o embed de shame **e a mensagem de tiltar em cada uma dessas derrotas** — nao so na primeira vez que -3 foi atingido.

### Cena 4 — Jogador ganha

GatoMakonha ganha uma ranked. Streak volta para positivo.

O bot posta o embed cinza de vitoria. O streakHandler nao dispara. Nenhuma mensagem extra.

### Cena 5 — Jogador ganha, depois perde 3 vezes

GatoMakonha ganha (streak = 1), perde (streak = -1), perde (streak = -2), perde (streak = -3).

No quarta partida, streak chegou em -3 novamente. O streakHandler dispara. O bot posta embed de shame e mensagem de tiltar.

### Cena 6 — Handler do Discord lanca erro

`discordHandler` falha ao postar o embed (ex: canal offline, token expirado).

`statsHandler` ja executou e atualizou os stats normalmente.
`streakHandler` ainda executa apos o erro do discordHandler e tenta postar a mensagem de streak se a condicao for atingida — podendo tambem falhar, mas de forma independente.
Nenhum handler interrompe os outros.

---

## User Stories

### US-1 — EventBus interno

**Como** desenvolvedor do bot,
**quero** que `processMatchJob` emita um evento `"match:finished"` apos buscar o resultado da partida,
**para que** novos comportamentos pos-partida sejam adicionados como handlers registrados no EventBus, sem modificar o fluxo principal.

### US-2 — statsHandler

**Como** bot,
**quero** um handler que reaja ao evento `"match:finished"` e atualize as stats do jogador (wins, losses, streak),
**para que** a logica de estatisticas esteja isolada e testavel independentemente dos outros handlers.

### US-3 — discordHandler

**Como** bot,
**quero** um handler que reaja ao evento `"match:finished"` e monte e poste o embed correto (loss ou win) no canal do Discord,
**para que** a logica de apresentacao esteja isolada da logica de dados.

### US-4 — streakHandler

**Como** membro do servidor Discord,
**quero** receber uma mensagem especial quando um jogador monitorado perde 3 ou mais partidas consecutivas,
**para que** a zoeira seja intensificada exatamente quando o jogador esta tiltado.

### US-5 — Isolamento de falhas entre handlers

**Como** operador do bot,
**quero** que a falha de um handler nao interrompa a execucao dos outros handlers registrados no EventBus,
**para que** uma falha no Discord nao impeca a atualizacao de stats, e vice-versa.

---

## Criterios de Aceite

### EventBus

- [ ] Existe um modulo `src/infra/eventBus.ts` que exporta uma instancia singleton de `EventEmitter` tipada com o evento `"match:finished"`.
- [ ] O payload do evento `"match:finished"` contem: `{ gameName, tagLine, match: MatchResult, isDefeat: boolean, statsAfter: PlayerStats }`.
  - `statsAfter` e o estado das stats **apos** a atualizacao pelo statsHandler — o streakHandler usa esse valor para decidir se dispara.
  - Nota: como handlers sao assincronos e registrados de forma independente, a ordem de execucao deve ser garantida ou o payload deve ser pre-computado antes da emissao. Ver secao "Decisoes de design" abaixo.
- [ ] `processMatchJob` emite `"match:finished"` apos buscar o resultado da partida e **nao** executa diretamente nenhuma logica de stats, embed ou Discord.

### statsHandler

- [ ] **Given** evento `"match:finished"` com `isDefeat: true`, **When** statsHandler executa, **Then** `botState.stats[key].losses` aumenta em 1 e `streak` diminui em 1 (ou reseta para -1 se era positivo).
- [ ] **Given** evento `"match:finished"` com `isDefeat: false`, **When** statsHandler executa, **Then** `botState.stats[key].wins` aumenta em 1 e `streak` aumenta em 1 (ou reseta para 1 se era negativo).
- [ ] statsHandler chama `saveState(botState)` apos atualizar as stats.
- [ ] statsHandler e testavel de forma isolada, recebendo `botState` e o payload do evento como parametros.

### discordHandler

- [ ] **Given** `isDefeat: true`, **When** discordHandler executa, **Then** chama `buildLossEmbed` e `sendMessage` com o embed vermelho.
- [ ] **Given** `isDefeat: false`, **When** discordHandler executa, **Then** chama `buildWinEmbed` e `sendMessage` com o embed cinza.
- [ ] discordHandler e testavel de forma isolada com `client` e `channelId` como dependencias injetadas.

### streakHandler

- [ ] **Given** `isDefeat: true` e `statsAfter.streak <= -3`, **When** streakHandler executa, **Then** posta uma mensagem de texto simples no mesmo canal do Discord.
- [ ] **Given** `isDefeat: true` e `statsAfter.streak === -2`, **When** streakHandler executa, **Then** nao posta nenhuma mensagem extra.
- [ ] **Given** `isDefeat: false` (vitoria), **When** streakHandler executa, **Then** nao posta nenhuma mensagem, independente do valor de `streak`.
- [ ] **Given** `statsAfter.streak === -5` (abaixo de -3), **When** streakHandler executa, **Then** posta a mensagem de tiltar (nao e so na primeira vez em -3).
- [ ] A mensagem de tiltar e uma string de texto simples (nao embed), postada com `sendMessage`.
- [ ] Existe um conjunto de mensagens de tiltar (`TILT_MESSAGES`) em `src/watcher/shame.ts`, com pelo menos 5 opcoes, escolhida aleatoriamente. Tom: zoeira que reconhece o colapso emocional iminente.
- [ ] streakHandler e testavel de forma isolada com `client`, `channelId` e o payload do evento como dependencias injetadas.

### Isolamento de falhas

- [ ] **Given** discordHandler lanca um erro, **When** o EventBus processa os handlers, **Then** statsHandler e streakHandler ainda executam (o erro e logado mas nao propagado).
- [ ] Cada handler envolve sua execucao em try/catch e loga o erro com `log('error', ...)` incluindo o nome do handler.

### Regressao — comportamento existente preservado

- [ ] O embed de derrota (vermelho, #ff0000) continua sendo postado apos uma derrota ranked.
- [ ] O embed de vitoria (cinza, #808080) continua sendo postado apos uma vitoria ranked.
- [ ] As stats do jogador continuam sendo persistidas no Redis apos cada partida.
- [ ] Os 91 testes existentes continuam passando sem modificacao.

---

## Decisao de Design — Ordem de execucao e `statsAfter`

O streakHandler depende das stats ja atualizadas (`statsAfter.streak`). Para garantir isso sem acoplar a ordem de registro dos handlers no EventEmitter, a abordagem recomendada e:

**`processMatchJob` computa as stats antes de emitir o evento**, e inclui `statsAfter` no payload. O `statsHandler` entao persiste esse valor no Redis (nao recalcula). Dessa forma, o payload do evento e auto-contido e os handlers podem executar em qualquer ordem.

Essa decisao e do Tech Lead confirmar ou ajustar no design tecnico.

---

## Mensagens de Tiltar (streakHandler)

Tom esperado: reconhece que o jogador esta em colapso, zoeira carinhosa/brutal, no estilo das `SHAME_MESSAGES` existentes.

Exemplos de direcao (nao sao os textos finais — o dev escreve):
- Algo sobre tilt, sobre desligar o computador antes de piorar
- Algo sobre o jogador estar em modo automatico de derrota
- Algo sobre sugerir uma pausa antes de chegar ao ferro

Minimo: 5 mensagens no array `TILT_MESSAGES` em `src/watcher/shame.ts`.

---

## Fora do Escopo desta Entrega

- **Notificacao quando a partida comeca** (nao apenas termina) — backlog separado.
- **Streak positivo especial** (ex: mensagem ao ganhar 3 seguidas) — pode ser um handler futuro, nao entra agora.
- **Threshold configuravel** (-3 e hardcoded nesta entrega; configuracao por servidor e escopo futuro).
- **EventBus distribuido ou persistido** — o EventEmitter e in-memory e descartado ao reiniciar o processo. Nao usar Redis Pub/Sub ou BullMQ para o EventBus interno.
- **Multi-server Discord** — o bot continua operando em canal unico configurado via env var.
- **Mudancas no schema do Redis** (`BotState`) — a estrutura de `stats` nao muda.
- **Novos slash commands** relacionados a streak ou eventos.
- **Testes de integracao com Redis real** — mocks sao suficientes para esta entrega.

---

## Impacto em modulos existentes

Para o Tech Lead avaliar:

| Modulo | Tipo de mudanca |
|--------|----------------|
| `src/queue/matchWorker.ts` | Refatoracao: remove logica inline, passa a emitir evento; `processMatchJob` fica menor |
| `src/watcher/shame.ts` | Adicao: array `TILT_MESSAGES` e funcao `buildTiltMessage(gameName)` |
| `src/infra/eventBus.ts` | **Novo arquivo**: singleton EventEmitter tipado |
| `src/queue/statsHandler.ts` | **Novo arquivo**: handler de stats |
| `src/queue/discordHandler.ts` | **Novo arquivo**: handler de embed/Discord |
| `src/queue/streakHandler.ts` | **Novo arquivo**: handler de streak/tilt |
| `tests/queue/statsHandler.test.ts` | **Novo arquivo**: testes unitarios do handler |
| `tests/queue/discordHandler.test.ts` | **Novo arquivo**: testes unitarios do handler |
| `tests/queue/streakHandler.test.ts` | **Novo arquivo**: testes unitarios do handler |
| `tests/queue/matchWorker.test.ts` | Atualizacao: testes do worker adaptados para verificar emissao de evento |
| `tests/watcher/shame.test.ts` | Atualizacao: adicionar casos para `TILT_MESSAGES` e `buildTiltMessage` |

`src/index.ts` pode precisar registrar os handlers no EventBus durante o boot — avaliar no design tecnico.

---

## Metricas de Sucesso

A feature esta entregue corretamente quando:

1. **Todos os testes existentes passam** (91+) sem modificacao de comportamento.
2. **Novos testes cobrindo os 3 handlers e o EventBus** passam com 100% de cobertura de branches nos handlers.
3. **`processMatchJob` nao contem mais** chamadas diretas a `updateStats`, `buildLossEmbed`, `buildWinEmbed`, `sendMessage` ou `saveState` — apenas busca a partida, computa `statsAfter` e emite o evento.
4. **Em producao**, apos uma derrota com streak <= -3, o canal do Discord exibe o embed de shame seguido da mensagem de tilt na mesma conversa.
5. **Em producao**, uma derrota com streak = -2 nao gera mensagem de tilt.
6. **CI verde**: `lint → test → build` passando sem warnings.
