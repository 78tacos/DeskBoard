# Desk Board

Double-click the **Desk Board** shortcut on your desktop (or run `start.cmd`). It starts the server with no console window and opens the board in its own window at http://127.0.0.1:4173. If the shortcut goes missing, `launch.vbs` is what it runs and `deskboard.ico` is its icon.

Needs only Node.js (already installed). Everything stays on this PC. Your board is `data.json`. The server keeps a copy of it for each of the last 14 days in `backups\`.

**Source and versions:** private repositories `LCMS-Foundation/DeskBoard` and `78tacos/DeskBoard`. `CHANGELOG.md` lists each release.

**Documentation:** click **Docs** in the board header, or open `docs\html\index.html`. Start with `docs\01-overview-and-quick-start.md`. This file is only a short summary.

## Connecting an AI
Click **Connect AI**. Options: Claude Desktop (a session answers), Claude Code on this PC, any OpenAI-compatible service (OpenAI, Ollama, LM Studio, OpenRouter, Gemini, Mistral, Groq), or the Anthropic API. Once connected, the board shows **What should I do first?**, **Paste to tasks** and **Weekly review**.

Keys are stored in `config.json` and are never sent to the page. Optional hand edits in `config.json`:
- `"ai": { "apiKeyEnv": "NAME" }` reads the key from an environment variable instead.
- `"collect": { "scriptRoots": ["Development", "C:\\Scripts"], "extensions": [".ps1", ".py", ".bat"] }` changes where scripts are collected from.

Behind a firewall that inspects HTTPS: save its CA certificate as `ca.pem` in this folder.

## Claude Desktop
`.mcp.json` registers the board's tools for sessions opened in this folder (approve the `deskboard` server when asked). Then a session can read and update the board, and answer the AI buttons when the provider is Claude Desktop: say "handle Desk Board requests".

## Start at sign-in
Double-click `startup-install.cmd` once. `startup-remove.cmd` undoes it.

## Launcher tab
The **Launcher** tab lists the apps you have made, each with a status (Running or Stopped, for apps with a web address) and **Start**, **Start and open**, **Open** and **Show script** buttons. Start scripts live in `launchers/`. Only `.cmd`, `.bat`, `.ps1`, `.vbs` and `.exe` files inside your user folder can be started. Add an app with the form on that tab, or ask Claude to register something it built. Artifacts and documents you have saved are listed below the apps.

## Checklists and focus
Click **Focus** on a project to see only that project: its checklists (add items, paste a list, tick things off), tasks, chats and scripts. Claude sessions can add checklists to a project too. **Exit focus** returns to the full board.

## Last 7 days
By default each panel shows only what was worked on in the last 7 days, with a "Show N older" button on the panel. The **Last 7 days / Everything** switch at the top changes all panels at once, and the ▾ next to a panel title collapses it. Searching or focusing a project shows everything that matches. Your choices are remembered.

## Shortcuts
`/` search, `N` new task, `T` today only, `Esc` clear filters.
