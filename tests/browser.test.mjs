import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findBrowser } from "../lib/browser.mjs";

const browserScript = join(dirname(fileURLToPath(import.meta.url)), "..", "lib", "browser.mjs");
const noBrowser = findBrowser() ? false : "no Chrome or Edge on this machine";

const form = `<!doctype html><html><head><title>Centros de Custo - Novo</title></head><body>
<h1>Novo centro de custo</h1>
<form onsubmit="event.preventDefault(); document.getElementById('ok').hidden = false;">
<label for="code">Codigo *</label> <input id="code" name="code" required maxlength="10">
<label>Senha <input type="password" name="secret"></label>
<label for="kind">Tipo</label> <select id="kind"><option>Administrativo</option><option>Produtivo</option></select>
<button type="submit">Salvar</button>
</form><div id="ok" role="alert" hidden>Centro de custo cadastrado.</div></body></html>`;

test("RF-02 drives the installed browser: summary, fill, mark, screenshot, click, PDF", { skip: noBrowser, timeout: 90000 }, () => {
  const sandbox = mkdtempSync(join(tmpdir(), "crow-browser-test-"));
  const env = { ...process.env, CROW_HOME: join(sandbox, "home") };
  const run = (...args) => JSON.parse(execFileSync(process.execPath, [browserScript, ...args], { env, encoding: "utf8" }));
  const page = join(sandbox, "form.html");
  writeFileSync(page, form);
  try {
    run("start", "--url", pathToFileURL(page).href);

    const summary = run("summary");
    assert.equal(summary.title, "Centros de Custo - Novo");
    const code = summary.elements.find((element) => element.target === "css:#code");
    assert.equal(code.required, true);
    assert.equal(code.maxlength, 10);
    assert.ok(summary.elements.some((element) => element.target === "text:Salvar"));

    run("fill", "label:Codigo", "CC-01");
    run("fill", "label:Senha", "nao-deve-aparecer");
    run("select", "css:#kind", "Produtivo");
    const filled = run("summary");
    assert.equal(filled.elements.find((element) => element.target === "css:#code").value, "CC-01");
    assert.equal(filled.elements.find((element) => element.label === "Senha").value, "***");

    run("mark", "text:Salvar", "1", "--note", "Clique em Salvar");
    run("shot", join(sandbox, "passo1.png"));
    assert.ok(statSync(join(sandbox, "passo1.png")).size > 1000);
    assert.deepEqual([...readFileSync(join(sandbox, "passo1.png")).subarray(1, 4)], [0x50, 0x4e, 0x47]);

    run("click", "text:Salvar");
    assert.deepEqual(run("summary").messages, ["Centro de custo cadastrado."]);

    run("pdf", page, join(sandbox, "form.pdf"));
    assert.equal(readFileSync(join(sandbox, "form.pdf")).subarray(0, 4).toString(), "%PDF");
  } finally {
    try { run("stop"); } catch {}
    rmSync(sandbox, { recursive: true, force: true });
  }
  assert.equal(existsSync(join(sandbox, "home", "browser-session.json")), false);
});
