// Desk Board MCP server (stdio). Lets Claude Desktop / Claude Code sessions read and update the board
// and answer AI requests from the page. No dependencies. Registered for this folder by .mcp.json.
const store = require("./store");

const COLL = ["todos", "projects", "attention", "links", "checklists", "apps"];
const TOOLS = [
  {
    name: "deskboard_get",
    description: "Read the Desk Board: open tasks, projects, open needs-attention items, links, counts of collected scripts and chats, and pending AI requests. Call this first.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "deskboard_add",
    description: "Add an item. collection: todos {title, due 'YYYY-MM-DD' or null, priority high|normal|low, project (project id) or null, repeat ''|daily|weekdays|weekly|monthly, link}; projects {name, status active|waiting|blocked|unsorted|done, next, path (relative to the user's home or absolute), notes}; attention {title, note, severity high|normal, source, url}; links {title, url, kind artifact|doc|other, note, updatedAt 'YYYY-MM-DD'}; checklists {title, project (project id), items: array of strings or {text, done}}; apps (shown in the Launcher tab) {name, description, start (script or program that starts it: path relative to the DeskBoard folder, or absolute inside the user's folder; .cmd, .bat, .ps1, .vbs or .exe), url (where it runs, e.g. http://127.0.0.1:8765), port (optional, defaults from url), project (project id)}. Returns the new id.",
    inputSchema: { type: "object", properties: { collection: { type: "string", enum: COLL }, item: { type: "object" } }, required: ["collection", "item"], additionalProperties: false }
  },
  {
    name: "deskboard_update",
    description: "Change fields on an existing item by id (for example mark a task done with {done:true, doneAt:<ms>}, resolve attention with {resolved:true}, set a project's status or next action). For a checklist send the full items array (keep each item's id, text, done); it replaces the old one.",
    inputSchema: { type: "object", properties: { collection: { type: "string", enum: COLL }, id: { type: "string" }, fields: { type: "object" } }, required: ["collection", "id", "fields"], additionalProperties: false }
  },
  {
    name: "deskboard_delete",
    description: "Delete an item by id. Only do this when the user asked.",
    inputSchema: { type: "object", properties: { collection: { type: "string", enum: COLL }, id: { type: "string" } }, required: ["collection", "id"], additionalProperties: false }
  },
  {
    name: "deskboard_collected",
    description: "List what the board collected from this PC: scripts (including scripts Claude wrote) or Claude chats, newest first.",
    inputSchema: { type: "object", properties: { kind: { type: "string", enum: ["scripts", "chats"] }, limit: { type: "number" } }, required: ["kind"], additionalProperties: false }
  },
  {
    name: "deskboard_requests",
    description: "List AI requests the Desk Board page is waiting on (status pending). Answer each with deskboard_answer. A request's prompt says what output format it needs.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "deskboard_answer",
    description: "Answer a pending AI request. text is shown on the board exactly as given, so follow the format the request's prompt asks for (plain text, or JSON only).",
    inputSchema: { type: "object", properties: { id: { type: "string" }, text: { type: "string" } }, required: ["id", "text"], additionalProperties: false }
  }
];

function normItems(items) {
  return (Array.isArray(items) ? items : []).map((it) => {
    let o;
    if (typeof it === "string") {
      const done = /^[-*]?\s*\[[xX]\]/.test(it.trim());
      o = { text: it.trim().replace(/^[-*]\s*/, "").replace(/^\[[ xX]?\]\s*/, "").replace(/^\d+[.)]\s*/, ""), done };
    } else o = Object.assign({}, it);
    o.text = String(o.text || "").trim().slice(0, 300);
    o.done = o.done === true;
    o.id = o.id || store.uid();
    return o;
  }).filter((o) => o.text).slice(0, 200);
}
function summary() {
  const d = store.readData();
  const col = store.readJson(store.FILES.collected, { scripts: [], chats: [], scannedAt: 0 });
  const pname = (id) => (d.projects.find((p) => p.id === id) || {}).name || null;
  const req = store.readRequests();
  return {
    today: new Date().toISOString().slice(0, 10),
    openTasks: d.todos.filter((t) => !t.done).map((t) => ({ id: t.id, title: t.title, due: t.due || null, priority: t.priority, project: pname(t.project), repeat: t.repeat || "" })),
    projects: d.projects.map((p) => ({ id: p.id, name: p.name, status: p.status, next: p.next || "", path: p.path || "", notes: p.notes || "" })),
    needsAttention: d.attention.filter((a) => !a.resolved).map((a) => ({ id: a.id, title: a.title, severity: a.severity, note: a.note || "", source: a.source || "" })),
    links: d.links.map((l) => ({ id: l.id, title: l.title, kind: l.kind, url: l.url })),
    apps: d.apps.map((a) => ({ id: a.id, name: a.name, url: a.url || "", start: a.start || "" })),
    checklists: d.checklists.map((c) => ({ id: c.id, title: c.title, project: pname(c.project), done: (c.items || []).filter((i) => i.done).length, total: (c.items || []).length })),
    collected: { scripts: col.scripts.length, scriptsByClaude: col.scripts.filter((s) => s.byClaude).length, chats: col.chats.length, scannedAt: col.scannedAt },
    pendingRequests: req.requests.filter((r) => r.status === "pending").length
  };
}

