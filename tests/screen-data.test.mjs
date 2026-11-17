import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const vault = await import("../lib/vault.mjs");
const accessMap = await import("../lib/access-map.mjs");
const flows = await import("../lib/flows.mjs");
const catalog = await import("../lib/catalog.mjs");
const { commands: browser, findBrowser } = await import("../lib/browser.mjs");

// A made-up application: nothing from a real access map belongs in this public repository.
const sampleMap = {
  index: { modules: { admin: { label: "Administracao", screens: ["costCenters"], presets: { cost_center_admin: "Admin de centros", viewer: "Consulta" } } } },
  about: { what: "exemplo" },
  user_levels: [{ value: 6, name: "Analista Junior" }],
  user_types: [{ value: 1, name: "Supervisor" }],
  modules: {
    admin: {
      label: "Administracao",
      screens: ["costCenters"],
      presets: {
        cost_center_admin: { label: "Admin de centros", user_level: { value: 6 }, user_type: { value: 1 }, global_admin: false, permissions: [{ screen: "costCenters", read: "all", update: "all", create: "all" }], approver_of: [], assigned_by: null },
        viewer: { label: "Consulta", user_level: { value: 6 }, user_type: { value: 1 }, global_admin: false, permissions: [{ screen: "costCenters", read: "all" }], approver_of: [], assigned_by: null },
        root: { label: "Super Admin", user_level: { value: 12 }, user_type: { value: 1 }, global_admin: true, permissions: [], approver_of: [], assigned_by: null },
      },
    },
  },
  screens: { costCenters: { label: "Centros de Custo", kind: "screen", mapped: true, modules: ["admin"], used_by_presets: ["admin.cost_center_admin", "admin.viewer"], pages: [] } },
};

const sampleFlow = {
  id: "admin.cost-centers.create",
  module: "admin",
  screen: "costCenters",
  operation: "Cadastrar centro de custo",
  preset: "admin.cost_center_admin",
  steps: [
    { action: "goto", url: "form.html" },
    { action: "fill", target: "label:Codigo", value: "CC-01", mark: "Informe o codigo" },
    { action: "fill", target: "label:Responsavel", value: "{{user.email}}" },
    { action: "click", target: "text:Salvar", mark: "Clique em Salvar" },
  ],
  fields: [{ target: "label:Codigo", label: "Codigo", rules: [{ rule: "obrigatorio", source: "tela" }, { rule: "ate 10 caracteres", source: "tela" }] }],
  result: { description: "Centro cadastrado", expect: { message: "Centro de custo cadastrado." } },
  approved_at: "2026-11-17",
};

function withCrowHome(runScenario) {
  const home = mkdtempSync(join(tmpdir(), "crow-data-"));
  const previous = process.env.CROW_HOME;
  process.env.CROW_HOME = home;
  vault.createVault("q", "a");
  vault.writeEncrypted(join(home, "private", "exemplo", "acessos.json.enc"), JSON.stringify(sampleMap));
  return Promise.resolve(runScenario(home)).finally(() => {
    if (previous === undefined) delete process.env.CROW_HOME;
    else process.env.CROW_HOME = previous;
    rmSync(home, { recursive: true, force: true });
  });
}

test("RF-01 the access map answers only the part asked for", () =>
  withCrowHome(() => {
    assert.deepEqual(accessMap.queries.apps().apps, ["exemplo"]);
    assert.deepEqual(Object.keys(accessMap.queries.index("exemplo").modules), ["admin"]);
    assert.equal(accessMap.queries.preset("exemplo", "admin.viewer").label, "Consulta");
    assert.throws(() => accessMap.queries.preset("exemplo", "admin.nobody"), /no preset/);
  }));

test("RN-06 who-can lists the presets for positive and negative tests", () =>
  withCrowHome(() => {
    const answer = accessMap.queries["who-can"]("exemplo", "costCenters", "create");
    assert.deepEqual(answer.can.map((entry) => entry.reference).sort(), ["admin.cost_center_admin", "admin.root"]);
    assert.deepEqual(answer.cannot.map((entry) => entry.reference), ["admin.viewer"]);
  }));

test("RF-04 a saved flow goes into one encrypted file with an index", () =>
  withCrowHome((home) => {
    flows.saveFlow("exemplo", sampleFlow);
    assert.ok(!readFileSync(join(home, "fluxos", "exemplo.json.enc"), "utf8").includes("Cadastrar"));
    assert.deepEqual(flows.flowIndex("exemplo").map((entry) => [entry.id, entry.source]), [["admin.cost-centers.create", "local"]]);
    assert.equal(flows.getFlow("exemplo", "admin.cost-centers.create").steps.length, 4);
  }));

test("RN-07 RN-09 a flow without approval or without the source of a rule is refused", () =>
  withCrowHome(() => {
    assert.throws(() => flows.saveFlow("exemplo", { ...sampleFlow, approved_at: "" }), /missing approved_at/);
    const ruleWithoutSource = { ...sampleFlow, fields: [{ label: "Codigo", rules: [{ rule: "obrigatorio" }] }] };
    assert.throws(() => flows.saveFlow("exemplo", ruleWithoutSource), /has no source/);
  }));

