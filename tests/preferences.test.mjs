import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const startMarker = "<!-- crow:preferences:start -->";
const endMarker = "<!-- crow:preferences:end -->";

function readNormalized(path) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
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

const pluginVersion = JSON.parse(readFileSync(join(repositoryRoot, ".claude-plugin", "plugin.json"), "utf8")).version;

function withPluginCopy(runScenario) {
  const sandbox = mkdtempSync(join(tmpdir(), "crow-preferences-"));
  const pluginRoot = join(sandbox, "plugin");
  for (const folder of [".claude-plugin", "skills", "hooks"]) {
    cpSync(join(repositoryRoot, folder), join(pluginRoot, folder), { recursive: true });
  }
  const preferencesFile = join(sandbox, "answers", "preferences.md");
  try {
    runScenario({
      pluginRoot,
      preferencesFile,
      conventionsFile: join(pluginRoot, "skills", "conventions", "SKILL.md"),
      runHook: () =>
        execFileSync("bash", [join(pluginRoot, "hooks", "session-start.sh").replace(/\\/g, "/")], {
          encoding: "utf8",
          env: {
            ...process.env,
            CLAUDE_PLUGIN_ROOT: pluginRoot.replace(/\\/g, "/"),
            CROW_PREFERENCES_FILE: preferencesFile.replace(/\\/g, "/"),
          },
        }),
      saveAnswers: (version, rows) => {
        mkdirSync(dirname(preferencesFile), { recursive: true });
        const table = rows.map(([name, value]) => `| ${name} | ${value} |`).join("\n");
        writeFileSync(preferencesFile, `---\ncrow_version: ${version}\nupdated: 2026-11-17\n---\n\n| Preferência | Valor |\n| --- | --- |\n${table}\n`);
      },
    });
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

test("the conventions table shows every catalog preference with its default", () => {
  const catalog = tableRows(readNormalized(join(repositoryRoot, "skills", "setup", "references", "preferences.md")))
    .filter((row) => row.length === 5)
    .map(([name, , , defaultValue]) => [name, defaultValue]);
  const table = tableRows(preferencesBlock(readNormalized(join(repositoryRoot, "skills", "conventions", "SKILL.md"))));

  assert.deepEqual(table, catalog);
});

test("first run: the hook asks for /crow:setup", () => {
  withPluginCopy(({ runHook }) => {
    const output = JSON.parse(runHook());
    assert.equal(output.hookSpecificOutput.hookEventName, "SessionStart");
    assert.match(output.hookSpecificOutput.additionalContext, /first run/);
    assert.match(output.hookSpecificOutput.additionalContext, /crow:setup/);
  });
});

test("after an update: the hook asks for /crow:setup in update mode", () => {
  withPluginCopy(({ runHook, saveAnswers }) => {
    saveAnswers("0.0.1", [["Nome", "Ana"]]);
    const context = JSON.parse(runHook()).hookSpecificOutput.additionalContext;
    assert.match(context, /update mode/);
    assert.match(context, /0\.0\.1/);
  });
});

test("answers in step: the hook writes them into the conventions and says nothing", () => {
  withPluginCopy(({ runHook, saveAnswers, conventionsFile }) => {
    const before = readNormalized(conventionsFile);
    saveAnswers(pluginVersion, [["Nome", "Ana"], ["Prefixo de branch", "`ab-`"]]);

    assert.equal(runHook(), "");

    const after = readNormalized(conventionsFile);
    assert.deepEqual(tableRows(preferencesBlock(after)), [["Nome", "Ana"], ["Prefixo de branch", "`ab-`"]]);
    assert.equal(after.slice(0, after.indexOf(startMarker)), before.slice(0, before.indexOf(startMarker)));
    assert.equal(after.slice(after.indexOf(endMarker)), before.slice(before.indexOf(endMarker)));
  });
});

test("answers already applied: the hook leaves the conventions untouched", () => {
  withPluginCopy(({ runHook, saveAnswers, conventionsFile }) => {
    saveAnswers(pluginVersion, [["Nome", "Ana"]]);
    runHook();
    const firstWrite = statSync(conventionsFile).mtimeMs;
    const firstContent = readFileSync(conventionsFile, "utf8");

    runHook();

    assert.equal(readFileSync(conventionsFile, "utf8"), firstContent);
    assert.equal(statSync(conventionsFile).mtimeMs, firstWrite);
  });
});
