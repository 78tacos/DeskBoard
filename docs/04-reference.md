# Desk Board: reference

Last updated 2026-10-15. For day-to-day use see [the user guide](02-user-guide.md); for fixes see [setup and troubleshooting](03-setup-and-troubleshooting.md).

## Architecture

A single Node.js server (`server.js`, no dependencies) listens on 127.0.0.1 port 4173. It serves the page (`index.html`), stores the board in `data.json`, scans for scripts and chats, relays AI requests, and starts or opens things on request. The page talks to it with `fetch` and checks for changes every few seconds. A second small program, `mcp-server.js`, lets Claude sessions read and update the same files.

```
Edge window (index.html)  <--->  server.js  <--->  data.json, config.json, collected.json, requests.json
                                    |  
                                    +--> AI providers (only when you click an AI button)
                                    +--> Explorer, VS Code, launcher scripts (only when you click a button)
mcp-server.js (Claude sessions)  <--->  the same JSON files
```

## Files in the DeskBoard folder

| File or folder | Purpose |
|---|---|
| `index.html` | The whole page: layout, styles and code |
| `server.js` | Local server and AI relay |
| `store.js` | Reads and writes the JSON files; makes the daily backup |
| `collector.js` | Scans for scripts and Claude chats |
| `mcp-server.js` | Tools for Claude sessions (see [using Desk Board with Claude](05-using-desk-board-with-claude.md)) |
| `.mcp.json` | Registers `mcp-server.js` for sessions opened in this folder |
| `CLAUDE.md` | Instructions Claude sessions read in this folder |
| `data.json` | The board (your data) |
| `config.json` | AI connection and collection settings; may contain an API key |
| `collected.json` | Result of the last script and chat scan; rebuilt automatically |
| `requests.json` | Pending AI requests for Claude Desktop; trimmed automatically |
| `backups\` | Daily copies of `data.json` (14 days) and any unreadable file |
| `launch.vbs` | What the desktop shortcut runs |
| `start.cmd` | Starts the server and opens the board |
| `start-server.cmd` | Runs the server with no window (used by the others) |
| `startup-install.cmd`, `startup-remove.cmd` | Add or remove start at sign-in |
| `CHANGELOG.md`, `.gitignore` | Version history, and the list of files kept out of git |
| `deskboard.ico`, `deskboard-256.png` | The icon (the page favicon is the same drawing) |
| `launchers\` | Start scripts for the Launcher tab; logs in `launchers\logs` |
| `docs\` | This documentation |

## Data format (`data.json`)

One JSON object. Each key is a list. Every item has an `id` (text, unique within its list) and most have `createdAt` (milliseconds since 1970).

| List | Fields |
|---|---|
| `todos` | `title`, `due` (`YYYY-MM-DD` or null), `priority` (high, normal, low), `project` (project id or null), `repeat` (empty, daily, weekdays, weekly, monthly), `link`, `done`, `doneAt` |
| `projects` | `name`, `status` (active, waiting, blocked, unsorted, done), `next`, `path` (relative to the user folder, or absolute), `notes`, `updatedAt` |
| `attention` | `title`, `note`, `severity` (high, normal), `source`, `url`, `resolved`, `resolvedAt` |
| `links` | `title`, `url`, `kind` (artifact, doc, other), `note`, `updatedAt` (`YYYY-MM-DD`) |
| `checklists` | `title`, `project`, `items` (a list of `{ id, text, done }`), `source`, `updatedAt` |
| `apps` | `name`, `description`, `start`, `url`, `port`, `project` |
| `chatmap` | `id` (chat id), `project` (project id, or empty for none): your manual project choice for a chat |
| `reviews` | `date`, `text` |

Writes are checked: the page sends the file's last-modified time with each save, and the server refuses a save made on stale data (HTTP 409). The page then reloads and asks you to redo your change.

## Settings (`config.json`)

```json
{
  "ai": {
    "provider": "openai | anthropic | claude-code | desktop",
    "baseUrl": "https://api.example.com/v1",
    "model": "model-name",
    "apiKey": "saved by the Connect AI dialog",
    "verified": true
  },
  "collect": { "scriptRoots": ["Development"], "extensions": [".ps1", ".py"] }
}
```

Optional `ai` keys: `apiKeyEnv`, `authHeader`, `headers`, `query` (see [setup and troubleshooting](03-setup-and-troubleshooting.md)). The `verified` flag is set by a passing test and cleared when the settings change. Claude Desktop needs no test.

How each provider is called:

| Provider | Call |
|---|---|
| OpenAI-compatible | `POST {baseUrl}/chat/completions` with `Authorization: Bearer <key>`; 120 second limit |
| Anthropic API | `POST {baseUrl}/v1/messages` with `x-api-key` and `anthropic-version: 2023-06-01`; `max_tokens` 4096; 120 second limit |
| Claude Code | Runs `claude.exe -p --no-session-persistence --tools ""` (found under `%APPDATA%\Claude\claude-code`) in a temporary folder; prompt on standard input; 180 second limit |
| Claude Desktop | Adds a request to `requests.json` and waits up to 15 minutes for a session to answer |

## Local API

All routes are on http://127.0.0.1:4173. Every `/api` call must send the header `X-Deskboard: 1`.

| Route | Purpose |
|---|---|
| `GET /api/data`, `PUT /api/data` | Read or save the board (`PUT` needs the `X-Base-Mtime` header) |
| `GET /api/collected` | The last script and chat scan |
| `POST /api/collect` | Scan now |
| `POST /api/open` | Open a project folder, VS Code, a script's folder, a task link, or an app's script folder |
| `GET /api/apps/status` | Running or stopped for each app (checks its port) |
| `POST /api/app/start` | Start an app (`{ "id": "...", "open": true }` also opens its address when ready) |
| `GET /api/ai/status` | Which AI is connected (never returns the key) |
| `PUT /api/ai/config` | Save or clear the AI connection |
| `POST /api/ai/test` | Test the connection |
| `POST /api/ai/chat` | Send a prompt through the connected AI |
| `GET /docs/` | This documentation |

## Security model

- The server listens on 127.0.0.1 only. Other PCs cannot reach it.
- It rejects requests whose `Host` is not `127.0.0.1:4173` or `localhost:4173`, and any `/api` request without the `X-Deskboard` header or with a foreign `Origin`. A web page in another tab cannot use it.
- The API key lives only in `config.json`. The page can see whether a key exists, never the key.
- Opening and starting are limited to what the board already holds. `POST /api/open` works on a project id, a script found by the scan, a task's link, or an app id, never on a path the page supplies. Starting an app requires a start script that exists, is a `.cmd`, `.bat`, `.ps1`, `.vbs` or `.exe` inside the user folder, and has no shell characters in its path.
- The Claude Code provider runs with no tools and no session saved.
- Data stays on this PC. The only outbound traffic is to the AI provider you chose, when you click an AI button, plus Google Fonts for the typeface.
- Anything that can edit `data.json` can add an app whose script you may later start. Only click **Start** on apps you recognise.

## How collection works

**Scripts.** The collector walks the script folders (see setup) and also adds every script that Claude wrote with its file tool, found in the chat transcripts, except those in temporary or work-tree folders. For each file it records the language, size, modified date, project (the project whose folder contains it, longest match) and a one-line description from the first comment:

| Type | Description taken from |
|---|---|
| PowerShell | `.SYNOPSIS`, else the first `#` comment, else the first line of a `<# #>` block |
| Python | The module docstring, else the first `#` comment |
| Batch | The first `REM` or `::` line |
| Shell | The first `#` comment after the first line |
| VBScript | The first `'` comment |

