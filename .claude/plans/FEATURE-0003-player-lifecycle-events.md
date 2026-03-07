# FEATURE-0003: Player Lifecycle Events

**Status**: Pronto para Dev
**Prioridade**: Media
**Valor**: Extensibilidade — habilita handlers futuros (notificacoes, auditoria, ranking) sem tocar em commands.ts ou index.ts. Tambem entrega rastreabilidade operacional imediata via logs JSON no Railway.

---

## O que o bot faz hoje

Quando um admin executa `/add-player` ou `/remove-player`:
1. `index.ts` chama `addPlayer` / `removePlayer` de `commands.ts` — funcoes puras que retornam a nova lista
2. `index.ts` persiste a lista chamando `savePlayers(players)`
3. `index.ts` responde ao slash command com mensagem efemera para o admin
4. **Nenhum evento e emitido.** Nenhum outro modulo fica sabendo que a lista mudou.

O `eventBus` em `src/infra/eventBus.ts` so conhece `match:finished`. Qualquer reacao ao ciclo de vida de jogadores (log, embed, webhook futuro) precisaria modificar `index.ts` diretamente — acoplamento crescente.

---

## O problema ou oportunidade

A lista de jogadores monitorados muda durante a vida do bot. Hoje nao ha rastro observavel (nos logs nem no Discord) de quando um jogador entra ou sai. Alem disso, qualquer comportamento novo disparado por essa mudanca exige alterar `index.ts`, o entry point mais critico e menos testavel do sistema.

Adicionar `player:added` e `player:removed` ao `BotEventMap` resolve as duas coisas:
- Qualquer handler reage ao evento sem tocar em `index.ts`
- A emissao do evento serve como log de auditoria de ciclo de vida

---

## Comportamento esperado (cenas)

**Cena 1 — Jogador adicionado**
Admin executa `/add-player nome:Faker#T1` em um servidor Discord. O bot responde com a confirmacao efemera para o admin (comportamento atual, sem mudanca). Nos logs do Railway aparece uma linha JSON:
```json
{ "level": "info", "message": "player:added", "gameName": "Faker", "tagLine": "T1" }
```

**Cena 2 — Jogador duplicado (idempotente)**
Admin executa `/add-player` com um jogador que ja existe na lista. O bot responde que o jogador ja esta sendo monitorado (comportamento atual). **Nenhum evento `player:added` e emitido** — o evento so dispara quando a lista realmente muda.

**Cena 3 — Jogador removido**
Admin executa `/remove-player nome:Faker#T1`. O bot confirma remocao. Nos logs aparece:
```json
{ "level": "info", "message": "player:removed", "gameName": "Faker", "tagLine": "T1" }
```

**Cena 4 — Remocao de jogador inexistente**
Admin tenta remover alguem que nao esta na lista. O bot informa que o jogador nao foi encontrado (comportamento atual). **Nenhum evento `player:removed` e emitido.**

---

## User Stories

- Como desenvolvedor do bot, quero que adicao e remocao de jogadores emitam eventos tipados no eventBus, para que eu possa adicionar handlers futuros sem modificar o entry point.
- Como operador do bot no Railway, quero ver logs JSON quando jogadores sao adicionados ou removidos, para rastrear mudancas na lista de monitorados sem precisar consultar o Redis.

---

## Criterios de Aceite

### Infraestrutura (eventBus.ts)
- [ ] `BotEventMap` contem `'player:added': [event: PlayerChangedEvent]`
- [ ] `BotEventMap` contem `'player:removed': [event: PlayerChangedEvent]`
- [ ] `PlayerChangedEvent` exporta `{ gameName: string; tagLine: string }`
- [ ] `TypedEventEmitter` aceita os novos eventos sem erro de TypeScript

### Handler de log (playerLifecycleHandler.ts)
- [ ] `playerLifecycleHandler` recebe `event: PlayerChangedEvent` e `eventName: 'player:added' | 'player:removed'`
- [ ] Chama `log('info', eventName, { gameName, tagLine })` para cada evento recebido
- [ ] Handler e testavel de forma isolada: aceita `log` como dependencia injetada (sem import direto do modulo logger)
- [ ] Nao lanca excecao — erros internos sao capturados e logados como `'error'`

### Emissao (index.ts)
- [ ] Apos `addPlayer` retornar lista maior que a original, `eventBus.emit('player:added', { gameName, tagLine })` e chamado
- [ ] Apos `removePlayer` retornar lista menor que a original, `eventBus.emit('player:removed', { gameName, tagLine })` e chamado
- [ ] Se a lista nao mudar de tamanho (duplicado / nao encontrado), nenhum evento e emitido
- [ ] `playerLifecycleHandler` e registrado no `eventBus` na inicializacao do bot

### Comportamento observavel nos logs
- [ ] Log de adicao contem `gameName` e `tagLine` corretos
- [ ] Log de remocao contem `gameName` e `tagLine` corretos
- [ ] Nenhum log e emitido quando a lista nao muda

---

## Fora do Escopo desta Entrega

- Embed publico no canal do Discord anunciando adicao/remocao de jogador
- Notificacao de DM para o jogador adicionado
- Persistencia do historico de mudancas (quem adicionou, quando)
- Evento `player:updated` para mudanca de dados de um jogador existente
- Multi-server: eventos nao carregam `guildId` nesta entrega

---

## Impacto em modulos existentes

| Arquivo | Tipo de mudanca |
|---------|----------------|
| `src/infra/eventBus.ts` | Adicionar `PlayerChangedEvent` e os dois novos entries em `BotEventMap` |
| `src/handlers/playerLifecycleHandler.ts` | **Arquivo novo** — handler de log para `player:added` e `player:removed` |
| `src/index.ts` | Emitir eventos apos `addPlayer`/`removePlayer`; registrar `playerLifecycleHandler` |
| `tests/handlers/playerLifecycleHandler.test.ts` | **Arquivo novo** — testes unitarios do handler |
| `tests/infra/eventBus.test.ts` | Adicionar casos para os novos tipos de evento |

---

## Notas de implementacao para o Tech Lead

**Deteccao de mudanca na lista (sem retorno booleano de commands.ts):**
`addPlayer` e `removePlayer` em `commands.ts` sao funcoes puras que retornam a nova lista. A forma mais simples de detectar mudanca e comparar o tamanho da lista antes e depois, sem alterar a assinatura dessas funcoes:
```typescript
const before = players.length;
players = addPlayer(players, { gameName, tagLine });
if (players.length > before) {
  eventBus.emit('player:added', { gameName, tagLine });
}
```
Isso preserva a pureza de `commands.ts` e nao quebra nenhum teste existente.

**Assinatura do handler:**
Por consistencia com `streakHandler` e `discordHandler`, o handler deve receber dependencias injetadas:
```typescript
export interface PlayerLifecycleHandlerDeps {
  log: (level: string, message: string, meta?: object) => void;
}

export async function playerLifecycleHandler(
  eventName: 'player:added' | 'player:removed',
  event: PlayerChangedEvent,
  deps: PlayerLifecycleHandlerDeps
): Promise<void>
```

**Registro no eventBus (index.ts):**
```typescript
eventBus.on('player:added',   (e) => playerLifecycleHandler('player:added',   e, { log }));
eventBus.on('player:removed', (e) => playerLifecycleHandler('player:removed', e, { log }));
```
