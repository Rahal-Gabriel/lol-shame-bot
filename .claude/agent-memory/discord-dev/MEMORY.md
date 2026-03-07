# Discord Dev — Memoria Persistente

## Slash commands registrados (src/index.ts)
- `/add-player nome:Nome#Tag` — reply imediato
- `/remove-player nome:Nome#Tag` — reply imediato
- `/list-players` — reply imediato
- `/stats nome:Nome#Tag` — reply imediato
- `/check-now nome:Nome#Tag` — deferReply + followUp (faz I/O)
- `/history nome:Nome#Tag` — deferReply + editReply (faz I/O com Riot API)

## Padrão de handler com I/O (deferReply)
- `/check-now` usa `deferReply` + `followUp`
- `/history` usa `deferReply` + `editReply` (padrao correto para comandos que retornam embed)
- Nunca expor stack trace para o usuario — catch generico com mensagem amigavel

## Embeds existentes (src/discord/embed.ts)
- `buildLossEmbed(gameName, match)` — cor #ff0000 (vermelho)
- `buildWinEmbed(gameName, match)` — cor #808080 (cinza)
- `buildHistoryEmbed(gameName, tagLine, matches[])` — cor #0099ff (azul)
  - Campos: "N. Champion" | "Win/Loss | KDA | duracao"
  - Formato win: "🟢 Win", formato loss: "🔴 Loss"

## Funcoes Riot API usadas nos handlers
- `getAccountByRiotId(gameName, tagLine)` → `{ puuid }`
- `getLastNRankedMatchIds(puuid, count)` → `string[]`
- `getMatchResult(matchId, puuid)` → `MatchResult`

## Parse do parametro Nome#Tag
```typescript
function parseNomeTag(input: string): { gameName: string; tagLine: string } | null {
  const [gameName, tagLine] = input.split('#');
  if (!gameName || !tagLine) return null;
  return { gameName, tagLine };
}
```

## Estado do projeto
- 146 testes passando, 0 warnings, build limpo
- index.ts: 244 linhas (limite: 300)
- Testes de buildHistoryEmbed ja existem em tests/discord/embed.test.ts

## Links para arquivos principais
- `/Users/gabrielarcenio/lol-shame-bot/src/index.ts`
- `/Users/gabrielarcenio/lol-shame-bot/src/discord/embed.ts`
- `/Users/gabrielarcenio/lol-shame-bot/src/discord/commands.ts`
- `/Users/gabrielarcenio/lol-shame-bot/src/discord/client.ts`
- `/Users/gabrielarcenio/lol-shame-bot/tests/discord/embed.test.ts`
