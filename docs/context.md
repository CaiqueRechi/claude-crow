# context

Prepara um projeto para que o trabalho sobreviva ao fim de uma sessão: quando
os tokens acabam, dá para continuar com outro modelo, outra ferramenta (Codex,
Cursor, Gemini, Copilot) ou num chat novo, exatamente de onde parou — e os
agentes conseguem deixar recado uns para os outros.

É a **primeira coisa a rodar** num projeto, antes da `analyst` e da
`security-validation`. As duas avisam quando os arquivos de contexto não
existem.

## Comandos

Só rodam quando chamados. Nada é carregado nem salvo sozinho.

| Comando | Quando usar | O que faz |
| --- | --- | --- |
| `/crow:context` ou `/crow:context prepare` | ao começar num projeto | lê o projeto e cria **só os arquivos que faltam** |
| `/crow:context save` | antes dos tokens acabarem, antes de trocar de modelo ou ferramenta, ao encerrar | registra onde parou e a próxima ação |
| `/crow:context resume` | ao abrir um chat, modelo ou ferramenta novos | lê tudo, confere com o git e continua |
| `/crow:context message <para> <texto>` | para deixar recado para outro agente | cria uma mensagem em `.context/messages/` |

## Arquivos que ela cria

| Arquivo | Para quê |
| --- | --- |
| `CLAUDE.md` | orienta o Claude: ler o contexto antes de tudo, atualizá-lo antes de parar, as regras |
| `AGENTS.md` | a mesma orientação para o Codex — também lido por Cursor, Copilot e outros |
| `GEMINI.md` | a mesma orientação para o Gemini CLI |
| `CONTEXT.md` | estado atual, objetivos, decisões, restrições, stack, caminhos importantes, como rodar e testar |
| `ARCHITECTURE.md` | a arquitetura técnica em detalhe, com diagramas |
| `TASKS.md` | tarefas pendentes e progresso |
| `.context/CONVENTIONS.md` | cópia das suas convenções, para modelos que não têm este plugin |
| `.context/HANDOFF.md` | onde a última sessão parou, a próxima ação e o estado de uma skill pela metade |
| `.context/sessions/` | um log por sessão, só acrescentado |
| `.context/messages/` | um arquivo por mensagem entre agentes |

Os modelos de cada arquivo estão em
[skills/context/templates/](../skills/context/templates/).

## Cria só o que falta

Antes de escrever, ela confere cada arquivo. O que já existe **nunca é
sobrescrito**: é lido e usado como contexto. Rodar `prepare` duas vezes
seguidas não muda nada na segunda. Se um arquivo existente parece
desatualizado, ela avisa e pergunta — não corrige sozinha.

## Nada vai para o git

Os arquivos ficam fora do git pelo `info/exclude` local do repositório
(`git rev-parse --git-path info/exclude`), que não é versionado. O
`.gitignore` não é tocado, porque ele mesmo é versionado.

Se o projeto **já versiona** algum desses arquivos — um `CLAUDE.md` do time,
por exemplo —, ela não mexe nele e pergunta o que fazer, já que editar poria
contexto no git.

Consequência: o contexto vive só nesta máquina. Outra máquina, ou outra
pessoa, não recebe o handoff por `git pull`.

## Retomar do ponto exato

O `save` escreve no `HANDOFF.md` branch, último commit, arquivos não
commitados, perguntas em aberto, comandos para retomar e **uma próxima ação
concreta**. Quando uma skill está pela metade, o estado dela também vai para
lá — na `analyst`, cada item da checklist com o estado e as respostas dadas,
para a entrevista seguir da próxima pergunta em vez de recomeçar.

O `resume` confere o handoff contra o git antes de agir. Se branch ou commit
mudaram depois do `save`, alguém continuou por fora, e ela diz isso primeiro.

## Agentes conversando

Não existe canal ao vivo entre ferramentas diferentes. O que todas conseguem
ler são os arquivos do projeto, então a conversa é por arquivo:

- cada mensagem é um arquivo `.context/messages/<AAAAMMDD-HHMMSS>-<de>-to-<para>.md`
  com `from`, `to`, `date`, `status: new`;
- `CLAUDE.md`, `AGENTS.md` e `GEMINI.md` mandam todo agente procurar mensagens
  endereçadas a ele ao começar, e marcar `status: read` depois de agir;
- resposta é outra mensagem, com `reply_to:` apontando a original.

Um arquivo por mensagem, nunca um arquivo compartilhado: dois agentes
escrevendo ao mesmo tempo não se sobrescrevem.

Cada agente se identifica por ferramenta + modelo: `claude-code-opus-5.5`,
`codex-gpt-5`, `gemini-cli-2.5-pro`.

## Limitações

- Funciona tão bem quanto o último `save`. Se a sessão acabar sem `save`, o
  próximo agente parte do estado anterior — o git ainda mostra o que mudou,
  mas não o porquê.
- Ferramentas sem este plugin seguem o protocolo porque `AGENTS.md` manda, não
  porque alguém obriga. Um modelo que ignora o arquivo ignora o protocolo.
