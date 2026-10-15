# develop

Transforma o documento de requisitos da `analyst` em código testado, fase por
fase. O documento é o contrato: ela constrói o que ele diz, do jeito que ele
diz, e nada que ele não diga.

## Como chamar

```
/crow:develop
/crow:develop <documento ou fase>
```

Sem argumento, ela pega o documento de `docs/requirements/` (pergunta qual, se
houver mais de um) e a próxima fase ainda não feita — o MVP primeiro.

Sem documento de requisitos ela **não começa**: aponta para `/crow:analyst`. Uma
descrição no chat não substitui o levantamento.

## Antes do código

1. Lê o documento inteiro, `CONTEXT.md`, `ARCHITECTURE.md`, `TASKS.md`, o
   handoff e o código existente. Fase pela metade no handoff → continua do
   próximo requisito.
2. Pergunta, uma de cada vez, as decisões em aberto que bloqueiam a fase — com
   a recomendação dela primeiro. As que só afetam fases futuras esperam.
3. Mostra o plano da fase: os `RF`, a ordem (por dependência), o que cada um
   toca e o nome da branch. E começa.

## Durante a fase

- **Branch** por fase: `cm-<slug>-<fase>`, a partir da `main`. Projeto novo sem
  repositório ganha `git init` e um primeiro commit só com o esqueleto.
- **Fundação primeiro**, num projeto novo: o esqueleto da stack do documento,
  com o runner de testes e um teste passando. Stack não definida no documento
  é pergunta, não escolha dela.
- **Um `RF` por vez**: código onde a arquitetura manda; um teste por critério
  de aceite e por exemplo e exceção de cada `RN`; testes rodados e vistos
  passando; checagem de segurança; commit citando os `RF` e `RN`
  implementados.
- **Suas convenções valem em tudo** (`/crow:conventions`): commits em inglês, um
  por mudança, testes, `docs:` por último, nunca coautoria, **nunca push**.
- **Documento errado ou omisso** → para aquele requisito e pergunta. Não
  inventa e não escolhe entre duas regras que se contradizem. A decisão também
  precisa ir para o documento de requisitos.
- **Nada fora do escopo.** O que seria útil e o documento não pede vira
  sugestão, não código.

Para rodar testes que precisam de banco, ela usa o ambiente da `/crow:build`.

## Fim da fase

- suíte completa rodada, resultado mostrado;
- `docs/requirements/<slug>-traceability.md`: cada `RF` da fase com arquivos,
  testes, commit e estado (`implemented`, `partial` ou `blocked`);
- documentação do projeto atualizada, num commit `docs:` por último;
- relatório por tópico e **parada**. A próxima fase só começa quando você
  chamar `/crow:develop` de novo.

Ela sugere `/crow:context save`, `/crow:build` se ainda não houver ambiente, e
`/crow:security-validation` antes do merge.

## Limitações

- O código é tão bom quanto o documento. Um levantamento raso vira um sistema
  raso — ou uma sequência de perguntas durante a fase.
- Ela não faz push nem abre pull request; a revisão e o envio são seus.
