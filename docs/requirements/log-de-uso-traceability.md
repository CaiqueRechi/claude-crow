# Rastreabilidade — registro de uso (1.4.0)

> Branch `cm-1.4.0`. Documento: [log-de-uso.md](log-de-uso.md). Atualizado em
> 2026-11-17 por claude-code-opus-5.5.

| Requisito | Arquivos | Testes | Commit | Estado |
| --- | --- | --- | --- | --- |
| RF-01 hook que abre a execução | `hooks/hooks.json`, `lib/usage-log.mjs` | `usage-log.test.mjs` (abre, ignora `conventions`, entrada inválida) | `9146721`, `88c475a` | partial — o hook não foi visto rodando numa sessão real |
| RF-02 script que fecha e grava | `lib/usage-log.mjs` | `usage-log.test.mjs` (tokens por `message.id`, tempo ativo, linha anônima) | `9146721`, `6fcf269` | implemented |
| RF-03 fim de sessão grava interrompida | `hooks/hooks.json`, `lib/usage-log.mjs` | `usage-log.test.mjs` | `9146721`, `88c475a` | implemented |
| RF-04 passo final nas skills | as nove skills | `usage-log.test.mjs` (`status`) | `9b7d853` | partial — texto de skill, não exercido |
| RF-05 duas preferências | `skills/setup/references/preferences.md`, `locked-skills/conventions/SKILL.md` | `preferences.test.mjs` (tabela igual ao catálogo) | `1554076` | implemented |

## Verificado e não verificado

- **Verificado:** `npm test` 52/52; o resumo calculado sobre o registro real
  desta sessão.
- **Não verificado:** uma execução real de ponta a ponta numa sessão nova.
