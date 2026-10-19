# Desk Board: user guide

Last updated 2026-10-15. See [the overview](01-overview-and-quick-start.md) for what Desk Board is and how to start it.

## The window

Across the top: the title, a **Last 7 days / Everything** switch, the search box, the AI buttons (once an AI is connected), and **Connect AI** (or the name of the connected AI). Under that are two tabs, **Board** and **Launcher**.

On the Board tab, from top to bottom: the summary strip, the week strip, the panels, and a row with the Checklists, Scripts and Claude chats panels. Each panel has a small arrow next to its title that collapses it.

Changes save as you make them. Open windows pick up changes made elsewhere within a few seconds, including changes Claude makes.

## Tasks

**Add a task:** type in the Add a task box (shortcut **N**). Optional fields are due date, priority (Normal, High, Low), repeat, project, and a link or file path. Press Add or Enter.

**Complete a task:** click its box. Completed tasks move to Recently done at the bottom of the panel. Click the box again to reopen one.

**Groups:** Overdue (red), Today, Upcoming, No date. Inside a group, high priority comes first, then earliest due date.

**Repeating tasks:** choose Daily, Weekdays, Weekly or Monthly. When you complete one, the next copy is created automatically with the next due date, and a message offers Undo. If the task was already overdue, the next date is the first one that is today or later.

**Links on tasks:** a web address shows Open link. A file or folder path shows Show in folder, which opens Explorer.

**Today only:** the **Today only** button (shortcut **T**) shows just overdue tasks, tasks due today, and high priority tasks.

**Delete:** the **×** on a task. A message offers Undo for a few seconds.

**Later tasks:** with the 7-day view on, a task counts as current if it is overdue, due within the next 7 days, high priority, or was added this week. Other open tasks are folded under **Show N later tasks**. Nothing is deleted.

## Summary strip and week strip

The tiles are filters. **Overdue** shows only overdue tasks. **Active projects** shows only active projects. **Needs attention** scrolls to that panel. **Done, last 7 days** shows a small bar chart, one bar per day.

The week strip has one button per day (today and the next six) with the number of tasks due, and an **Overdue** button. Click a day to filter tasks to that date. Click it again to clear.

## Projects

Each project card shows its status, folder, next action, progress, and counts of chats and scripts.

- **Status** menu: Active, Waiting, Blocked, Unsorted, Done. Blocked projects sort first.
- **Next action:** click the line under the name and type. It saves when you leave the box.
- **Progress bar:** tasks linked to the project that are done, out of all of them. Checklist progress shows as `checklists 2/7`.
- **Touched Nd ago:** the latest of: a change to the project, a task added or finished, a chat in its folder, or a script changed in its folder.
- **Stale:** an Active project not touched for more than 14 days.
- **Notes:** open Notes on the card for free text. A dot shows when notes exist.
- **Open folder** opens the project's folder in Explorer. **VS Code** opens it in VS Code. Both appear only when the project has a folder.
- **Add a project:** use the form at the top of the panel. The folder is relative to your user folder (for example `Development\MyProject`) or a full path.

## Focus mode and checklists

