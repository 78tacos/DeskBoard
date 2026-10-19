// Desk Board local server. No dependencies: node server.js
// - serves index.html and stores the board in data.json
// - relays AI requests so API keys never reach the page (OpenAI-compatible, Anthropic, Claude Code, or Claude Desktop)
// - collects scripts and Claude chats from this PC
// - opens folders for you (Explorer / VS Code)
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const net = require("net");
const store = require("./store");
const collector = require("./collector");

const PORT = Number(process.env.DESKBOARD_PORT) || 4173;
const HOST = "127.0.0.1";
const INDEX = path.join(__dirname, "index.html");
const PROVIDERS = ["openai", "anthropic", "claude-code", "desktop"];
const ALLOWED_HOSTS = new Set(["127.0.0.1:" + PORT, "localhost:" + PORT]);

/* ---------- AI config (config.json, never sent to the browser) ---------- */
function readConfig() { return store.readJson(store.FILES.config, {}); }
function writeConfig(cfg) { store.writeJson(store.FILES.config, cfg); }
function getKey(a) { return a.apiKeyEnv ? process.env[a.apiKeyEnv] : a.apiKey; }

function findClaudeExe() {
  const root = path.join(process.env.APPDATA || "", "Claude", "claude-code");
  try {
    const versions = fs.readdirSync(root).filter((v) => /^\d+(\.\d+)*$/.test(v))
      .sort((a, b) => { const A = a.split(".").map(Number), B = b.split(".").map(Number); for (let i = 0; i < Math.max(A.length, B.length); i++) { const d = (B[i] || 0) - (A[i] || 0); if (d) return d; } return 0; });
    for (const v of versions) {
      for (const sub of fs.readdirSync(path.join(root, v))) {
        const exe = path.join(root, v, sub, "claude.exe");
        if (fs.existsSync(exe)) return exe;
      }
    }
  } catch (e) { /* not installed */ }
  return "";
}

function aiStatus() {
  const a = readConfig().ai || {};
  const type = a.provider || "";
  const ready = PROVIDERS.includes(type) && (type === "claude-code" || type === "desktop" ? true : !!a.baseUrl && !!a.model);
  const reqs = store.readRequests();
  return {
    provider: type,
    baseUrl: a.baseUrl || "",
    model: a.model || "",
    hasKey: !!getKey(a),
    keyFromEnv: !!a.apiKeyEnv,
    configured: ready,
    verified: ready && a.verified === true,
    claudeExe: findClaudeExe(),
    desktopLastSeen: reqs.heartbeat,
    pendingRequests: reqs.requests.filter((r) => r.status === "pending").length
  };
}

class AiError extends Error {
  constructor(message, status) { super(message); this.status = status || 502; }
}

function explainNetworkError(e) {
  const code = (e.cause && e.cause.code) || e.code || "";
  if (e.name === "TimeoutError") return "The AI provider took too long to answer.";
  if (code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" || code === "SELF_SIGNED_CERT_IN_CHAIN" || code === "DEPTH_ZERO_SELF_SIGNED_CERT" || code === "UNABLE_TO_GET_ISSUER_CERT_LOCALLY")
    return "Certificate not trusted (" + code + "). A firewall may be inspecting HTTPS. Save its CA certificate as ca.pem in this folder and restart.";
  if (code === "ENOTFOUND") return "Can't find that server. Check the base URL.";
  if (code === "ECONNREFUSED") return "Connection refused. Is the AI server running and the base URL right?";
  return "Couldn't reach the AI provider" + (code ? " (" + code + ")" : "") + ".";
}

function flatten(messages) {
  return messages.map((m) => (m.role === "system" ? "" : (m.role === "assistant" ? "Assistant: " : "")) + m.content).filter(Boolean).join("\n\n");
}

// Claude Code on this PC, run headless with no tools. Needs a one-time `claude auth login`.
function viaClaudeCode(a, messages, signal) {
  return new Promise((resolve, reject) => {
    const exe = findClaudeExe() || "claude";
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n") || "You are a concise, helpful assistant.";
    const args = ["-p", "--no-session-persistence", "--tools", "", "--output-format", "text", "--system-prompt", system];
    if (a.model && a.model !== "default") args.push("--model", a.model);
    const env = Object.assign({}, process.env);
    Object.keys(env).forEach((k) => { if (/^(CLAUDE_CODE_|CLAUDECODE|CLAUDE_AGENT_SDK)/.test(k)) delete env[k]; });
    let child;
    try { child = spawn(exe, args, { cwd: os.tmpdir(), env, windowsHide: true }); }
    catch (e) { return reject(new AiError("Couldn't start Claude Code on this PC.", 502)); }
    let out = "", err = "", done = false;
    const finish = (fn, v) => { if (!done) { done = true; clearTimeout(timer); signal.removeEventListener("abort", onAbort); fn(v); } };
    const timer = setTimeout(() => { child.kill(); finish(reject, new AiError("Claude Code took too long to answer.", 504)); }, 180000);
    const onAbort = () => { child.kill(); finish(reject, new AiError("Cancelled.", 499)); };
    signal.addEventListener("abort", onAbort);
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { err += d; });
    child.on("error", () => finish(reject, new AiError("Claude Code isn't installed where Desk Board expected it.", 502)));
    child.on("close", (code) => {
      const text = out.trim();
      if (code === 0 && text) return finish(resolve, text);
      const blob = (text + " " + err).trim();
      if (/oauth|authenticate|log ?in|not logged/i.test(blob)) {
        return finish(reject, new AiError("Claude Code on this PC isn't signed in. Run this once in a terminal, then try again: \"" + exe + "\" auth login", 401));
      }
      finish(reject, new AiError("Claude Code returned an error. " + blob.slice(0, 200), 502));
    });
    child.stdin.end(flatten(messages));
  });
}

