// Drives the Chrome or Edge already installed on the machine through the DevTools
// Protocol, with Node built-ins only. A session survives between commands: `start`
// launches the browser on a temporary profile, the other commands reconnect to it.
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { crowHome } from "./vault.mjs";

const sessionFile = () => join(crowHome(), "browser-session.json");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const knownBrowsers = {
  win32: [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ],
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ],
  linux: ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge"],
};

export function findBrowser() {
  if (process.env.CROW_BROWSER) return process.env.CROW_BROWSER;
  for (const candidate of knownBrowsers[process.platform] ?? knownBrowsers.linux) {
    if (candidate.includes("/") && existsSync(candidate)) return candidate;
    if (!candidate.includes("/")) {
      try {
        return execFileSync("which", [candidate], { encoding: "utf8" }).trim();
      } catch {}
    }
  }
  return null;
}

function readSession() {
  if (!existsSync(sessionFile())) throw new Error("no browser session; run start first");
  return JSON.parse(readFileSync(sessionFile(), "utf8"));
}

async function getJson(port, path) {
  return (await fetch(`http://127.0.0.1:${port}${path}`)).json();
}

class Connection {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      const waiter = this.pending.get(message.id);
      if (!waiter) return;
      this.pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message));
      else waiter.resolve(message.result);
    });
  }

  static async open(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", () => reject(new Error(`cannot connect to ${url}`)), { once: true });
    });
    return new Connection(socket);
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  close() {
    this.socket.close();
  }
}

async function pageConnection() {
  const { port } = readSession();
  const page = (await getJson(port, "/json")).find((target) => target.type === "page");
  if (!page) throw new Error("the browser has no open page");
  return Connection.open(page.webSocketDebuggerUrl);
}

async function evaluate(connection, expression) {
  const { result, exceptionDetails } = await connection.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
}

async function waitForQuiet(connection, extraMs = 400) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if ((await evaluate(connection, "document.readyState").catch(() => "loading")) === "complete") break;
    await sleep(250);
  }
  await sleep(extraMs);
}

// Runs inside the page. A target is "css:<selector>", "text:<visible text>" (button or
// link) or "label:<label text>" (field); anything else is read as css.
const pageHelpers = `
window.__crow = window.__crow || {
  visible(element) {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  },
  text(element) { return (element.innerText || element.value || element.getAttribute('aria-label') || '').trim().replace(/\\s+/g, ' '); },
  labelOf(element) {
    if (element.id) { const label = document.querySelector('label[for="' + CSS.escape(element.id) + '"]'); if (label) return label.innerText.trim(); }
    const wrapping = element.closest('label'); if (wrapping) return wrapping.innerText.trim();
    return element.getAttribute('aria-label') || element.getAttribute('placeholder') || element.name || '';
  },
  resolve(target) {
    const [kind, ...rest] = target.split(':'); const value = rest.join(':');
    if (kind === 'text') return [...document.querySelectorAll('button, a, [role=button], input[type=submit], input[type=button]')].find((e) => this.visible(e) && this.text(e) === value) || null;
    if (kind === 'label') return [...document.querySelectorAll('input, select, textarea')].find((e) => this.visible(e) && this.labelOf(e).replace(/\\s*\\*$/, '') === value) || null;
    return document.querySelector(kind === 'css' ? value : target);
  },
  must(target) { const element = this.resolve(target); if (!element) throw new Error('element not found: ' + target); return element; },
  selectorOf(element) {
    if (element.id) return 'css:#' + CSS.escape(element.id);
    if (element.name) return 'css:' + element.tagName.toLowerCase() + '[name="' + element.name + '"]';
    if (['BUTTON', 'A'].includes(element.tagName) || element.type === 'submit') return 'text:' + this.text(element);
    const label = this.labelOf(element); return label ? 'label:' + label : null;
  },
};`;