Click **Focus** on a project card (or the project's name anywhere) to focus on it. A panel appears at the top with the project's name, status, next action, counts, and its checklists. The Tasks, Projects, Scripts and Claude chats panels narrow to that project, and older items are shown too. The filter bar shows **Focus: Sorto** (or the project name). Click **Exit focus** to return.

If your latest Claude chat in a project was in the last 3 hours, the header suggests **Working on Sorto? Focus**.

**Checklists** hold steps, tests, or things to verify.

- **New checklist:** give it a title and, optionally, items one per line. Lines may start with `- [ ]`, `- [x]`, `-` or `1.`; the marks are understood and `[x]` starts the item ticked.
- **Tick an item:** click its box. Click again to untick.
- **Add an item:** type in the box at the bottom and press Enter. Pasting several lines adds them all.
- **Hide done:** hides ticked items on that checklist so only the remaining work shows. It becomes Show done.
- **Remove an item** with its **×**, or the whole checklist with the **×** at the top right. Both offer Undo.
- Claude can add checklists to a project too. They are marked with a Claude badge.

When no project is focused, the Checklists panel in the lower row lists the recently touched checklists from all projects.

## Needs attention

Things waiting on you. Add one with a title and a severity (Normal or High). High items sort first. **Resolve** removes an item from the list (it is kept, marked resolved). Items always show, whatever their age. Claude adds items here when something needs your decision.

## Documents and artifacts

Links to things you made in Claude or elsewhere. Add a title, a web address, and a type (Artifact, Document, Other). Links are grouped by type, newest first. The Launcher tab lists the artifacts and documents too.

## Weekly reviews

Click **Weekly review** (needs an AI connected). The AI writes a short summary of the last 7 days from your board: what you finished, what slipped, where the time went (using chats and scripts), and suggestions for next week. Each review is saved in this panel. The newest is open; older ones are folded.

## Scripts

This panel lists script files found on this PC: PowerShell, Python, batch, shell and VBScript files. It includes every script Claude wrote in a chat, even in folders it would not normally scan.

- Each row shows the language, name, a one-line description taken from the script's first comment, its project, date and size.
- A **Claude** badge marks scripts Claude wrote. Hover it to see which chat.
- **Show** opens Explorer on the file. **Copy path** copies the full path.
- **Made by Claude** shows only those. **Show missing** includes scripts that no longer exist on disk (for example from deleted scratch folders). **Rescan** scans again now; otherwise the scan repeats every 5 minutes.

## Claude chats

Conversations from Claude Desktop and Claude Code on this PC, newest first, with a snippet of your last message, how long ago, and how many messages. Each chat is matched to a project by the folder it ran in.

Use the dropdown on a row to change a chat's project. Chats started with no folder show **No folder** until you pick one. Chats from claude.ai in a web browser are not on this PC and are not listed.

## Last 7 days and Everything

The **Last 7 days / Everything** switch at the top controls every panel at once. In Last 7 days (the default), each panel shows what was worked on this week and folds the rest under a button such as **Show 23 older scripts**. Click the button to expand that one panel and click it again to fold it. **Everything** shows it all.

Searching or focusing a project always shows everything that matches. The arrow next to a panel title collapses the whole panel. Your choices are remembered between sessions.

What counts as "this week" for each panel:

| Panel | Counts as this week |
|---|---|
| Tasks | Overdue, due within 7 days, high priority, or added this week |
| Projects | Touched in the last 7 days (see Projects above) |
| Checklists | Changed in the last 7 days |
| Documents and artifacts | Updated or added in the last 7 days |
| Scripts | File changed in the last 7 days |
| Claude chats | Last message in the last 7 days |
| Weekly reviews | The newest one |
| Needs attention | Always shown |

## Search and filters

The search box filters every panel as you type: tasks, projects, notes, checklists and their items, attention items, links, scripts, chats and reviews. Filters you set (focus, overdue, a day, active projects, today only, search) appear as chips under the header. Click the **×** on a chip to remove it, **Clear all**, or press **Esc**.

## Launcher tab

The Launcher lists the apps you have built, each with a status and buttons.

- **Running / Stopped:** shown for apps with a web address on this PC. Apps without one show **No status** (for example tray apps).
- **Start** runs the app's start script.
- **Start and open** runs it, waits until it is up (up to about 30 seconds), then opens its address in your default browser.
- **Open** appears when the app is running and opens its address.
- **Show script** opens Explorer on the start script. The script's output goes to `launchers\logs`.
- **Add an app:** use the form under the list: a name, an optional description, the start script (a path relative to the DeskBoard folder, or a full path), the address, and a project.

There is no Stop button. Close an app the usual way, or see [setup and troubleshooting](03-setup-and-troubleshooting.md).

Below the apps, **Made in Claude** lists your artifacts and documents. Add more on the Board tab.

## AI buttons

Click **Connect AI** and pick a provider (setup steps are in [setup and troubleshooting](03-setup-and-troubleshooting.md)). Once it is connected, three buttons appear.

| Button | What it does | What it sends |
|---|---|---|
| What should I do first? | One sentence on the day and up to four next actions | Today's date, open tasks, open attention items, active projects with days since last touched, the 12 latest chat titles |
| Paste to tasks | Finds tasks in pasted text; you tick the ones to add | The pasted text (up to 20,000 characters), today's date, project names |
| Weekly review | Writes and saves a review of the last 7 days | Tasks done and overdue, attention titles, projects, chat titles and script names from this week |

Chat titles are sent, never chat content. If the provider is Claude Desktop, requests wait for a Claude session to answer them (see [using Desk Board with Claude](05-using-desk-board-with-claude.md)).

## Keyboard shortcuts

| Key | Action |
|---|---|
| `/` | Go to the search box |
| `N` | Go to the new task box |
| `T` | Toggle Today only |
| `Esc` | Clear filters and search |
| Enter (in an Add item box) | Add the checklist item |

The shortcuts work when you are not typing in a box and no dialog is open. `N` and `T` apply on the Board tab.

## Tips

- Back up `data.json` now and then. It is the whole board.
- Give each active project a next action. The AI buttons work only from what is on the board, so a next action gives them something to go on.
- Put start scripts for anything you build in `launchers\` so it shows up in the Launcher.
- To get a list from a chat onto the board, ask Claude to add it as a checklist on the project.
