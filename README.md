# limit-sync

A Claude Code mod that keeps a cloud routine titled **Session initializer** timed to your 5-hour usage limit.

It reads the 5-hour window's reset time, then sets the routine's cron to five fires a day, 5 hours apart, starting 1 minute after the reset (cron in UTC). Five minutes after each armed time it checks the routine's `last_fired_at` and shows a toast: `initializer ran` or `initializer MISSED`.

## Setup

Create a cloud routine (claude.ai scheduled routine) titled exactly `Session initializer`, with a short prompt such as "Reply with one line: session started. Use no tools." The mod finds it by that title.

The mod only re-times the routine while a Claude Code session with the mod loaded is open. Cloud runs count against your usage.

## Install

At the prompt of a terminal session:

```
/plugin install limit-sync --marketplace Subakiz/limit-sync
```

From a shell:

```
claude plugin install limit-sync --marketplace Subakiz/limit-sync
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `Subakiz/limit-sync`, then Add plugin.

The repository is private: you need read access on GitHub and a git credential for github.com on your machine (an SSH key, or `gh auth login` then `gh auth setup-git`).