test("RN-02 a local flow wins over the private one with the same id", () =>
  withCrowHome((home) => {
    vault.writeEncrypted(join(home, "private", "fluxos", "exemplo.json.enc"), JSON.stringify({ app: "exemplo", flows: { [sampleFlow.id]: { ...sampleFlow, operation: "privado" } } }));
    assert.equal(flows.getFlow("exemplo", sampleFlow.id).operation, "privado");
    flows.saveFlow("exemplo", sampleFlow);
    assert.equal(flows.getFlow("exemplo", sampleFlow.id).operation, "Cadastrar centro de custo");
    assert.equal(flows.flowIndex("exemplo")[0].source, "local");
  }));

test("test users follow the crow.<module>.<preset>@teste.local pattern, password equal to the e-mail", () => {
  assert.deepEqual(flows.testUser("legal.member"), { email: "crow.legal.member@teste.local", password: "crow.legal.member@teste.local" });
  assert.equal(flows.resolveValue("{{user.email}}", { user: flows.testUser("admin.viewer") }), "crow.admin.viewer@teste.local");
});

test("the owner can export local flows in plaintext for the private repository", () =>
  withCrowHome((home) => {
    flows.saveFlow("exemplo", sampleFlow);
    const result = flows.exportFlows("exemplo", join(home, "export"));
    assert.equal(result.flows, 1);
    assert.equal(JSON.parse(readFileSync(join(home, "export", "exemplo.json"), "utf8")).flows[sampleFlow.id].preset, "admin.cost_center_admin");
  }));

test("RF-05 a catalog is kept encrypted and opens with its prints", () =>
  withCrowHome((home) => {
    const work = join(home, "work");
    mkdirSync(join(work, "prints"), { recursive: true });
    writeFileSync(join(work, "catalogo.md"), "# Catalogo\n\n![passo 1](prints/passo-01.png)\n");
    writeFileSync(join(work, "prints", "passo-01.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    assert.equal(catalog.saveCatalog("exemplo", "centros", join(work, "catalogo.md"), join(work, "prints")).prints, 1);
    assert.deepEqual(catalog.listCatalogs("exemplo"), ["centros"]);
    const opened = catalog.openCatalog("exemplo", "centros");
    assert.match(readFileSync(opened.markdown, "utf8"), /# Catalogo/);
    assert.ok(existsSync(join(opened.opened, "prints", "passo-01.png")));
    rmSync(opened.opened, { recursive: true, force: true });
  }));

test("the catalog Markdown becomes HTML with tables, lists and images", () => {
  const html = catalog.markdownToHtml("# Teste 1\n\n| Campo | Esperado |\n| --- | --- |\n| Codigo | obrigatorio |\n\n1. Entre\n2. **Salve**\n\n![p](prints/a.png)", "t");
  assert.match(html, /<h1>Teste 1<\/h1>/);
  assert.match(html, /<th>Campo<\/th>/);
  assert.match(html, /<td>obrigatorio<\/td>/);
  assert.match(html, /<ol>\s*<li>Entre<\/li>\s*<li><strong>Salve<\/strong><\/li>/);
  assert.match(html, /<img alt="p" src="prints\/a.png">/);
  assert.doesNotMatch(catalog.markdownToHtml("<script>x</script>", "t"), /<script>x/);
});

const page = `<!doctype html><html><head><title>Novo</title></head><body>
<form onsubmit="event.preventDefault(); document.getElementById('ok').hidden = false;">
<label for="code">Codigo *</label> <input id="code" required maxlength="10">
<label for="owner">Responsavel</label> <input id="owner">
<button type="submit">Salvar</button></form>
<div id="ok" role="alert" hidden>Centro de custo cadastrado.</div></body></html>`;

test("RF-06 a flow replays, takes marked prints, and stops at the first broken step", { skip: findBrowser() ? false : "no Chrome or Edge", timeout: 90000 }, () =>
  withCrowHome(async (home) => {
    const site = join(home, "site");
    mkdirSync(site, { recursive: true });
    writeFileSync(join(site, "form.html"), page);
    const base = pathToFileURL(site + "/").href;
    flows.saveFlow("exemplo", sampleFlow);
    flows.saveFlow("exemplo", { ...sampleFlow, id: "quebrado", steps: [sampleFlow.steps[0], { action: "click", target: "text:Gravar", mark: "botao que mudou de nome" }] });
    await browser.start({});
    try {
      const done = await flows.runFlow("exemplo", sampleFlow.id, { base, shots: join(home, "shots") });
      assert.equal(done.ok, true, JSON.stringify(done));
      assert.deepEqual(done.messages, ["Centro de custo cadastrado."]);
      assert.equal(done.shots.length, 3);

      const broken = await flows.runFlow("exemplo", "quebrado", { base });
      assert.equal(broken.ok, false);
      assert.equal(broken.failed_step, 2);
      assert.match(broken.error, /element not found: text:Gravar/);
      assert.ok(broken.screen.elements.some((element) => element.target === "text:Salvar"));
    } finally {
      await browser.stop();
    }
  }));
