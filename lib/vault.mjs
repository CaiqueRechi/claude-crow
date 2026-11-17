// Local encryption for crow data: an app key per machine, AES-256-GCM files, and
// the key wrapped by a key derived from the user's security answer so it can be
// recovered. Node built-ins only.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const keyLength = 32;
const scryptOptions = { N: 16384, r: 8, p: 1 };

export function crowHome() {
  return process.env.CROW_HOME ?? join(homedir(), ".claude", "crow");
}

const appKeyFile = () => join(crowHome(), "app-key");
const vaultFile = () => join(crowHome(), "vault.json");
// Folders holding encrypted data; a reset moves them to a backup instead of deleting.
const encryptedFolders = ["fluxos", "catalogs", "private"];

function writePrivateFile(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, { mode: 0o600 });
}

export function encrypt(key, plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { v: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") };
}

export function decrypt(key, sealed) {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(sealed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(sealed.data, "base64")), decipher.final()]);
}

function wrapKey(appKey, question, answer) {
  const salt = randomBytes(16);
  const answerKey = scryptSync(answer, salt, keyLength, scryptOptions);
  return { version: 1, question, salt: salt.toString("base64"), wrapped: encrypt(answerKey, appKey) };
}

export function vaultStatus() {
  const vault = existsSync(vaultFile()) ? JSON.parse(readFileSync(vaultFile(), "utf8")) : null;
  return { home: crowHome(), hasKey: existsSync(appKeyFile()), hasVault: vault !== null, question: vault?.question ?? null };
}

export function createVault(question, answer) {
  if (!question || !answer) throw new Error("a security question and its answer are required");
  if (existsSync(appKeyFile()) || existsSync(vaultFile())) throw new Error("a vault already exists; use recover or reset");
  const appKey = randomBytes(keyLength);
  writePrivateFile(appKeyFile(), appKey.toString("hex"));
  writePrivateFile(vaultFile(), JSON.stringify(wrapKey(appKey, question, answer), null, 2));
  return vaultStatus();
}

export function loadKey() {
  if (!existsSync(appKeyFile())) throw new Error("no app key on this machine; run recover with the security answer, or reset");
  return Buffer.from(readFileSync(appKeyFile(), "utf8").trim(), "hex");
}

export function recoverKey(answer) {
  if (!existsSync(vaultFile())) throw new Error("no vault on this machine; only reset is possible");
  const vault = JSON.parse(readFileSync(vaultFile(), "utf8"));
  const answerKey = scryptSync(answer, Buffer.from(vault.salt, "base64"), keyLength, scryptOptions);
  let appKey;
  try {
    appKey = decrypt(answerKey, vault.wrapped);
  } catch {
    throw new Error("the answer does not match the security question");
  }
  writePrivateFile(appKeyFile(), appKey.toString("hex"));
  return vaultStatus();
}

// Starts over with a new key. Encrypted data under the old key is moved, never deleted,
// so it can still be opened if the old answer is remembered.
export function resetVault(question, answer) {
  const backup = join(crowHome(), "backup", new Date().toISOString().replace(/[:.]/g, "-"));
  const moved = [];
  for (const name of [...encryptedFolders, "app-key", "vault.json"]) {
    const source = join(crowHome(), name);
    if (!existsSync(source)) continue;
    mkdirSync(backup, { recursive: true });
    renameSync(source, join(backup, name));
    moved.push(name);
  }
  createVault(question, answer);
  return { ...vaultStatus(), backup: moved.length ? backup : null, moved };
}

export function writeEncrypted(path, plaintext) {
  writePrivateFile(path, JSON.stringify(encrypt(loadKey(), Buffer.from(plaintext))));
}

export function readEncrypted(path) {
  return decrypt(loadKey(), JSON.parse(readFileSync(path, "utf8"))).toString("utf8");
}

// Encrypts every file under a plaintext folder into a mirror of .enc files.
export function encryptFolder(sourceFolder, targetFolder) {
  const written = [];
  const walk = (relative) => {
    for (const entry of readdirSync(join(sourceFolder, relative), { withFileTypes: true })) {
      const path = join(relative, entry.name);
      if (entry.name === ".git") continue;
      if (entry.isDirectory()) walk(path);
      else {
        writeEncrypted(join(targetFolder, `${path}.enc`), readFileSync(join(sourceFolder, path)));
        written.push(path.replace(/\\/g, "/"));
      }
    }
  };
  walk("");
  return written;
}

function readStdinJson() {
  const input = readFileSync(0, "utf8").trim();
  return input ? JSON.parse(input) : {};
}

function runCli([command, ...args]) {
  // The answer comes on stdin, never as an argument, so it stays out of process lists.
  const commands = {
    status: () => vaultStatus(),
    init: () => { const { question, answer } = readStdinJson(); return createVault(question, answer); },
    recover: () => recoverKey(readStdinJson().answer),
    reset: () => { const { question, answer } = readStdinJson(); return resetVault(question, answer); },
    "encrypt-folder": () => ({ written: encryptFolder(args[0], args[1]) }),
  };
  if (!commands[command]) throw new Error(`unknown command ${command}; use ${Object.keys(commands).join(", ")}`);
  return commands[command]();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    console.log(JSON.stringify(runCli(process.argv.slice(2))));
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}

