# Product Owner — Memoria Persistente

## Features especificadas

### FEATURE-0001: Event-Driven Match Processing
- **Arquivo:** `.claude/plans/FEATURE-0001-event-driven-match.md`
- **Status:** Pronto para Dev
- **Decisao chave:** `processMatchJob` pre-computa `statsAfter` antes de emitir o evento, para que o streakHandler receba stats ja atualizadas sem depender da ordem de execucao dos handlers.
- **Threshold de tilt:** streak <= -3 (hardcoded nesta entrega).
- **Mensagens de tilt:** array `TILT_MESSAGES` em `src/watcher/shame.ts`, funcao `buildTiltMessage`.
- **Novos arquivos esperados:** `src/infra/eventBus.ts`, `src/queue/statsHandler.ts`, `src/queue/discordHandler.ts`, `src/queue/streakHandler.ts`.

## Comportamentos confirmados pelo usuario

- Stats sem backfill historico: contagem comeca a partir do inicio do monitoramento.
- Zoeira e o tom: mensagens de derrota sao de zoeira amigavel, nao agressivas.
- Vitoria tambem e notificada: embeds cinza (#808080) de parabens.
- Streak positivo especial (ex: 3 vitorias seguidas) NAO entra no escopo do FEATURE-0001.

## Backlog nao priorizado

- Mensagens personalizadas por jogador (apelidos, frases customizadas)
- Ranking semanal/mensal do servidor
- Notificacao quando jogador comeca uma partida (nao apenas termina)
- Suporte a outras regioes alem de BR1/Americas
- Configuracao por servidor Discord (multi-server)
- Threshold configuravel de tilt por servidor
- Handler de streak positivo (mensagem especial ao ganhar 3 seguidas)

## Convencoes do projeto que impactam specs

- Arquivos acima de 300 linhas devem ser refatorados antes de continuar.
- TDD obrigatorio: teste antes do codigo de producao.
- Handlers devem ser testaveis de forma isolada com dependencias injetadas.
- Logs de erro usam `log('error', ...)` do `src/logger.ts`.
- EventBus interno usa Node.js EventEmitter nativo (nao Redis Pub/Sub).
