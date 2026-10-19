# Desk Board

A local personal dashboard (tasks, projects, needs-attention items, documents and artifacts, scripts and Claude chats collected from this PC). It runs on http://127.0.0.1:4173 and the user keeps it open in its own Edge window.

## How to update the board

Use the `deskboard_*` MCP tools (registered in `.mcp.json`, started from `mcp-server.js`). Call `deskboard_get` first.

- Add things the user asks for with `deskboard_add`, change them with `deskboard_update`, remove with `deskboard_delete` (only when asked).
- The page picks up changes within a few seconds. Do not tell the user to reload.
- If the MCP tools are not available in this session, use `store.js` from Node (`readData`, `writeData`) instead of editing `data.json` by hand. Keep `id` values unique and keep every collection an array.
- Collections: `todos`, `projects`, `attention`, `links`, `checklists`, `apps`, `chatmap` (chat to project overrides), `reviews`.
- Task fields: `title`, `due` (`YYYY-MM-DD` or null), `priority` (high, normal, low), `project` (project id or null), `repeat` ('', daily, weekdays, weekly, monthly), `link`, `done`, `doneAt`.
- Project fields: `name`, `status` (active, waiting, blocked, unsorted, done), `next`, `path` (relative to the user's home folder, or absolute), `notes`.
- Needs-attention fields: `title`, `note`, `severity` (high, normal), `source`, `url`, `resolved`.
- Links: `title`, `url`, `kind` (artifact, doc, other), `note`, `updatedAt`.
- Checklists: `title`, `project` (project id), `items` (array of `{id, text, done}`), `source`, `updatedAt`. With `deskboard_add`, `items` may be plain strings; a leading `[x]`, `- [ ]` or `1.` is understood. With `deskboard_update`, send the whole `items` array back (keep each id).

- Apps (the Launcher tab): `name`, `description`, `start` (script or program that starts it: a path relative to this folder, or absolute inside the user's folder; `.cmd`, `.bat`, `.ps1`, `.vbs` or `.exe`), `url` (where it runs), `port` (optional, taken from `url` if it is localhost), `project` (project id).

When you build something the user runs locally, such as a server or a desktop tool, give it a start script and register it as an app so it appears in the Launcher tab:
- Put the start script in `launchers/` (like `launchers/sorto-studio.cmd`), or in the project if it already has one. Keep it to the one command that starts the thing, send output to `launchers/logs/<name>.log`, and start with a `rem` line saying what it does.
- Register it with `deskboard_add` (collection `apps`). Set `url` when it serves a page, so the board can show Running or Stopped and offer "Start and open".
- Artifacts and documents you make go in `links` (kind `artifact` or `doc`); the Launcher lists them too.

Checklists are what the user sees when they focus on a project (the Focus button on a project card). When a chat produces a list of steps or things to verify for a project such as Sorto, add it as a checklist on that project, and tell the user it is there.

By default the board shows only what was worked on in the last 7 days; older items sit behind "Show N older" buttons and the Everything switch. Setting `updatedAt` (checklists, projects, links) is what keeps something current, so update it when you change an item.

Good things to push here from any session: an artifact or document you just made (a `links` item), something the user must decide or follow up on (an `attention` item with `source: "Claude"`), follow-up tasks you promised.

## When asked to "handle Desk Board requests"

The board's AI buttons (What should I do first, Paste to tasks, Weekly review) wait on Claude Desktop when the provider is "Claude Desktop". Answer them:

1. Call `deskboard_requests`. Each has an `id`, a `kind` (brief, tasks, review) and a `prompt`.
2. Follow the prompt exactly. For `tasks` reply with only the JSON array the prompt describes. For `brief` and `review` reply with plain text, no markdown symbols.
3. Call `deskboard_answer` with the `id` and your text. Do it promptly: the page is waiting, and requests expire after 15 minutes.
4. If there are none pending, say so.

## Collected data

`collected.json` is rebuilt every 5 minutes by `collector.js` from the user's project folders and Claude chat transcripts (`~/.claude/projects`). Use `deskboard_collected` to read it. Do not edit it.

## Rules

- API keys live only in `config.json`. Never read it, print it, or copy keys into chat, `data.json` or any other file. If the user wants to connect an AI provider, tell them to use the Connect AI button.
- Do not run `server.js` with a different port, or expose it beyond 127.0.0.1.
- No dependencies: keep the server, collector and MCP server on Node built-ins.
- Keep the documentation current. When a feature or behaviour changes, update the matching article in `docs\` (Markdown is the source), refresh its "Last updated" line, and run `node docs\build-docs.js` to rebuild `docs\html`.

## Files

`index.html` the page. `server.js` local server and AI relay. `store.js` shared file storage. `collector.js` scripts and chats scan. `mcp-server.js` tools for Claude sessions. `start.cmd` launches the board. `launch.vbs` is what the "Desk Board" desktop shortcut runs (starts the server with no console window, waits for it, opens the board in its own Edge window); `deskboard.ico` is its icon (the same drawing is the page favicon). `launchers/` holds the start scripts for the apps in the Launcher tab. `startup-install.cmd` and `startup-remove.cmd` start the server at Windows sign-in. `docs\` holds the documentation (five articles in Markdown, `build-docs.js`, and generated pages in `docs\html`, also served at `/docs/` and linked from the page header). `backups\` holds daily copies of `data.json`. `CHANGELOG.md` is the version history.

## Git and releases

The project is a git repository (branch main) with two private remotes: origin is 78tacos/DeskBoard and lcms is LCMS-Foundation/DeskBoard. Push to both. Never commit data.json, config.json, equests.json, collected.json, ackups\, launchers\logs\ or ca.pem; .gitignore covers them, so check git status before committing. Releases follow the steps in docs\04-reference.md (Source code and releases): update CHANGELOG.md, rebuild the docs, tag X.Y.Z, push, attach a git archive zip, create the release on both repositories. Ask before creating repositories, tags or releases that the user has not requested.
