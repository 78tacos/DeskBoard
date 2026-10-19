# Desk Board: setup, operation and troubleshooting

Last updated 2026-10-15. This is the runbook. For how to use the board, see [the user guide](02-user-guide.md).

## Requirements

- Windows 11 and Microsoft Edge (Edge gives the app-style window; any browser works for the address).
- Node.js 22 or later on the PATH. Check with `node --version`.
- Nothing to install for Desk Board itself. It has no dependencies.

## Setting it up on a PC

1. Get the program into `%USERPROFILE%\Development\DeskBoard`. Either clone the private repository (`gh repo clone LCMS-Foundation/DeskBoard "$env:USERPROFILE\Development\DeskBoard"`), or download the zip from the latest release, or copy the folder from another PC. Your board (`data.json`) and settings (`config.json`) are not in the repository; copy `data.json` across if you want the same board.
2. Run `start.cmd`. The server starts and the board opens.
3. Create the desktop shortcut (run this in PowerShell):

```powershell
$dir = "$env:USERPROFILE\Development\DeskBoard"
$lnk = Join-Path ([Environment]::GetFolderPath("Desktop")) "Desk Board.lnk"
$s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
$s.TargetPath = "$env:WINDIR\System32\wscript.exe"
$s.Arguments = '"' + "$dir\launch.vbs" + '"'
$s.WorkingDirectory = $dir
$s.IconLocation = "$dir\deskboard.ico,0"
$s.WindowStyle = 7
$s.Save()
```

4. Optional: make the server start when you sign in to Windows by double-clicking `startup-install.cmd`. It adds one file, `DeskBoard-server.vbs`, to your Startup folder (`shell:startup`). Double-click `startup-remove.cmd` to undo it.

The shortcut runs `launch.vbs`. That starts the server with no console window, waits until it answers (up to 15 seconds), then opens the board in an Edge app window. If Edge cannot be started it opens your default browser.

## Starting, stopping and restarting

| Task | How |
|---|---|
| Start | Double-click the **Desk Board** shortcut, or run `start.cmd` |
| Check it is running | `Get-NetTCPConnection -LocalPort 4173 -State Listen` (a row means yes), or open http://127.0.0.1:4173 |
| Stop the server | Run the command below |
| Restart | Stop it, then start it again |

Stop the server:

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like "*server.js*" } | ForEach-Object { Stop-Process -Id $_.ProcessId }
```

Closing the board window does not stop the server. If you start the server while it is already running, the second copy exits quietly and nothing changes.

When files change:

- `index.html` (the page) is read on every load. Reload the window; no restart needed.
- `server.js`, `store.js`, `collector.js` and `mcp-server.js` need a restart (and, for `mcp-server.js`, a new Claude session).

To use a different port, set the `DESKBOARD_PORT` environment variable before starting the server. The shortcut, `start.cmd` and `launch.vbs` assume 4173, so edit them too.

## Connecting an AI

Click **Connect AI**, choose a provider, and click **Save and test**. Once it passes, the AI buttons appear. **Disconnect** removes the connection and any saved key.

| Provider | What you need | Notes |
|---|---|---|
| Claude Desktop (a session answers) | Nothing | Requests wait until a Claude session in the DeskBoard folder answers them. See [using Desk Board with Claude](05-using-desk-board-with-claude.md). |
| Claude Code on this PC | One-time sign-in | Run the sign-in command shown in the dialog once, in a terminal. It runs Claude Code in the background with no tools. |
| OpenAI, Ollama, LM Studio, OpenRouter, Google Gemini, Mistral, Groq, or any OpenAI-compatible service | Base URL, model name, API key (local models need no key) | The preset fills the base URL. Type the model name your provider uses. |
| Anthropic API | API key | Base URL `https://api.anthropic.com`. The preset suggests `claude-opus-5-5`; change it if you prefer another model. |

The API key is saved in `config.json` and is never sent to the page. Optional hand edits in `config.json`:

- `"ai": { "apiKeyEnv": "NAME" }` reads the key from an environment variable instead.
- `"ai": { "authHeader": "api-key" }` sends the key in a header of that name instead of `Authorization: Bearer`.
- `"ai": { "headers": { "name": "value" } }` adds extra headers.
- `"ai": { "query": "api-version=2024-10-21" }` adds a query string (for Azure-style services).

### If the network inspects HTTPS

A firewall that replaces certificates stops the server reaching cloud AI providers. The test fails with "Certificate not trusted". Save the firewall's CA certificate (PEM format) as `ca.pem` in the DeskBoard folder and restart the server. `start-server.cmd` picks it up automatically. Local models are not affected.

## Where scripts and chats are collected from

Every 5 minutes (and when you click **Rescan**) the server scans for scripts and Claude chats.

