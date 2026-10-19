# Desk Board: overview and quick start

Last updated 2026-10-15. Folder: `%USERPROFILE%\Development\DeskBoard`. Address: http://127.0.0.1:4173

## What it is

Desk Board is a personal dashboard that runs on this PC and opens in its own window. It keeps the things that need attention in one place:

- tasks, with due dates, priorities and repeats
- projects, each with a status, a next action, notes and checklists
- things that need attention
- documents and artifacts made in Claude
- scripts found on this PC, including the ones Claude wrote
- Claude chats, matched to projects
- weekly reviews
- a Launcher tab that starts the apps built in Claude

By default every panel shows only what was worked on in the last 7 days. Older items are one click away. Optional AI buttons can suggest what to do first, turn pasted text into tasks, and write a weekly review.

It is a small Node.js program with no installs and no cloud service. The board is stored in one file, `data.json`, next to the program. Nothing leaves this PC unless an AI provider is connected and an AI button is clicked.

## Why it runs locally

The first version was a claude.ai artifact. Artifacts load from `*.claudeusercontent.com`. The network firewall (a FortiGate) inspects HTTPS to that domain and replaces its certificate, so the page stayed blank. A local program avoids that problem and can also do things a web page cannot: read project folders and Claude chat history, open folders, and start apps.

## Quick start

1. Double-click **Desk Board** on the desktop. It starts the server with no console window and opens the board in its own window. The first open takes a few seconds.
2. Add a task: press **N** (or click the Add a task box), type it, press Enter.
3. Click **Focus** on a project card to see only that project, including its checklists.
4. Open the **Launcher** tab to start the apps you have built.
5. Optional: click **Connect AI** to turn on the AI buttons (see [the user guide](02-user-guide.md)).

Other ways to start it:

- Run `start.cmd` in the DeskBoard folder.
- Open http://127.0.0.1:4173 in any browser while the server is running.

Closing the window does not stop the server. It keeps running in the background and uses very little. To stop it, see [setup and troubleshooting](03-setup-and-troubleshooting.md).

## What is on the Board tab

| Panel | What it shows | Where the data comes from |
|---|---|---|
| Summary strip | Open tasks, overdue, active projects, needs attention, done in the last 7 days | Calculated from your data |
| Week strip | Tasks due today and over the next 6 days, plus overdue | Tasks |
| Focus panel | One project: its checklists, next action, counts, folder buttons | Projects, checklists, tasks, chats, scripts |
| Tasks | Open tasks grouped by Overdue, Today, Upcoming, No date | You add them (or Claude does) |
| Projects | One card per project with status, next action, progress, notes | You add them |
| Needs attention | Things waiting on you, high priority first | You add them (or Claude does) |
| Documents and artifacts | Links to things you made in Claude or elsewhere | You add them (or Claude does) |
| Weekly reviews | AI-written summaries, newest first | Weekly review button |
| Checklists | Lists of steps per project | You add them (or Claude does) |
| Scripts | Script files found on this PC, newest first | Scanned automatically |
| Claude chats | Claude Desktop and Claude Code conversations | Scanned automatically |

## What you need

- Windows 11 and Microsoft Edge.
- Node.js (version 22 is installed here). Nothing else to install for the board itself.
- Optional: VS Code (for the **VS Code** button), and whatever each app in the Launcher needs (for example `uv` for Sorto Studio, the .NET SDK for Wartburg and WGUpdater, `npm` for the LFND forms preview).

## Where things are

Everything is in `%USERPROFILE%\Development\DeskBoard`. The important files:

- `data.json` is your board. Back this up.
- `config.json` holds the AI connection, including any API key. Do not share it.
- `docs\` is this documentation.

The full list is in [the reference](04-reference.md).

## Related articles

- [User guide](02-user-guide.md): how to use every part of the board.
- [Setup and troubleshooting](03-setup-and-troubleshooting.md): install, start and stop, AI setup, backup, fixes.
- [Reference](04-reference.md): files, data format, local API, security, limits.
- [Using Desk Board with Claude](05-using-desk-board-with-claude.md): how Claude sessions read and update the board and answer the AI buttons.
