# build

Sobe o projeto na sua máquina para você abrir e testar. Docker Compose, só
local: nada é publicado, nada sai da máquina.

## Comandos

| Comando | Faz |
| --- | --- |
| `/crow:build` ou `/crow:build up` | cria os arquivos de ambiente que faltam, sobe os containers, prepara o banco e confere a URL |
| `/crow:build status` | mostra o que está rodando, em que porta, e se a URL responde |
| `/crow:build down` | para os containers e mantém os dados |
| `/crow:build reset` | apaga os dados locais e recomeça — só depois de você confirmar |

## O que ela faz no `up`

1. Lê `ARCHITECTURE.md`, os requisitos e os manifestos do projeto para saber o
   que subir: a aplicação, o banco e só os extras que a arquitetura cita.
   Sem código de aplicação ainda, aponta para `/crow:develop`.
2. Confere o Docker. Com o Docker Desktop fechado, pede para você abrir — não
   abre nem mexe na configuração dele. **No Windows, tudo passa a rodar de
   dentro do Ubuntu do WSL** (ver abaixo).
3. Cria **só o que falta**: `compose.yaml`, `docker/app/Dockerfile`,
   `.dockerignore`, chaves de `.env` e `.env.example`. Arquivo existente é lido
   e usado, nunca sobrescrito sem perguntar.
4. **Pede um sim só para o que o projeto declara**: antes de baixar, lista
   cada imagem com a tag e cada lockfile que vai restaurar, e espera o seu
   ok. Qualquer coisa nova — dependência, imagem, versão, mudança no
   Dockerfile — é perguntada item a item. É a mesma regra da `develop`, em
   [.github/installation-policy.md](../.github/installation-policy.md).
5. Sobe tudo, espera o banco ficar saudável, restaura as dependências, roda
   migrations e seeders, passa `storage/` e `bootstrap/cache` para o
   `www-data` (Laravel) e roda os testes uma vez, só dentro do container.
6. **Confere a URL** antes de entregar: a página precisa responder, os logs
   precisam estar limpos, e a mediana de cinco requisições precisa ficar em
   até 1 s. Acima disso, ela diagnostica antes de entregar.
7. Commita os arquivos de ambiente numa branch `cm-` própria — eles fazem parte
   do projeto, quem clonar consegue rodar. O `.env` nunca vai para o git.
8. Entrega: URL, serviços e portas, resultado da conferência (com a mediana) e
   dos testes, comandos de uso, onde ficam as contas de teste e, no Windows,
   onde o projeto mora no WSL.

## No Windows: o projeto roda de dentro do WSL

Um projeto numa pasta do Windows é lido pelo container através de um bind
mount, e cada arquivo atravessa do Windows para a VM do Docker. Num projeto
Laravel, uma página levava de 4 a 18 s assim e ~0,05 s com o projeto dentro do
Linux do WSL; a suíte de testes caiu de mais de uma hora para menos de oito
minutos. Por isso, no Windows:

- O projeto mora em `~/projects/<nome da pasta>` no Ubuntu, e todo comando roda
  lá dentro (`wsl.exe -d Ubuntu-24.04 --cd ~/projects/<pasta> -- …`). Pelo
  Windows, abra `\\wsl.localhost\Ubuntu-24.04\home\<usuário>\projects\<pasta>`
  ou o terminal do WSL na IDE.
- **Ubuntu ainda não pronto:** ela mostra cada passo e só executa depois do
  seu sim (instalar o Ubuntu, torná-lo a distribuição padrão, pôr o usuário no
  grupo `docker`). Criar o usuário Linux com senha, dar `sudo` e ligar a
  integração WSL no Docker Desktop são seus: ela entrega o passo a passo e
  espera.
