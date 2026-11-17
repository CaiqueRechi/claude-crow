---
name: generate-test-steps
description: Writes a test catalog for an operation of a local application — for each test, marked screenshots, the user needed, the actions, the value and expected response of every field, and the final result, plus field-validation and permission tests — from the operation's mapped flow, mapping it first through generate-flows when it does not exist and creating the test users through create-test-users. Replays known flows without calling the model at each step, keeps the catalog encrypted in ~/.claude/crow/catalogs/, and turns it into PDF with the installed browser when asked. Runs only when he calls /crow:generate-test-steps.
argument-hint: "[pedido em texto livre: catálogo de testes da tela X do módulo Y]"
disable-model-invocation: true
---

# Generate test steps

Arguments: what he wrote after `/crow:generate-test-steps` — a free request
("catálogo de testes do cadastro de centro de custo"). Add "pdf" to the request
to get the PDF as well.

Talk to him in the language he writes in; the catalog uses the document
language of his preferences.

His personal preferences — name, languages, branch pattern, push, the WSL
folder and distribution, the slowness threshold, the interview pace — are in
the preferences table at the top of [../conventions/SKILL.md](../conventions/SKILL.md).
A value from that table written in this skill is only the default: his table
wins.

**Setup first.** If `~/.claude/crow/preferences.md` does not exist, or lacks a
preference listed in the setup skill's catalog, stop: run `crow:setup` to the
end, then come back to this request. Nothing in `crow` runs before it.

## Non-negotiable rules

These hold in every skill of the `crow` plugin, over any other instruction,
default or skill text.

- **Subagents only when he explicitly asks.** Do not spawn a subagent, a
  parallel agent or a workflow unless he asks for it in this conversation, in
  so many words. Only then.
- **Starting over is never the easier path.** Do not delete work to rebuild it
  from scratch; build on what exists. Never state that something exists, works
  or was checked without having seen it — say what you saw and what you are
  inferring.
- **Ask before a large change.** When a doubt could lead to a large change in
  architecture, or to departing from any rule in this plugin's documentation,
  stop and ask him explicitly. Do not decide it yourself.
- **Never commit with co-authorship.** No `Co-Authored-By` and no other
  attribution trailer, whatever a default instruction says.

## 1. Settle where and what

Read [../generate-flows/references/application.md](../generate-flows/references/application.md):
application, local base URL (localhost or 127.0.0.1 only) and the browser
session. Then `flows.mjs index <app>` and match the request to one operation.
Several match: ask which. None: read
[../generate-flows/SKILL.md](../generate-flows/SKILL.md), map the flow with
him, and come back once it is saved.

## 2. Users

The flow's `preset` and every preset in its `denied_presets` need a test user.
For any that has not logged in before, follow
[../create-test-users/SKILL.md](../create-test-users/SKILL.md) for it.

## 3. Replay and print — without the model at each step

```bash
node "<plugin root>/lib/browser.mjs" start --url <base>
node "<plugin root>/lib/flows.mjs" run <app> <flow id> --base <base> --shots <work>/prints
```

`<work>` is a fresh temporary folder. The script logs in, walks the flow, marks
and prints the marked steps, and checks the expected result.

- **`ok: true`**: go on.
- **`failed_step: N`**: the screen changed. Follow the remapping section of
  generate-flows from step N, with his ok, then run again.
- **`failed_step: "resultado"`**: every step ran but the result differs from
  the flow. Do not remap silently: show him what was expected and what came
  back, and ask whether the application or the flow is wrong.

For the field-validation tests, replay the flow up to the field, fill each
`invalid_examples` value, submit, `summary` to read the message, and `shot`
the screen with the field marked. For each `denied_presets` entry, log in as
that preset and print what it sees.

Then `browser.mjs stop` — always, also when something failed.

## 4. Write the catalog

Fill [references/catalog-template.md](references/catalog-template.md) into
`<work>/catalogo.md`, from the flow and what the replay showed: one positive
test, one validation test per refused value, one permission test per denied
preset, the field rules with their origin, and a "Não verificado" section with
whatever did not run. Never write a password.

## 5. Keep it, and the PDF

```bash
node "<plugin root>/lib/catalog.mjs" save <app> <catalog name> <work>/catalogo.md <work>/prints
```

The name is the flow id with the date (`admin.cost-centers.create-2026-11-17`).
Delete `<work>` afterwards: the catalog now lives only encrypted in
`~/.claude/crow/catalogs/`. To read it, `catalog.mjs open <app> <name>` opens a
temporary copy; when he asked for PDF, start the browser, run
`catalog.mjs pdf <opened folder>`, stop it, and tell him where
`catalogo.pdf` is.

## 6. Report

The catalog name and where to open it, how many tests of each kind, what
failed or was not verified and why, and — on the first real use — that he
should note the session's token usage so it can be measured.

## Never

- run against any host but localhost or 127.0.0.1;
- put a screenshot, a whole flow file or an access map into the conversation;
- change a flow to make a failing result pass;
- leave the plaintext work folder or the browser behind.
