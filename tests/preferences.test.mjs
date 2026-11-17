import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const startMarker = "<!-- crow:preferences:start -->";
const endMarker = "<!-- crow:preferences:end -->";
const catalogFile = join(repositoryRoot, "skills", "setup", "references", "preferences.md");
const lockedSkills = readdirSync(join(repositoryRoot, "locked-skills"));

function readNormalized(path) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

function toPosixPath(path) {
  return path.replace(/\\/g, "/");
}

function tableRows(markdown) {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("| ") && !line.startsWith("| ---") && !line.startsWith("| Preferência |"))
    .map((line) => line.split("|").map((cell) => cell.trim()).filter(Boolean));
}

function preferencesBlock(conventions) {
  const start = conventions.indexOf(startMarker);
  const end = conventions.indexOf(endMarker);
  assert.ok(start >= 0 && end > start, "the conventions must hold the preferences markers in order");
  return conventions.slice(start + startMarker.length, end);
}

function catalogDefaults() {
  return tableRows(readNormalized(catalogFile))
    .filter((row) => row.length === 5)
    .map(([name, , , defaultValue]) => [name, defaultValue]);
}

function answersFile(rows) {
  const table = rows.map(([name, value]) => `| ${name} | ${value} |`).join("\n");
  return ["---", "crow_version: 1.0.0", "updated: 2026-11-17", "---", "", "| Preferência | Valor |", "| --- | --- |", table, ""].join("\n");
}

function withPluginCopy(runScenario) {
  const sandbox = mkdtempSync(join(tmpdir(), "crow-preferences-"));
  const pluginRoot = join(sandbox, "plugin");
  for (const folder of [".claude-plugin", "skills", "locked-skills", "hooks"]) {
    cpSync(join(repositoryRoot, folder), join(pluginRoot, folder), { recursive: true });
  }
  const preferencesFile = join(sandbox, "answers", "preferences.md");
  try {
    runScenario({
      visibleSkills: () => readdirSync(join(pluginRoot, "skills")).sort(),
      conventionsFile: join(pluginRoot, "skills", "conventions", "SKILL.md"),
      runHook: () =>
        execFileSync("bash", [toPosixPath(join(pluginRoot, "hooks", "session-start.sh"))], {
          encoding: "utf8",
          env: {
            ...process.env,
            CLAUDE_PLUGIN_ROOT: toPosixPath(pluginRoot),
            CROW_PREFERENCES_FILE: toPosixPath(preferencesFile),
          },
        }),
      saveAnswers: (rows) => {
        mkdirSync(dirname(preferencesFile), { recursive: true });
        writeFileSync(preferencesFile, answersFile(rows));
      },
    });
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

test("only setup is visible on install; the other skills wait in locked-skills", () => {
  assert.deepEqual(readdirSync(join(repositoryRoot, "skills")), ["setup"]);
  assert.ok(lockedSkills.includes("conventions"));
});

test("every locked skill sends the user to setup first", () => {
  for (const skill of lockedSkills) {
    const text = readNormalized(join(repositoryRoot, "locked-skills", skill, "SKILL.md"));
    assert.ok(text.includes("**Setup first.**"), `${skill} has no setup-first gate`);
  }
});

test("the conventions table shows every catalog preference with its default", () => {
  const table = tableRows(preferencesBlock(readNormalized(join(repositoryRoot, "locked-skills", "conventions", "SKILL.md"))));
  assert.deepEqual(table, catalogDefaults());
});

test("first run: the hook asks for setup and releases nothing", () => {
  withPluginCopy(({ runHook, visibleSkills }) => {
    const context = JSON.parse(runHook()).hookSpecificOutput.additionalContext;
    assert.match(context, /not set their preferences/);
    assert.match(context, /crow:setup/);
    assert.deepEqual(visibleSkills(), ["setup"]);
  });
});

test("a preference the user never answered: the hook asks only for it and releases nothing", () => {
  withPluginCopy(({ runHook, saveAnswers, visibleSkills }) => {
    saveAnswers(catalogDefaults().filter(([name]) => name !== "Ritmo da analyst"));
    const context = JSON.parse(runHook()).hookSpecificOutput.additionalContext;
    assert.ok(context.includes("not answered yet (Ritmo da analyst)"), context);
    assert.deepEqual(visibleSkills(), ["setup"]);
  });
});

test("an update with no new preference does not ask again: the skills are released", () => {
  withPluginCopy(({ runHook, saveAnswers, visibleSkills }) => {
    saveAnswers(catalogDefaults());
    const context = JSON.parse(runHook()).hookSpecificOutput.additionalContext;
    assert.match(context, /released/);
    assert.doesNotMatch(context, /crow:setup/);
    assert.deepEqual(visibleSkills(), [...lockedSkills, "setup"].sort());
  });
});

test("complete answers: the hook writes them into the released conventions", () => {
  withPluginCopy(({ runHook, saveAnswers, conventionsFile }) => {
    const answers = catalogDefaults().map(([name, value]) => [name, name === "Nome" ? "Ana" : value]);
    saveAnswers(answers);
    runHook();
    const conventions = readNormalized(conventionsFile);
    const original = readNormalized(join(repositoryRoot, "locked-skills", "conventions", "SKILL.md"));
    assert.deepEqual(tableRows(preferencesBlock(conventions)), answers);
    assert.equal(conventions.slice(0, conventions.indexOf(startMarker)), original.slice(0, original.indexOf(startMarker)));
    assert.equal(conventions.slice(conventions.indexOf(endMarker)), original.slice(original.indexOf(endMarker)));
  });
});

test("already released and applied: the hook says nothing and touches nothing", () => {
  withPluginCopy(({ runHook, saveAnswers, conventionsFile }) => {
    saveAnswers(catalogDefaults());
    runHook();
    const firstWrite = statSync(conventionsFile).mtimeMs;

    assert.equal(runHook(), "");
    assert.ok(existsSync(conventionsFile));
    assert.equal(statSync(conventionsFile).mtimeMs, firstWrite);
  });
});