- **Projeto ainda no NTFS:** o próprio `up` faz a mudança. Clona a partir do
  repositório local (as branches que só existem na máquina vêm junto), copia o
  que está fora do git (`.env`, arquivos de Docker, arquivos de contexto) em
  LF e mantém o mesmo nome de projeto Compose, então os volumes e o banco são
  os mesmos.
  - **Trabalho não commitado para a mudança:** ela lista os arquivos e espera
    você commitar ou guardar.
  - **A pasta antiga do Windows nunca é apagada.** Ela avisa que a pasta ficou
    para trás e que não se deve mais trabalhar nela; apagar é decisão sua.
- Comando que precisar rodar pelo Windows tira antes as variáveis herdadas
  que colidem com chaves do `.env` — o Compose prefere a variável do ambiente.

Detalhes: [skills/build/references/wsl.md](../skills/build/references/wsl.md).

## Lentidão

A conferência mede cinco requisições à URL. Com a mediana acima de **1 s**, ela
investiga nesta ordem: onde o projeto mora, variáveis herdadas, processos que
ela mesma deixou rodando, carga dos containers e a máquina (memória livre e
processos pesados, com PID e como identificar). Toda correção — inclusive
encerrar processo de fora do projeto ou reiniciar o Docker Desktop — só
acontece depois do seu sim, e ela mede de novo depois. Antes de entregar,
encerra todo processo que abriu em segundo plano.

Detalhes: [skills/build/references/slowness.md](../skills/build/references/slowness.md).

## Docker Desktop

- **Restart** só com o seu sim, e antes ela lista os containers de outros
  projetos que vão parar.
- **Se ele não voltar** (por exemplo, "Some files are not correctly signed"):
  confere assinaturas e o disco de dados, encerra processos presos e elevados
  por um comando com UAC que você aprova, `wsl --shutdown`, sobe de novo e
  confere os volumes. Reinstalar por cima é seu.
- **Nunca, nem com o seu sim:** *Clean / Purge data*, *Reset to factory
  defaults* ou desinstalar. Os três apagam o `docker_data.vhdx`, com as imagens
  e os volumes — o banco — de todos os projetos.

Detalhes: [skills/build/references/docker-desktop.md](../skills/build/references/docker-desktop.md).

## Segurança do ambiente local

- Portas presas em `127.0.0.1`: ninguém na rede alcança o seu ambiente.
- Porta ocupada → ela escolhe a próxima livre e grava no `.env`.
- Imagens com versão fixa, nunca `latest`.
- Segredos só no `.env`, com senhas locais geradas.
- Sem container privilegiado, sem socket do Docker montado, sem pasta de fora
  do projeto montada.
- Todo comando fica restrito ao projeto (`name:` do compose): containers de
  outros projetos não são tocados — fora o restart do Docker Desktop que você
  aprovar — e `docker system prune` nunca roda.
- Duas instâncias do mesmo sistema têm nome de projeto, portas, prefixo do
  Redis e nome do cookie de sessão próprios: o cookie é por host, não por
  porta, e com o mesmo nome uma instância desloga a outra.

## Testes com Node

Se a suíte tem testes que executam JavaScript e a imagem do app não tem Node,
ela propõe copiar o binário da imagem oficial, na versão do Node do projeto, e
só adiciona depois do seu sim. Sem o sim, diz quais testes não rodaram.

## Contas e dados de teste

Vêm dos seeders do projeto. Sem seeders, ela escreve um que só roda no
ambiente local, com uma conta por papel do documento de requisitos e dados
fictícios. As credenciais ficam no seeder ou no `.env.example` — ela aponta
onde, sem repetir no chat.

## Stacks

[skills/build/references/stacks.md](../skills/build/references/stacks.md) tem
o padrão de PHP/Laravel, PostgreSQL, Node.js, Python e dos extras (Redis,
Mailpit). PHP/Laravel tem o conjunto completo em
[skills/build/templates/php-laravel/](../skills/build/templates/php-laravel/).

## Limitações

- Só local. Homologação e produção estão fora, por decisão sua.
- O template ainda não foi levantado de verdade, e o fluxo do WSL só foi
  exercido à mão, no Hub, antes de virar regra — ver [testing.md](testing.md).
