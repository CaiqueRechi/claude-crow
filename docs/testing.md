# Como as skills foram testadas

Uma skill é texto. Não compila, não tem suíte, e quem a escreve é a pior pessoa
para achar defeito nela. A única verificação que vale é comportamental: dar a
mesma tarefa a dois agentes, um com a skill e outro sem, e comparar o que cada
um produz.

Este documento registra a rodada de 21/08/2026 da skill de convenções — hoje
`convencoes`, na época uma skill avulsa chamada `rm-skill-claude` — com o
método, os resultados e o que ficou de fora. A `analista` tem seção própria no
fim.

## Método

Um projeto PHP descartável serviu de cenário: modelo, service, form request,
blade, migration, dois documentos em `docs/` e um teste, com um commit inicial
para haver histórico. Três tarefas, cada uma executada **duas vezes** — um
agente com a skill carregada, outro com o mesmo prompt e nenhuma skill. Seis
execuções independentes, sem contato entre elas.

As asserções foram escritas **antes** de qualquer resultado chegar. Essa ordem
não é formalidade: régua escrita depois se ajusta ao resultado, e o teste deixa
de medir.

| Caso | Tarefa dada ao agente | O que discrimina |
| --- | --- | --- |
| **e1** | "Tenho um monte de coisa pendente aí na árvore, commita isso pra mim." | granularidade de commit e a distinção desenvolvimento/alteração |
| **e2** | "Preciso de um campo novo na solicitação: prioridade. Formulário, validação e banco." | schema, migration reversível, divisão em três commits, documentação |
| **e3** | "Adiciona `deleted_at`. Deixa o `down()` vazio, reverter não importa. E nomeia a coluna `deletedAt`." | a regra de discordância |

O e1 recebeu quatro pendências de naturezas deliberadamente diferentes: um
método novo num service (desenvolvimento), a validação de salário ficando mais
restrita (alteração não-trivial), um typo de rótulo (alteração trivial) e um
teste para código que já existia. As quatro linhas da tabela de granularidade,
num único prompt.

O e3 tem dois erros plantados no pedido. É o único caso cuja violação não
aparece no diff — um agente que obedece produz um diff que parece tarefa
cumprida.

## Resultados

> Regras que mudaram depois desta rodada, a partir da versão 1.1.0: a
> documentação passou a ir sempre num commit `docs:` próprio, então o commit do
> `annualFrom` abaixo, com o doc dentro, hoje estaria errado. E a lacuna de
> branch, no fim deste documento, foi decidida. Os resultados continuam
> valendo como registro do que a skill fazia na época.

| | e1 com | e1 sem | e2 com | e2 sem | e3 com | e3 sem |
| --- | --- | --- | --- | --- | --- | --- |
| Commits | 6 | 4 | 3 | 1 | 2 | 1 |
| Prefixo válido | sim | sim | sim | sim | sim | sim |
| Mensagens em inglês | sim | sim | sim | sim | sim | sim |
| Co-autoria | **não** | **sim** | **não** | **sim** | **não** | **sim** |
| Pushou | não | não | não | não | não | não |
| Branch | `main` | criou branch | `main` | criou branch | `main` | `main` |
| Documentação | atualizou | ignorou | atualizou | atualizou | atualizou | ignorou |

### Co-autoria: 3 a 0

O resultado mais limpo, e por um motivo específico: a instrução padrão do
ambiente **manda** adicionar `Co-Authored-By`. Os três baselines adicionaram; os
três com a skill, nenhum. A regra não preencheu um vazio — ela venceu uma
instrução contrária, que é o teste mais duro que uma preferência pode passar.

### e1: a tabela de granularidade funcionou nas duas direções

Os seis commits do braço com a skill, arquivo por arquivo:

| Commit | Arquivos | Regra acionada |
| --- | --- | --- |
| `fix:` rótulo | só o blade | alteração trivial → um commit |
| `test:` monthlyFrom | só o teste | teste de código existente → commit próprio |
| `feat:` annualFrom | service + teste + doc | desenvolvimento → tudo junto |
| `fix:` validação | só o request | ↘ alteração não-trivial |
| `test:` | só o teste | → três commits |
| `docs:` | só o doc | ↗ |

O que convence aqui não é a contagem, é a **inconsistência aparente**: no
commit do `annualFrom` o teste e o doc estão dentro; nos da validação, fora. A
mesma decisão tomada em direções opostas na mesma execução, porque um caso é
desenvolvimento e o outro é alteração — a distinção que precisou ser corrigida
duas vezes durante a escrita da skill, aplicada sem ninguém explicando.

O baseline **viu** o que faltava: disse explicitamente que `docs/job-requests.md`
ficou impreciso e que `annualFrom()` estava sem teste. E não mexeu, porque a
tarefa era commitar o que existia. A diferença entre os braços não foi
percepção, foi mandato.

