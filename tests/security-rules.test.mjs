import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import Ajv2020 from "ajv/dist/2020.js";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = join(repositoryRoot, "skills", "security-validation");

const readText = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

// The 24 rules of the specification's section 7, plus the 17 written for the
// section 4.4 attacks they do not cover. Removing one is a breaking change.
const requiredRuleIds = [
  "SV-APP-0001", "SV-APP-0002", "SV-APP-0003", "SV-APP-0004", "SV-APP-0005",
  "SV-APP-0006", "SV-APP-0007", "SV-APP-0008", "SV-APP-0009", "SV-API-0001",
  "SV-DATA-0001", "SV-CRY-0001", "SV-IDN-0001", "SV-CLD-0001", "SV-CON-0001",
  "SV-SCM-0001", "SV-DEV-0001", "SV-NET-0001", "SV-HOST-0001", "SV-RES-0001",
  "SV-AI-0001", "SV-BIZ-0001", "SV-MON-0001", "SV-REC-0001",
  "SV-APP-0010", "SV-APP-0011", "SV-APP-0012", "SV-APP-0013", "SV-APP-0014",
  "SV-APP-0015", "SV-APP-0016", "SV-APP-0017", "SV-IDN-0002", "SV-IDN-0003",
  "SV-IDN-0004", "SV-DATA-0002", "SV-RES-0002", "SV-AI-0002", "SV-BIZ-0002",
  "SV-IOT-0001", "SV-OT-0001",
];

const requiredFamilies = [
  "Entrada e interpretação", "Navegador", "Identidade", "Autorização", "APIs",
  "Arquivos", "Infraestrutura", "Host", "Dados", "Cloud", "Containers",
  "Supply chain", "CI/CD", "IA", "IoT/OT", "Disponibilidade",
  "Lógica de negócio", "Operação",
];

function loadRules() {
  const rulesDirectory = join(skillRoot, "rules");
  const rules = [];
  for (const file of readdirSync(rulesDirectory).filter((name) => name.endsWith(".md"))) {
    const text = readText(join(rulesDirectory, file));
    for (const match of text.matchAll(/^```yaml\n([\s\S]*?)^```$/gm)) {
      rules.push({ file, rule: yaml.load(match[1]) });
    }
  }
  return rules;
}

function backtickedIds(text, pattern) {
  return new Set([...text.matchAll(/`([^`]+)`/g)].map((match) => match[1]).filter((id) => pattern.test(id)));
}

const rules = loadRules();
const ruleIds = rules.map(({ rule }) => rule.id);

test("every rule matches the rule contract", () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(JSON.parse(readText(join(skillRoot, "schemas", "rule.schema.json"))));
  for (const { file, rule } of rules) {
    const valid = validate(rule);
    assert.ok(valid, `${rule?.id ?? "rule"} in ${file}: ${ajv.errorsText(validate.errors)}`);
  }
});

test("rule ids are unique", () => {
  const duplicates = ruleIds.filter((id, index) => ruleIds.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
});

test("every required rule is present", () => {
  const missing = requiredRuleIds.filter((id) => !ruleIds.includes(id));
  assert.deepEqual(missing, []);
});

test("each rule sits under a heading with its own id", () => {
  const rulesDirectory = join(skillRoot, "rules");
  for (const file of readdirSync(rulesDirectory).filter((name) => name.endsWith(".md"))) {
    const text = readText(join(rulesDirectory, file));
    const headings = [...text.matchAll(/^## (SV-[A-Z]+-\d{4}) /gm)].map((match) => match[1]);
    const contracts = [...text.matchAll(/^```yaml\nid: (SV-[A-Z]+-\d{4})$/gm)].map((match) => match[1]);
    assert.deepEqual(contracts, headings, file);
  }
});

test("every category is canonical", () => {
  const taxonomy = readText(join(skillRoot, "catalog", "taxonomy.md"));
  const categories = backtickedIds(taxonomy, /^[A-Z_]+\.[A-Z_]+$/);
  for (const { rule } of rules) {
    assert.ok(categories.has(rule.category), `${rule.id}: unknown category ${rule.category}`);
  }
});

test("every external reference is present in the verified catalog", () => {
  const references = readText(join(skillRoot, "catalog", "references.md"));
  const verified = backtickedIds(references, /^(CWE-\d+|V\d+\.\d+\.\d+|WSTG-[A-Z]{4}-\d{2}|T\d{4}(\.\d{3})?|AML\.T\d{4}(\.\d{3})?)$/);
  for (const { rule } of rules) {
    const { cwe, asvs, wstg, attack, atlas = [] } = rule.references;
    for (const id of [...cwe, ...asvs, ...wstg, ...attack, ...atlas]) {
      assert.ok(verified.has(id), `${rule.id}: ${id} is not in catalog/references.md`);
    }
  }
});

test("related controls and duplicates point to existing rules", () => {
  for (const { rule } of rules) {
    for (const id of rule.related_controls) {
      assert.ok(ruleIds.includes(id), `${rule.id}: related control ${id} does not exist`);
      assert.notEqual(id, rule.id, `${rule.id} lists itself as related`);
    }
    if (rule.duplicate_of !== null) {
      assert.ok(ruleIds.includes(rule.duplicate_of), `${rule.id}: duplicate_of ${rule.duplicate_of} does not exist`);
    }
  }
});

test("the attack catalog covers every family and every rule", () => {
  const catalog = readText(join(skillRoot, "catalog", "attack-types.md"));
  const families = [...catalog.matchAll(/^## (.+)$/gm)].map((match) => match[1].trim());
  for (const family of requiredFamilies) {
    assert.ok(families.includes(family), `family missing from attack-types.md: ${family}`);
  }
  const cited = backtickedIds(catalog, /^SV-[A-Z]+-\d{4}$/);
  for (const id of cited) {
    assert.ok(ruleIds.includes(id), `attack-types.md cites ${id}, which does not exist`);
  }
  for (const id of ruleIds) {
    assert.ok(cited.has(id), `${id} is not reachable from attack-types.md`);
  }
});

test("fixture expectations use existing rules and valid states", () => {
  const expectedPath = join(repositoryRoot, "evals", "security-validation", "expected.json");
  assert.ok(existsSync(expectedPath), "evals/security-validation/expected.json is missing");
  const states = new Set(["PASS", "FAIL", "INCONCLUSIVE", "NOT_APPLICABLE", "NOT_TESTED", "ERROR", "SUPPRESSED"]);
  const expected = JSON.parse(readText(expectedPath));
  const seenStates = new Set();
  for (const item of expected.cases) {
    assert.ok(ruleIds.includes(item.rule_id), `${item.case}: unknown rule ${item.rule_id}`);
    assert.ok(states.has(item.expected_status), `${item.case}: invalid status ${item.expected_status}`);
    assert.ok(existsSync(join(repositoryRoot, "evals", "security-validation", item.path)), `${item.case}: missing ${item.path}`);
    seenStates.add(item.expected_status);
  }
  for (const required of ["PASS", "FAIL", "INCONCLUSIVE"]) {
    assert.ok(seenStates.has(required), `no fixture expects ${required}`);
  }
});
