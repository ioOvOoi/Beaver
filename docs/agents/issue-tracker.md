# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations. Do not keep a parallel tracker under `.scratch/`.

Repo: `ioOvOoi/Beaver`.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body-file <file>`. Prefer `--body-file` on Windows (avoid heredoc).
- **Read an issue**: `gh issue view <number> --comments`
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments`
- **Comment**: `gh issue comment <number> --body "..."`
- **Labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

## Pull requests as a triage surface

**PRs as a request surface: no.**

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

- **Map**: one issue labelled `wayfinder:map`.
- **Child ticket**: GitHub sub-issue of the map. Fallback: task list on the map + `Part of #<map>` in the child. Labels: `wayfinder:research` / `wayfinder:prototype` / `wayfinder:grilling` / `wayfinder:task`.
- **Blocking**: native issue dependencies (`blocked_by` via `gh api`). Fallback: a `Blocked by: #N` line in the child body.
- **Frontier**: open children of the map with no open blocker and no assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me`
- **Resolve**: comment the answer, close the issue, append a gist + link to the map's Decisions so far.
