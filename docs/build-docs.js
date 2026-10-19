// Builds docs\html from the numbered Markdown files in this folder. No dependencies: node docs\build-docs.js
// Output: one page per article, an index page, and all.html (everything on one page) for copying into OneNote or Wartburg.
const fs = require("fs");
const path = require("path");

const DIR = __dirname;
const OUT = path.join(DIR, "html");
const DESCRIPTIONS = {
  "01-overview-and-quick-start": "What Desk Board is, how to start it, and a map of the board.",
  "02-user-guide": "How to use every part of the board.",
  "03-setup-and-troubleshooting": "Install, start and stop, AI setup, backup, and fixes.",
  "04-reference": "Files, data format, settings, local API, security and limits.",
  "05-using-desk-board-with-claude": "How Claude sessions read and update the board and answer the AI buttons."
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function inline(text, linkFor) {
  let s = esc(text);
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return "\u0000" + (codes.length - 1) + "\u0000"; });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => '<a href="' + linkFor(u) + '">' + t + "</a>");
  s = s.replace(/\u0000(\d+)\u0000/g, (m, i) => "<code>" + codes[i] + "</code>");
  return s;
}

function render(md, linkFor, idPrefix) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  const isBlock = (l) => /^(#{1,4}\s|```|\|)/.test(l) || /^\s*([-*]|\d+\.)\s+/.test(l) || /^>\s?/.test(l) || /^---+$/.test(l);
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("```")) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      out.push("<pre><code>" + esc(code.join("\n")) + "</code></pre>");
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      out.push("<h" + level + ' id="' + idPrefix + slug(h[2]) + '">' + inline(h[2], linkFor) + "</h" + level + ">");
      i++;
      continue;
    }
    if (line.startsWith("|") && i + 1 < lines.length && /^\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const cells = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(cells(lines[i++]));
      out.push("<table><thead><tr>" + head.map((c) => "<th>" + inline(c, linkFor) + "</th>").join("") + "</tr></thead><tbody>" +
        rows.map((r) => "<tr>" + r.map((c) => "<td>" + inline(c, linkFor) + "</td>").join("") + "</tr>").join("") + "</tbody></table>");
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        let t = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, "");
        i++;
        while (i < lines.length && lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) t += " " + lines[i++].trim();
        items.push("<li>" + inline(t, linkFor) + "</li>");
      }
      out.push((ordered ? "<ol>" : "<ul>") + items.join("") + (ordered ? "</ol>" : "</ul>"));
      continue;
    }
    if (/^---+$/.test(line)) { out.push("<hr>"); i++; continue; }
    if (/^>\s?/.test(line)) {
      const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ""));
      out.push("<blockquote>" + inline(q.join(" "), linkFor) + "</blockquote>");
      continue;
    }
    const p = [];
    while (i < lines.length && lines[i].trim() && !isBlock(lines[i])) p.push(lines[i++].trim());
    out.push("<p>" + inline(p.join(" "), linkFor) + "</p>");
  }
  return out.join("\n");
}

const CSS = `
  :root { color-scheme: light; }
  body { margin: 0; background: #ffffff; color: #1b1b1b; font: 15px/1.55 "Segoe UI", Calibri, Arial, sans-serif; }
  main, nav, footer { max-width: 880px; margin: 0 auto; padding: 0 20px; }
  nav { padding-top: 14px; padding-bottom: 10px; font-size: 13px; border-bottom: 1px solid #d0d0d0; }
  nav a { margin-right: 14px; }
  main { padding-top: 10px; padding-bottom: 40px; }
  h1 { font-size: 26px; margin: 22px 0 8px; }
  h2 { font-size: 20px; margin: 28px 0 8px; }
  h3 { font-size: 16px; margin: 20px 0 6px; }
  p, ul, ol, table, pre { margin: 0 0 12px; }
  li { margin: 2px 0; }
  a { color: #0b5cad; }
  code { font-family: Consolas, "Cascadia Mono", monospace; font-size: 13px; background: #f1f1f1; padding: 1px 4px; border-radius: 3px; }
  pre { background: #f6f6f6; border: 1px solid #dcdcdc; border-radius: 4px; padding: 10px 12px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  th, td { border: 1px solid #c4c4c4; padding: 6px 9px; text-align: left; vertical-align: top; }
  th { background: #efefef; }
  hr { border: 0; border-top: 1px solid #d0d0d0; margin: 24px 0; }
  footer { color: #666; font-size: 12px; padding-bottom: 24px; }
  section.article { page-break-before: always; }
  section.article:first-of-type { page-break-before: auto; }
  @media print { nav { display: none; } }
`;