// Claude Desktop answers through a request queue (see mcp-server.js and CLAUDE.md).
async function viaDesktop(messages, signal, kind) {
  const id = store.uid();
  const r = store.readRequests();
  r.requests.push({ id, kind: kind || "ask", prompt: messages.map((m) => m.content).join("\n\n"), status: "pending", createdAt: Date.now() });
  store.writeRequests(r);
  const deadline = Date.now() + 15 * 60000;
  const mark = (status) => { const x = store.readRequests(); const q = x.requests.find((y) => y.id === id); if (q && q.status === "pending") { q.status = status; q.updatedAt = Date.now(); store.writeRequests(x); } };
  for (;;) {
    if (signal.aborted) { mark("cancelled"); throw new AiError("Cancelled.", 499); }
    const q = store.readRequests().requests.find((y) => y.id === id);
    if (q && q.status === "answered" && q.answer) return String(q.answer);
    if (Date.now() > deadline) { mark("expired"); throw new AiError("Claude Desktop didn't pick this up within 15 minutes. Open a session in the DeskBoard folder and ask it to handle Desk Board requests.", 504); }
    await new Promise((res) => setTimeout(res, 1000));
  }
}

async function callAI(messages, signal, kind) {
  const a = readConfig().ai || {};
  if (!PROVIDERS.includes(a.provider)) throw new AiError("No AI is configured.", 400);
  if (a.provider === "claude-code") return viaClaudeCode(a, messages, signal);
  if (a.provider === "desktop") return viaDesktop(messages, signal, kind);
  if (!a.baseUrl || !a.model) throw new AiError("No AI is configured.", 400);

  const key = getKey(a);
  const base = String(a.baseUrl).replace(/\/+$/, "");
  const extra = a.headers && typeof a.headers === "object" ? a.headers : {};
  let url, headers, body;
  if (a.provider === "anthropic") {
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    url = base + "/v1/messages";
    headers = Object.assign({ "content-type": "application/json", "anthropic-version": "2023-06-01" }, key ? { "x-api-key": key } : {}, extra);
    body = { model: a.model, max_tokens: 4096, messages: messages.filter((m) => m.role !== "system") };
    if (system) body.system = system;
  } else {
    url = base + "/chat/completions" + (a.query ? "?" + a.query : "");
    const auth = key ? (a.authHeader ? { [a.authHeader]: key } : { Authorization: "Bearer " + key }) : {};
    headers = Object.assign({ "content-type": "application/json" }, auth, extra);
    body = { model: a.model, messages };
  }

  let r;
  try {
    r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]) });
  } catch (e) {
    if (signal.aborted) throw new AiError("Cancelled.", 499);
    throw new AiError(explainNetworkError(e), 502);
  }
  const raw = await r.text();
  let j = null;
  try { j = JSON.parse(raw); } catch (e) { /* not json */ }
  if (!r.ok) {
    const detail = j && j.error ? (j.error.message || (typeof j.error === "string" ? j.error : "")) : "";
    const hint = r.status === 401 || r.status === 403 ? "The provider rejected the API key." : r.status === 404 ? "The provider doesn't know that model or URL." : r.status === 429 ? "Rate limit or usage limit reached." : "The provider returned an error.";
    throw new AiError(hint + (detail ? " " + String(detail).slice(0, 300) : ""), 502);
  }
  let text = "";
  if (a.provider === "anthropic") {
    text = ((j && j.content) || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  } else {
    const c = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    text = typeof c === "string" ? c : Array.isArray(c) ? c.map((p) => p.text || "").join("") : "";
  }
  if (!text.trim()) throw new AiError("The provider returned an empty answer.", 502);
  return text;
}

