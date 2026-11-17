# setup

As preferências pessoais de quem usa o crow. O plugin traz as do Caique como
padrão; cada usuário confirma ou troca as suas.

**Enquanto ela não termina, `/crow` mostra só a `setup`.** As outras seis
skills ficam guardadas e nada consegue chamá-las.

## Quando ela roda

Sozinha, antes do primeiro pedido da sessão, em dois casos:

- **primeira vez** — ainda não existe `~/.claude/crow/preferences.md`;
- **preferência nova** — uma atualização trouxe ao catálogo uma preferência
  que você ainda não respondeu. Só ela é perguntada.

Uma atualização sem preferência nova não pergunta nada: as skills são
liberadas sozinhas.

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
4. com preferência nova, pergunta só ela, oferecendo o padrão primeiro.

No fim, ela libera as outras skills e pede um `/reload-plugins`, para elas
aparecerem no `/crow` na hora; sem ele, aparecem na sessão seguinte.

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
| Repositório privado de skills | nenhum | generate-test-steps, generate-flows, create-test-users |
| Registro de uso | sim | hooks do plugin ([usage-log.md](usage-log.md)) |
| Pedir avaliação | sim, nas skills de entrega | analyst, develop, build, security-validation, generate-test-steps, generate-flows |

O catálogo completo, com a pergunta de cada uma, está em
[skills/setup/references/preferences.md](../skills/setup/references/preferences.md).

## Cofre e repositório privado

Além das preferências, a `setup` prepara o que os testes de tela precisam:

- **o cofre:** você escolhe uma pergunta de segurança e a resposta (a sua, não
  uma compartilhada; maiúsculas e minúsculas contam). O crow cria uma app key
  nesta máquina e guarda uma cópia dela embrulhada pela resposta. A resposta
  nunca é gravada. Perdeu a chave: a `setup` pergunta de novo e recupera.
  Esqueceu a resposta: só com o seu sim, ela recomeça com uma chave nova e
  guarda os dados antigos num backup;
- **o repositório privado:** com uma URL na preferência, ela clona com as suas
  credenciais do git, criptografa tudo em `~/.claude/crow/private/` e apaga o
  clone. Sem acesso, só cria as pastas dos seus fluxos e catálogos.

O crow continua travado até o cofre existir. Detalhes:
[screen-tests.md](screen-tests.md).

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

- **A trava:** o plugin instalado traz só a `setup` em `skills/`; as outras
  skills ficam em `locked-skills/`, que o Claude Code não lê. Esconder pelas
  configurações (`skillOverrides`) não serve: o Claude Code ignora esse ajuste
  em skills de plugin.
- As respostas ficam em `~/.claude/crow/preferences.md`, fora da pasta do
  plugin, para que uma atualização não as apague.
- A `conventions` tem a tabela entre `<!-- crow:preferences:start -->` e
  `<!-- crow:preferences:end -->`. Onde uma seção dela afirma um desses
  valores, vale a tabela.
- Um hook `SessionStart` ([hooks/session-start.sh](../hooks/session-start.sh))
  roda a cada sessão e compara as respostas com o catálogo da `setup`. Faltando
  alguma, pede ao Claude que rode a `setup` antes do primeiro pedido, dizendo
  quais faltam. Com tudo respondido, copia as skills de `locked-skills/` para
  `skills/` (se ainda não estiverem lá) e reescreve a tabela da `conventions`.
- Cada atualização instala uma pasta nova do plugin, só com a `setup` em
  `skills/`. Se nada faltar, o hook libera as skills de novo sozinho.
- Cada skill guardada começa com uma trava: sem as respostas completas, ela
  manda para a `setup` antes de agir.
- As outras skills dizem que os valores pessoais escritos nelas são só o
  padrão, e que vale a tabela.

## Limitações

- Só no Claude Code. O crow do Codex não tem a `setup` nem o hook.
- O Claude Code lê as skills ao abrir a sessão. Liberadas no meio dela, só
  aparecem depois de um `/reload-plugins` ou na sessão seguinte.
- Num clone, as cópias liberadas em `skills/` ficam fora do git pelo
  `.gitignore`.
- O hook é bash. No Windows ele roda pelo Git Bash que o Claude Code usa; os
  scripts `.sh` são fixados em LF pelo `.gitattributes`.
- Uma preferência muda o que as skills dizem, não o que elas conseguem: um
  push liberado nas preferências continua sujeito às permissões do Claude Code.
