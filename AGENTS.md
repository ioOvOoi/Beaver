# AGENTS

本仓是**河狸**游戏，不是引擎。引擎在根目录 `pgengine`。

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

## 第一关（现在只做这个）

同时引用 Webgiya 和 Box3D：

- 引擎仓拉 `third_party/webgiya`，写进引擎 README 引用表
- 刚体走 `box3d-wasm`，写进引擎 README 引用表
- 两样都要能跑
- 不要求 Surfel 焊到动态刚体上
- 这一关不做联机、不做 Steam

完成：可演示一件事 + git diff。动了 sim 要有测试绿。
