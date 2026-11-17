# Catalog template

Written in the document language of his preferences. One file per request,
`catalogo.md`, with the prints beside it in `prints/`. Never a password: the
user line names the preset and the e-mail only.

```markdown
# Catálogo de testes — <operação>

| | |
| --- | --- |
| Aplicação | <app> |
| Módulo / tela | <módulo> / <menu_path> |
| Fluxo | <flow id> (aprovado em <approved_at>) |
| Gerado em | <AAAA-MM-DD> |

## Resumo

<duas linhas: o que a operação faz e quantos testes há (positivos, de validação, de permissão)>

## T-01 — <operação> com dados válidos

- **Objetivo:** <o que este teste prova>
- **Usuário:** <rótulo do preset> (`<módulo.preset>`, `crow.<módulo>.<preset>@teste.local`)
- **Pré-condições:** <dados que precisam existir>

| Passo | Ação | Campo | Valor | Resposta esperada | Print |
| --- | --- | --- | --- | --- | --- |
| 1 | Abrir <menu_path> | — | — | a tela <título> abre | ![1](prints/passo-01.png) |
| 2 | Preencher | Código | `CC-TESTE-01` | aceito | ![2](prints/passo-02.png) |
| 3 | Clicar | Salvar | — | mensagem "<mensagem>" | ![3](prints/passo-03.png) |

**Resultado final esperado:** <result.description> — ![resultado](prints/resultado.png)

## T-02 … — validação de campos

Um teste por regra que recusa um valor, a partir de `fields[].invalid_examples`:

| Campo | Regra | Valor | Resposta esperada | Origem da regra |
| --- | --- | --- | --- | --- |
| Código | obrigatório | (vazio) | "O campo código é obrigatório." | tela |

## T-NN — permissão

Um teste por preset de `denied_presets`:

| Usuário | O que tenta | O que deve ver |
| --- | --- | --- |
| <rótulo> (`<módulo.preset>`) | abrir <menu_path> | <expected> |

## Regras dos campos

| Campo | Regras | Origem |
| --- | --- | --- |

## Não verificado

<o que o catálogo não cobriu e por quê — um passo que não rodou, uma regra sem confirmação>
```

Every expected value in a test comes from the flow, which records where each
rule came from; the catalog keeps that origin visible.
