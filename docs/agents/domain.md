# Domain Docs

How the engineering skills should consume this repo's domain documentation.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root — points at each context.
- **`CONTEXT.md`** — 河狸（这款游戏独有的词）
- **`pgengine/CONTEXT.md`** — 运行时词（sim / Snapshot / Box3D / Webgiya / Steam）
- **`docs/adr/`** — if any exist; also `pgengine` docs if they appear.

If a file does not exist, proceed silently. `/domain-modeling` creates them lazily.

## File structure

This repo is **multi-context**:

- 河狸游戏仓（本仓）
- PGEngine（`pgengine` 子模块）

## Use the glossary's vocabulary

When an issue title, ticket, or test names a domain concept, use the term from the relevant `CONTEXT.md`. Don't drift to synonyms listed under `_Avoid_`.
