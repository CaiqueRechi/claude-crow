# rm-skill-claude

Plugin `rm` do Claude Code: as minhas skills num lugar só. Cada skill vira um
comando com o prefixo do plugin.

**Autor:** Caique Rechi Mehret

| Comando | Skill | Quando roda |
| --- | --- | --- |
| `/rm:convencoes` | as minhas convenções de trabalho | sozinha, sempre que o agente for escrever código, criar branch ou commitar |
| `/rm:analista` | analista de requisitos | só quando eu chamo |

Skill nova entra em `skills/<nome>/SKILL.md` e vira `/rm:<nome>`. O nome da
pasta tem de bater com o `name:` do frontmatter: quando divergem, a skill
simplesmente não carrega e não dá erro nenhum. O pacote de release confere isso.

## convencoes

As decisões que eu já tomei e não quero repetir a cada sessão. Valem para
qualquer projeto meu, e não descrevem sistema nenhum em específico.

| Assunto | Regra |
| --- | --- |
| Commits | um por alteração, em inglês, com prefixo convencional e sem co-autoria |
| Erro já commitado | corrigido em commit novo; reescrever só quando eu pedir |
| Branch | uma por tarefa, a partir da `main`, no padrão `cm-titulo-resumido` |
| Push | meu, sempre — o agente para no commit |
| Testes | tudo testado; no mesmo commit quando é desenvolvimento, separado quando é alteração não-trivial |
| Documentação | sem ela o trabalho não está pronto, e vai sempre num commit `docs:` próprio |
| Comentários | só o necessário, e em inglês |
| Nomes | `camelCase` no código, `PascalCase` em classe, `snake_case` no banco |
| Migration | sempre reversível, e o `down()` rodado |
| Design | Clean Code e SOLID sempre, sem abstração para um caso só |
| Segurança | toda alteração checada contra bot criando registro, XSS e dado sensível exposto |
| Desempenho | cache onde o dado permitir; navegador e servidor escolhidos de propósito |
| Subagentes | só quando eu pedir |
| Discordância | falar antes de fazer, nunca depois |
| Hooks | não se pula, nem com `--no-verify` |

O detalhe e o **porquê** de cada uma estão em
[skills/convencoes/SKILL.md](skills/convencoes/SKILL.md). O porquê é a parte
que importa: sem ele a letra é cumprida e a intenção se perde no primeiro caso
que não estava previsto.

## analista

Faz o levantamento de requisitos de uma solicitação, uma pergunta por vez, até
cobrir 100% de uma checklist de dezesseis áreas — de modelo de negócio a aceite.
No fim escreve a documentação completa da solução em `docs/requisitos/` do
projeto: regras de negócio, requisitos, modelo de dados, arquitetura, fluxos,
riscos e decisões em aberto.

```
/rm:analista sistema de agendamento de entregas
```

Como usar, o que ela pergunta e o que entrega: [docs/analista.md](docs/analista.md).

## Instalação

O repositório é ao mesmo tempo o plugin e um marketplace com ele dentro. Dentro
do Claude Code:

```
/plugin marketplace add CaiqueRechi/rm-skill-claude
/plugin install rm@rm-skill-claude
```

Ou pelo terminal:

```bash
claude plugin marketplace add CaiqueRechi/rm-skill-claude
```

```bash
claude plugin install rm@rm-skill-claude
```

Para usar um clone local em vez do GitHub — útil enquanto uma skill está sendo
escrita — passe o caminho da pasta no lugar de `CaiqueRechi/rm-skill-claude`.
Para testar sem instalar, `claude --plugin-dir <caminho do clone>` carrega o
plugin só naquela sessão.

### Vindo da 1.x

Até a 1.1.0 a skill era clonada direto em `~/.claude/skills/rm-skill-claude`.
Apague essa pasta depois de instalar o plugin: nesse formato ela não carrega
mais, e se for atualizada por `git pull` volta a carregar a versão antiga.

### Instalação por release

As [Releases](https://github.com/CaiqueRechi/rm-skill-claude/releases) oferecem
um ZIP do plugin e o respectivo checksum SHA-256. Baixe os dois arquivos da
versão desejada, valide o checksum, extraia o ZIP onde quiser e adicione a
pasta `rm-skill-claude` extraída como marketplace.

No Linux:

```bash
sha256sum -c rm-skill-claude-v2.0.0.zip.sha256
unzip rm-skill-claude-v2.0.0.zip -d ~/plugins
claude plugin marketplace add ~/plugins/rm-skill-claude
claude plugin install rm@rm-skill-claude
```

No PowerShell, compare o resultado abaixo com o valor presente no arquivo
`.sha256` antes de extrair:

```powershell
Get-FileHash .\rm-skill-claude-v2.0.0.zip -Algorithm SHA256
Expand-Archive .\rm-skill-claude-v2.0.0.zip -DestinationPath "$HOME\plugins"
claude plugin marketplace add "$HOME\plugins\rm-skill-claude"
claude plugin install rm@rm-skill-claude
```

## Releases

A versão a publicar fica em [VERSION](VERSION) e segue versionamento semântico.
O `version` de [.claude-plugin/plugin.json](.claude-plugin/plugin.json) tem de
ser o mesmo — é ele que o Claude Code lê para saber se há atualização — e o
pacote falha se os dois divergirem.

Todo pull request valida a estrutura e a criação do ZIP. Quando uma alteração
entra na `main` com uma versão ainda não publicada, o workflow cria
automaticamente:

- a tag `vX.Y.Z`;
- a Release com notas geradas a partir dos commits;
- o pacote `rm-skill-claude-vX.Y.Z.zip`;
- o checksum `rm-skill-claude-vX.Y.Z.zip.sha256`.

Depois de uma versão publicada, a próxima alteração que deva gerar Release
precisa atualizar `VERSION` e `plugin.json` juntos.

## Verificação

[docs/testing.md](docs/testing.md) registra como cada skill foi testada e o que
ficou de fora. Os cenários de teste da `analista` estão em
[evals/analista/evals.json](evals/analista/evals.json).

## O que entra aqui

Skill minha, para uso em qualquer projeto. Nas convenções, só preferência dita
por mim.

Regra deduzida da leitura de um código é palpite, e palpite aqui se propaga para
todo projeto que eu abrir. Detalhe de uma base específica não é assunto deste
plugin — é do `CLAUDE.md` ou do `AGENTS.md` daquele repositório.