function call(name, args) {
  store.touchHeartbeat();
  if (name === "deskboard_get") return summary();
  if (name === "deskboard_add") {
    const d = store.readData();
    if (!COLL.includes(args.collection)) throw new Error("Unknown collection.");
    const item = Object.assign({}, args.item || {});
    if (args.collection === "todos") { if (!item.title) throw new Error("A task needs a title."); item.done = false; item.priority = item.priority || "normal"; }
    if (args.collection === "projects") { if (!item.name) throw new Error("A project needs a name."); item.status = item.status || "unsorted"; }
    if (args.collection === "attention") { if (!item.title) throw new Error("An item needs a title."); item.severity = item.severity || "normal"; item.resolved = false; item.source = item.source || "Claude"; }
    if (args.collection === "links") { if (!item.title || !/^https?:\/\//i.test(item.url || "")) throw new Error("A link needs a title and an http(s) url."); item.kind = item.kind || "other"; item.updatedAt = item.updatedAt || new Date().toISOString().slice(0, 10); }
    if (args.collection === "apps") { if (!item.name) throw new Error("An app needs a name."); if (item.url && !/^https?:\/\//i.test(item.url)) throw new Error("An app url must start with http:// or https://."); }
    if (args.collection === "checklists") { if (!item.title) throw new Error("A checklist needs a title."); item.items = normItems(item.items); item.source = item.source || "Claude"; item.updatedAt = Date.now(); }
    item.id = item.id || store.uid();
    item.createdAt = Date.now();
    d[args.collection].push(item);
    store.writeData(d);
    return { ok: true, id: item.id };
  }
  if (name === "deskboard_update") {
    const d = store.readData();
    const item = (d[args.collection] || []).find((x) => x.id === args.id);
    if (!item) throw new Error("No item with that id.");
    const fields = Object.assign({}, args.fields || {});
    if (args.collection === "checklists") { if ("items" in fields) fields.items = normItems(fields.items); fields.updatedAt = Date.now(); }
    Object.assign(item, fields, { id: item.id });
    store.writeData(d);
    return { ok: true };
  }
  if (name === "deskboard_delete") {
    const d = store.readData();
    const before = (d[args.collection] || []).length;
    d[args.collection] = (d[args.collection] || []).filter((x) => x.id !== args.id);
    if (d[args.collection].length === before) throw new Error("No item with that id.");
    store.writeData(d);
    return { ok: true };
  }
  if (name === "deskboard_collected") {
    const col = store.readJson(store.FILES.collected, { scripts: [], chats: [] });
    const lim = Math.max(1, Math.min(200, Number(args.limit) || 40));
    return (args.kind === "chats" ? col.chats : col.scripts).slice(0, lim);
  }
  if (name === "deskboard_requests") {
    return store.readRequests().requests.filter((r) => r.status === "pending").map((r) => ({ id: r.id, kind: r.kind, createdAt: r.createdAt, prompt: r.prompt }));
  }
  if (name === "deskboard_answer") {
    const r = store.readRequests();
    const q = r.requests.find((x) => x.id === args.id);
    if (!q) throw new Error("No request with that id.");
    if (q.status !== "pending") throw new Error("That request is no longer pending (" + q.status + ").");
    q.status = "answered"; q.answer = String(args.text); q.updatedAt = Date.now();
    store.writeRequests(r);
    return { ok: true };
  }
  throw new Error("Unknown tool.");
}

function reply(id, result) { process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n"); }
function fail(id, code, message) { process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }) + "\n"); }

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch (e) { continue; }
    if (msg.id === undefined) continue; // notifications need no reply
    if (msg.method === "initialize") {
      reply(msg.id, { protocolVersion: (msg.params && msg.params.protocolVersion) || "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "deskboard", version: "1.0.0" } });
    } else if (msg.method === "tools/list") {
      reply(msg.id, { tools: TOOLS });
    } else if (msg.method === "tools/call") {
      try {
        const out = call(msg.params.name, msg.params.arguments || {});
        reply(msg.id, { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] });
      } catch (e) {
        reply(msg.id, { content: [{ type: "text", text: "Error: " + e.message }], isError: true });
      }
    } else if (msg.method === "ping") {
      reply(msg.id, {});
    } else {
      fail(msg.id, -32601, "Method not found");
    }
  }
});
process.stdin.on("end", () => process.exit(0));
