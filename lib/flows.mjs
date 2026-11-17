// Flows: the end-to-end path of one operation, kept per application in one encrypted
// JSON file with an index, so a skill reads the index and then only the flow it needs.
// Flows the user maps live in ~/.claude/crow/fluxos/; flows from the private
// repository in ~/.claude/crow/private/fluxos/<app>.json.enc. A local flow wins.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { crowHome, readEncrypted, writeEncrypted } from "./vault.mjs";
import { commands as browser } from "./browser.mjs";

const actions = ["goto", "fill", "select", "click"];
const localFile = (app) => join(crowHome(), "fluxos", `${app}.json.enc`);
const privateFile = (app) => join(crowHome(), "private", "fluxos", `${app}.json.enc`);

function readFlowFile(path, app) {
  return existsSync(path) ? JSON.parse(readEncrypted(path)) : { app, flows: {} };
}

function indexEntry(flow, source) {
  return { id: flow.id, module: flow.module, screen: flow.screen, operation: flow.operation, preset: flow.preset, approved_at: flow.approved_at, source };
}

export function flowIndex(app) {
  const entries = new Map();
  for (const [path, source] of [[privateFile(app), "private"], [localFile(app), "local"]]) {
    for (const flow of Object.values(readFlowFile(path, app).flows)) entries.set(flow.id, indexEntry(flow, source));
  }
  return [...entries.values()];
}

export function getFlow(app, id) {
  const local = readFlowFile(localFile(app), app).flows[id];
  const flow = local ?? readFlowFile(privateFile(app), app).flows[id];
  if (!flow) throw new Error(`no flow ${id} for ${app}`);
  return flow;
}

export function validateFlow(flow) {
  const problems = [];
  for (const field of ["id", "module", "screen", "operation", "preset", "steps", "result", "approved_at"]) {
    if (flow[field] === undefined || flow[field] === null || flow[field] === "") problems.push(`missing ${field}`);
  }
  (flow.steps ?? []).forEach((step, index) => {
    if (!actions.includes(step.action)) problems.push(`step ${index + 1}: action must be one of ${actions.join(", ")}`);
    if (step.action !== "goto" && !step.target) problems.push(`step ${index + 1}: missing target`);
  });
  for (const field of flow.fields ?? []) {
    for (const rule of field.rules ?? []) if (!rule.source) problems.push(`field ${field.label ?? field.target}: rule "${rule.rule}" has no source`);
  }
  return problems;
}

export function saveFlow(app, flow) {
  const problems = validateFlow(flow);
  if (problems.length) throw new Error(`invalid flow: ${problems.join("; ")}`);
  const file = readFlowFile(localFile(app), app);
  file.flows[flow.id] = flow;
  writeEncrypted(localFile(app), JSON.stringify(file, null, 2));
  return indexEntry(flow, "local");
}

// Placeholders a step value may carry, filled at run time.
export function resolveValue(value, context) {
  return String(value ?? "").replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, group, key) => context[group]?.[key] ?? match);
}

export function testUser(preset) {
  const [moduleKey, presetKey] = preset.split(".");
  const email = `crow.${moduleKey}.${presetKey}@teste.local`.toLowerCase();
  return { email, password: email };
}

// Replays a flow and stops at the first step that fails, returning where, so only
// the rest has to be mapped again.
export async function runFlow(app, id, { base, shots }) {
  const flow = getFlow(app, id);
  const context = { user: testUser(flow.preset), app: { base } };
  const taken = [];
  let mark = 0;
  for (const [index, step] of flow.steps.entries()) {
    const number = index + 1;
    try {
      const target = step.target;
      const value = resolveValue(step.value, context);
      if (step.action === "goto") await browser.goto({ _: [new URL(resolveValue(step.url, context), base).href] });
      if (step.mark && step.action !== "goto") {
        await browser["clear-marks"]();
        await browser.mark({ _: [target, ++mark], note: step.mark });
        if (shots) taken.push((await browser.shot({ _: [join(shots, `passo-${String(number).padStart(2, "0")}.png`)] })).screenshot);
      }
      if (step.action === "fill") await browser.fill({ _: [target, value] });
      if (step.action === "select") await browser.select({ _: [target, value] });
      if (step.action === "click") await browser.click({ _: [target] });
    } catch (error) {
      return { ok: false, flow: id, failed_step: number, error: error.message, screen: await browser.summary({}).catch(() => null), shots: taken };
    }
  }
  await browser["clear-marks"]();
  const screen = await browser.summary({});
  if (shots) taken.push((await browser.shot({ _: [join(shots, "resultado.png")] })).screenshot);
  const expected = flow.result.expect ?? {};
  const met = (!expected.message || screen.messages.some((message) => message.includes(expected.message)))
    && (!expected.url_contains || screen.url.includes(expected.url_contains));
  return { ok: met, flow: id, failed_step: met ? null : "resultado", expected, messages: screen.messages, url: screen.url, shots: taken };
}

// Plaintext copy of the user's local flows, ready to become fluxos/<app>.json in the private repository.
export function exportFlows(app, folder) {
  const file = readFlowFile(localFile(app), app);
  mkdirSync(folder, { recursive: true });
  const target = join(folder, `${app}.json`);
  writeFileSync(target, JSON.stringify(file, null, 2));
  return { exported: target, flows: Object.keys(file.flows).length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [command, app, ...args] = process.argv.slice(2);
  const option = (name) => { const at = args.indexOf(`--${name}`); return at >= 0 ? args[at + 1] : undefined; };
  const readStdin = async () => { let text = ""; for await (const chunk of process.stdin) text += chunk; return JSON.parse(text); };
  const run = {
    index: () => flowIndex(app),
    get: () => getFlow(app, args[0]),
    save: async () => saveFlow(app, await readStdin()),
    run: () => runFlow(app, args[0], { base: option("base"), shots: option("shots") }),
    export: () => exportFlows(app, args[0]),
  };
  try {
    if (!run[command]) throw new Error(`unknown command ${command}; use ${Object.keys(run).join(", ")}`);
    console.log(JSON.stringify(await run[command]()));
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}