- **Script folders:** `%USERPROFILE%\Development`, every project folder on the board, and every folder a Claude chat ran in. It skips `node_modules`, `.git`, `venv`, `dist`, `build`, `.claude` and similar. It stops at 4,000 files or 6 folders deep.
- **Script types:** `.ps1`, `.psm1`, `.py`, `.bat`, `.cmd`, `.sh`, `.vbs`.
- **Chats:** the transcripts Claude Desktop and Claude Code keep in `%USERPROFILE%\.claude\projects`.

To change the folders or file types, add this to `config.json` (relative folders are relative to your user folder):

```json
{
  "collect": {
    "scriptRoots": ["Development", "C:\\Scripts"],
    "extensions": [".ps1", ".py", ".bat"]
  }
}
```

## Backup and restore

`data.json` is the whole board. The server protects it automatically:

- Before the first change each day it copies the board to `backups\data-YYYY-MM-DD.json`. The last 14 days are kept.
- If `data.json` is ever unreadable (for example a hand edit left a typo), the damaged file is saved as `backups\data-unreadable-<date-time>.json` before anything overwrites it.

To restore: close the board window, stop the server, copy the backup you want over `data.json`, then start the server again.

Also worth keeping a copy of: `config.json` (AI connection, contains any key), `launchers\` (start scripts) and `docs\`. `collected.json` and `requests.json` are rebuilt automatically.

If you hand-edit `data.json`, stop the server first and keep the file valid JSON. A typo makes the board look empty, and the next change you make saves over the file (your old copy is kept in `backups\`).

## Troubleshooting

| What you see | Likely cause | What to do |
|---|---|---|
| "Waiting for the Desk Board server…" and it stays | The server is not running, or another program is using port 4173 | Run `start.cmd`. If it stays, check `node --version` and run `Get-NetTCPConnection -LocalPort 4173 -State Listen`. If another program owns the port, close it. |
| The shortcut does nothing | `launch.vbs` or `start-server.cmd` is missing or moved | Check both are in the DeskBoard folder. Recreate the shortcut with the script above. |
| Opens in a normal browser tab, not an app window | Edge could not be started | Harmless. Use the browser tab, or fix Edge. |
| "The board changed elsewhere, so it was reloaded" | Two things saved at once (a second window, or Claude) | Your last change was dropped. Do it again. |
| A change Claude made does not show up | The page waits while you are typing in a box, or the server is stopped | Click outside the box and wait a few seconds. Check the server is running. |
| The board is empty after a restart | `data.json` was damaged or replaced | Restore the newest file in `backups\`. |
| AI buttons are missing | No AI is connected, or the test has not passed | Click **Connect AI**. It says **Finish AI setup** if setup is incomplete. |
| AI test fails with "Certificate not trusted" | The firewall inspects HTTPS | Add `ca.pem` as described above. |
| AI test fails with "rejected the API key" | Wrong or expired key | Paste the key again. A blank key box keeps the old key. |
| AI test fails with "doesn't know that model or URL" | Wrong model name or base URL | Check both with the provider. |
| "Claude Code on this PC isn't signed in" | The one-time sign-in was not done | Run the sign-in command shown in the dialog. |
| The AI button waits and waits | Provider is Claude Desktop and no session has answered | Open a Claude session in the DeskBoard folder and say "handle Desk Board requests". Requests expire after 15 minutes. |
| A script is not listed | It is outside the scanned folders, too deep, or the type is not scanned | Add its folder to `scriptRoots` and click **Rescan**. |
| A script shows Missing | The file was moved or deleted | Turn off **Show missing** to hide it. |
| A chat has no project | It ran with no folder, or in a folder that is not a project | Pick a project in its dropdown. |
| **Start** in the Launcher does nothing or the app never turns Running | The start script failed | Open `launchers\logs\<name>.log`. Check the app's prerequisites (Wartburg needs PostgreSQL running; Sorto Studio needs `uv`). |
| "The start script wasn't found, or it isn't allowed" | Wrong path, or the file is not a `.cmd`, `.bat`, `.ps1`, `.vbs` or `.exe` inside your user folder | Fix the path in the app's entry. |
| **Open folder** or **VS Code** says not found | The project folder is not set or does not exist, or VS Code is in an unusual place | Check the project's folder in `data.json`. VS Code is looked for in `%LOCALAPPDATA%\Programs\Microsoft VS Code` and `Program Files`. |
| The page looks plain or fonts differ | No internet for Google Fonts | Harmless. The page falls back to system fonts. |

To stop an app started from the Launcher, close it normally. For a web app, find its process by port and stop it (change `8765` to the app's port):

```powershell
Get-NetTCPConnection -LocalPort 8765 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess }
```

## Removing Desk Board

1. Stop the server (command above).
2. Delete the **Desk Board** shortcut from the desktop.
3. Run `startup-remove.cmd` if you installed start at sign-in.
4. Delete the DeskBoard folder. Keep `data.json` first if you want the board.

Desk Board stores nothing elsewhere, except its window preferences (see [the reference](04-reference.md)).
