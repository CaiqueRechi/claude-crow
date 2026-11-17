# setup

As preferências pessoais de quem usa o crow. O plugin traz as do Caique como
padrão; cada usuário confirma ou troca as suas.

## Quando ela roda

Sozinha, antes do primeiro pedido da sessão, em dois casos:

- **primeira vez** — ainda não existe `~/.claude/crow/preferences.md`;
- **depois de uma atualização** — as respostas foram dadas numa versão do crow
  diferente da instalada.

E sempre que você chamar:

```
/crow:setup
/crow:setup show
```

`show` só mostra a tabela atual.

## Como ela pergunta

No ritmo da `analyst`, uma pergunta por mensagem, sem nunca pedir tudo de uma
vez:

1. mostra a tabela (os padrões na primeira vez, as suas respostas depois) e
   pergunta se mantém ou ajusta;
2. se ajustar, pergunta quais grupos: **Identidade e idiomas**, **Git**,
   **Código**, **Ambiente e ritmo**;
3. pergunta cada preferência dos grupos escolhidos, oferecendo o valor atual
   primeiro;
4. depois de uma atualização, pergunta à parte o que for novo na versão.

## O que é preferência

| Preferência | Padrão | Onde vale |
| --- | --- | --- |
| Nome | Caique | todas as skills |
| Idioma da conversa | o mesmo em que você escrever | todas |
| Idioma dos documentos | português | context, analyst, develop, security-validation |
| Idioma de commits e comentários | inglês | conventions |
| Prefixo de branch | `cm-` + título curto | conventions, develop, build |
| Branch base | `main` | conventions, develop, build |
| Push | nunca; o agente para no commit | conventions, develop, build |
| Reescrever commits | nunca sem você pedir | conventions |
| Testes no commit | junto no desenvolvimento, à parte na alteração não trivial | conventions |
| Documentação no commit | sempre num `docs:` próprio, por último | conventions |
| Prefixos de commit | os nove convencionais, sem escopo | conventions |
| Nomes no código | `camelCase` / `PascalCase` | conventions |
| Nomes no banco | `snake_case` | conventions |
| Ambiente no Windows | WSL, `Ubuntu-24.04` | build |
| Pasta dos projetos no WSL | `~/projects/<pasta>` | build |
| Limite de lentidão da build | mediana acima de 1 s | build |
| Ritmo da analyst | uma pergunta por mensagem | analyst |

O catálogo completo, com a pergunta de cada uma, está em
[skills/setup/references/preferences.md](../skills/setup/references/preferences.md).

## O que não é preferência

Fica igual para todo usuário, porque protege o trabalho em vez de expressar um
gosto:

- as **regras inegociáveis**: sem coautoria, subagente só quando pedido, nunca
  recomeçar do zero, perguntar antes de mudança grande;
- a **política de instalação** comum à `develop` e à `build`;
- os **arquivos de contexto fora do git**;
- as **boas práticas** da `conventions`: Clean Code e SOLID, checagem de
  segurança, cache com invalidação, tudo testado e visto passando, um commit
  por mudança em ordem de dependência, hooks nunca pulados, migrations
  reversíveis, discordar antes de construir.

## Como funciona por dentro

- As respostas ficam em `~/.claude/crow/preferences.md`, fora da pasta do
  plugin, para que uma atualização não as apague. O arquivo guarda a versão do
  crow em que foram dadas.
- A `conventions` tem a tabela entre `<!-- crow:preferences:start -->` e
  `<!-- crow:preferences:end -->`. Onde uma seção dela afirma um desses
  valores, vale a tabela.
- Um hook `SessionStart` ([hooks/session-start.sh](../hooks/session-start.sh))
  roda a cada sessão. Com as respostas em dia, reescreve a tabela da
  `conventions` instalada e não diz nada. Sem respostas, ou com a versão
  diferente, pede ao Claude que rode a `setup` antes do primeiro pedido.
- As outras skills dizem que os valores pessoais escritos nelas são só o
  padrão, e que vale a tabela.

## Limitações

- Só no Claude Code. O crow do Codex não tem a `setup` nem o hook.
- O hook é bash. No Windows ele roda pelo Git Bash que o Claude Code usa; os
  scripts `.sh` são fixados em LF pelo `.gitattributes`.
- Uma preferência muda o que as skills dizem, não o que elas conseguem: um
  push liberado nas preferências continua sujeito às permissões do Claude Code.
