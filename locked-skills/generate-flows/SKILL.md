---
name: generate-flows
description: Maps the flow of one operation in a local application — the end-to-end path from login to the final result — opening the screens in the installed Chrome or Edge, reading them as compact text instead of screenshots, and recording each step, the user preset that can do it, every field's rules with where each rule came from, the expected result and the presets that must be refused. Shows him a summary and saves the flow, encrypted, only after his ok. Remaps only from the step that broke when a screen changed. Runs when he calls /crow:generate-flows, or when generate-test-steps or create-test-users need a flow that does not exist.
argument-hint: "[operação a mapear, em texto livre]"
disable-model-invocation: true
---

# Generate flows

Arguments: what he wrote after `/crow:generate-flows` — a free description of
the operation ("cadastro de centro de custo pelo menu Administração"). When
another skill sent you here, it passes the operation and, when remapping, the
flow id and the step that failed.

Talk to him in the language he writes in.

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

## Before mapping

Read [references/application.md](references/application.md) and settle the
application, the local base URL and the browser session. Read
[references/flow-format.md](references/flow-format.md): it is the shape you
save.

`flows.mjs index <app>`: if a flow for this operation already exists, say so
and ask whether he wants it remapped. Remapping a flow that broke starts at the
failed step — see the last section.

## 1. Find the screen and who can use it

From the access map, one query at a time:

- `index <app>` → the module and the screen key the operation belongs to;
- `screen <app> <screen>` → its pages: `menu_path`, URL and the `access` each
  page asks (`read`, `write`, a middleware, `public`, or `null` when the code
  decides);
- `who-can <app> <screen> <action>` → the presets that can do it (positive
  test) and the ones in the same module that cannot (negative tests).

Pick the narrowest preset that can do it — not a global admin when a module
preset exists. A screen with `mapped: false` has no pages in the map: find it
through the menu.

## 2. Log in as that preset

The preset's test user must exist: read
[../create-test-users/SKILL.md](../create-test-users/SKILL.md) and follow it
for this preset if `flows.mjs` has never logged in with it. Then open the login
page (the `guest` page of the map, usually `/login`), `summary`, fill e-mail
and password with `{{user.email}}` / `{{user.password}}` and submit. These
login steps are the first steps of the flow.

## 3. Walk to the result

At each screen: `summary`, decide the next action, act (`fill`, `select`,
`click`), `summary` again. Prefer the menu path a person would take when the
operation is about learning the screen; `goto` the page URL when the menu adds
nothing. Mark (`"mark"` in the step) the steps a tester must see: opening the
screen, each field that matters, the button that commits.

Local environment only: create, save and delete as the operation needs.

## 4. Learn every field

For each field of the operation:

- **from the screen** (`source: "tela"`): required, `maxlength`, `pattern`,
  options of a select, the mask; then, to learn the messages, submit once with
  the field empty and once with a value it must refuse, and record the message
  under `invalid_examples`;
- **from the project** (`source: "requisitos:<file>"` or
  `"documentacao:<file>"`): `docs/requirements/`, the module's `documentation`
  in the access map, and other project docs when the screen does not explain a
  rule (a limit, a uniqueness, a business condition);
- **from him** (`source: "dono"`): what neither explains — ask, one question at
  a time.

Every rule records its source. A guess is not a rule.

## 5. The result and the refusals

Record what proves the operation worked: the message and where the browser
landed (`result.expect`). For each preset in `who-can … cannot` of the same
module, log in as it (its user via create-test-users) and record what it sees
instead — a missing button, a 403, a redirect — under `denied_presets`.

## 6. His ok, then save

Show him a short summary: preset, steps (numbered, with the marked ones),
fields with their rules and sources, expected result, refused presets. Save
only after his ok, with `approved_by` and `approved_at` filled:

```bash
echo '<flow json>' | node "<plugin root>/lib/flows.mjs" save <app>
```

Then `browser.mjs stop`. If he is the owner and wants the flow in the private
repository, `flows.mjs export <app> <folder>` writes it in plaintext for him
to copy into `fluxos/<app>.json` of his clone; sending it is his.

## Remapping a broken flow

When `flows.mjs run` failed at step N (generate-test-steps passes the id, N and
the screen summary at the failure):

1. `get <app> <id>`; keep steps 1 to N-1 as they are.
2. Replay them (`run` stops at N again), then map from step N onward as above.
3. Show him what changed — the old steps from N and the new ones — and save the
   whole flow again only after his ok.

## Never

- map on any host but localhost or 127.0.0.1;
- put a screenshot into the conversation, or a whole access map or flow file;
- save a flow he has not approved, or a rule without its source;
- write the private repository's URL anywhere, or send anything to it.

## Last step: usage log

After the report, unless another `crow` skill called this one — then the caller closes the run.
`<plugin root>` is two folders above this file.

1. `node "<plugin root>/lib/usage-log.mjs" status`. When `open` and `rating`
   are both true, ask with AskUserQuestion for a rating of the result from 1 to 5 (options 5, 4, 3 and 2; 1 or skipping go in
   the free answer). A 1 or 2 gets one optional follow-up in plain text — what
   fell short — warning that it goes in the file sent to the `crow` author and
   must carry no code, names or client data.
2. `node "<plugin root>/lib/usage-log.mjs" finish --rating <1-5|pulada|nao-pedida> [--comment '<text>']`,
   with `nao-pedida` when `rating` is false. Do not mention the log otherwise.
