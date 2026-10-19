// Collects scripts and Claude chats from this PC for the Desk Board.
//   Scripts: files with script extensions under your project folders, plus any script Claude wrote (found in chat transcripts).
//   Chats:   Claude Code / Claude Desktop sessions stored in ~/.claude/projects.
const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

const HOME = os.homedir();
const TRANSCRIPTS = path.join(HOME, ".claude", "projects");
const DEFAULT_EXT = [".ps1", ".psm1", ".py", ".bat", ".cmd", ".sh", ".vbs"];
const SKIP_DIRS = new Set(["node_modules", ".git", "venv", ".venv", "__pycache__", "site-packages", "dist", "build", ".idea", ".vs", "bin", "obj", ".next", "target", ".claude"]);
const LANG = { ".ps1": "PowerShell", ".psm1": "PowerShell", ".py": "Python", ".bat": "Batch", ".cmd": "Batch", ".sh": "Shell", ".vbs": "VBScript", ".js": "JavaScript", ".ts": "TypeScript", ".sql": "SQL" };
const MAX_FILES = 4000;
const MAX_DEPTH = 6;

const norm = (p) => path.normalize(p).replace(/[\\/]+$/, "");
const key = (p) => norm(p).toLowerCase();

function absProject(p) {
  if (!p) return "";
  return norm(path.isAbsolute(p) ? p : path.join(HOME, p));
}

function isNoise(p) {
  const k = key(p);
  return k.includes("\\appdata\\local\\temp\\") || k.includes("\\.claude\\worktrees\\") || k.includes("\\node_modules\\");
}