/* ---------- collection (scripts and chats) ---------- */
let collecting = null;
function runCollect() {
  if (collecting) return collecting;
  collecting = collector.collect({ projects: store.readData().projects, config: readConfig().collect || {} })
    .then((r) => { store.writeJson(store.FILES.collected, r); return r; })
    .catch((e) => { console.error("collect failed:", e.message); return store.readJson(store.FILES.collected, { scannedAt: 0, scripts: [], chats: [] }); })
    .then((r) => { collecting = null; return r; });
  return collecting;
}
function readCollected() { return store.readJson(store.FILES.collected, { scannedAt: 0, scripts: [], chats: [], roots: [] }); }

/* ---------- opening things (Explorer / VS Code) ---------- */
function launch(exe, args) {
  const c = spawn(exe, args, { detached: true, stdio: "ignore", windowsHide: false });
  c.on("error", () => { /* reported by the exists checks below */ });
  c.unref();
}
function findVSCode() {
  const cands = [process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Programs", "Microsoft VS Code", "Code.exe"), "C:\\Program Files\\Microsoft VS Code\\Code.exe"];
  return cands.filter(Boolean).find((p) => fs.existsSync(p)) || "";
}
function safePath(p) { return typeof p === "string" && p.length < 500 && !/["<>|*?\r\n]/.test(p); }

function openThing(b) {
  const data = store.readData();
  const kind = b.kind;
  if (kind === "project-folder" || kind === "project-code") {
    const pr = data.projects.find((p) => p.id === b.id);
    const dir = pr && pr.path ? collector.absProject(pr.path) : "";
    if (!dir || !safePath(dir) || !fs.existsSync(dir)) return { status: 404, error: "That project's folder wasn't found. Set its path in data.json." };
    if (kind === "project-folder") { launch("explorer.exe", [dir]); return { status: 200 }; }
    const code = findVSCode();
    if (!code) return { status: 404, error: "VS Code wasn't found in its usual install folders." };
    launch(code, [dir]);
    return { status: 200 };
  }
  if (kind === "script") {
    const s = readCollected().scripts.find((x) => x.path === b.path);
    if (!s || !safePath(s.path) || !fs.existsSync(s.path)) return { status: 404, error: "That script isn't on disk any more." };
    launch("explorer.exe", ["/select," + s.path]);
    return { status: 200 };
  }
  if (kind === "task-link") {
    const t = data.todos.find((x) => x.id === b.id);
    const p = t && t.link;
    if (!p || /^https?:\/\//i.test(p) || !safePath(p) || !fs.existsSync(p)) return { status: 404, error: "That path wasn't found." };
    launch("explorer.exe", [fs.statSync(p).isDirectory() ? p : "/select," + p]);
    return { status: 200 };
  }
  if (kind === "app-script") {
    const p = resolveStart(data.apps.find((x) => x.id === b.id));
    if (!startable(p)) return { status: 404, error: "That start script wasn't found." };
    launch("explorer.exe", ["/select," + p]);
    return { status: 200 };
  }
  return { status: 400, error: "Unknown item." };
}

/* ---------- apps (the Launcher tab) ---------- */
const START_EXT = [".cmd", ".bat", ".ps1", ".vbs", ".exe"];
const LOCAL_URL = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i;
function appPort(a) {
  if (Number(a.port) > 0) return Number(a.port);
  try {
    const u = new URL(a.url);
    if (/^(127\.0\.0\.1|localhost)$/.test(u.hostname)) return Number(u.port) || (u.protocol === "https:" ? 443 : 80);
  } catch (e) { /* no url */ }
  return 0;
}
function probe(port) {
  return new Promise((resolve) => {
    const s = net.connect({ host: "127.0.0.1", port });
    const done = (v) => { s.destroy(); resolve(v); };
    s.setTimeout(400, () => done(false));
    s.on("connect", () => done(true));
    s.on("error", () => done(false));
  });
}
function resolveStart(a) {
  if (!a || !a.start) return "";
  return path.normalize(path.isAbsolute(a.start) ? a.start : path.join(__dirname, a.start));
}
// Only scripts and programs inside the user's own folder, with plain paths, may be started.
function startable(p) {
  return !!p && /^[A-Za-z]:\\[^"<>|*?&^%\r\n]*$/.test(p) && p.toLowerCase().startsWith(os.homedir().toLowerCase() + "\\") &&
    START_EXT.includes(path.extname(p).toLowerCase()) && fs.existsSync(p);
}
function spawnStart(p) {
  const opts = { cwd: path.dirname(p), detached: true, stdio: "ignore", windowsHide: true };
  const ext = path.extname(p).toLowerCase();
  let c;
  if (ext === ".ps1") c = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", p], opts);
  else if (ext === ".vbs") c = spawn("wscript.exe", [p], opts);
  else if (ext === ".exe") c = spawn(p, [], Object.assign({}, opts, { windowsHide: false }));
  else c = spawn("cmd.exe", ["/c", p], opts);
  c.on("error", () => { /* the status check shows it never came up */ });
  c.unref();
}
function openWhenUp(a) {
  const port = appPort(a);
  if (!LOCAL_URL.test(a.url || "") || !port) return;
  let tries = 0;
  const t = setInterval(() => {
    tries++;
    probe(port).then((up) => {
      if (up) { clearInterval(t); launch("explorer.exe", [a.url]); }
      else if (tries > 60) clearInterval(t);
    });
  }, 500);
}

/* ---------- http ---------- */
function send(res, status, body, type) {
  res.writeHead(status, { "Content-Type": type || "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}
function json(res, status, obj) { send(res, status, JSON.stringify(obj)); }
function readBody(req, res, limit, cb) {
  let raw = "";
  req.on("data", (c) => { raw += c; if (raw.length > limit) req.destroy(); });
  req.on("end", () => {
    let parsed;
    try { parsed = JSON.parse(raw || "{}"); } catch (e) { return json(res, 400, { error: "Bad JSON." }); }
    cb(parsed);
  });
}
function withAbort(req, res) {
  const ctl = new AbortController();
  res.on("close", () => { if (!res.writableEnded) ctl.abort(); });
  return ctl;
}

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];

  // Only this machine's own page may use the server (blocks DNS rebinding and other websites).
  if (!ALLOWED_HOSTS.has(req.headers.host)) return send(res, 403, "Forbidden", "text/plain");
  if (url.startsWith("/api/")) {
    const origin = req.headers.origin;
    if (req.headers["x-deskboard"] !== "1" || (origin && !ALLOWED_HOSTS.has(origin.replace(/^https?:\/\//, "")))) {
      return json(res, 403, { error: "Forbidden." });
    }
  }

  if (url === "/" || url === "/index.html") {
    return fs.readFile(INDEX, (err, buf) => err ? send(res, 500, "index.html missing", "text/plain") : send(res, 200, buf, "text/html; charset=utf-8"));
  }

  if (url === "/docs") { res.writeHead(301, { Location: "/docs/" }); return res.end(); }
  if (url.startsWith("/docs/")) {
    const rel = url === "/docs/" ? "index.html" : url.slice(6);
    if (!/^[A-Za-z0-9._-]+\.html$/.test(rel)) return send(res, 404, "Not found", "text/plain");
    return fs.readFile(path.join(__dirname, "docs", "html", rel), (err, buf) => err ? send(res, 404, "Not found. Run node docs\\build-docs.js to build the docs.", "text/plain") : send(res, 200, buf, "text/html; charset=utf-8"));
  }
  if (url === "/api/data" && req.method === "GET") return json(res, 200, { mtime: store.dataMtime(), data: store.readData() });

  if (url === "/api/data" && req.method === "PUT") {
    return readBody(req, res, 5e6, (body) => {
      if (Number(req.headers["x-base-mtime"]) !== store.dataMtime()) return json(res, 409, { mtime: store.dataMtime(), data: store.readData() });
      store.writeData(body);
      json(res, 200, { mtime: store.dataMtime() });
    });
  }

  if (url === "/api/collected" && req.method === "GET") return json(res, 200, Object.assign({ collecting: !!collecting }, readCollected()));
  if (url === "/api/collect" && req.method === "POST") return runCollect().then((r) => json(res, 200, r));

  if (url === "/api/open" && req.method === "POST") {
    return readBody(req, res, 1e4, (b) => { const r = openThing(b); json(res, r.status, r.error ? { error: r.error } : { ok: true }); });
  }

  if (url === "/api/apps/status" && req.method === "GET") {
    const apps = store.readData().apps;
    return Promise.all(apps.map((a) => { const port = appPort(a); return port ? probe(port).then((up) => [a.id, up]) : Promise.resolve([a.id, null]); }))
      .then((rows) => json(res, 200, Object.fromEntries(rows)));
  }

  if (url === "/api/app/start" && req.method === "POST") {
    return readBody(req, res, 1e4, (b) => {
      const a = store.readData().apps.find((x) => x.id === b.id);
      if (!a) return json(res, 404, { error: "That app isn't on the board." });
      const p = resolveStart(a);
      if (!startable(p)) return json(res, 404, { error: "The start script wasn't found, or it isn't allowed. It must be a .cmd, .bat, .ps1, .vbs or .exe inside your user folder." });
      const port = appPort(a);
      (port ? probe(port) : Promise.resolve(false)).then((up) => {
        if (up) { if (b.open && LOCAL_URL.test(a.url || "")) launch("explorer.exe", [a.url]); return json(res, 200, { ok: true, already: true }); }
        spawnStart(p);
        if (b.open) openWhenUp(a);
        json(res, 200, { ok: true, starting: true });
      });
    });
  }

  if (url === "/api/ai/status" && req.method === "GET") return json(res, 200, aiStatus());

  if (url === "/api/ai/config" && req.method === "PUT") {
    return readBody(req, res, 1e5, (b) => {
      const cfg = readConfig();
      if (b.clear === true) { delete cfg.ai; writeConfig(cfg); return json(res, 200, aiStatus()); }
      if (!PROVIDERS.includes(b.provider)) return json(res, 400, { error: "Unknown provider type." });
      const prev = cfg.ai || {};
      const next = Object.assign({}, prev, { provider: b.provider, verified: false });
      if (b.provider === "openai" || b.provider === "anthropic") {
        let base;
        try { base = new URL(String(b.baseUrl)); } catch (e) { return json(res, 400, { error: "Enter a full base URL, such as https://api.example.com/v1." }); }
        if (base.protocol !== "https:" && base.protocol !== "http:") return json(res, 400, { error: "The base URL must start with http:// or https://." });
        const model = String(b.model || "").trim();
        if (!model) return json(res, 400, { error: "Enter a model name." });
        next.baseUrl = base.toString().replace(/\/+$/, "");
        next.model = model;
      } else {
        next.baseUrl = "";
        next.model = String(b.model || "").trim();
        delete next.apiKey; delete next.apiKeyEnv;
        if (b.provider === "desktop") next.verified = true; // nothing to test: sessions answer when they next look
      }
      if ((b.provider === "openai" || b.provider === "anthropic") && typeof b.apiKey === "string" && b.apiKey.trim()) { next.apiKey = b.apiKey.trim(); delete next.apiKeyEnv; }
      cfg.ai = next;
      writeConfig(cfg);
      json(res, 200, aiStatus());
    });
  }

  if (url === "/api/ai/test" && req.method === "POST") {
    const ctl = withAbort(req, res);
    callAI([{ role: "user", content: "Reply with the single word: ok" }], ctl.signal, "test").then(() => {
      const cfg = readConfig();
      if (cfg.ai) { cfg.ai.verified = true; writeConfig(cfg); }
      json(res, 200, aiStatus());
    }).catch((e) => json(res, e.status || 500, { error: e.message }));
    return;
  }

  if (url === "/api/ai/chat" && req.method === "POST") {
    return readBody(req, res, 4e5, (b) => {
      const msgs = Array.isArray(b.messages) ? b.messages : [];
      const ok = msgs.length && msgs.every((m) => m && ["user", "assistant", "system"].includes(m.role) && typeof m.content === "string" && m.content);
      if (!ok || msgs[msgs.length - 1].role !== "user") return json(res, 400, { error: "Bad messages." });
      if (msgs.reduce((n, m) => n + m.content.length, 0) > 200000) return json(res, 413, { error: "That is too much text to send." });
      const ctl = withAbort(req, res);
      callAI(msgs, ctl.signal, typeof b.kind === "string" ? b.kind.slice(0, 40) : "ask").then((text) => json(res, 200, { text })).catch((e) => json(res, e.status || 500, { error: e.message }));
    });
  }

  send(res, 404, "Not found", "text/plain");
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") process.exit(0); // already running
  console.error(e);
  process.exit(1);
});
server.listen(PORT, HOST, () => {
  console.log("Desk Board running at http://" + HOST + ":" + PORT);
  setTimeout(runCollect, 300);
  setInterval(runCollect, 5 * 60000);
});
