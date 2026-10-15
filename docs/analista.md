# analista

Levantamento de requisitos conduzido pelo agente. Ele entrevista, uma pergunta
por vez, até cobrir tudo o que precisa ser verdade para a solicitação ser
construída certa, e então escreve a documentação da solução.

## Como chamar

```
/rm:analista <descrição da solicitação>
```

A descrição pode ser uma linha só. Sem descrição, a primeira pergunta é o que
você quer construir.

Ela **não roda sozinha**: está marcada com `disable-model-invocation`, então só
começa quando é chamada. Uma entrevista disparando no meio de uma tarefa de
código seria ruído.

## O que acontece antes da primeira pergunta

- **Retomada.** Se já existe em `docs/requisitos/` um documento da mesma
  solicitação, ela lê, reconstrói a cobertura e continua das decisões em aberto
  em vez de recomeçar.
- **Leitura do repositório.** Dentro de um projeto, ela lê README,
  `CLAUDE.md`/`AGENTS.md`, manifestos de dependência, schema ou migrations e
  `docs/` antes de perguntar. O que o código já responde não vira pergunta —
  vira item **inferido**, que você confirma de uma vez numa única pergunta.

## A entrevista

- **Uma pergunta por mensagem.** Com opções clicáveis quando as respostas
  possíveis são enumeráveis, em texto livre quando não são.
- **Começa pelo que molda o resto:** contexto, problema e modelo de negócio.
  Depois regras e fluxos, dados e integrações, tecnologia e arquitetura,
  requisitos não funcionais, gargalos, restrições, escopo, operação e aceite.
  Sai dessa ordem quando uma resposta revela um risco.
- **Resposta vaga ganha número.** "Rápido" vira quantos segundos para quantos
  usuários; "muito registro" vira quantos por dia e quantos em cinco anos.
- **Regra de negócio só conta com exemplo e exceção.**
- **Contradição é perguntada**, com as duas respostas citadas — nunca resolvida
  em silêncio.
- **Quando algo parece errado ou perigoso** (sem backup, relatório pesado no
  navegador, dado pessoal sem prazo de retenção), ela diz uma vez, com o motivo,
  e registra a sua decisão.

Ela não escreve código, não monta projeto e não decide tecnologia, arquitetura
ou regra por você. Pedida a recomendação, dá com o motivo; no documento entra o
que você decidiu.

## O que é "100%"

A cobertura é medida contra uma checklist fixa de dezesseis áreas —
[coverage-checklist.md](../skills/analista/references/coverage-checklist.md).
Cada item termina num destes estados:

| Estado | Conta como coberto |
| --- | --- |
| aberto | não |
| inferido (do repositório, sem confirmação) | não |
| respondido | sim |
| não se aplica (dito por você) | sim |
| adiado (com responsável e prazo) | sim |

Nenhum item vai para um estado coberto por suposição. A cada cinco respostas ela
mostra a tabela de cobertura com o que falta.

### O que você pode dizer a qualquer momento

| Você diz | Efeito |
| --- | --- |
| `status` ou `cobertura` | mostra a tabela de cobertura |
| `pula <área>` | os itens abertos da área viram adiados, com você como responsável |
| `não se aplica <área>` | os itens abertos da área viram não se aplica |
| `pode fechar` | para de perguntar e escreve o documento agora; o que não foi discutido vai para as decisões em aberto, marcado como tal |

Com uma pergunta por vez, um levantamento completo passa fácil de quarenta
perguntas. O que encurta: um repositório que já responde parte delas, `pula` e
`não se aplica` nas áreas que não pesam, e `pode fechar` quando o resto pode
esperar.

## O que ela entrega

`docs/requisitos/<nome-da-solicitacao>.md` no projeto onde foi chamada, no
idioma da conversa, seguindo
[document-template.md](../skills/analista/references/document-template.md):

1. Resumo, objetivos e situação atual
2. Partes interessadas e usuários
3. Modelo de negócio
4. Regras de negócio (`RN-01`…, com exemplo e exceção) e ciclo de vida
5. Requisitos funcionais (`RF-01`…, com critérios de aceite e as `RN` que implementam)
6. Requisitos não funcionais (`RNF-01`…, todos com medida)
7. Modelo de domínio e dados, com diagrama ER
8. Arquitetura: visão geral, tecnologias, integrações, ambientes e deploy
9. Fluxos principais em diagrama de sequência
10. Gargalos, riscos e mitigações
11. Escopo e fases
12. Engenharia e operação
13. Restrições
14. Aceite
15. Decisões em aberto
16. Glossário

Seção sem conteúdo continua no documento, com "Não se aplica" e o motivo. Os
diagramas são Mermaid, então aparecem renderizados no GitHub.

O arquivo fica **sem commit**, para você revisar. Ao final ela informa o
caminho, a cobertura, as decisões em aberto e os riscos que mais pedem atenção.

## Limitações

- O documento é tão bom quanto as respostas. Ela não inventa, então uma área
  respondida por cima sai rasa — e a checklist só garante que a pergunta foi
  feita.
- A checklist é genérica. Domínios com exigências próprias (saúde, financeiro,
  fiscal pesado) podem pedir itens que ela não tem; nesse caso vale mencionar
  logo na descrição da solicitação.
