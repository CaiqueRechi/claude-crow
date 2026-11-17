# Registro de uso

Cada vez que você chama uma skill do crow, uma linha vai para
`~/.claude/crow/logs/uso.jsonl`, na sua máquina: quanto custou, quanto demorou
e, nas skills de entrega, a nota que você deu. O arquivo não sai daí sozinho.
Quando o autor do crow pedir, você o envia.

## O que vai em cada linha

| Campo | O que é |
| --- | --- |
| `skill` | a skill chamada, ex.: `analyst` |
| `crow_version` | a versão do crow |
| `started_at`, `ended_at` | início e fim, em UTC |
| `duration_s` | tempo total, no relógio |
| `active_s` | só o tempo em que o Claude trabalhou, sem a sua espera para responder |
| `turns` | mensagens suas durante a execução |
| `tool_calls` | ferramentas que o Claude usou |
| `tokens` | `input`, `cache_creation`, `cache_read`, `output` e `thinking` |
| `models` | os modelos que responderam |
| `outcome` | `concluida` ou `interrompida` |
| `rating` | de 1 a 5, `pulada` ou `nao-pedida` |
| `comment` | só com nota 1 ou 2, e só se você escrever |

**Não vai nada da conversa:** nenhum nome, projeto, caminho, pedido, código ou
tela. O comentário é o único texto livre, e a skill avisa, ao pedir, que ele
segue no arquivo.

## Quando grava

- **Começa** quando você digita `/crow:<skill>`. A `conventions` fica de fora:
  ela carrega sozinha, o tempo todo.
- **Termina** no último passo da skill, que fecha a execução.
- **Interrompida:** se a sessão acaba antes, ou se você chama outra skill do
  crow antes do fim, a linha é gravada como `interrompida`, com o que foi gasto
  até ali.
- **Uma skill chamada por outra** (a `generate-test-steps` chamando a
  `generate-flows`, por exemplo) entra na conta de quem chamou.
- **Subagentes ficam de fora**: têm registro próprio no Claude Code.

## A nota

Só nas skills de entrega: `analyst`, `develop`, `build` (no `up` e no
`reset`), `security-validation`, `generate-test-steps` e `generate-flows`. No
fim, a skill pergunta uma nota de 1 a 5; dá para pular. Com nota 1 ou 2, ela
pergunta o que faltou, e o comentário é opcional.

## Ligar e desligar

Duas preferências da `/crow:setup`:

| Preferência | Padrão | Faz |
| --- | --- | --- |
| Registro de uso | sim | com `não`, nada roda e nada é gravado |
| Pedir avaliação | sim, nas skills de entrega | com `não`, a linha é gravada sem perguntar a nota |

## Como funciona

Dois hooks do plugin chamam `lib/usage-log.mjs`, fora do modelo:

- **`UserPromptSubmit`** abre a execução ao ver `/crow:<skill>` no prompt e a
  guarda em `~/.claude/crow/logs/abertas/`;
- **`SessionEnd`** fecha como interrompida a que ficou aberta.

O último passo da skill fecha a execução: o script lê o registro da sessão que
o próprio Claude Code mantém, a partir do ponto em que ela abriu, e soma os
tokens **uma vez por resposta**, pelo `message.id`, porque o registro repete a
mesma resposta em várias linhas.

**Custo:** os hooks e o script não gastam tokens. O passo final custa cerca de
100 a 150 tokens de instrução por skill, e a pergunta da nota, um turno.

**Robustez:** o formato do registro da sessão é interno do Claude Code e pode
mudar. O script grava o que conseguir ler e nunca interrompe a sessão.
