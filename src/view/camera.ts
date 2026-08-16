/**
 * 肩后镜头（议题 #1 / #2 用户故事 5）。
 *
 * 镜头跟在狸背后、略高于狸，看向狸前方。本刀狸不移动，但镜头逻辑
 * 按「跟 Snapshot 里狸的位姿」写，以后狸能走了镜头自然跟着走。
 * 相机不进 sim，它只是 view 的观察者。
 */
import * as THREE from 'three/webgpu'
import type { Snapshot } from '../../pgengine/src/sim/types'

/** 肩后偏移：在狸背后（-z 方向是狸面朝方向）上方 */
const OFFSET = new THREE.Vector3(0, 2.2, -3.5)

/**
 * 肩后相机：持有相机对象，每帧按狸位姿更新位置。
 */
export class ShoulderCamera {
  readonly camera: THREE.PerspectiveCamera

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000)
  }

  /** 每帧跟随 Snapshot 里的狸位姿 */
  follow(snap: Snapshot): void {
    const b = snap.beaver.position
    this.camera.position.set(b.x + OFFSET.x, b.y + OFFSET.y, b.z + OFFSET.z)
    // 看向狸身体（略高于脚底，让河谷在视野下方展开）
    this.camera.lookAt(b.x, b.y + 0.6, b.z)
  }

  /** 窗口尺寸变化时更新纵横比 */
  resize(aspect: number): void {
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
  }
}