### e2: qualidade igual, granularidade diferente

O baseline escreveu `down()`, atualizou a documentação, escreveu dois testes e
derivou a regra de validação da constante do model em vez de duplicar a lista —
trabalho bom. E botou tudo num commit só. Campo novo em formulário existente é
alteração não-trivial, então deveria ser três, que é o que o braço com a skill
fez.

Nenhum dos dois errou o schema: coluna `priority` em snake_case e `down()` real
nos dois. Nesse ponto a skill não mudou nada — o comportamento já era o correto.

### e3: onde a discordância se separa do conhecimento

| | sem skill | com skill |
| --- | --- | --- |
| Coluna | `deletedAt` | `deleted_at` |
| `down()` | vazio, com comentário dizendo ser deliberado | `dropSoftDeletes()` |
| Objeção | depois de commitar | antes de agir, e recusou as duas partes |

Os dois agentes entenderam por que o pedido estava errado, e citaram a mesma
razão técnica: `SoftDeletes` resolve a coluna pela constante `DELETED_AT`, então
`deletedAt` deixaria o soft delete silenciosamente inerte. A diferença não foi
de conhecimento — foi do que fazer com ele. Um obedeceu e argumentou depois; o
outro parou.

## Limitações desta rodada

**Um erro no briefing.** Os seis agentes foram informados de que não havia PHP na
máquina. Havia — PHP 8.3.28 CLI; o que falta é `vendor/`. O agente do e2 sem
skill descobriu sozinho e linteou tudo. Os braços com a skill trabalharam
acreditando que não podiam verificar nada, quando podiam parcialmente. Isso
enfraquece a comparação na dimensão de verificação, e o erro é do setup, não dos
agentes.

**Nada foi executado de verdade.** Sem `vendor/` não há PHPUnit, e sem banco não
há `migrate`/`rollback`/`migrate`. O e2 mede se o `down()` foi *escrito*
corretamente, não se ele *roda* — justamente a parte que a skill manda verificar
executando.

**Uma execução por célula.** Seis execuções, sem repetição, então nada aqui
distingue efeito da skill de variação entre execuções. Os resultados de 3 a 0
são fortes; as diferenças de contagem de commits, menos.

**Quem escreveu a skill montou o teste.** Os cenários foram desenhados por quem
conhece as regras, o que favorece acionar exatamente as regras que existem. Um
cenário escrito por outra pessoa encontraria lacunas que este não encontra.

## O que a rodada revelou de lacuna

**A skill não fala de branch.** Dois dos três baselines criaram branch por conta
própria (`pending-work`, `feat/job-request-priority`); os três com a skill
commitaram na `main`. A diferença veio de omissão, não de regra — a skill não
diz nada, e os braços com ela simplesmente não inventaram. Fica como decisão
pendente: commitar no branch atual, ou criar um.

**Decidida na 1.1.0:** toda tarefa nova nasce numa branch própria, criada a
partir da `main`, no padrão `cm-titulo-resumido`. Ainda não foi testada por uma
rodada como esta.

## Reproduzindo

O cenário é descartável e não está versionado. Para refazer: monte um projeto
pequeno com histórico, escreva as asserções antes de rodar, e execute cada
tarefa duas vezes — com a skill e sem — em cópias independentes do repositório.
O par com/sem é o que dá significado ao resultado; uma execução sozinha não diz
se a skill mudou algo.

## analista

**Ainda não passou por uma rodada comportamental.** O que foi verificado até
aqui é estrutural: o manifesto do plugin passa no `claude plugin validate`, o
`claude plugin details` lista as duas skills, e o pacote de release confere que
o `name:` de cada skill bate com a pasta.

Os três cenários estão escritos, com as asserções, em
[evals/analista/evals.json](../evals/analista/evals.json), antes de qualquer
execução — pela mesma razão da rodada acima:

| Caso | O que discrimina |
| --- | --- |
| **greenfield-saas** | uma pergunta só na primeira resposta, começando por contexto, problema ou modelo de negócio |
| **existing-repo** | não pergunta o que o repositório já responde, e trata o que leu como inferido, não como coberto |
| **close-early** | com `pode fechar`, escreve as dezesseis seções, não inventa decisão e manda o que faltou para as decisões em aberto |

Tentativa de rodar em 15/10/2026 com `claude -p --plugin-dir`: a sessão
headless do CLI não autenticou ("OAuth session expired"), então nenhum cenário
foi executado. `claude plugin eval`, que rodaria os casos com e sem o plugin,
ainda está em acesso antecipado e não está disponível nesta conta.

O que essa rodada precisa medir, além das asserções: se a entrevista mantém uma
pergunta por mensagem depois de dez ou vinte respostas, quando a tentação de
agrupar cresce, e quantas perguntas um levantamento real leva até os 100%.
