# Log de uso das skills

| | |
| --- | --- |
| Data | 2026-11-17 |
| Solicitante | Caique Rechi Mehret |
| Cobertura do levantamento | 100% — sem decisões em aberto |
| Status | Levantamento concluído |

## 1. Resumo

Cada execução de uma skill do crow chamada pelo usuário grava uma linha num
arquivo local, anônimo e em texto aberto: tokens por tipo, modelo, tempo total e
ativo, turnos, ferramentas, resultado e, nas skills de entrega, a nota de 1 a 5
(com comentário opcional quando a nota é 1 ou 2). O usuário envia o arquivo ao
Caique quando ele pedir. Duas preferências novas ligam e desligam o log e a
avaliação. Entra na 1.4.0.

## 2. Partes interessadas

| Persona | Precisa de |
| --- | --- |
| Caique | saber quanto cada skill custa, quanto demora e se o resultado agradou |
| Usuário | decidir se registra e se é perguntado; enviar o arquivo quando pedido |

## 3. Modelo de negócio

Não se aplica.

## 4. Regras de negócio

- **RN-01 — Quais skills.** As chamadas pelo usuário: setup, context, analyst,
  develop, build, security-validation, generate-test-steps, generate-flows e
  create-test-users. A conventions fica de fora. Uma skill chamada por outra
  entra nos tokens de quem chamou, sem linha própria.
- **RN-02 — Nota só nas skills de entrega:** analyst, develop, build,
  security-validation, generate-test-steps e generate-flows. As outras gravam só
  tempo e tokens.
- **RN-03 — Comentário só em nota baixa.** Nota 1 ou 2 pergunta um comentário
  opcional, avisando que ele vai no arquivo enviado ao Caique e que não deve ter
  dado sensível.
- **RN-04 — Preferências.** "Registro de uso" (padrão: sim) e "Pedir avaliação"
  (padrão: sim, nas skills de entrega), na tabela da conventions e no catálogo
  da setup. Log desligado: nada roda nem é gravado. Usuários atuais são
  perguntados só por elas.
- **RN-05 — Anônimo e sem conteúdo.** Sem nome, sem projeto, sem nada da
  conversa, do código ou das telas.
- **RN-06 — Início e fim.** Começa quando o usuário digita `/crow:<skill>`;
  termina no último passo da skill. Sessão encerrada antes, ou outro comando do
  crow antes do fim: grava "interrompida" com o que foi gasto até ali.
- **RN-07 — Tokens.** Soma, por tipo (entrada, cache criado, cache lido, saída,
  raciocínio), uma vez por resposta (`message.id`) — o registro repete a mesma
  resposta em várias linhas. Subagentes ficam de fora (registro próprio).
- **RN-08 — Tempo.** Duração total (relógio) e tempo ativo (só enquanto o
  Claude responde).

## 5. Requisitos funcionais

- **RF-01** Hook que marca o início ao ver `/crow:<skill>` no prompt.
- **RF-02** Script que fecha a execução, soma tokens, tempo, turnos e
  ferramentas a partir do registro da sessão e grava a linha.
- **RF-03** Hook de fim de sessão que grava como interrompida a execução aberta.
- **RF-04** Passo final nas skills: nota (quando cabe), comentário (nota baixa)
  e fechamento.
- **RF-05** Duas preferências novas na conventions e na setup.

Aceite de cada um: testes com um registro de sessão de exemplo; nenhuma linha
gravada com o log desligado.

## 6. Requisitos não funcionais

| ID | Requisito | Medida |
| --- | --- | --- |
| RNF-01 | Custo | hooks e script fora do modelo: 0 token; ~100–150 tokens de instrução por skill; a nota custa 1 turno |
| RNF-02 | Robustez | formato do registro de sessão é interno do Claude Code: o script grava o que conseguir, nunca derruba a sessão; teste com amostra |
| RNF-03 | Privacidade | arquivo anônimo, só números, nota e comentário |

## 7. Modelo de dados

`~/.claude/crow/logs/uso.jsonl`, uma linha por execução: `skill`,
`crow_version`, `started_at`, `ended_at`, `duration_s`, `active_s`, `turns`,
`tool_calls`, `tokens` (`input`, `cache_creation`, `cache_read`, `output`,
`thinking`), `models`, `outcome` (`concluida` | `interrompida`), `rating`
(1–5 | `pulada` | `nao-pedida`), `comment`.

## 8. Arquitetura

Hooks `UserPromptSubmit` e `SessionEnd` do plugin chamam `lib/usage-log.mjs`,
que lê o `transcript_path` da sessão. Execução aberta em
`~/.claude/crow/logs/abertas/<sessão>.json`.

## 9–13

Fluxo: comando → hook abre → skill trabalha → passo final (nota) → script fecha
e grava. Sem prazo. Sem instalação. Só Claude Code.

## 14. Aceite

Uma execução real gera uma linha com tokens coerentes com o uso da sessão; com
o log desligado, nenhuma linha.

## 15. Decisões em aberto

Nenhuma.
