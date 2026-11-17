# Preferences catalog

Every personal preference of the `crow` plugin, in the order the table shows
them. The default is the value the plugin ships with. The `Group` decides which
answers are asked together when he chooses to adjust.

| Preferência | Group | Question to ask | Default | Used by |
| --- | --- | --- | --- | --- |
| Nome | Identidade e idiomas | Como devo te chamar? | Caique | every skill ("he" in the texts) |
| Idioma da conversa | Identidade e idiomas | Em que idioma devo falar com você? | o mesmo em que ele escrever | every skill |
| Idioma dos documentos (contexto, requisitos, relatórios) | Identidade e idiomas | Em que idioma ficam os documentos que o crow escreve? | português | context, analyst, develop, security-validation |
| Idioma de commits e comentários no código | Identidade e idiomas | Em que idioma ficam as mensagens de commit e os comentários no código? | inglês | conventions |
| Prefixo de branch | Git | Qual o padrão do nome de branch? | `cm-` seguido de um título curto, minúsculo, com hífens | conventions, develop, build |
| Branch base | Git | De qual branch as novas partem? | `main` | conventions, develop, build |
| Push | Git | O agente pode fazer push? | nunca: o agente para no commit, e o push é dele | conventions, develop, build |
| Reescrever commits | Git | Um commit já feito pode ser reescrito (amend, rebase)? | nunca sem ele pedir; um erro já commitado vai num commit novo | conventions |
| Testes no commit | Git | Testes vão no mesmo commit da mudança? | junto no desenvolvimento novo; em commit próprio na alteração não trivial | conventions |
| Documentação no commit | Git | Documentação vai em commit próprio? | sempre num commit `docs:` próprio, o último da mudança | conventions |
| Prefixos de commit | Git | Quais prefixos de commit usar? | `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `ci`, `chore` — sem escopo | conventions |
| Nomes no código | Código | Como nomear variáveis, métodos e classes? | `camelCase` em variáveis e métodos, `PascalCase` em classes | conventions |
| Nomes no banco | Código | Como nomear tabelas e colunas? | `snake_case` | conventions |
| Ambiente no Windows | Ambiente e ritmo | No Windows, onde o ambiente local roda? | WSL, distribuição `Ubuntu-24.04` | build |
| Pasta dos projetos no WSL | Ambiente e ritmo | Em que pasta do WSL os projetos ficam? | `~/projects/<nome da pasta>` | build |
| Limite de lentidão da build | Ambiente e ritmo | A partir de quanto tempo de resposta o ambiente é lento? | mediana acima de 1 s | build |
| Ritmo da analyst | Ambiente e ritmo | Como a analyst pergunta? | uma pergunta por mensagem | analyst |

## Not preferences

These stay fixed for every user, because they protect the work rather than
express a taste: the non-negotiable rules (no co-authorship, subagents only
when asked, never start over, ask before a large change), the shared
installation policy, context files kept out of git, and the good-practice
sections of the conventions — design, security, testing, one commit per
change, order by dependency, hooks never skipped.
