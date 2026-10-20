# Como as skills foram testadas

Uma skill é texto. Não compila, não tem suíte, e quem a escreve é a pior pessoa
para achar defeito nela. A única verificação que vale é comportamental: dar a
mesma tarefa a dois agentes, um com a skill e outro sem, e comparar o que cada
um produz.

Este documento registra a rodada de 21/08/2026 da skill de convenções — hoje
`conventions`, na época uma skill avulsa chamada `rm-skill-claude` — com o
método, os resultados e o que ficou de fora. A `analyst`, a `context` e a `security-validation` têm seção própria no
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

## analyst

**Ainda não passou por uma rodada comportamental.** O que foi verificado até
aqui é estrutural: o manifesto do plugin passa no `claude plugin validate`, o
`claude plugin details` lista as quatro skills, e o pacote de release confere
que o `name:` de cada skill bate com a pasta e que o bloco de regras
inegociáveis está em todas.

Os cenários estão escritos, com as asserções, em
[evals/analyst/evals.json](../evals/analyst/evals.json), antes de qualquer
execução — pela mesma razão da rodada acima:

| Caso | O que discrimina |
| --- | --- |
| **greenfield-saas** | uma pergunta só na primeira resposta, começando por contexto, problema ou modelo de negócio |
| **existing-repo** | não pergunta o que o repositório já responde, e trata o que leu como inferido, não como coberto |
| **close-early** | com `pode fechar`, escreve as dezesseis seções, não inventa decisão e manda o que faltou para as decisões em aberto |
| **resume-from-handoff** | retoma a entrevista do ledger salvo em `.context/HANDOFF.md`, sem repetir o que já foi respondido |
| **no-context-files** | sem arquivos de contexto, recomenda `/crow:context` numa linha e segue sem esperar |

Tentativa de rodar em 15/10/2026 com `claude -p --plugin-dir`: a sessão
headless do CLI não autenticou ("OAuth session expired"), então nenhum cenário
foi executado. `claude plugin eval`, que rodaria os casos com e sem o plugin,
ainda está em acesso antecipado e não está disponível nesta conta.

O que essa rodada precisa medir, além das asserções: se a entrevista mantém uma
pergunta por mensagem depois de dez ou vinte respostas, quando a tentação de
agrupar cresce, e quantas perguntas um levantamento real leva até os 100%.

## context

**A mecânica de arquivos foi verificada; o comportamento do agente, não.**

Em 15/10/2026 os passos do `prepare` foram executados à mão, exatamente como a
skill descreve, em repositórios descartáveis:

| Verificação | Resultado |
| --- | --- |
| Primeira execução num repositório sem arquivos de contexto | criou os dez itens; `git status --short` continuou vazio |
| Segunda execução, depois de editar `TASKS.md` e apagar `CONTEXT.md` e `GEMINI.md` | recriou só os dois apagados; `TASKS.md` ficou idêntico byte a byte |
| Linhas em `info/exclude` depois das duas execuções | nenhuma duplicada |
| Repositório que já versiona o próprio `CLAUDE.md` | `CLAUDE.md` intocado e fora do exclude; os demais criados |
| `git rev-parse --git-path info/exclude` dentro de um worktree | aponta para o exclude do repositório principal, como esperado |

O que isso não mede: se o agente segue esses passos sem pular nenhum, se o
`save` escreve uma próxima ação concreta o bastante, e se outro modelo,
lendo só `AGENTS.md`, retoma do ponto certo. Os cinco cenários para isso estão
em [evals/context/evals.json](../evals/context/evals.json), ainda não
executados pelo mesmo motivo da `analyst`.

## security-validation

**O catálogo é testado; a skill rodando, ainda não.**

`npm test` roda em todo pull request e verifica o checklist da seção 15 da
especificação que dá para verificar sem um agente:

| Teste | O que recusa |
| --- | --- |
| contrato | regra que não bate com `schemas/rule.schema.json` — campo faltando, estado ou severidade inválidos, `safe_by_default` falso |
| identificadores | id fora do formato `SV-<DOM>-<NNNN>`, ou repetido |
| conjunto obrigatório | qualquer uma das 41 regras ausente |
| categorias | categoria fora da taxonomia |
| referências | CWE, ASVS, WSTG, ATT&CK ou ATLAS que não está nas tabelas verificadas de `catalog/references.md` |
| relações | `related_controls` ou `duplicate_of` apontando para regra que não existe |
| catálogo de ataques | família da seção 4.4 ausente, ou regra que nenhum ataque alcança |
| fixtures | caso que cita regra inexistente, estado inválido ou arquivo que não existe; ausência de casos `PASS`, `FAIL` e `INCONCLUSIVE` |

Cada teste foi conferido com uma regra quebrada de propósito — `fail_criteria`
renomeado, id duplicado, `CWE-abc`, `CWE-99999`, categoria inventada, controle
relacionado inexistente — e cada quebra foi recusada pelo teste certo.

As referências foram conferidas contra os artefatos oficiais, com hash
registrado em `catalog/references.md`. A conferência achou um problema real: a
`T1562` está revogada no ATT&CK v20.0 e foi trocada pela `T1685`.

