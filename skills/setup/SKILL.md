---
name: setup
description: Sets the user's personal preferences for the crow plugin — name, languages, branch pattern, push, commit granularity and prefixes, code and database naming, the Windows/WSL environment, the build's slowness threshold and the analyst's pace — and writes them into the preferences table of the conventions skill. Runs on the first session after crow is installed and after every update, when the session-start hook asks for it, and whenever he calls /crow:setup to change something.
argument-hint: "[show]"
---

# Preferences setup

Arguments: $ARGUMENTS

`show` prints the current preferences and changes nothing. Anything else, or
nothing, runs the setup below. Talk to him in the language he writes in.

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

## What this skill owns

- **The catalog**: [references/preferences.md](references/preferences.md) —
  every preference, its group, the question to ask and its default.
- **His answers**: `~/.claude/crow/preferences.md`. It lives outside the plugin
  so updates never erase it. Nothing else in the plugin writes to it.
- **The table in the conventions**: the block between
  `<!-- crow:preferences:start -->` and `<!-- crow:preferences:end -->` in
  [../conventions/SKILL.md](../conventions/SKILL.md), which the session-start
  hook rewrites from his answers.

Only what the catalog lists is asked. Everything under "Not preferences" in the
catalog stays as it is, whatever he answers — if he asks to change one of
those, say it is fixed for every user and why, and carry on.

## 1. Find out where things stand

Read the catalog, his answers file if it exists, and the plugin version in
`.claude-plugin/plugin.json`, two folders above this skill's directory.

| Situation | Mode |
| --- | --- |
| no answers file | **first run** — start from the defaults |
| answers saved under another `crow_version` | **update** — start from his saved values |
| answers saved under this version | **on demand** — start from his saved values |

In update mode, a preference in the catalog that is missing from his file is
**new in this version**: it is always asked on its own, even if he keeps the
rest.

## 2. Ask — simple first, detail only where he wants it

One question per message. When the answer space can be enumerated, use
AskUserQuestion; otherwise ask in plain text.

1. **Keep or adjust.** Show the full table with the starting values (defaults
   on a first run, his values otherwise) and ask whether to keep it as it is or
   adjust some. On a first run, say in one line why: these are the personal
   choices the other `crow` skills will follow.
2. **Which groups.** If he adjusts, ask which groups — the catalog's four
   groups, several allowed.
3. **Each preference** of the chosen groups, one at a time, using the
   catalog's question. Offer the current value first, marked as current, and
   one or two common alternatives when there are obvious ones; the free answer
   is always there.
4. **New preferences**, in update mode, one at a time the same way.

A vague answer gets a follow-up until it can be applied: "branch curta" → which
prefix, from which base branch.

## 3. Save

Create `~/.claude/crow/` if needed and write `~/.claude/crow/preferences.md`
with exactly this shape — one row per catalog entry, in catalog order, nothing
else:

```markdown
---
crow_version: <plugin version>
updated: <YYYY-MM-DD>
---

| Preferência | Valor |
| --- | --- |
| <preferência> | <valor> |
```

Keep his words; values that are names, paths or prefixes go in backticks, as
in the catalog.

## 4. Apply now

Run the session-start hook once, so the conventions table shows his answers in
this session instead of the next one:

```bash
bash "<plugin root>/hooks/session-start.sh"
```

`<plugin root>` is two folders above this skill's directory. Then read the
block in the conventions back and check it matches the file. If the hook could
not write it, say so: the answers are saved and the next session applies them.

## 5. Report

The final table, where it is saved, that `/crow:setup` changes it at any time
and `/crow:setup show` prints it, and which skills each changed preference
affects (the catalog's last column). Then go back to whatever he had asked
before the setup started.
