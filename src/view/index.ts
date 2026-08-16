/**
 * view 组装层（议题 #1 / #8 / #9）。
 *
 * GameView 是游戏仓 view 的唯一入口：
 * - createView：初始化 WebGPU + Surfel 管线 + 河谷静物 + 肩后相机
 * - renderView：每帧从 Snapshot 同步木头与相机，然后推进 GI 管线
 * - onClickGround：把「点击屏幕」翻译成「平地世界坐标」（喂给 sim 的 SpawnLog）
 * - disposeView：释放 GPU 资源
 *
 * 铁律（pgengine/CONTEXT.md）：view 只读 Snapshot，绝不直接改 World；
 * sim 与 view 之间只有一条数据通道（Snapshot）。
 */
import * as THREE from 'three/webgpu'
import type { Snapshot } from '../../pgengine/src/sim/types'
import { createStillLife } from './scene'
import { LogMeshes } from './logs'
import { ShoulderCamera } from './camera'
import { createGiPipeline, type GiPipeline } from './gi'

export interface GameView {
  /** 注册「点击平地」回调（世界坐标，y=0 平面） */
  onClickGround: (cb: (point: { x: number; y: number; z: number }) => void) => void
}

interface ViewInternals extends GameView {
  scene: THREE.Scene
  /** 肩后相机：持有 THREE 相机对象 */
  cam: ShoulderCamera
  logs: LogMeshes
  gi: GiPipeline
}

/**
 * 初始化整个 view。
 * @param mount 挂载画布的 DOM 元素
 */
export async function createView(mount: HTMLElement): Promise<GameView> {
  // 1) 河谷静物：平地、程序树、盒子狸、不透明静水（全部进 BVH）
  const { scene, dirLight } = createStillLife()

  // 2) 肩后相机（先建，因为 GI 管线需要相机参数）
  const cam = new ShoulderCamera(window.innerWidth / window.innerHeight)

  // 3) 木头：动态物，先不挂进 scene（BVH 构建完成后才挂 —— 议题 #6）
  const logs = new LogMeshes()

  // 4) Surfel GI 管线（BVH 构建发生在内部，此时木头组不在场景里）
  const gi = await createGiPipeline(mount, scene, cam.camera, dirLight)

  // 5) BVH 构建完成后，把木头组挂进场景
  logs.attachTo(scene)

  // 6) 点击 → 平地坐标（喂给 sim 的 SpawnLog）
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) // y=0 平面
  const hitPoint = new THREE.Vector3()

  const screenToGround = (
    clientX: number,
    clientY: number,
  ): { x: number; y: number; z: number } | null => {
    const rect = mount.getBoundingClientRect()
    ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(ndc, cam.camera)
    if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
      return { x: hitPoint.x, y: 0, z: hitPoint.z }
    }
    return null // 射线没打到平地（理论上不会发生，防御）
  }

  const internals: ViewInternals = {
    scene,
    cam,
    logs,
    gi,
    onClickGround: (cb) => {
      gi.renderer.domElement.addEventListener('pointerdown', (e) => {
        const p = screenToGround(e.clientX, e.clientY)
        if (p) cb(p)
      })
    },
  }

  // 7) 窗口尺寸变化 → 相机 + GBuffer + 合成一起更新
  window.addEventListener('resize', () => {
    cam.resize(window.innerWidth / window.innerHeight)
    gi.resize()
  })

  return internals
}

/**
 * 每帧渲染：从 Snapshot 同步动态物与相机，然后推进 GI 管线。
 * 由 main.ts 的 requestAnimationFrame 循环驱动。
 */
export function renderView(view: GameView, snap: Snapshot): void {
  const v = view as ViewInternals
  v.logs.sync(snap) // 木头位姿 ← Snapshot
  v.cam.follow(snap) // 肩后镜头 ← Snapshot 里狸的位姿
  v.gi.renderFrame(v.scene, v.cam.camera)
}

/** 释放 GPU 资源（页面卸载时） */
export function disposeView(view: GameView): void {
  const v = view as ViewInternals
  v.gi.dispose()
}
