---
name: create-test-users
description: Creates or corrects, in the local environment's database, one test user per user preset of an application's access map — level, type, screen permissions, approval rules and, for presets assigned by a designation, the record that designates them — following the application's own rules and documentation through a recipe learned once and approved by him. E-mail crow.<module>.<preset>@teste.local, password equal to the e-mail. Runs when he calls /crow:create-test-users, or when generate-flows or generate-test-steps need a user that does not exist.
argument-hint: "[<módulo>.<preset> | <módulo> | todos]"
disable-model-invocation: true
---

# Create test users

Arguments: what he wrote after `/crow:create-test-users` — one preset
(`legal.member`), a whole module (`legal`) or `todos`. When another skill sent
you here, it names the preset.

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

## Before creating

Read [../generate-flows/references/application.md](../generate-flows/references/application.md)
and settle the application and its local environment. Local only: the database
is the one of the project's `/crow:build` environment, reached through it (for
example `docker compose exec -T db mysql …` from the project folder in WSL).
Any other database is refused, whoever asks.

The presets come from the access map: `access-map.mjs module <app> <module>`
lists them; `preset <app> <module.preset>` gives one preset's level, type,
permissions per screen, `approver_of`, `global_admin` and `assigned_by`.

## 1. The recipe

Writing straight to the database must respect the application's rules, so each
application gets a recipe, learned once.

- **Look for it**: `vault.mjs read private/<app>/receita-usuarios.json.enc`
  (from the private repository), then `vault.mjs read receitas/<app>.json.enc`
  (made on this machine).
- **None yet**: read what the application documents about users and access —
  the files the access map's `about` and modules point to (in the Hub,
  `docs/user-presets.md` and `docs/permissoes.md`), the migrations of the user,
  permission, approval and designation tables, and the code that creates a user
  from a preset when one exists. Write the recipe: which tables and columns, in
  which order, how a screen grant and its scope are stored, how an approval rule
  names its approver, how each kind of `assigned_by` designation is recorded,
  how the password is hashed, and the rules to check before writing (for
  example, a minimum level for a screen). Hash passwords with the language's
  own function inside the local environment (in PHP,
  `php -r "echo password_hash('…', PASSWORD_BCRYPT);"` in the app container);
  never install anything for it.
- **Show it to him** and save only after his ok:
  `echo '<recipe>' | node "<plugin root>/lib/vault.mjs" write receitas/<app>.json.enc`.
  If he is the owner and wants it in the private repository, hand it to him in
  plaintext to commit as `<app>/receita-usuarios.json`.
- **When the recipe fails** because the schema changed, redo only the part
  that broke and ask his ok again.

## 2. Create or correct each user

For each preset asked:

1. E-mail `crow.<module>.<preset>@teste.local` (lowercase); password equal to
   the e-mail. If the application's password policy (from its documentation or
   validation) refuses that password, stop and tell him instead of writing a
   password the login will reject.
2. Look the user up by e-mail. **Exists**: compare level, type, permissions,
   approvals and designation with the preset and correct only what differs.
   **Does not exist**: create it following the recipe. One user per preset,
   never duplicated.
3. **`assigned_by`**: create, in the local database, the test record that
   designates the user (the category whose responsible it is, the list it is
   on), following the `assigned_by` text and the documentation. When neither
   says how, read [../generate-flows/SKILL.md](../generate-flows/SKILL.md) and
   map the screen that makes the designation.
4. **Check the login**: `browser.mjs start --url <base>`, log in with the
   e-mail and password, `summary`, and confirm the user is in; `stop`.

## 3. Report

Per preset: created, corrected (and what) or already right; the e-mail; the
login check result. Never the password in the report or in a catalog — say it
follows the test-user rule.

## Never

- write to any database but the local environment's;
- create a user for a real person, or with real personal data;
- install anything to hash passwords or reach the database;
- save a recipe he has not approved.