export function summaryExpression(maxElements) {
  return `${pageHelpers}
(() => {
  const crow = window.__crow;
  const fields = [...document.querySelectorAll('input, select, textarea, button, a[href], [role=button]')]
    .filter((e) => crow.visible(e) && e.type !== 'hidden')
    .slice(0, ${maxElements})
    .map((e) => {
      const item = { target: crow.selectorOf(e), tag: e.tagName.toLowerCase() };
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.tagName)) {
        Object.assign(item, { label: crow.labelOf(e), type: e.type || null, required: e.required || undefined,
          maxlength: e.maxLength > 0 ? e.maxLength : undefined, pattern: e.pattern || undefined,
          value: e.type === 'password' ? (e.value ? '***' : '') : (e.value || undefined), disabled: e.disabled || undefined });
        if (e.tagName === 'SELECT') item.options = [...e.options].slice(0, 15).map((o) => o.text.trim());
      } else {
        Object.assign(item, { text: crow.text(e).slice(0, 80), href: e.tagName === 'A' ? e.getAttribute('href') : undefined });
      }
      return item;
    });
  const messages = [...document.querySelectorAll('[role=alert], .alert, .invalid-feedback, .error, .text-danger, .text-red-600')]
    .filter((e) => crow.visible(e)).map((e) => crow.text(e)).filter(Boolean).slice(0, 10);
  const headings = [...document.querySelectorAll('h1, h2')].filter((e) => crow.visible(e)).map((e) => crow.text(e)).slice(0, 6);
  return { url: location.href, title: document.title, headings, messages, elements: fields };
})()`;
}

function markExpression(target, number, note) {
  return `${pageHelpers}
(() => {
  const element = window.__crow.must(${JSON.stringify(target)});
  element.scrollIntoView({ block: 'center' });
  const box = element.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.dataset.crowMark = '';
  layer.style.cssText = 'position:absolute;pointer-events:none;z-index:2147483647;left:' + (box.left + scrollX - 4) + 'px;top:' + (box.top + scrollY - 4) + 'px;width:' + (box.width + 8) + 'px;height:' + (box.height + 8) + 'px;border:3px solid #e11d48;border-radius:4px';
  const badge = document.createElement('div');
  badge.textContent = ${JSON.stringify(String(number))};
  badge.style.cssText = 'position:absolute;right:-14px;top:-14px;background:#e11d48;color:#fff;font:bold 13px sans-serif;min-width:24px;height:24px;border-radius:12px;text-align:center;line-height:24px;padding:0 4px';
  layer.append(badge);
  ${note ? `const caption = document.createElement('div'); caption.textContent = ${JSON.stringify(note)}; caption.style.cssText = 'position:absolute;left:0;top:100%;margin-top:6px;background:#e11d48;color:#fff;font:12px sans-serif;padding:2px 6px;border-radius:3px;white-space:nowrap'; layer.append(caption);` : ""}
  document.body.append(layer);
  return true;
})()`;
}

