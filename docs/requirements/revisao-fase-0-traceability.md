# Rastreabilidade — Revisão do claude-crow, Fase 0

> Fase: MVP (1.2.0). Branch `cm-revisao-fase-0-mvp`. Documento:
> [revisao-fase-0.md](revisao-fase-0.md). Atualizado em 2026-10-20 por
> claude-code-opus-5.5, com revisão final do Codex.

| RF | Regras | Arquivos | Testes | Commit | Estado |
| --- | --- | --- | --- | --- | --- |
| RF-01 Identidade claude-crow | RN-01, RN-02 | `.claude-plugin/marketplace.json`, `.claude-plugin/plugin.json`, `package.json`, `package-lock.json`, `README.md` | teste do nome antigo; instalação limpa | `9fb688b`, `7a20432`, `8654f6f` | implemented |
| RF-02 Seção de migração | RN-03 | `README.md` | teste do nome antigo (aceita a seção) | `7a20432` | implemented |
| RF-03 Teste contra o nome antigo | RN-02 | `tests/plugin.test.mjs` | ele mesmo; falhou de propósito com `crow@rm-skill-claude` no README | `92c7ca7` | implemented |
| RF-04 Política de instalação idêntica | RN-04 | `.github/installation-policy.md`, `skills/develop/SKILL.md`, `skills/build/SKILL.md` | teste da política | `5e00b54` | implemented |
| RF-05 Conferência do bloco | RN-05 | `tests/plugin.test.mjs`, `.github/scripts/package-skill.sh` | ele mesmo; falhou de propósito com uma frase alterada só na `build`; política presente no pacote preparado | `2e3458c`, `17b676c` | implemented |
| RF-06 Teste de referências renomeado | RN-06 | `tests/security-rules.test.mjs` | `npm test` mostra o nome novo passando | `31bfba2` | implemented |
| RF-07 Versão, documentação e origin | RN-01, RN-04 | `VERSION`, `.claude-plugin/plugin.json`, `docs/develop.md`, `docs/build.md`, `docs/testing.md`; `origin` local | `npm test` 12/12; validações do `package-skill.sh` | `d38cb7b`, `7b34154` | implemented |

## Verificado e não verificado

- **Verificado:** `npm test` 12/12. Os dois testes novos foram vistos falhando
  num erro plantado. As validações do `package-skill.sh` passaram (o ZIP não
  foi gerado: falta `zip` nesta máquina), e a árvore preparada contém
  `.github/installation-policy.md`. Instalação limpa em
  `CLAUDE_CONFIG_DIR` isolado, a partir do clone: marketplace `claude-crow`,
  `crow@claude-crow` 1.2.0 habilitado, seis skills.
- **Não verificado:** `marketplace add CaiqueRechi/claude-crow` pelo GitHub
  (depende do merge); a migração de uma instalação existente (a sua ainda usa
  `rm-skill-claude`); um `up` real com a política nova.

## Interpretação registrada

- Os arquivos de ambiente que a `build` cria a partir do próprio template, no
  mesmo `up`, contam como declarados: as imagens deles entram na lista do ok
  único. Isso segue o exemplo de RN-04 (um `up` Laravel listando `mysql:8.4`,
  `php:8.3-apache`, `composer:2`), e o bloco da política diz isso
  explicitamente.
- A ordem dos commits do RF-01: o README (`docs:`) veio antes do teste contra
  o nome antigo (`test:`), porque o teste falharia sem ele. A dependência
  venceu a regra "documentação por último".
