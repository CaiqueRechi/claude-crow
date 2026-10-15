# security-validation

Analista de segurança defensiva. Identifica, avalia, documenta e ajuda a
corrigir vulnerabilidades em aplicações, APIs, sistemas operacionais, redes,
nuvem, containers, pipelines, dispositivos e sistemas de IA — e diz com
precisão o que foi verificado, como, e o que ficou de fora.

Construída a partir da sua especificação (`name: security-validation`,
versão 1.0.0, pt-BR).

## Como chamar

```
/crow:security-validation <escopo>
```

Só roda quando chamada. Antes de começar ela:

1. lê `CONTEXT.md`, `ARCHITECTURE.md` e `docs/requirements/` se existirem, e
   retoma uma validação salva em `.context/HANDOFF.md`;
2. pergunta se há **autorização para teste dinâmico** — sem ela, a validação é
   só estática;
3. pergunta o **limite de aceitação**: a partir de que severidade uma falha
   aberta impede a aprovação. Sem resposta, nenhuma falha aberta é aceita.

## O que ela entrega

`docs/security/<AAAA-MM-DD>-<escopo>.md` no projeto avaliado, **sem commit**,
seguindo [templates/report.md](../skills/security-validation/templates/report.md):
identificação com as versões das referências, resumo por estado, cobertura,
achados com evidência redigida, exceções, riscos residuais e conclusão.

Ela nunca escreve "sem vulnerabilidades" nem "sistema seguro". O status global
só é `PASS` quando todos os requisitos obrigatórios do escopo foram verificados
e os critérios de aceitação foram satisfeitos.

Ela recomenda correções; não as aplica. Aplicar é outra tarefa, que começa
quando você pedir.

## Como está organizada

A estrutura é a da seção 14 da especificação:

| Pasta | Conteúdo |
| --- | --- |
| `catalog/` | taxonomia e estados, catálogo de ataques por família, referências fixadas e verificadas |
| `rules/` | as 41 regras, cada uma com contrato YAML e critérios em texto |
| `schemas/` | JSON Schema da regra e do achado |
| `procedures/` | as sete fases: estática, dinâmica, triagem, correção e revalidação |
| `policies/` | autorização, testes seguros, severidade |
| `templates/` | relatório e achado |

O `SKILL.md` só orquestra e carrega cada arquivo quando a fase pede.

## As 41 regras

**As 24 da sua seção 7**, com os seus critérios de aprovação, reprovação e
falsos positivos mantidos palavra por palavra: `SV-APP-0001` a `SV-APP-0009`,
`SV-API-0001`, `SV-DATA-0001`, `SV-CRY-0001`, `SV-IDN-0001`, `SV-CLD-0001`,
`SV-CON-0001`, `SV-SCM-0001`, `SV-DEV-0001`, `SV-NET-0001`, `SV-HOST-0001`,
`SV-RES-0001`, `SV-AI-0001`, `SV-BIZ-0001`, `SV-MON-0001`, `SV-REC-0001`.

**17 escritas por mim** para os ataques da seção 4.4 que nenhuma das 24 cobre
sozinha, como você escolheu. Seguem o mesmo contrato e o mesmo estilo, mas
**pedem a sua revisão**:

| Regra | Cobre |
| --- | --- |
| `SV-APP-0010` | NoSQL injection |
| `SV-APP-0011` | Server-side template injection |
| `SV-APP-0012` | XXE e expansão de entidades |
| `SV-APP-0013` | Command injection |
| `SV-APP-0014` | Desserialização insegura |
| `SV-APP-0015` | Clickjacking |
| `SV-APP-0016` | CORS |
| `SV-APP-0017` | Zip Slip e bombas de descompressão |
| `SV-IDN-0002` | Brute force e credential stuffing |
| `SV-IDN-0003` | MFA |
| `SV-IDN-0004` | Recuperação e redefinição de credenciais |
| `SV-DATA-0002` | Integridade, retenção e privacidade (LGPD) |
| `SV-RES-0002` | ReDoS |
| `SV-AI-0002` | Integridade de modelos e dados de treinamento |
| `SV-BIZ-0002` | Abuso por automação (bots) |
| `SV-IOT-0001` | Firmware e interfaces administrativas |
| `SV-OT-0001` | Protocolos industriais e segmentação |

Malware e C2, engenharia social e identidade federada ficam no catálogo como
revisão manual, sem regra própria — não há como testá-los com segurança de
forma automática.

## Onde ela se afasta da especificação

Pequenos ajustes, todos no sentido da própria especificação:

- **Referências preenchidas.** O contrato de exemplo deixava `asvs`, `wstg` e
  `attack` vazios "até confirmar a correspondência". Foram confirmados contra
  os artefatos oficiais e preenchidos; o que não tem correspondência ficou
  vazio com uma nota (`references.note`).
- **ATLAS.** As regras de IA citam técnicas do MITRE ATLAS num campo próprio,
  `references.atlas`, para não misturá-las com o ATT&CK.
- **T1562 revogada.** No ATT&CK v20.0 a `T1562` foi revogada; a regra de
  monitoramento cita a substituta, `T1685`.
- **Link da OWASP API Security.** O endereço da especificação cai numa página
  404; `catalog/references.md` usa o endereço atual do projeto.
- **Campos da seção 4.3.** `weakness_refs`, `verification_refs` e
  `attack_refs` ficam dentro de `references` (`cwe`, `asvs`/`wstg`,
  `attack`/`atlas`), como no contrato da seção 5. A correspondência está em
  `catalog/taxonomy.md`.

## Mantendo o catálogo

- Regra nova: um bloco YAML com o contrato completo, sob um título `## <id> —
  <nome>`, no arquivo da família; e o ataque correspondente em
  `catalog/attack-types.md`.
- Identificador externo novo: conferir na fonte oficial e acrescentar à tabela
  de `catalog/references.md` **antes** de citá-lo. O teste recusa o que não
  estiver lá.
- Trocar a versão de uma referência: atualizar a tabela de versões, o hash e
  as tabelas de identificadores, e registrar a mudança incompatível na versão
  do plugin.
- `npm test` valida tudo isso localmente; o mesmo roda em todo pull request.

## Limitações

- O catálogo é testado; a skill rodando contra o projeto de teste ainda não
  foi — ver [testing.md](testing.md).
- ATT&CK for ICS não está fixado: as regras de OT não citam técnicas.
- CIS Benchmarks e CISA KEV não têm versão única; a versão do benchmark e a
  data da consulta ao KEV são registradas em cada execução.
