import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const usageLog = await import("../lib/usage-log.mjs");
const script = fileURLToPath(new URL("../lib/usage-log.mjs", import.meta.url));

// A transcript shaped like the one Claude Code writes: one response split over
// several lines with the same message id and usage, a question to the user that
// waits two minutes for an answer, and a line that is not JSON.
const at = (second) => new Date(Date.UTC(2026, 10, 17, 12, 0, second)).toISOString();
const usage = { input_tokens: 10, cache_creation_input_tokens: 100, cache_read_input_tokens: 1000, output_tokens: 50, output_tokens_details: { thinking_tokens: 20 } };
const sampleEntries = [
  { type: "user", timestamp: at(0), message: { role: "user", content: "/crow:analyst quero um log" } },
  { type: "assistant", timestamp: at(4), message: { id: "msg_1", model: "claude-opus-5-5", usage, content: [{ type: "thinking", thinking: "" }] } },
  { type: "assistant", timestamp: at(5), message: { id: "msg_1", model: "claude-opus-5-5", usage, content: [{ type: "tool_use", id: "tool_ask", name: "AskUserQuestion", input: {} }] } },
  { type: "user", timestamp: new Date(Date.parse(at(5)) + 120000).toISOString(), message: { role: "user", content: [{ type: "tool_result", tool_use_id: "tool_ask", content: "Sim" }] } },
  { type: "assistant", timestamp: new Date(Date.parse(at(8)) + 120000).toISOString(), message: { id: "msg_2", model: "claude-opus-5-5", usage, content: [{ type: "tool_use", id: "tool_read", name: "Read", input: {} }] } },
  { type: "user", timestamp: new Date(Date.parse(at(9)) + 120000).toISOString(), message: { role: "user", content: [{ type: "tool_result", tool_use_id: "tool_read", content: "..." }] } },
  { type: "assistant", timestamp: new Date(Date.parse(at(12)) + 120000).toISOString(), message: { id: "msg_3", model: "<synthetic>", usage: { input_tokens: 0, output_tokens: 0 }, content: [{ type: "text", text: "pronto" }] } },
];

