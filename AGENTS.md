# AGENTS

本仓是**河狸**游戏，引擎在根目录 `pgengine`。

## 必须遵守

Break your requirement down into small, test‑able functions before writing any code.
Match the existing code‑style and architecture inside your current repository.
Add defensive checks for edge‑case inputs and handle runtime exceptions gracefully.
Never deliver incomplete code that cannot run without extra manual modification.
Wrap complicated logic into independent helper‑functions to improve readability.
每一小步进行一次中文git提交，详细描述更改以及任务。
大模块更新需要创建分支进行修改。
开发过程中优先写好debug。
程序与美术分离。

## 每次先做

1. 读 `pgengine/CONTEXT.md` 对词。
2. 读 `pgengine/AGENTS.md` 和 `pgengine/README.md`。
3. 提示词只点名：`sim` / `koota` / `Box3D` / `Steam Networking` / `R3F` / `Three` / `Webgiya`。不要冒充别的引擎 API。

## 写哪里

| 答案 | 写哪里 |
| --- | --- |
| 这款游戏独有（河狸、木头、坝、关卡、文案） | 本仓 |
| 下一款还要用（tick、Snapshot、GI、Steam 绑定） | `pgengine`，在子模块里提交 |
| 拿不准 | 先写本仓 |

不要改 `pgengine/third_party/` 里钉死的上游。不要在本仓再造一套 tick / 物理 / GI。

## Agent skills

### Issue tracker

任务、地图、规格、票一律 GitHub Issues（`gh`）。禁止再写 `.scratch/` tracker。见 `docs/agents/issue-tracker.md`。

### Triage labels

`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`。见 `docs/agents/triage-labels.md`。

### Domain docs

多上下文：`CONTEXT-MAP.md` → `CONTEXT.md`（河狸）+ `pgengine/CONTEXT.md`。见 `docs/agents/domain.md`。