function page(title, nav, body) {
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(title) +
    "</title><style>" + CSS + "</style></head><body>" + nav + "<main>\n" + body + '\n</main><footer>Desk Board documentation. Source: the Markdown files in the docs folder; rebuild with node docs\\build-docs.js.</footer></body></html>\n';
}

const articles = fs.readdirSync(DIR).filter((f) => /^\d\d-.*\.md$/.test(f)).sort().map((f) => {
  const name = f.replace(/\.md$/, "");
  const md = fs.readFileSync(path.join(DIR, f), "utf8");
  const title = (md.match(/^#\s+(.*)$/m) || [null, name])[1];
  return { file: f, name, md, title };
});
if (!articles.length) throw new Error("No numbered .md files found in " + DIR);

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith(".html")) fs.unlinkSync(path.join(OUT, f));

const navHtml = (current) => "<nav><a href=\"index.html\">All articles</a>" + articles.map((a) => a.name === current ? "<strong>" + esc(a.title.replace(/^Desk Board:\s*/, "")) + "</strong> " : '<a href="' + a.name + '.html">' + esc(a.title.replace(/^Desk Board:\s*/, "")) + "</a>").join("") + '<a href="all.html">Everything on one page</a></nav>';

// one page per article
for (const a of articles) {
  const linkFor = (u) => (/\.md$/.test(u) ? u.replace(/\.md$/, ".html") : u);
  fs.writeFileSync(path.join(OUT, a.name + ".html"), page(a.title, navHtml(a.name), render(a.md, linkFor, "")));
}

// everything on one page
const linkAll = (u) => (/\.md$/.test(u) ? "#" + u.replace(/\.md$/, "") : u);
const toc = "<ul>" + articles.map((a) => '<li><a href="#' + a.name + '">' + esc(a.title) + "</a></li>").join("") + "</ul>";
const combined = "<h1>Desk Board documentation</h1>\n<p>Everything about Desk Board on one page. Contents:</p>\n" + toc + "\n" +
  articles.map((a) => '<section class="article" id="' + a.name + '">\n' + render(a.md, linkAll, a.name + "-") + "\n</section>").join("\n");
fs.writeFileSync(path.join(OUT, "all.html"), page("Desk Board documentation", '<nav><a href="index.html">All articles</a></nav>', combined));

// index
const index = "<h1>Desk Board documentation</h1>\n<p>Pick an article, or open everything on one page.</p>\n<ul>" +
  articles.map((a) => '<li><a href="' + a.name + '.html">' + esc(a.title) + "</a>. " + esc(DESCRIPTIONS[a.name] || "") + "</li>").join("") +
  '<li><a href="all.html">Everything on one page</a>. Best for copying into OneNote.</li></ul>\n' +
  "<h2>Copying into OneNote or Wartburg</h2>\n<p>Open an article, press Ctrl+A, then Ctrl+C, and paste into a OneNote page or the Wartburg editor. Headings, lists, tables and code blocks come across. The Markdown files in the docs folder are the source: edit those, then run <code>node docs\\build-docs.js</code> to rebuild these pages.</p>";
fs.writeFileSync(path.join(OUT, "index.html"), page("Desk Board documentation", "<nav><a href=\"all.html\">Everything on one page</a></nav>", index));

console.log("built " + (articles.length + 2) + " pages in " + OUT + ": " + fs.readdirSync(OUT).join(", "));
