import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const vault = await import("../lib/vault.mjs");
const { syncPrivate } = await import("../lib/private-sync.mjs");

function withCrowHome(runScenario) {
  const sandbox = mkdtempSync(join(tmpdir(), "crow-sync-"));
  const previous = process.env.CROW_HOME;
  process.env.CROW_HOME = join(sandbox, "home");
  try {
    vault.createVault("q", "a");
    runScenario(sandbox);
  } finally {
    if (previous === undefined) delete process.env.CROW_HOME;
    else process.env.CROW_HOME = previous;
    rmSync(sandbox, { recursive: true, force: true });
  }
}

function makeRepository(folder) {
  mkdirSync(join(folder, "exemplo"), { recursive: true });
  writeFileSync(join(folder, "exemplo", "acessos.json"), '{"modules":{}}');
  const git = (...args) => execFileSync("git", ["-C", folder, ...args], { stdio: "ignore" });
  git("init", "-q", "-b", "main");
  git("add", ".");
  git("-c", "user.name=crow", "-c", "user.email=crow@teste.local", "commit", "-q", "-m", "seed");
}

test("RF-08 the private repository arrives encrypted and the plaintext clone is deleted", () =>
  withCrowHome((sandbox) => {
    const repository = join(sandbox, "repo");
    makeRepository(repository);
    const before = readdirSync(tmpdir()).filter((name) => name.startsWith("crow-private-")).length;

    const result = syncPrivate(repository);

    assert.equal(result.cloned, true);
    assert.deepEqual(result.files, ["exemplo/acessos.json"]);
    assert.equal(vault.readEncrypted(join(process.env.CROW_HOME, "private", "exemplo", "acessos.json.enc")), '{"modules":{}}');
    assert.equal(readdirSync(tmpdir()).filter((name) => name.startsWith("crow-private-")).length, before);
  }));

test("RN-02 without access, setup only prepares the folders for the user's own flows", () =>
  withCrowHome((sandbox) => {
    const result = syncPrivate(join(sandbox, "no-such-repository"));
    assert.equal(result.cloned, false);
    assert.ok(existsSync(join(process.env.CROW_HOME, "fluxos")));
    assert.equal(existsSync(join(process.env.CROW_HOME, "private")), false);
    assert.equal(syncPrivate("nenhum").cloned, false);
  }));
