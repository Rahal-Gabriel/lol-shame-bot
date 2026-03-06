# Lacunas de cobertura — src/players/stats.ts

Auditado em 2026-03-06. Cobertura de linhas/branches: 100%.
Mas os seguintes comportamentos observaveis NAO possuem teste dedicado:

## formatStats — texto exato e estrutura

1. **Texto literal de win streak nao verificado**
   - O teste `shows win streak` verifica apenas `.toContain('3')` (numero)
   - Nunca verifica o emoji ou o texto "vitoria(s) seguida(s)"
   - Exemplo ausente: `expect(result).toContain('vitória(s) seguida(s)')`

2. **Texto literal de loss streak nao verificado**
   - O teste `shows loss streak` verifica apenas `.toContain('4')` (numero absoluto)
   - Nunca verifica o emoji ou o texto "derrota(s) seguida(s)"

3. **Texto de streak zero nao verificado**
   - `emptyStats()` tem streak = 0 → deve retornar 'Nenhuma sequência ainda'
   - Nenhum teste verifica essa string exata
   - O teste `shows 0% winrate when no matches played` verifica o WR mas nao o texto do streak

4. **Formato completo do output nao verificado**
   - Nunca se verifica que wins e losses aparecem com os sufixos V e D
   - Ex: `expect(result).toMatch(/5V\s*5D/)` — nao existe

## updateStats — casos numericos extremos

5. **Streak alto acumulado (ex: 10 vitorias seguidas)**
   - Apenas 3 iteracoes sao testadas. O comportamento com numeros maiores nao e verificado.
   - Nao e um bug conhecido, mas e uma lacuna de confianca.

6. **Acumulacao de wins/losses com numeros grandes**
   - Nenhum teste verifica o comportamento com stats pre-existentes grandes
   - Ex: `updateStats({ wins: 100, losses: 50, streak: 5 }, true)` → wins deve ser 101

## Severidade das lacunas

| Lacuna | Severidade | Motivo |
|--------|-----------|--------|
| Texto literal do streak zero | Medio | Regressao silenciosa se string mudar |
| Texto literal de win/loss streak | Baixo | Numero e verificado, mas texto nao |
| Formato V/D no output | Baixo | Nao ha teste de regressao para mudanca de formato |
| Numeros grandes | Baixo | Matematica pura, improvavel de quebrar |
