# Desk Board documentation

Last updated 2026-10-15.

| Article | What it covers |
|---|---|
| [01-overview-and-quick-start.md](01-overview-and-quick-start.md) | What Desk Board is, how to start it, a map of the board |
| [02-user-guide.md](02-user-guide.md) | How to use every part of the board |
| [03-setup-and-troubleshooting.md](03-setup-and-troubleshooting.md) | Install, start and stop, AI setup, backup, fixes (the runbook) |
| [04-reference.md](04-reference.md) | Files, data format, settings, local API, security, limits |
| [05-using-desk-board-with-claude.md](05-using-desk-board-with-claude.md) | How Claude sessions read and update the board and answer the AI buttons |

## Reading it

- In Desk Board: click **Docs** in the header (opens http://127.0.0.1:4173/docs/).
- On disk: open `html\index.html`, or `html\all.html` for everything on one page.

## Putting it in Wartburg or OneNote

Wartburg and OneNote take rich text, not Markdown, so use the HTML pages:

1. Open the page in Edge (for example `html\01-overview-and-quick-start.html`).
2. Press Ctrl+A, then Ctrl+C.
3. Paste into a new Wartburg article or a OneNote page. Headings, lists, tables and code blocks keep their formatting.

Suggested layout in Wartburg: one folder named Desk Board in the knowledge base, with one article per file above. Article 03 is written as a runbook, so the Runbook template fits it. For OneNote, `html\all.html` gives a single page with everything.

## Keeping it current

The Markdown files are the source. After editing one, rebuild the HTML:

```powershell
node docs\build-docs.js
```

When a feature changes, update the matching article and the "Last updated" line at the top.
