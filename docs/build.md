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
   abre nem mexe na configuração dele.
3. Cria **só o que falta**: `compose.yaml`, `docker/app/Dockerfile`,
   `.dockerignore`, chaves de `.env` e `.env.example`. Arquivo existente é lido
   e usado, nunca sobrescrito sem perguntar.
4. Sobe tudo, espera o banco ficar saudável, instala dependências, roda
   migrations e seeders, e roda os testes uma vez.
5. **Confere a URL** antes de entregar: a página precisa responder e os logs
   precisam estar limpos.
6. Commita os arquivos de ambiente numa branch `cm-` própria — eles fazem parte
   do projeto, quem clonar consegue rodar. O `.env` nunca vai para o git.
7. Entrega: URL, serviços e portas, resultado da conferência e dos testes,
   comandos de uso e onde ficam as contas de teste.

## Segurança do ambiente local

- Portas presas em `127.0.0.1`: ninguém na rede alcança o seu ambiente.
- Porta ocupada → ela escolhe a próxima livre e grava no `.env`.
- Imagens com versão fixa, nunca `latest`.
- Segredos só no `.env`, com senhas locais geradas.
- Sem container privilegiado, sem socket do Docker montado, sem pasta de fora
  do projeto montada.
- Todo comando fica restrito ao projeto (`name:` do compose): containers de
  outros projetos não são tocados, e `docker system prune` nunca roda.

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
- O template ainda não foi levantado de verdade — ver
  [testing.md](testing.md).