**O que falta:** rodar a skill contra
[evals/security-validation/fixtures/php-app](../evals/security-validation/fixtures/php-app)
e comparar com [expected.json](../evals/security-validation/expected.json) —
sete falhas plantadas, as versões corrigidas, um falso positivo esperado, dois
casos inconclusivos e uma regra não aplicável. Bloqueado pelo mesmo
"OAuth session expired" do CLI.

**Antivírus.** O primeiro fixture de command injection, que passava `$_GET`
direto para `shell_exec`, foi travado pelo antivírus da máquina logo depois de
criado: o arquivo existe e ninguém consegue lê-lo. O caso foi reescrito uma vez,
com o valor passando por um método, e essa versão é legível. Quem rodar os
fixtures em outra máquina pode esbarrar no mesmo bloqueio.

## develop

**Só verificação estrutural.** O plugin valida, o `SKILL.md` tem o bloco de
regras inegociáveis e o nome passa no teste de nomes. Os seis cenários estão
em [evals/develop/evals.json](../evals/develop/evals.json): sem documento de
requisitos, MVP de um projeto novo, decisão em aberto que bloqueia a fase,
contradição encontrada no meio da construção, fase retomada pela metade e
requisito que precisa de um pacote ainda não instalado.
Nenhum foi executado, pelo mesmo bloqueio de autenticação do CLI.

## build

**O template foi validado, mas não levantado.**

| Verificação | Resultado |
| --- | --- |
| Tags de imagem citadas (`php:8.3-apache`, `composer:2`, `mysql:8.4`, `postgres:17`, `redis:7.4`, `node:22`, `python:3.13`, `axllent/mailpit:v1.21`) | todas existem no Docker Hub em 15/10/2026 |
| `docker compose config` no template PHP/Laravel, num projeto de teste | válido; as duas portas publicadas em `127.0.0.1`; healthcheck do MySQL montado |
| Mesmo comando sem `COMPOSE_PROJECT_NAME` | recusado com a mensagem do template |

O que falta: subir o template de verdade (`up`, healthcheck, conexão da
aplicação com o banco, resposta da URL). O Docker Desktop estava fechado e a
decisão foi não testar agora. Os seis cenários de comportamento estão em
[evals/build/evals.json](../evals/build/evals.json).

### WSL, lentidão e Docker Desktop (1.1.0)

**As regras vêm de um caso real; a skill com elas ainda não rodou.**

O que foi medido veio do relatório do ambiente da Engenharia do Hub Ibiporã
(2026-10-19), feito à mão antes de virar regra: `/login` de 4–18 s no NTFS
para ~0,05 s no WSL, `npm run build` de 14,5 s para 3,5 s, suíte de 4.871
testes de mais de 1 h para 473 s, e o Docker Desktop recuperado sem perda
depois do aviso de assinatura. Ficou de fora da skill o que era só daquele
projeto (nomes, portas, contas, o `dllhost.exe`, `SESSION_ENCRYPT`).

| Verificação | Resultado |
| --- | --- |
| `npm test` | 10 de 10 passando |
| `evals/build/evals.json` | JSON válido; seis cenários novos: migração do NTFS com o volume preservado, trabalho não commitado parando a mudança, preparo do WSL passo a passo, URL lenta diagnosticada, restart listando o que para, reset recusado mesmo oferecido |

O que falta, e é o aceite da 1.1.0: um `/crow:build` real num projeto Laravel
no Windows, rodado por ele, conferindo o projeto em `~/projects/<pasta>`, a
mediana do `/login` abaixo de 1 s, os volumes preservados e a pasta antiga
intacta. Os cenários novos também não foram executados por um agente.

## Nome claude-crow e política de instalação (1.2.0)

**Verificado por teste e por uma instalação limpa a partir do clone; a
instalação pelo GitHub com o nome novo só é possível depois do merge.**

| Verificação | Resultado |
| --- | --- |
| `npm test` | 12 de 12 passando |
| Nome antigo fora das seções de migração | o teste novo passa; com um `crow@rm-skill-claude` posto de propósito no README, falhou apontando `README.md:264` |
| Política idêntica na `develop` e na `build` | o teste novo passa; com uma frase alterada só na `build`, falhou apontando o arquivo |
| Teste de referências | renomeado para "every external reference is present in the verified catalog", sem mudar o que confere |
| `package-skill.sh` | passou em todas as validações e inclui `.github/installation-policy.md`; o ZIP não foi gerado nesta máquina, que não tem `zip` |
| Instalação limpa | com `CLAUDE_CONFIG_DIR` num diretório vazio: `claude plugin marketplace add <clone>` registrou o marketplace `claude-crow`; `claude plugin install crow@claude-crow` instalou a 1.2.0, habilitada, com as seis skills |
| `claude plugin marketplace remove` | o comando existe no Claude Code 2.1.223 (`remove\|rm <name>`); a migração em si não foi executada |

O que falta: `claude plugin marketplace add CaiqueRechi/claude-crow` direto do
GitHub, que só reflete o nome novo depois do merge, e a migração de uma
instalação existente pelos três comandos do README. A política de instalação
é texto de skill: nenhum agente rodou um `up` com ela ainda.
