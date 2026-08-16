/**
 * 游戏仓入口（议题 #1 / #2 / #8 / #9）。
 *
 * 职责：把 sim（pgengine/src/sim）和 view（Three + Webgiya Surfel）缝起来。
 * 数据流严格单向：输入 → sim tick（固定步）→ Snapshot → view 绘制。
 * view 绝不直接改 World；木头只吃直接光，不进 BVH（议题 #6）。
 */
import { createWorld, tick, snapshot, type SimWorld } from '../pgengine/src/sim/world'
import type { Input } from '../pgengine/src/sim/types'
import { createView, renderView, disposeView, type GameView } from './view'
import { BEAVER_POSITION } from './view/scene'

/** 主循环状态：sim 世界 + view */
interface Game {
  world: SimWorld
  view: GameView
}

/**
 * 启动游戏。
 * @param mount 挂载画布的 DOM 元素
 */
export async function startGame(mount: HTMLElement): Promise<Game> {
  // sim 与 view 并行初始化：Box3D 等 wasm，Three 等 WebGPU
  // 狸放哪是游戏仓的「独有」内容，在这里注入 sim；
  // box3d.wasm 由游戏仓 public/wasm 转发，避免 dev 下 SPA fallback 顶替
  const [world, view] = await Promise.all([
    createWorld({
      beaverPosition: { ...BEAVER_POSITION },
      box3dLocateFile: (path) => `${import.meta.env.BASE_URL}wasm/${path}`,
    }),
    createView(mount),
  ])

  // 输入缓冲：浏览器事件先入队，tick 时统一消费（不让事件直接改 World）
  const pendingInputs: Input[] = []

  // 点击 → 射线求交平地 → 刷木头（议题 #8）
  // 「从空中落下」是游戏规则（规格 #2 用户故事 10）：点击处是落点，
  // 木头从落点上方一段高度投放，落下来才显得「刚体真的在 step」。
  // 投放高度放游戏仓（main.ts），不塞进引擎 sim。
  const DROP_HEIGHT = 2.5
  view.onClickGround((point) => {
    pendingInputs.push({ type: 'SpawnLog', position: { ...point, y: point.y + DROP_HEIGHT } })
  })

  // 固定步累加器：显示器 60/144Hz 都走同样的物理节奏（用户故事 20/21）
  // 卡顿时不追赶（steps 钳制），避免「死亡螺旋」
  const FIXED_DT = 1 / 60
  let accumulator = 0
  let lastTime = performance.now()

  const game: Game = { world, view }

  const loop = (now: number) => {
    // 真实流逝时间（秒），钳制上限防止切后台回来时一次补太多步
    const realDt = Math.min((now - lastTime) / 1000, 0.25)
    lastTime = now
    accumulator += realDt

    // 攒够一个固定步才 tick；最多一次补 4 步，掉帧不追帧
    let steps = 0
    while (accumulator >= FIXED_DT && steps < 4) {
      tick(world, pendingInputs.splice(0))
      accumulator -= FIXED_DT
      steps++
    }

    // view 只读 Snapshot
    renderView(game.view, snapshot(world))
    requestAnimationFrame(loop)
  }

  requestAnimationFrame(loop)

  // 调试挂点（开发辅助，AGENTS「优先写好 debug」）：
  // 让 DevTools / 自动化能读当前 Snapshot 与刷木数，不上生产路径
  const debugApi = {
    readSnapshot: () => snapshot(world),
    logCount: () => snapshot(world).logs.length,
  }
  Object.assign(window, { __beaverDebug__: debugApi })

  return game
}

/**
 * 停止游戏并释放 GPU/物理资源（刷新页面或卸载时调用）。
 */
export function stopGame(game: Game): void {
  disposeView(game.view)
  game.world.physics.destroy()
}

// ------------------------------------------------------------------
// 入口：页面加载即启动。WebGPU 不可用 / 初始化失败时给玩家一句人话，
// 而不是白屏（议题 #8 验收「点开游戏看到明确反馈」）。
// ------------------------------------------------------------------
const mount = document.getElementById('app')

if (!mount) {
  // index.html 结构被改坏时的兜底（正常不会走到）
  document.body.textContent = '页面容器缺失，请检查 index.html 的 #app。'
} else if (!('gpu' in navigator)) {
  // 早期提示：连 WebGPU API 都没有（比等到 WebGPURenderer.init() 报错更友好）
  mount.textContent =
    '你的浏览器不支持 WebGPU（游戏画面需要它）。请使用最新版 Chrome 或 Edge。'
} else {
  startGame(mount).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    // 清掉可能已挂上的 canvas，只留错误说明
    mount.textContent = ''
    const tip = document.createElement('p')
    tip.textContent = `第一刀启动失败：${message}`
    tip.style.cssText = 'color:#f66;font:16px/1.6 sans-serif;padding:24px;'
    mount.appendChild(tip)
    console.error('启动失败:', error)
  })
}