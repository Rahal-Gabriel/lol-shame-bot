# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# lol-shame-bot — CLAUDE.md

## Desafio 7 Dias: Do Zero à Produção com IA + XP

### Regras que valem para os 7 dias inteiros
- CI roda em CADA commit — não é opcional
- Teste antes do código — sempre, sem exceção
- Se a IA escrever código de produção antes do teste, recuse
- Cada commit é production-ready
- Se um arquivo passar de 300 linhas, refatore antes de continuar
- Documente cada aprendizado aqui no CLAUDE.md no momento que acontece
- O humano decide o QUÊ — a IA decide o COMO

---

### Dia 1 — IA Jail: Governança e CI
**Objetivo:** Nenhuma feature. Apenas a fundação.
- Repositório criado
- Ambiente isolado (container ou .nvmrc fixando versão do Node)
- CI configurado: ESLint + testes (mesmo vazios) rodando em cada push
- CLAUDE.md criado
- **Critério de saída:** CI verde no commit #1

### Dia 2 — Arquitetura e Primeira Feature com TDD
**Objetivo:** Definir a arquitetura e implementar o core com teste-primeiro.
- Serviços principais definidos e documentados aqui
- Primeira feature implementada: teste → código → CI verde
- **Critério de saída:** CLAUDE.md com arquitetura, 1 feature com TDD

### Dia 3 — Features com TDD Contínuo
**Objetivo:** Empilhar features mantendo a disciplina.
- Cada commit: teste → código → CI verde
- Sem código duplicado, sem arquivo acima de 300 linhas
- **Critério de saída:** Checklist de cada commit respeitado

### Dia 4 — Features + Revisão de Saúde
**Objetivo:** Continuar features e fazer checkpoint do projeto.
- Relatório de cobertura de testes revisado
- Arquivos maiores identificados e divididos se necessário
- CLAUDE.md atualizado com o estado real
- **Critério de saída:** Checklist de saúde do projeto feito

### Dia 5 — Interface de Saída (Bot Discord)
**Objetivo:** Conectar o core ao Discord.
- Comandos do bot implementados com testes de integração
- Validação de input na borda
- Tratamento explícito de erros
- **Critério de saída:** Bot respondendo no servidor de teste

### Dia 6 — Hardening: Segurança e Refactoring
**Objetivo:** Transformar o que funciona no que sobrevive a usuários reais.
- Zero warnings de linter e segurança
- Jobs de polling com retry e timeout
- Refactoring final — sem dívida técnica acumulada
- **Critério de saída:** Zero warnings, cobertura revisada

### Dia 7 — Deploy em Produção
**Objetivo:** Sistema acessível por um usuário real.
- Suite completa de testes passando
- Deploy executado
- Smoke test em produção feito
- **Critério de saída:** Bot rodando em produção, primeiro uso real documentado

## Overview

A Discord bot that integrates with the Riot Games API to post shame messages about League of Legends players in a Discord channel.

## Development

```bash
npm install          # instala deps e gera package-lock.json
npm run dev          # ts-node src/index.ts (requer .env)
npm run build        # compila para dist/
npm run test         # vitest run (uma vez)
npm run test:watch   # vitest em modo watch
npm run lint         # eslint src/

# Um único teste por nome:
npx vitest run --reporter=verbose -t "nome do teste"

# Docker
docker compose up --build
```

Copy `.env.example` to `.env`:
- `RIOT_API_KEY` — from https://developer.riotgames.com
- `DISCORD_TOKEN` — Discord bot token
- `DISCORD_CHANNEL_ID` — channel to post messages in

## Architecture

**Stack:** Node 20 · TypeScript (CommonJS) · discord.js v14 · axios · vitest

**Entry point:** `src/index.ts` — valida env vars e inicializa o bot.

**`src/config.ts`** — `requireEnv(key)`: única função utilitária para leitura de variáveis obrigatórias de ambiente. Testável de forma isolada.

**`tests/`** — testes vitest, fora do `rootDir` do TypeScript (processados pelo esbuild do vitest, não pelo tsc).

**CI:** `.github/workflows/ci.yml` roda `npm ci → lint → test` em cada push/PR.

### Módulos

**`src/config.ts`** — `requireEnv(key)`: leitura de variáveis obrigatórias de ambiente.

**`src/riot.ts`** — cliente da Riot API (região Americas/BR1):
- `getAccountByRiotId(gameName, tagLine)` → `{ puuid }`
- `getLastRankedMatchId(puuid)` → `string | null` (queue 420 = Ranked Solo/Duo)
- `getMatchResult(matchId, puuid)` → `MatchResult`

**`src/shame.ts`** — lógica pura de detecção:
- `isRankedDefeat(match: MatchResult)` → `boolean` (queue 420 + `won === false`)

**`tests/`** — vitest com axios mockado via `vi.mock('axios')` + `vi.mocked(axios.get)`.