function withCrowHome(runScenario, preferences = "| Registro de uso | sim |\n| Pedir avaliação | sim |\n") {
  const home = mkdtempSync(join(tmpdir(), "crow-usage-"));
  const previous = { home: process.env.CROW_HOME, preferences: process.env.CROW_PREFERENCES_FILE };
  process.env.CROW_HOME = home;
  delete process.env.CROW_PREFERENCES_FILE;
  writeFileSync(join(home, "preferences.md"), `| Preferência | Valor |\n| --- | --- |\n${preferences}`);
  const transcript = join(home, "session.jsonl");
  writeFileSync(transcript, "");
  try {
    return runScenario({ home, transcript, logLines: () => (existsSync(join(home, "logs", "uso.jsonl")) ? readFileSync(join(home, "logs", "uso.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line)) : []) });
  } finally {
    for (const [name, value] of [["CROW_HOME", previous.home], ["CROW_PREFERENCES_FILE", previous.preferences]]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    rmSync(home, { recursive: true, force: true });
  }
}

const writeEntries = (transcript, entries) => appendFileSync(transcript, `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`);

test("RN-07 counts each response once, by message id, and leaves synthetic models out", () => {
  const summary = usageLog.summarize(sampleEntries);
  assert.deepEqual(summary.tokens, { input: 20, cache_creation: 200, cache_read: 2000, output: 100, thinking: 40 });
  assert.deepEqual(summary.models, ["claude-opus-5-5"]);
  assert.equal(summary.tool_calls, 2);
  assert.equal(summary.turns, 1);
});

test("RN-08 active time leaves out the wait for the user's answer", () => {
  // 5 s until the question, 3 s after the answer, 1 s, 3 s: the 120 s wait is out.
  assert.equal(usageLog.summarize(sampleEntries).active_s, 12);
});

test("RF-01 RF-02 a crow command opens a run and the skill's last step writes the line", () => {
  withCrowHome(({ transcript, logLines }) => {
    writeEntries(transcript, [{ type: "user", timestamp: at(0), message: { content: "conversa anterior" } }, { type: "assistant", timestamp: at(1), message: { id: "msg_old", usage, content: [] } }]);
    assert.ok(usageLog.startRun({ session_id: "s1", transcript_path: transcript, prompt: "/crow:analyst quero um log" }));
    writeEntries(transcript, sampleEntries);
    const line = usageLog.finishRun({ rating: "4" });
    assert.equal(line.skill, "analyst");
    assert.equal(line.outcome, "concluida");
    assert.equal(line.rating, 4);
    assert.equal(line.comment, null);
    assert.equal(line.tokens.input, 20, "what came before the command is not counted");
    assert.deepEqual(logLines(), [line]);
  });
});

test("RN-05 the line carries no prompt, path or session id", () => {
  withCrowHome(({ transcript, logLines }) => {
    usageLog.startRun({ session_id: "s-secret", transcript_path: transcript, prompt: "/crow:develop projeto-sigiloso" });
    writeEntries(transcript, sampleEntries);
    usageLog.finishRun({ rating: "pulada" });
    const text = JSON.stringify(logLines());
    for (const leak of ["projeto-sigiloso", "s-secret", "session.jsonl", "quero um log", "pronto"]) assert.ok(!text.includes(leak), leak);
  });
});

test("RN-03 keeps a comment only with a rating of 1 or 2", () => {
  withCrowHome(({ transcript }) => {
    usageLog.startRun({ session_id: "s1", transcript_path: transcript, prompt: "/crow:build" });
    assert.equal(usageLog.finishRun({ rating: "2", comment: "demorou" }).comment, "demorou");
    usageLog.startRun({ session_id: "s1", transcript_path: transcript, prompt: "/crow:build" });
    assert.equal(usageLog.finishRun({ rating: "5", comment: "ótimo" }).comment, null);
  });
});

test("RN-06 a new crow command or the end of the session leaves the open run interrupted", () => {
  withCrowHome(({ transcript, logLines }) => {
    usageLog.startRun({ session_id: "s1", transcript_path: transcript, prompt: "/crow:analyst" });
    usageLog.startRun({ session_id: "s1", transcript_path: transcript, prompt: "/crow:develop" });
    usageLog.endSession({ session_id: "s1" });
    assert.deepEqual(logLines().map((line) => [line.skill, line.outcome, line.rating]), [["analyst", "interrompida", "nao-pedida"], ["develop", "interrompida", "nao-pedida"]]);
    assert.equal(usageLog.endSession({ session_id: "s1" }), null);
  });
});

test("RN-01 conventions and prompts that are not crow commands open nothing", () => {
  withCrowHome(({ home, transcript }) => {
    for (const prompt of ["/crow:conventions", "use o /crow:analyst depois", "/outro:analyst", ""]) assert.equal(usageLog.startRun({ session_id: "s1", transcript_path: transcript, prompt }), null, prompt);
    assert.ok(!existsSync(join(home, "logs")));
  });
});

test("RF-04 the last step learns whether to ask the rating and whether a run is open", () => {
  withCrowHome(({ transcript }) => {
    assert.deepEqual(usageLog.usageStatus(), { logging: true, rating: false, open: false });
    usageLog.startRun({ session_id: "s1", transcript_path: transcript, prompt: "/crow:develop" });
    assert.deepEqual(usageLog.usageStatus(), { logging: true, rating: false, open: true });
  }, "| Registro de uso | sim |\n| Pedir avaliação | não |\n");
});

test("RN-04 with the log turned off nothing is written", () => {
  withCrowHome(({ home, transcript }) => {
    assert.equal(usageLog.loggingEnabled(), false);
    assert.equal(usageLog.startRun({ session_id: "s1", transcript_path: transcript, prompt: "/crow:analyst" }), null);
    assert.equal(usageLog.finishRun({ rating: "5" }), null);
    assert.ok(!existsSync(join(home, "logs")));
  }, "| Registro de uso | não |\n");
});

test("RNF-02 the hook never fails the session, even with bad input", () => {
  withCrowHome(({ home }) => {
    for (const command of ["hook-prompt", "hook-session-end"]) {
      for (const input of ["not json", "{}", JSON.stringify({ session_id: "s1", transcript_path: join(home, "missing.jsonl"), prompt: "/crow:build" })]) {
        execFileSync(process.execPath, [script, command], { input, env: { ...process.env, CROW_HOME: home } });
      }
    }
    const opened = readdirSync(join(home, "logs", "abertas"));
    assert.equal(opened.length, 0, "the session end closed the run the prompt opened");
  });
});

test("RNF-02 a broken transcript line is skipped, not fatal", () => {
  withCrowHome(({ transcript }) => {
    usageLog.startRun({ session_id: "s1", transcript_path: transcript, prompt: "/crow:context save" });
    appendFileSync(transcript, "{ isto não é json\n");
    writeEntries(transcript, sampleEntries);
    assert.equal(usageLog.finishRun().tokens.output, 100);
  });
});
