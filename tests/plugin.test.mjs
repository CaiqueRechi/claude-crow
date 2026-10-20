import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const retiredRepositoryName = "rm-skill-claude";
// Files that record the project's history and so must keep the old name.
const historyFiles = ["docs/testing.md"];

function migrationSectionLines(markdown) {
  const lineNumbers = new Set();
  let insideFence = false;
  let insideMigration = false;

  markdown.split(/\r?\n/).forEach((line, index) => {
    if (line.startsWith("```")) insideFence = !insideFence;
    const heading = insideFence ? null : line.match(/^#{1,6}\s+(.*)/);
    if (heading) insideMigration = heading[1].startsWith("Vindo do");
    if (insideMigration) lineNumbers.add(index + 1);
  });

  return lineNumbers;
}

function trackedLinesMentioning(text, excludedFile) {
  try {
    return execFileSync("git", ["grep", "-n", text, "--", ".", `:(exclude)${excludedFile}`], {
      cwd: repositoryRoot,
      encoding: "utf8",
    })
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean);
  } catch (error) {
    if (error.status === 1) return [];
    throw error;
  }
}

test("the retired rm-skill-claude name appears only where the move is explained", () => {
  const readmeMigrationLines = migrationSectionLines(readFileSync(join(repositoryRoot, "README.md"), "utf8"));

  const strayMentions = trackedLinesMentioning(retiredRepositoryName, "tests/plugin.test.mjs").filter((match) => {
    const [file, lineNumber] = match.split(":");
    if (historyFiles.includes(file)) return false;
    return !(file === "README.md" && readmeMigrationLines.has(Number(lineNumber)));
  });

  assert.deepEqual(strayMentions, [], `use claude-crow instead of ${retiredRepositoryName} in:\n${strayMentions.join("\n")}`);
});

// The names the skills had before he ruled that every name is in English.
const retiredPortugueseNames = ["analista", "convencoes", "contexto", "seguranca", "requisitos"];

test("every skill has an English, command-friendly name", () => {
  const skillNames = readdirSync(join(repositoryRoot, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const name of skillNames) {
    assert.match(name, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${name} is not lowercase words joined by hyphens`);
    assert.ok(!retiredPortugueseNames.includes(name), `${name} is a Portuguese name`);
  }
});
