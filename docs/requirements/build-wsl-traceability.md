# Rastreabilidade — build no WSL e correção de lentidão

> Fase: MVP (1.1.0). Branch `cm-build-wsl-mvp`. Documento:
> [build-wsl.md](build-wsl.md). Atualizado em 2026-10-20 por
> claude-code-opus-5.5.

| RF | Regras | Arquivos | Testes | Commit | Estado |
| --- | --- | --- | --- | --- | --- |
| RF-01 Detectar o Windows e o estado do WSL | RN-01, RN-02 | `skills/build/SKILL.md` (passo 2), `skills/build/references/wsl.md` | eval `wsl-not-ready-asks-step-by-step` | `d725a28` | implemented |
| RF-02 Migrar o projeto do NTFS | RN-01, RN-03, RN-09 | `skills/build/SKILL.md` (passo 2), `skills/build/references/wsl.md`, `skills/build/references/stacks.md` | evals `windows-project-on-ntfs-moves-to-wsl`, `uncommitted-work-stops-the-move` | `d725a28` | implemented |
| RF-03 Medir e diagnosticar a lentidão | RN-04, RN-05, RN-08 | `skills/build/SKILL.md` (passos 6 e 8), `skills/build/references/slowness.md` | eval `slow-url-is-diagnosed` | `54d7726` | implemented |
| RF-04 Restart e recuperação do Docker Desktop | RN-06, RN-07 | `skills/build/SKILL.md` (Never), `skills/build/references/docker-desktop.md` | evals `restart-lists-what-stops`, `docker-desktop-never-reset` | `f33a0c3` | implemented |
| RF-05 Isolar instâncias | RN-10 | `skills/build/SKILL.md` (passo 4), `skills/build/templates/php-laravel/env.example`, `skills/build/references/stacks.md` | — (sem eval próprio) | `d748221` | implemented |
| RF-06 Laravel: permissões, views e Node | RN-11, RN-12 | `skills/build/SKILL.md` (passo 5), `skills/build/references/stacks.md` | — (sem eval próprio) | `da7fc07` | implemented |
| RF-07 Documentação, evals e versão | — | `evals/build/evals.json`, `docs/build.md`, `docs/testing.md`, `VERSION`, `.claude-plugin/plugin.json` | `npm test` 10/10; `package-skill.sh` passou nas validações (o `zip` não existe nesta máquina) | `b2d67db`, `9c3a88f`, `bd85a74` | implemented |

## Verificado e não verificado

- **Verificado:** `npm test` 10/10, as validações do `package-skill.sh` (nome
  da pasta = `name:`, bloco de regras inegociáveis, versão = `VERSION`) e o
  JSON dos evals.
- **Não verificado:** nenhum cenário foi executado por um agente, e a skill
  ainda não rodou num projeto real. O aceite (seção 14 do documento) é um
  `/crow:build` dele num projeto Laravel no Windows.
- **Lacuna:** RF-05 e RF-06 não têm eval próprio. Fica a sugestão de
  acrescentar um eval para cada.

## Decisão tomada durante a fase

- 2026-10-20: na migração, trabalho não commitado faz a skill listar os
  arquivos e parar (RN-03). Registrado no documento.
