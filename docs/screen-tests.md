# Testes de tela

Três skills que trabalham juntas para documentar os testes de uma aplicação a
partir das telas de verdade:

| Comando | Faz |
| --- | --- |
| `/crow:generate-test-steps <pedido>` | gera o catálogo de testes de uma operação; acrescente "pdf" ao pedido para ter o PDF |
| `/crow:generate-flows <operação>` | mapeia o fluxo de ponta a ponta da operação |
| `/crow:create-test-users <módulo.preset \| módulo \| todos>` | cria ou corrige um usuário de teste por preset |

O catálogo chama as outras duas sozinho quando falta um fluxo ou um usuário.

## O que sai

Um catálogo em Markdown (e PDF, quando pedido) com:

- **um teste positivo:** cada passo com a ação, o campo, o valor, a resposta
  esperada e o print com o destaque numerado, até o resultado final;
- **um teste de validação por valor recusado:** o campo, a regra, o valor e a
  mensagem esperada;
- **um teste de permissão por perfil que não pode fazer a operação:** o que
  ele vê no lugar;
- **as regras de cada campo com a origem:** a tela, os requisitos, a
  documentação ou você;
- **o que não foi verificado**, e por quê.

O usuário aparece pelo preset e pelo e-mail, nunca pela senha.

## Como as telas são abertas

Um script do próprio crow (`lib/browser.mjs`) dirige o **Chrome ou o Edge já
instalados** pelo DevTools Protocol, só com o Node nativo (22 ou mais novo):

- **Navegador isolado:** perfil temporário, apagado no fim, com a porta de
  depuração presa em `127.0.0.1`.
- **O modelo lê a tela como texto, não como imagem:** campos, botões, links e
  mensagens, com as senhas mascaradas.
- **Prints e marcações em arquivo:** as caixas e os números são desenhados
  dentro da página antes do print, sem passar pela conversa.
- **Um fluxo já mapeado roda pelo script, sem o modelo a cada passo.** Ele para
  no primeiro passo que falhar, e só o resto é mapeado de novo.

Sem Chrome nem Edge, a skill avisa; não instala nenhum.

## Fluxos

Um fluxo é o caminho de ponta a ponta de uma operação: o login com o preset,
os passos, os campos com as regras e a origem de cada uma, o resultado esperado
e os perfis que devem ser recusados. O formato está em
[locked-skills/generate-flows/references/flow-format.md](../locked-skills/generate-flows/references/flow-format.md).

- **Onde mapeia:** só no ambiente local (`localhost` ou `127.0.0.1`), onde
  pode salvar e excluir à vontade. Qualquer outro host é recusado.
- **O preset:** o mais estreito que consegue fazer a operação, tirado do mapa
  de acessos.
- **As regras:** vêm da tela, dos requisitos, da documentação do projeto ou de
  você. Regra sem origem não é salva.
- **O seu ok:** você vê um resumo e aprova antes de salvar.
- **Onde ficam:** criptografados num arquivo por aplicação, com índice, em
  `~/.claude/crow/fluxos/`.

## Usuários de teste

Um por preset, com o e-mail `crow.<módulo>.<preset>@teste.local` e a senha
igual ao e-mail. São usuários só de teste, sem dado real, e só no ambiente
local.

- **Gravados direto no banco local**, por uma **receita** aprendida uma vez na
  documentação e nas migrations da aplicação e aprovada por você.
- **Corrigidos, nunca duplicados:** um usuário que já existe e diverge do
  preset é ajustado.
- **Presets por designação** (`assigned_by`) ganham também o registro de teste
  que os designa.
- **O login é conferido** no fim.

## Criptografia e o repositório privado

- **A `setup` cria um cofre:** uma app key nesta máquina, guardada em
  `~/.claude/crow/`, mais uma cópia dela embrulhada por uma chave derivada da
  sua resposta de segurança (`scrypt`).
- **A resposta nunca é gravada.** A pergunta é de cada usuário, e a resposta
  diferencia maiúsculas de minúsculas.
- **Fluxos, catálogos, receitas e dados privados** ficam em AES-256-GCM, com
  o `crypto` nativo do Node.
- **Sem a chave e sem a resposta,** a `setup` recomeça com uma chave nova e
  guarda os dados antigos num backup, para o caso de a resposta voltar.
- **Repositório privado:** uma preferência guarda a URL (o padrão é
  "nenhum", e a URL nunca fica no código público). A `setup` clona com as suas
  credenciais do git, criptografa tudo em `~/.claude/crow/private/` e apaga o
  clone em texto aberto. Sem acesso, o crow funciona só com os seus fluxos
  locais.
- **Só o dono envia ao repositório privado.** `flows.mjs export` gera o
  arquivo em texto aberto para ele copiar e commitar.

O limite é este: a chave fica na mesma máquina que os dados, então a
criptografia protege de leitura por acaso e de vazamento acidental, não de quem
tem acesso à máquina. A proteção real dos dados privados é o acesso ao
repositório no GitHub.

## Limitações

- Só aplicações web. Aplicativo desktop fica para depois.
- O consumo de tokens ainda não foi medido. O [registro de uso](usage-log.md)
  grava os tokens de cada execução a partir do primeiro uso real.
- A receita de usuários e os fluxos dependem de você aprovar. Nada disso é
  gravado sem o seu ok.
