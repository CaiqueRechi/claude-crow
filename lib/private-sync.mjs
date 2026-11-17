// Brings the private repository to this machine encrypted: a shallow clone into a
// temporary folder, every file encrypted into ~/.claude/crow/private/, and the
// plaintext clone deleted. Without access, it only prepares the local folders.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { crowHome, encryptFolder } from "./vault.mjs";

export function syncPrivate(url) {
  mkdirSync(join(crowHome(), "fluxos"), { recursive: true });
  mkdirSync(join(crowHome(), "catalogs"), { recursive: true });
  if (!url || url === "nenhum") return { cloned: false, reason: "no private repository configured" };

  const clone = mkdtempSync(join(tmpdir(), "crow-private-"));
  try {
    execFileSync("git", ["clone", "--quiet", "--depth", "1", url, clone], { stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } });
  } catch (error) {
    rmSync(clone, { recursive: true, force: true });
    return { cloned: false, reason: String(error.stderr ?? error.message).trim().split("\n").pop() };
  }
  try {
    // Replaced whole on every sync: the repository is the source, nothing local lives here.
    rmSync(join(crowHome(), "private"), { recursive: true, force: true });
    const written = encryptFolder(clone, join(crowHome(), "private"));
    return { cloned: true, files: written };
  } finally {
    rmSync(clone, { recursive: true, force: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    console.log(JSON.stringify(syncPrivate(process.argv[2])));
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}
