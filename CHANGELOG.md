# Changelog

Versions are tagged in git (for example v1.0.0) and published as releases.

## 1.0.0 (2026-10-19)

**First release: a local dashboard for tasks, projects, scripts, chats and the apps you build.**
- **Board:** tasks (due dates, priorities, repeats, links), projects (status, next action, notes, Open folder and VS Code buttons), needs-attention items, links to documents and artifacts made in Claude, and saved weekly reviews.
- **Focus on a project:** a panel with that project's checklists (add items, paste a list, tick things off) while tasks, chats and scripts narrow to it.
- **Last 7 days by default:** each panel shows only what was worked on this week, with a **Show N older** button, an **Everything** switch, collapsible panels, search, filters and a week-ahead strip.
- **Collected for you:** scripts found on the PC (including every script Claude wrote, with a one-line description) and Claude Desktop and Claude Code chats, matched to projects.
- **Launcher tab:** the apps you have built, each with Running or Stopped status, **Start**, **Start and open** and **Show script**, plus your artifacts and documents.
- **AI buttons (optional):** What should I do first, Paste to tasks and Weekly review, through Claude Desktop (a session answers), Claude Code, any OpenAI-compatible service, or the Anthropic API. Keys stay in `config.json` and never reach the page.
- **Works with Claude sessions:** an MCP server and `CLAUDE.md` let sessions in the folder read and update the board, register new apps, and answer the AI buttons.
- **Everyday use:** desktop shortcut with its own icon that starts the server hidden and opens the board in its own window, optional start at sign-in, and a daily backup of the board (last 14 days).
- **Documentation:** five articles in `docs\`, also served inside the app at `/docs/` and ready to paste into Wartburg or OneNote.
- **Local only:** the server listens on 127.0.0.1 and rejects requests that do not come from its own page.