**Chats.** Each file in `%USERPROFILE%\.claude\projects\*\*.jsonl` is one chat. The title is the chat's name, else the last message. The project comes from the folder the chat ran in. Chats with no folder (the scratch workspace) show as No folder. Only the title, last message snippet, message count and times are used; chat content is never copied. Results are cached by file size and modified time, so rescans are quick.

## What counts as "this week"

See the table in [the user guide](02-user-guide.md). In short: tasks are current when overdue, due within 7 days, high priority, or added this week; the other panels use the last change or last message date; needs attention is always shown; searching or focusing a project overrides the 7-day view.

## Preferences stored in the browser

The window remembers its tab, the 7-day or Everything choice, the focused project, and collapsed panels in the browser's local storage under the key `deskboard.prefs`. Clearing the browser's site data resets them. They are not part of the board.

## Limits

| Item | Limit |
|---|---|
| Script scan | 4,000 files, 6 folders deep |
| Checklist | 200 items, 300 characters each |
| Paste to tasks | 20,000 characters in, up to 30 tasks proposed |
| AI request | 200,000 characters |
| Daily backups | 14 days |
| Claude Desktop request | Expires after 15 minutes |
| Rescan | Every 5 minutes, or on demand |
| Page refresh | Board every 4 seconds, scan results every 15 seconds, app status every 4 seconds while the Launcher is open |

## Source code and releases

The code is in two private GitHub repositories with the same history: `LCMS-Foundation/DeskBoard` (remote `lcms`) and `78tacos/DeskBoard` (remote `origin`). Versions are tagged `vX.Y.Z` and published as releases with a zip attached. `CHANGELOG.md` lists what changed in each version.

Not in the repository, by design: `data.json`, `config.json`, `requests.json`, `collected.json`, `backups\`, `launchers\logs\` and `ca.pem` (see `.gitignore`).

To make a release:

1. Update `CHANGELOG.md` and the affected articles in `docs\`, then run `node docs\build-docs.js`.
2. Commit, then tag: `git tag -a vX.Y.Z -m "Desk Board X.Y.Z"`.
3. Push the branch and the tag to both remotes: `git push origin main --tags` and `git push lcms main --tags`.
4. Make the zip: `git archive --format=zip --prefix=DeskBoard/ -o DeskBoard-vX.Y.Z.zip vX.Y.Z`.
5. Create the release in each repository with `gh release create vX.Y.Z DeskBoard-vX.Y.Z.zip --title "Desk Board X.Y.Z" --notes-file <notes>`, adding `-R LCMS-Foundation/DeskBoard` or `-R 78tacos/DeskBoard`.
## Not included

- Live mail, calendar or ticket panels. Anything a Claude session reads from a connected service can be added to the board as a needs-attention item or a task.
- Chats from claude.ai in a browser.
- A Stop button for apps.
- Use by more than one person or from more than one PC.
