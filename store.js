// Shared file storage for the Desk Board server and the MCP server.
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const FILES = {
  data: path.join(DIR, "data.json"),
  requests: path.join(DIR, "requests.json"),
  collected: path.join(DIR, "collected.json"),
  config: path.join(DIR, "config.json")
};
const COLS = ["todos", "projects", "attention", "links", "chatmap", "reviews", "checklists", "apps"];

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return fallback; }
}
function writeJson(file, obj) {
  const tmp = file + "." + process.pid + ".tmp";
  const text = JSON.stringify(obj, null, 2);
  fs.writeFileSync(tmp, text);
  try { fs.renameSync(tmp, file); }
  catch (e) { fs.writeFileSync(file, text); try { fs.unlinkSync(tmp); } catch (e2) { /* ignore */ } }
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function readData() {
  const d = readJson(FILES.data, {});
  COLS.forEach((c) => { if (!Array.isArray(d[c])) d[c] = []; });
  return d;
}
function pad(n) { return String(n).padStart(2, "0"); }
// Keeps one copy of the board per day (the last 14 days) and saves an unreadable data.json before it can be overwritten.
function protectData() {
  try {
    if (!fs.existsSync(FILES.data)) return;
    const raw = fs.readFileSync(FILES.data, "utf8");
    if (!raw.trim()) return;
    const dir = path.join(path.dirname(FILES.data), "backups");
    fs.mkdirSync(dir, { recursive: true });
    const n = new Date();
    let readable = true;
    try { JSON.parse(raw); } catch (e) { readable = false; }
    if (!readable) {
      fs.writeFileSync(path.join(dir, "data-unreadable-" + n.getFullYear() + pad(n.getMonth() + 1) + pad(n.getDate()) + "-" + pad(n.getHours()) + pad(n.getMinutes()) + pad(n.getSeconds()) + ".json"), raw);
      return;
    }
    const file = path.join(dir, "data-" + n.getFullYear() + "-" + pad(n.getMonth() + 1) + "-" + pad(n.getDate()) + ".json");
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, raw);
      fs.readdirSync(dir).filter((x) => /^data-\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort().slice(0, -14).forEach((x) => fs.unlinkSync(path.join(dir, x)));
    }
  } catch (e) { /* a backup problem must never stop the board saving */ }
}
function writeData(d) {
  protectData();
  const out = {};
  COLS.forEach((c) => { out[c] = Array.isArray(d[c]) ? d[c] : []; });
  writeJson(FILES.data, out);
}
function dataMtime() {
  try { return Math.floor(fs.statSync(FILES.data).mtimeMs); } catch (e) { return 0; }
}

// AI requests that Claude Desktop answers (see mcp-server.js). Also records when a session last touched the board.
function readRequests() {
  const r = readJson(FILES.requests, {});
  return { heartbeat: Number(r.heartbeat) || 0, requests: Array.isArray(r.requests) ? r.requests : [] };
}
function writeRequests(r) {
  const keep = r.requests.filter((x) => x.status === "pending" || Date.now() - (x.updatedAt || x.createdAt || 0) < 3600000).slice(-30);
  writeJson(FILES.requests, { heartbeat: r.heartbeat, requests: keep });
}
function touchHeartbeat() {
  const r = readRequests();
  r.heartbeat = Date.now();
  writeRequests(r);
}

module.exports = { DIR, FILES, COLS, readJson, writeJson, uid, readData, writeData, dataMtime, readRequests, writeRequests, touchHeartbeat };