function describe(file, ext) {
  let text = "";
  try {
    const fd = fs.openSync(file, "r");
    const buf = Buffer.alloc(4096);
    const n = fs.readSync(fd, buf, 0, 4096, 0);
    fs.closeSync(fd);
    text = buf.slice(0, n).toString("utf8").replace(/^﻿/, "");
  } catch (e) { return ""; }
  const lines = text.split(/\r?\n/);
  const clean = (s) => s.replace(/^[\s#'":;/*<>!=_~-]+/, "").replace(/(\*\/|#>|"""|''')\s*$/, "").trim();
  const real = (s) => /[a-z]/i.test(clean(s));
  let found = "";
  if (ext === ".ps1" || ext === ".psm1") {
    const syn = lines.findIndex((l) => /\.SYNOPSIS/i.test(l));
    if (syn >= 0) found = lines.slice(syn + 1).map((l) => l.trim()).find((l) => l && !l.startsWith(".")) || "";
    if (!found) found = lines.map((l) => l.trim()).find((l) => /^#(?!requires)/i.test(l) && real(l)) || "";
    if (!found) { const b = lines.findIndex((l) => l.trim().startsWith("<#")); if (b >= 0) found = lines.slice(b, b + 6).map((l) => clean(l)).find((l) => l && !l.startsWith(".")) || ""; }
  } else if (ext === ".py") {
    const doc = text.match(/^\s*(?:r?"""|r?''')([\s\S]*?)(?:"""|''')/);
    if (doc) found = doc[1].split(/\r?\n/).map((l) => l.trim()).find(Boolean) || "";
    if (!found) found = lines.map((l) => l.trim()).find((l) => l.startsWith("#") && !l.startsWith("#!") && !/coding[:=]/.test(l) && real(l)) || "";
  } else if (ext === ".bat" || ext === ".cmd") {
    found = lines.map((l) => l.trim()).find((l) => /^(rem\s|::)/i.test(l) && real(l.replace(/^rem\s/i, ""))) || "";
    found = found.replace(/^rem\s/i, "");
  } else if (ext === ".sh") {
    found = lines.map((l) => l.trim()).find((l) => l.startsWith("#") && !l.startsWith("#!") && real(l)) || "";
  } else if (ext === ".vbs") {
    found = lines.map((l) => l.trim()).find((l) => l.startsWith("'") && real(l)) || "";
  } else {
    found = lines.map((l) => l.trim()).find((l) => /^(\/\/|--)/.test(l) && real(l)) || "";
  }
  return clean(found).slice(0, 140);
}

function walk(root, exts, out, state, depth) {
  if (state.count >= MAX_FILES || depth > MAX_DEPTH) return;
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch (e) { return; }
  for (const e of entries) {
    if (state.count >= MAX_FILES) return;
    const full = path.join(root, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name.toLowerCase())) continue;
      walk(full, exts, out, state, depth + 1);
    } else if (e.isFile() && exts.includes(path.extname(e.name).toLowerCase())) {
      state.count++;
      out.push(full);
    }
  }
}

function matchProject(p, projects) {
  const k = key(p);
  let best = null, bestLen = -1;
  for (const pr of projects) {
    const base = absProject(pr.path);
    if (!base) continue;
    const bk = base.toLowerCase();
    if ((k === bk || k.startsWith(bk + "\\")) && bk.length > bestLen) { best = pr.id; bestLen = bk.length; }
  }
  return best;
}

/* ---------- transcripts ---------- */
const unescapeJson = (s) => { try { return JSON.parse('"' + s + '"'); } catch (e) { return s; } };

function scanTranscript(file, stat, exts) {
  return new Promise((resolve) => {
    const sum = { id: path.basename(file, ".jsonl"), title: "", agentName: "", lastPrompt: "", cwd: "", started: 0, updated: stat.mtimeMs, turns: 0, written: [] };
    const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
    rl.on("line", (line) => {
      if (!line || line.length < 10) return;
      if (line.startsWith('{"type":"custom-title"')) { try { sum.title = JSON.parse(line).customTitle || sum.title; } catch (e) { /* ignore */ } return; }
      if (line.startsWith('{"type":"agent-name"')) { try { sum.agentName = JSON.parse(line).agentName || sum.agentName; } catch (e) { /* ignore */ } return; }
      if (line.startsWith('{"type":"last-prompt"')) { try { sum.lastPrompt = JSON.parse(line).lastPrompt || sum.lastPrompt; } catch (e) { /* ignore */ } return; }
      if (!sum.cwd) { const m = line.match(/"cwd":"((?:[^"\\]|\\.)*)"/); if (m) sum.cwd = unescapeJson(m[1]); }
      if (!sum.started) { const t = line.match(/"timestamp":"([^"]+)"/); if (t) sum.started = Date.parse(t[1]) || 0; }
      if (line.includes('"type":"user"') && !line.includes('"tool_use_id"')) sum.turns++;
      if (line.includes('"type":"tool_use"') && line.includes('"name":"Write"')) {
        try {
          const rec = JSON.parse(line);
          const ts = Date.parse(rec.timestamp) || 0;
          for (const b of (rec.message && rec.message.content) || []) {
            if (b && b.type === "tool_use" && b.name === "Write" && b.input && typeof b.input.file_path === "string") {
              if (exts.includes(path.extname(b.input.file_path).toLowerCase())) sum.written.push({ path: b.input.file_path, ts });
            }
          }
        } catch (e) { /* ignore */ }
      }
    });
    rl.on("close", () => resolve(sum));
    rl.on("error", () => resolve(sum));
  });
}

let transcriptCache = new Map(); // file -> {size, mtimeMs, sum}

async function collectChats(exts) {
  const sums = [];
  let dirs = [];
  try { dirs = fs.readdirSync(TRANSCRIPTS, { withFileTypes: true }).filter((d) => d.isDirectory()); } catch (e) { return sums; }
  const seen = new Set();
  for (const d of dirs) {
    let files = [];
    try { files = fs.readdirSync(path.join(TRANSCRIPTS, d.name)).filter((f) => f.endsWith(".jsonl")); } catch (e) { continue; }
    for (const f of files) {
      const full = path.join(TRANSCRIPTS, d.name, f);
      seen.add(full);
      let st;
      try { st = fs.statSync(full); } catch (e) { continue; }
      const c = transcriptCache.get(full);
      if (c && c.size === st.size && c.mtimeMs === st.mtimeMs) { sums.push(c.sum); continue; }
      const sum = await scanTranscript(full, st, exts);
      transcriptCache.set(full, { size: st.size, mtimeMs: st.mtimeMs, sum });
      sums.push(sum);
    }
  }
  for (const k of transcriptCache.keys()) if (!seen.has(k)) transcriptCache.delete(k);
  return sums;
}

/* ---------- main ---------- */
async function collect(opts) {
  const cfg = opts.config || {};
  const projects = opts.projects || [];
  const exts = (Array.isArray(cfg.extensions) && cfg.extensions.length ? cfg.extensions : DEFAULT_EXT).map((e) => (e.startsWith(".") ? e : "." + e).toLowerCase());

  const sums = await collectChats(exts);

  // chats
  const chats = sums.filter((s) => s.turns > 0 || s.title || s.lastPrompt).map((s) => {
    const noFolder = !s.cwd || key(s.cwd).includes("\\scratch-workspaces\\");
    return {
      id: s.id,
      title: (s.title || s.agentName || s.lastPrompt || "Untitled chat").replace(/\s+/g, " ").slice(0, 120),
      lastPrompt: (s.lastPrompt || "").replace(/\s+/g, " ").slice(0, 160),
      cwd: noFolder ? "" : s.cwd,
      noFolder,
      project: noFolder ? null : matchProject(s.cwd, projects),
      started: s.started,
      updated: s.updated,
      turns: s.turns
    };
  }).sort((a, b) => b.updated - a.updated);
  const titleById = new Map(chats.map((c) => [c.id, c.title]));

  // script roots: configured, ~/Development, project folders, and folders where Claude chats ran
  const rootSet = new Map();
  const addRoot = (p) => { if (p && fs.existsSync(p)) rootSet.set(key(p), norm(p)); };
  (Array.isArray(cfg.scriptRoots) && cfg.scriptRoots.length ? cfg.scriptRoots.map(absProject) : [path.join(HOME, "Development")]).forEach(addRoot);
  projects.forEach((p) => addRoot(absProject(p.path)));
  chats.forEach((c) => { if (c.cwd && !isNoise(c.cwd)) addRoot(c.cwd); });
  const roots = [...rootSet.values()].sort((a, b) => a.length - b.length);
  const topRoots = roots.filter((r, i) => !roots.slice(0, i).some((p) => key(r).startsWith(key(p) + "\\")));

  const files = [];
  const state = { count: 0 };
  topRoots.forEach((r) => walk(r, exts, files, state, 0));

  const byPath = new Map();
  const add = (full, extra) => {
    if (isNoise(full)) return;
    const k = key(full);
    const prev = byPath.get(k) || {};
    byPath.set(k, Object.assign(prev, { path: norm(full) }, extra));
  };
  files.forEach((f) => add(f, {}));
  sums.forEach((s) => s.written.forEach((w) => add(w.path, { byClaude: true, session: { id: s.id, title: titleById.get(s.id) || "" }, writtenAt: w.ts })));

  const scripts = [];
  for (const entry of byPath.values()) {
    const ext = path.extname(entry.path).toLowerCase();
    let st = null;
    try { st = fs.statSync(entry.path); } catch (e) { /* missing */ }
    scripts.push({
      path: entry.path,
      name: path.basename(entry.path),
      ext,
      lang: LANG[ext] || ext.slice(1).toUpperCase(),
      dir: path.dirname(entry.path),
      project: matchProject(entry.path, projects),
      modified: st ? st.mtimeMs : (entry.writtenAt || 0),
      created: st ? (st.birthtimeMs || st.mtimeMs) : (entry.writtenAt || 0),
      size: st ? st.size : 0,
      description: st ? describe(entry.path, ext) : "",
      exists: !!st,
      byClaude: !!entry.byClaude,
      session: entry.session || null
    });
  }
  scripts.sort((a, b) => b.modified - a.modified);

  return { scannedAt: Date.now(), scripts, chats, roots: topRoots, truncated: state.count >= MAX_FILES };
}

module.exports = { collect, absProject, HOME, TRANSCRIPTS };
