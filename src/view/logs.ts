/**
 * 木头渲染（议题 #1 / #8）：动态刚体的视觉化身。
 *
 * 木头不进 BVH（议题 #6）：Surfel 只烙静态物，木头只吃直接光 + 阴影。
 * 每帧从 Snapshot 读位姿，只更新变换，不碰任何 sim 状态。
 */
import * as THREE from 'three/webgpu'
import { makeNodeStandard } from 'webgiya/materials'
import type { Snapshot } from '../../pgengine/src/sim/types'

/** 木头组：挂在 scene 下，但 BVH 构建时会被临时移出（见 gi.ts） */
export class LogMeshes {
  private readonly group = new THREE.Group()
  private readonly meshes = new Map<number, THREE.Mesh>()

  // 木头材质/几何共享单例：所有木头同色同质感同尺寸，没必要每根 new 一份 GPU 资源
  private static readonly logMaterial = makeNodeStandard(0x7a5230, 0.75, 0)
  private static readonly logGeometry = new THREE.BoxGeometry(1, 1, 1)

  constructor() {
    this.group.name = 'logs' // 动态物标记：BVH 构建时排除
  }

  /** 把木头组挂到场景（构建 BVH 之后再调用） */
  attachTo(scene: THREE.Scene): void {
    scene.add(this.group)
  }

  /** 按 Snapshot 同步木头位姿：新增的建 mesh，消失的移除 */
  sync(snap: Snapshot): void {
    const seen = new Set<number>()

    for (const log of snap.logs) {
      seen.add(log.id)
      let mesh = this.meshes.get(log.id)
      if (!mesh) {
        // 新木头：1m 见方木棕盒子（与 sim 的 LOG_HALF=0.5 对应）；几何也共享
        mesh = new THREE.Mesh(LogMeshes.logGeometry, LogMeshes.logMaterial)
        mesh.castShadow = true
        mesh.receiveShadow = true
        this.meshes.set(log.id, mesh)
        this.group.add(mesh)
      }
      mesh.position.set(log.position.x, log.position.y, log.position.z)
    }

    // 清理 sim 里已不存在的木头（第一刀不会发生，防御性处理）
    if (this.meshes.size !== seen.size) {
      for (const [id, mesh] of this.meshes) {
        if (!seen.has(id)) {
          this.group.remove(mesh)
          // 共享材质/几何不在此 dispose（还有别的木头在用）
          this.meshes.delete(id)
        }
      }
    }
  }
}
