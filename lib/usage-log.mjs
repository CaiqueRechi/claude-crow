// Usage log: one anonymous line per crow skill run in ~/.claude/crow/logs/uso.jsonl,
// with tokens, time, turns, tools, outcome and rating, read from the session
// transcript Claude Code keeps. Runs outside the model; never fails a session.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, appendFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { crowHome } from "./vault.mjs";

// conventions loads by itself all the time and has no end to rate.
const loggedSkills = ["setup", "context", "analyst", "develop", "build", "security-validation", "generate-test-steps", "generate-flows", "create-test-users"];

const logFile = () => join(crowHome(), "logs", "uso.jsonl");
const openFolder = () => join(crowHome(), "logs", "abertas");
const openFile = (session) => join(openFolder(), `${session.replace(/[^\w-]/g, "_")}.json`);
const preferencesFile = () => process.env.CROW_PREFERENCES_FILE ?? join(crowHome(), "preferences.md");

function preference(name) {
  if (!existsSync(preferencesFile())) return null;
  const row = readFileSync(preferencesFile(), "utf8").split(/\r?\n/).find((line) => line.startsWith(`| ${name} |`));
  return row ? row.split("|")[2].trim() : null;
}

export function loggingEnabled() {
  return !/^(n[aã]o|desligad|off|false)/i.test(preference("Registro de uso") ?? "sim");
}

function crowVersion() {
  try {
    return JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", ".claude-plugin", "plugin.json"), "utf8")).version;
  } catch {
    return null;
  }
}

function readTranscript(path) {
  if (!path || !existsSync(path)) return [];
  return readFileSync(path, "utf8").split("\n").filter(Boolean).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

const isToolResult = (entry) => Array.isArray(entry.message?.content) && entry.message.content.some((block) => block.type === "tool_result");
const isHumanPrompt = (entry) => entry.type === "user" && !entry.isMeta && !isToolResult(entry);

// Sums one run's share of a transcript. The same response is written on several
// lines (one per content block) carrying the same usage, so usage counts once per
// message id. Active time leaves out the user's thinking: the wait before each of
// their prompts and before each answer to a question the skill asked.
export function summarize(entries) {
  const tokens = { input: 0, cache_creation: 0, cache_read: 0, output: 0, thinking: 0 };
  const models = new Set();
  const seenMessages = new Set();
  const toolCalls = new Set();
  const userQuestions = new Set();
  let turns = 0;
  let activeMs = 0;
  let previousTime = null;

  for (const entry of entries) {
    const time = entry.timestamp ? Date.parse(entry.timestamp) : null;
    if (isHumanPrompt(entry)) turns++;
    const answersQuestion = isToolResult(entry) && entry.message.content.some((block) => userQuestions.has(block.tool_use_id));
    if (time && previousTime && !isHumanPrompt(entry) && !answersQuestion) activeMs += Math.max(0, time - previousTime);
    if (time) previousTime = time;

    if (entry.type !== "assistant" || !entry.message) continue;
    for (const block of Array.isArray(entry.message.content) ? entry.message.content : []) {
      if (block.type !== "tool_use") continue;
      toolCalls.add(block.id);
      if (block.name === "AskUserQuestion") userQuestions.add(block.id);
    }
    const usage = entry.message.usage;
    if (!usage || seenMessages.has(entry.message.id)) continue;
    seenMessages.add(entry.message.id);
    if (entry.message.model && entry.message.model !== "<synthetic>") models.add(entry.message.model);
    tokens.input += usage.input_tokens ?? 0;
    tokens.cache_creation += usage.cache_creation_input_tokens ?? 0;
    tokens.cache_read += usage.cache_read_input_tokens ?? 0;
    tokens.output += usage.output_tokens ?? 0;
    tokens.thinking += usage.output_tokens_details?.thinking_tokens ?? 0;
  }
  return { turns, tool_calls: toolCalls.size, active_s: Math.round(activeMs / 1000), tokens, models: [...models] };
}

function closeRun(run, { outcome, rating, comment }) {
  const entries = readTranscript(run.transcript).slice(run.start_line);
  const endedAt = new Date();
  const line = {
    skill: run.skill,
    crow_version: run.crow_version,
    started_at: run.started_at,
    ended_at: endedAt.toISOString(),
    duration_s: Math.round((endedAt - Date.parse(run.started_at)) / 1000),
    ...summarize(entries),
    outcome,
    rating,
    comment: comment || null,
  };
  mkdirSync(dirname(logFile()), { recursive: true });
  appendFileSync(logFile(), `${JSON.stringify(line)}\n`);
  rmSync(run.file, { force: true });
  return line;
}

function readOpenRun(path) {
  return { ...JSON.parse(readFileSync(path, "utf8")), file: path };
}

export function startRun({ session_id: session, transcript_path: transcript, prompt }) {
  const skill = (prompt ?? "").match(/^\s*\/crow:([a-z0-9-]+)/)?.[1];
  if (!skill || !loggedSkills.includes(skill) || !loggingEnabled() || !session) return null;
  // A new crow command before the previous one finished leaves that one interrupted.
  if (existsSync(openFile(session))) closeRun(readOpenRun(openFile(session)), { outcome: "interrompida", rating: "nao-pedida" });
  const run = { skill, session, transcript, start_line: readTranscript(transcript).length, started_at: new Date().toISOString(), crow_version: crowVersion() };
  mkdirSync(openFolder(), { recursive: true });
  writeFileSync(openFile(session), JSON.stringify(run));
  return run;
}

export function endSession({ session_id: session }) {
  if (!session || !existsSync(openFile(session))) return null;
  return closeRun(readOpenRun(openFile(session)), { outcome: "interrompida", rating: "nao-pedida" });
}

// Called by the skill's last step. The skill does not know its session id, so the
// open run whose transcript was written most recently is the one being finished.
export function finishRun({ rating = "nao-pedida", comment = null } = {}) {
  if (!existsSync(openFolder())) return null;
  const runs = readdirSync(openFolder()).map((name) => readOpenRun(join(openFolder(), name)));
  const freshness = (run) => (existsSync(run.transcript ?? "") ? statSync(run.transcript).mtimeMs : 0);
  const current = runs.sort((a, b) => freshness(b) - freshness(a))[0];
  if (!current) return null;
  const value = /^[1-5]$/.test(String(rating)) ? Number(rating) : rating;
  return closeRun(current, { outcome: "concluida", rating: value, comment: Number(value) <= 2 ? comment : null });
}

async function readStdinJson() {
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return text.trim() ? JSON.parse(text) : {};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [command, ...args] = process.argv.slice(2);
  const option = (name) => { const at = args.indexOf(`--${name}`); return at >= 0 ? args[at + 1] : undefined; };
  try {
    const result = command === "hook-prompt" ? startRun(await readStdinJson())
      : command === "hook-session-end" ? endSession(await readStdinJson())
      : command === "finish" ? finishRun({ rating: option("rating"), comment: option("comment") })
      : command === "enabled" ? { logging: loggingEnabled(), rating: !/^(n[aã]o|desligad|off|false)/i.test(preference("Pedir avaliação") ?? "sim") }
      : undefined;
    if (result === undefined) throw new Error("use hook-prompt, hook-session-end, finish --rating <1-5|pulada|nao-pedida> [--comment <text>], or enabled");
    if (command === "finish" || command === "enabled") console.log(JSON.stringify(result));
  } catch (error) {
    // A hook must never break the session; the skill's finish reports the error.
    if (command === "finish" || command === "enabled") {
      console.error(error.message);
      process.exit(2);
    }
  }
}
