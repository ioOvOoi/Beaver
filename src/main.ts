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
  const [world, view] = await Promise.all([createWorld(), createView(mount)])

  // 输入缓冲：浏览器事件先入队，tick 时统一消费（不让事件直接改 World）
  const pendingInputs: Input[] = []

  // 点击 → 射线求交平地 → 刷木头（议题 #8）
  view.onClickGround((point) => {
    pendingInputs.push({ type: 'SpawnLog', position: point })
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
  return game
}

/**
 * 停止游戏并释放 GPU/物理资源（刷新页面或卸载时调用）。
 */
export function stopGame(game: Game): void {
  disposeView(game.view)
  game.world.physics.destroy()
}