export const commands = {
  async start({ url = "about:blank", width = "1366", height = "768", headed = false }) {
    const browser = findBrowser();
    if (!browser) throw new Error("no Chrome or Edge found; install one of them, or set CROW_BROWSER to its path");
    if (existsSync(sessionFile())) await commands.stop().catch(() => {});
    const profile = mkdtempSync(join(tmpdir(), "crow-browser-"));
    const port = 9300 + Math.floor(Math.random() * 500);
    const args = [`--remote-debugging-port=${port}`, "--remote-debugging-address=127.0.0.1", `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`, "--no-first-run", "--no-default-browser-check", "--disable-extensions"];
    if (!headed) args.push("--headless=new");
    const child = spawn(browser, [...args, url], { detached: true, stdio: "ignore" });
    child.unref();
    for (let attempt = 0; attempt < 60; attempt++) {
      await sleep(250);
      try {
        const version = await getJson(port, "/json/version");
        mkdirSync(dirname(sessionFile()), { recursive: true });
        writeFileSync(sessionFile(), JSON.stringify({ port, profile, browser, browserSocket: version.webSocketDebuggerUrl }));
        const connection = await pageConnection();
        await waitForQuiet(connection);
        connection.close();
        return { started: true, browser, port };
      } catch {}
    }
    throw new Error("the browser did not open its debugging port");
  },

  async goto({ _: [url] }) {
    const connection = await pageConnection();
    await connection.send("Page.navigate", { url });
    await waitForQuiet(connection);
    const where = await evaluate(connection, "location.href");
    connection.close();
    return { url: where };
  },

  async summary({ max = "80" }) {
    const connection = await pageConnection();
    const summary = await evaluate(connection, summaryExpression(Number(max)));
    connection.close();
    return summary;
  },

  async fill({ _: [target, value] }) {
    const connection = await pageConnection();
    await evaluate(connection, `${pageHelpers}
      (() => { const e = window.__crow.must(${JSON.stringify(target)});
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e), 'value')?.set;
        e.focus(); setter ? setter.call(e, ${JSON.stringify(value)}) : (e.value = ${JSON.stringify(value)});
        e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    connection.close();
    return { filled: target };
  },

  async select({ _: [target, optionText] }) {
    const connection = await pageConnection();
    await evaluate(connection, `${pageHelpers}
      (() => { const e = window.__crow.must(${JSON.stringify(target)});
        const option = [...e.options].find((o) => o.text.trim() === ${JSON.stringify(optionText)} || o.value === ${JSON.stringify(optionText)});
        if (!option) throw new Error('option not found: ' + ${JSON.stringify(optionText)});
        e.value = option.value; e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    connection.close();
    return { selected: optionText };
  },

  async click({ _: [target] }) {
    const connection = await pageConnection();
    await evaluate(connection, `${pageHelpers} window.__crow.must(${JSON.stringify(target)}).click()`);
    await waitForQuiet(connection, 700);
    const where = await evaluate(connection, "location.href").catch(() => null);
    connection.close();
    return { clicked: target, url: where };
  },

  async mark({ _: [target, number], note }) {
    const connection = await pageConnection();
    await evaluate(connection, markExpression(target, number, note));
    connection.close();
    return { marked: target, number };
  },

  async "clear-marks"() {
    const connection = await pageConnection();
    await evaluate(connection, "document.querySelectorAll('[data-crow-mark]').forEach((e) => e.remove())");
    connection.close();
    return { cleared: true };
  },

  async shot({ _: [file], full = false }) {
    const connection = await pageConnection();
    const { data } = await connection.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: Boolean(full) });
    connection.close();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(data, "base64"));
    return { screenshot: file };
  },

  async pdf({ _: [htmlFile, outFile] }) {
    const connection = await pageConnection();
    await connection.send("Page.navigate", { url: pathToFileURL(htmlFile).href });
    await waitForQuiet(connection);
    const { data } = await connection.send("Page.printToPDF", { printBackground: true, preferCSSPageSize: true });
    connection.close();
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, Buffer.from(data, "base64"));
    return { pdf: outFile };
  },

  async stop() {
    const session = readSession();
    try {
      const connection = await Connection.open(session.browserSocket);
      connection.send("Browser.close").catch(() => {});
      await sleep(500);
      connection.close();
    } catch {}
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        rmSync(session.profile, { recursive: true, force: true });
        break;
      } catch {
        await sleep(300);
      }
    }
    rmSync(sessionFile(), { force: true });
    return { stopped: true };
  },
};

export function parseArguments(argv) {
  const options = { _: [] };
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (!argument.startsWith("--")) options._.push(argument);
    else if (index + 1 < argv.length && !argv[index + 1].startsWith("--")) options[argument.slice(2)] = argv[++index];
    else options[argument.slice(2)] = true;
  }
  return options;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [command, ...rest] = process.argv.slice(2);
  try {
    if (!commands[command]) throw new Error(`unknown command ${command}; use ${Object.keys(commands).join(", ")}`);
    console.log(JSON.stringify(await commands[command](parseArguments(rest))));
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
}
