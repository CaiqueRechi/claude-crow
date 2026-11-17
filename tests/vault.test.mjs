import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const vault = await import("../lib/vault.mjs");

function withCrowHome(runScenario) {
  const home = mkdtempSync(join(tmpdir(), "crow-vault-"));
  const previous = process.env.CROW_HOME;
  process.env.CROW_HOME = home;
  try {
    runScenario(home);
  } finally {
    if (previous === undefined) delete process.env.CROW_HOME;
    else process.env.CROW_HOME = previous;
    rmSync(home, { recursive: true, force: true });
  }
}

test("RF-07 creates an app key and a vault that never stores the answer", () => {
  withCrowHome((home) => {
    const status = vault.createVault("Qual o nome do gato?", "Salem");
    assert.equal(status.hasKey, true);
    assert.equal(status.question, "Qual o nome do gato?");
    assert.ok(!readFileSync(join(home, "vault.json"), "utf8").includes("Salem"));
  });
});

test("RF-07 encrypts and decrypts a file with the app key", () => {
  withCrowHome((home) => {
    vault.createVault("q", "a");
    const path = join(home, "fluxos", "hub.json.enc");
    vault.writeEncrypted(path, '{"flows":[]}');
    assert.ok(!readFileSync(path, "utf8").includes("flows"));
    assert.equal(vault.readEncrypted(path), '{"flows":[]}');
  });
});

test("RF-07 recovers a lost app key with the right answer, case sensitive", () => {
  withCrowHome((home) => {
    vault.createVault("q", "Salem");
    const path = join(home, "fluxos", "hub.json.enc");
    vault.writeEncrypted(path, "segredo");
    rmSync(join(home, "app-key"));

    assert.throws(() => vault.recoverKey("salem"), /does not match/);
    vault.recoverKey("Salem");
    assert.equal(vault.readEncrypted(path), "segredo");
  });
});

test("RF-07 reset starts over and keeps the old data as a backup", () => {
  withCrowHome((home) => {
    vault.createVault("q", "a");
    vault.writeEncrypted(join(home, "fluxos", "hub.json.enc"), "antigo");

    const result = vault.resetVault("nova pergunta", "nova resposta");

    assert.equal(existsSync(join(home, "fluxos")), false);
    assert.ok(result.backup);
    assert.deepEqual(result.moved.sort(), ["app-key", "fluxos", "vault.json"]);
    assert.ok(existsSync(join(result.backup, "fluxos", "hub.json.enc")));
    assert.equal(vault.vaultStatus().question, "nova pergunta");
  });
});

test("RF-07 encrypts a whole plaintext folder into .enc files, skipping .git", () => {
  withCrowHome((home) => {
    vault.createVault("q", "a");
    const source = join(home, "clone");
    mkdirSync(join(source, "hub"), { recursive: true });
    mkdirSync(join(source, ".git"), { recursive: true });
    writeFileSync(join(source, "hub", "acessos.json"), '{"modules":{}}');
    writeFileSync(join(source, ".git", "config"), "x");

    const written = vault.encryptFolder(source, join(home, "private"));

    assert.deepEqual(written, ["hub/acessos.json"]);
    assert.deepEqual(readdirSync(join(home, "private", "hub")), ["acessos.json.enc"]);
    assert.equal(vault.readEncrypted(join(home, "private", "hub", "acessos.json.enc")), '{"modules":{}}');
  });
});
