# Using Desk Board with Claude

Last updated 2026-10-15. Desk Board and Claude work together in four ways. This article covers what each does, how to set it up, and the rules Claude sessions follow.

## The four ways Claude is involved

| What | How it works | Setup |
|---|---|---|
| Claude sessions update the board | A session in the DeskBoard folder can read and change tasks, projects, checklists, links, attention items and apps through the `deskboard` tools | Approve the `deskboard` server when a session asks |
| Claude Desktop answers the AI buttons | The board queues each AI request and a Claude session answers it | **Connect AI**, then choose Claude Desktop |
| Claude Code answers the AI buttons | The server runs Claude Code in the background, with no tools | **Connect AI**, choose Claude Code, sign in once |
| Chats and scripts are collected | The board reads the chat history and the scripts Claude wrote on this PC | Nothing to set up |

The first two work without an API key. Neither sends your board anywhere except through your own Claude sessions.

## Claude sessions updating the board

`.mcp.json` in the DeskBoard folder registers a small program, `mcp-server.js`, as an MCP server named `deskboard`. When you open a Claude session in the DeskBoard folder, it asks you to approve the server once. After that the session has these tools:

| Tool | What it does |
|---|---|
| `deskboard_get` | Reads the board: open tasks, projects, open attention items, links, checklists, apps, counts of collected scripts and chats, and pending AI requests. Sessions call this first. |
| `deskboard_add` | Adds a task, project, attention item, link, checklist or app |
| `deskboard_update` | Changes fields on an item by id |
| `deskboard_delete` | Deletes an item by id. Sessions only do this when you ask. |
| `deskboard_collected` | Lists the collected scripts or chats |
| `deskboard_requests` | Lists AI requests waiting for an answer |
| `deskboard_answer` | Answers one request |

Things you can say in a session:

- "Add a task to call the vendor on Friday, high priority."
- "Put the steps from this chat on the Sorto project as a checklist."
- "Register this app in the Launcher." (The session writes a start script in `launchers\` and adds the app.)
- "Add the artifact you just made to Desk Board."

The board shows changes within a few seconds. Anything that touches an item should refresh its `updatedAt`, which keeps checklists, projects and links in the 7-day view.

If the tools are not available in a session (for example the session started before the server was registered), Claude falls back to Node's `store.js`, which writes `data.json` the same way.

### What Claude sessions are told to do

`CLAUDE.md` in the folder is read by every session in it. Its main rules:

- Call `deskboard_get` first. Delete only when asked.
- When a chat produces a list of steps or things to check for a project, add it as a checklist on that project and say so.
- When something is built that the user runs locally, put a start script in `launchers\` (one command, output to `launchers\logs`, a `rem` line saying what it does) and register it as an app with its address.
- Add artifacts and documents as links.
- Add things the user must decide as needs-attention items with the source Claude.
- Never read or print `config.json`, and never copy an API key anywhere.
- Keep the server, collector and MCP server free of dependencies, and never expose the server beyond 127.0.0.1.

## Claude Desktop as the AI

Click **Connect AI**, choose **Claude Desktop (a session answers)**, and click **Use Claude Desktop**. No key and no test are needed.

When you click an AI button the board shows "Waiting for Claude Desktop". To answer:

1. Open a Claude session in the DeskBoard folder.
2. Say **handle Desk Board requests**.
3. The session reads the waiting requests with `deskboard_requests`, writes each answer in the format the request asks for (plain text, or only a JSON list for Paste to tasks), and sends it with `deskboard_answer`.
4. The board shows the answer.

A request waits up to 15 minutes, then expires with a message. The **Connect AI** dialog shows when a session last used the board.

This needs a Claude session to be open. If you want answers without one, use Claude Code or an API provider instead.

## Claude Code as the AI

Choose **Claude Code on this PC (needs one-time sign-in)**. The server finds `claude.exe` in your Claude Desktop install (`%APPDATA%\Claude\claude-code`) and runs it in the background with no tools and no saved session. It uses your Claude plan.

Claude Code has its own sign-in, separate from the desktop app. Run the sign-in command shown in the dialog once, in a terminal, then click **Save and test**. Until then the test says Claude Code is not signed in.

## What Claude can see

- **Chats:** the chat history Claude Desktop and Claude Code keep on this PC. The board uses titles, a snippet of your last message, message counts and times. It does not copy chat content.
- **Scripts:** files on this PC, plus every script Claude wrote with its file tool in those chats.
- **Not visible:** claude.ai chats in a web browser, and anything stored only in Claude's cloud.

## Sending data to an AI provider

Only the AI buttons send anything, and only to the provider you connected. The exact contents are listed in the AI buttons table in [the user guide](02-user-guide.md). With Claude Desktop, the content goes to your Claude session. With Claude Code or an API provider, it goes to that service.

## Related

- [Setup and troubleshooting](03-setup-and-troubleshooting.md) for connection problems.
- [Reference](04-reference.md) for the data format and the tool details.
