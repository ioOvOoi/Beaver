# Beaver（河狸）

被投进污染河谷的河狸，靠啃树筑坝让环境变好。本仓是这款游戏自己的仓库；引擎是根目录 git 子模块 [`pgengine`](https://github.com/ioOvOoi/PGEngine)。

给 Agent：先读 [AGENTS.md](./AGENTS.md)、[CONTEXT-MAP.md](./CONTEXT-MAP.md)、[CONTEXT.md](./CONTEXT.md)。

## 第一刀（当前分支：feat/first-knife）

同一 WebGPU 画面里：

- **静物走 Surfel GI**：平地、程序树、盒子狸、不透明静水（Webgiya 子模块管线，钉在 `pgengine/third_party/webgiya`，不改上游）
- **点击刷木头**：点击平地 → `SpawnLog` sim 输入 → Box3D（`box3d-wasm`）落下、能堆，只吃直接光、不进 BVH
- **肩后镜头**：跟 Snapshot 里狸的位姿

规格见议题 [#2](https://github.com/ioOvOoi/Beaver/issues/2)，map 见议题 [#1](https://github.com/ioOvOoi/Beaver/issues/1)。

## 怎么跑

需要支持 WebGPU 的浏览器（Chrome/Edge 114+）。

```bash
# 首次 clone：引擎与 webgiya 都是子模块，必须递归拉取
git submodule update --init --recursive

# 游戏仓
npm install
npm run dev        # 打开终端提示的本地地址（Vite 默认 http://localhost:5173）
npm run build      # 产物在 dist/
npm run typecheck  # tsc --noEmit

# 引擎仓 sim 测试（无头、无 WebGPU）
cd pgengine && npm install && npm test
```

## 分账

| 内容 | 写哪里 |
| --- | --- |
| tick / Snapshot / 输入类型 / Box3D 封装 | `pgengine/src/sim`（固定步，有 vitest 测试） |
| Surfel GI 管线（引用） | `pgengine/third_party/webgiya`（子模块，钉 commit） |
| 河谷内容（狸、树、木头、水、关卡） | 本仓 `src/view` |
| 浏览器壳 / 点击输入 / 肩后镜头 | 本仓 `src/` |

数据流硬规则：输入 → 房主 `tick`（固定步）→ `Snapshot` → view。view 只读 Snapshot，绝不碰可变 World；LLM 不进 tick；玩法不写进 mesh。