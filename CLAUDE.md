# Claude Code Token & Context Discipline

Work efficiently. Treat the context window as a limited resource and follow
these rules without being reminded:

## Reading files

- Only read the specific files or sections you actually need for the task.
  Do not read whole folders "to be safe."
- When you only need part of a file, read that part, not the entire file.
- Prefer a quick search to locate the right place over opening many files.

## Subagents (delegating busywork)

- When you spin up subagents for grunt work (reading files, searching,
  scraping, simple lookups), use the cheap fast model (Haiku) for them.
- Keep the expensive thinking (planning, decisions, reviewing) on the main agent.

## Staying on track

- If you are unsure what I want, ask me ONE question before building.
  Do not guess and produce a large wrong output I have to pay to redo.
- If I tell you you are off track, stop immediately and re-align. Do not
  finish the wrong approach first.

## Keeping context clean

- When this task is basically done and we are clearly moving to a new one,
  tell me: "This looks like a new task, want to /clear?"
- When we have made a lot of progress and the window is getting full, suggest
  I run /compact, and remind me I can name what to protect.

## Output

- Be concise. Give me the answer and the why, not a wall of restated context.
- Do not repeat large blocks of code or text back to me unless I ask.

@AGENTS.md
**NOTE** AI agent context is centralized in **[AGENTS.md](AGENTS.md)** — project overview, stack, commands, and the Always / Ask First / Never rules live there.
