// Test catalogs: Markdown plus screenshots, kept encrypted in
// ~/.claude/crow/catalogs/<app>/<name>/, opened into a temporary folder to read,
// and turned into PDF by the installed browser.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { crowHome, decrypt, encrypt, loadKey } from "./vault.mjs";
import { commands as browser } from "./browser.mjs";

const catalogFolder = (app, name) => join(crowHome(), "catalogs", app, name);

export function saveCatalog(app, name, markdownFile, shotsFolder) {
  const key = loadKey();
  const folder = catalogFolder(app, name);
  mkdirSync(join(folder, "prints"), { recursive: true });
  writeFileSync(join(folder, "catalogo.md.enc"), JSON.stringify(encrypt(key, readFileSync(markdownFile))));
  const prints = shotsFolder && existsSync(shotsFolder) ? readdirSync(shotsFolder).filter((file) => file.endsWith(".png")) : [];
  for (const file of prints) writeFileSync(join(folder, "prints", `${file}.enc`), JSON.stringify(encrypt(key, readFileSync(join(shotsFolder, file)))));
  return { saved: folder, prints: prints.length };
}

export function listCatalogs(app) {
  const folder = join(crowHome(), "catalogs", app);
  return existsSync(folder) ? readdirSync(folder) : [];
}

// Decrypts a catalog into a fresh temporary folder: catalogo.md with prints/ beside it.
export function openCatalog(app, name) {
  const key = loadKey();
  const folder = catalogFolder(app, name);
  if (!existsSync(folder)) throw new Error(`no catalog ${name} for ${app}`);
  const target = mkdtempSync(join(tmpdir(), `crow-catalog-${name}-`));
  mkdirSync(join(target, "prints"));
  writeFileSync(join(target, "catalogo.md"), decrypt(key, JSON.parse(readFileSync(join(folder, "catalogo.md.enc"), "utf8"))));
  for (const file of readdirSync(join(folder, "prints"))) {
    writeFileSync(join(target, "prints", file.replace(/\.enc$/, "")), decrypt(key, JSON.parse(readFileSync(join(folder, "prints", file), "utf8"))));
  }
  return { opened: target, markdown: join(target, "catalogo.md") };
}

const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(text) {
  return escapeHtml(text)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

// Covers what the catalogs use: headings, paragraphs, lists, tables, images, bold, code.
export function markdownToHtml(markdown, title) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let list = null;
  let table = null;
  const closeBlocks = () => {
    if (list) { html.push(`</${list}>`); list = null; }
    if (table) { html.push("</tbody></table>"); table = null; }
  };
  for (const line of lines) {
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    const item = line.match(/^\s*(?:[-*]|(\d+)\.)\s+(.*)$/);
    if (heading) { closeBlocks(); html.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`); }
    else if (line.trim().startsWith("|")) {
      const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
      if (cells.every((cell) => /^:?-+:?$/.test(cell))) continue;
      if (!table) { closeBlocks(); html.push(`<table><thead><tr>${cells.map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead><tbody>`); table = true; }
      else html.push(`<tr>${cells.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`);
    } else if (item) {
      const kind = item[1] ? "ol" : "ul";
      if (table) closeBlocks();
      if (list !== kind) { if (list) html.push(`</${list}>`); html.push(`<${kind}>`); list = kind; }
      html.push(`<li>${inline(item[2])}</li>`);
    } else if (!line.trim()) closeBlocks();
    else { closeBlocks(); html.push(`<p>${inline(line)}</p>`); }
  }
  closeBlocks();
  const style = "body{font:13px/1.5 sans-serif;margin:24px;color:#111}img{max-width:100%;border:1px solid #ccc;margin:6px 0}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #bbb;padding:4px 6px;text-align:left;vertical-align:top}th{background:#f1f1f1}h1,h2{page-break-after:avoid}h2{margin-top:28px}code{background:#f3f3f3;padding:0 3px}";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${style}</style></head><body>${html.join("\n")}</body></html>`;
}

// Writes catalogo.html and catalogo.pdf next to an opened catalog; the browser
// session must be running.
export async function catalogPdf(openedFolder) {
  const markdown = readFileSync(join(openedFolder, "catalogo.md"), "utf8");
  const htmlFile = join(openedFolder, "catalogo.html");
  writeFileSync(htmlFile, markdownToHtml(markdown, basename(openedFolder)));
  return browser.pdf({ _: [htmlFile, join(openedFolder, "catalogo.pdf")] });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [command, ...args] = process.argv.slice(2);
  const run = {
    save: () => saveCatalog(args[0], args[1], args[2], args[3]),
    list: () => ({ catalogs: listCatalogs(args[0]) }),
    open: () => openCatalog(args[0], args[1]),
    pdf: () => catalogPdf(args[0]),
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

