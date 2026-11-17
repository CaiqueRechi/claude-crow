# Which application, where, and how to run the scripts

Shared by `generate-flows`, `generate-test-steps` and `create-test-users`.

## The scripts

They live in `<plugin root>/lib/`, where `<plugin root>` is two folders above
the skill's directory, need Node 22 or newer, and print JSON. Run them with
`node "<plugin root>/lib/<script>.mjs" …`.

| Script | For |
| --- | --- |
| `access-map.mjs apps \| index <app> \| module <app> <module> \| preset <app> <module.preset> \| screen <app> <screen> \| who-can <app> <screen> <action>` | the application's access map, one part at a time |
| `flows.mjs index <app> \| get <app> <id> \| save <app> (flow on stdin) \| run <app> <id> --base <url> --shots <folder> \| export <app> <folder>` | flows |
| `browser.mjs start [--url <url>] \| goto <url> \| summary [--max <n>] \| fill <target> <value> \| select <target> <option> \| click <target> \| mark <target> <n> [--note <text>] \| clear-marks \| shot <file> \| pdf <html> <out.pdf> \| stop` | the installed Chrome or Edge |
| `catalog.mjs save <app> <name> <catalog.md> <prints folder> \| list <app> \| open <app> <name> \| pdf <opened folder>` | catalogs |
| `vault.mjs read <path> \| write <path> (content on stdin)` | one encrypted file under `~/.claude/crow/` |

Never print a whole access map or flow file into the conversation: ask the
script for the index, then for the one part you need.

## The application

1. **Which access map.** `access-map.mjs apps` lists the applications whose map
   came from the private repository. Match the current project — its git
   remote or folder name — to one of them (a project whose remote is
   `hub-ibipora` matches `hub`). Not obvious, or no map at all: ask him which
   one, or whether to go on without a map (the flows then rely on what the
   screens show).
2. **Where it runs.** The base URL is the project's local environment: the
   `APP_URL` in its `.env`, the one `/crow:build` set up. Missing: ask him.
3. **Local only.** The base URL must point at `localhost` or `127.0.0.1`. Any
   other host — homologation, production, a shared server — is refused, whoever
   asks: mapping saves and deletes data freely.
4. **The browser.** `browser.mjs start --url <base>` once per task, `stop` at
   the end, always — including when something fails. It runs headless; pass
   `--headed` only if he wants to watch.

## Tokens

The model sees `summary` output (fields, buttons, links and messages, passwords
masked), never screenshots: prints go straight to files. A flow already mapped
is replayed by `flows.mjs run` without the model. On the first real use of each
skill, tell him to note the token usage of the session (`/cost` or the usage
panel) so it can be measured.
