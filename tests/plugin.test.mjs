import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

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
