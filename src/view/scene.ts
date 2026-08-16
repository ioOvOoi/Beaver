/**
 * 河谷静物（游戏仓内容层，议题 #1 / #9）。
 *
 * 本文件只放「这一款游戏独有的」东西：平地、程序树、盒子狸、不透明静水。
 * 全部静态、全部进 BVH（Surfel 烙死矩阵），与动态木头严格分开。
 *
 * 材质用 MeshStandardNodeMaterial（Webgiya 管线要求），
 * 颜色从 materials.ts 的 makeNodeStandard 来，保证 diffuse array 烘焙一致。
 */
import * as THREE from 'three/webgpu'
import { makeNodeStandard } from 'webgiya/materials'
import { BEAVER_POSITION } from '../../pgengine/src/sim/world'

/** 河谷静物场景的产物：场景 + 唯一方向光（Surfel 恰好 1 个 DirectionalLight） */
export interface StillLifeBundle {
  scene: THREE.Scene
  dirLight: THREE.DirectionalLight
}

/**
 * 构建河谷静物。
 * 注意：木头（动态刚体）绝不加进这里 —— 它们由 view/logs.ts 单独管理，
 * 且 BVH 构建时木头组会临时移出场景，保证烙进 BVH 的只有静态物。
 */
export function createStillLife(): StillLifeBundle {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x202025) // 加载期底色，合成时会被 env 贴图替换

  // 方向光：Surfel 管线恰好 1 个 DirectionalLight，角度取「阳光河谷」的午后斜照
  const dirLight = new THREE.DirectionalLight(0xffffff, 3.0)
  dirLight.position.set(30, 40, 20)
  dirLight.castShadow = true
  scene.add(dirLight)

  // ---- 平地：当代河床，顶面在 y=0（与 sim 的物理平地一致）----
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(200, 1, 200),
    makeNodeStandard(0x8a9a6b, 0.95, 0), // 沙草色，粗糙
  )
  ground.position.y = -0.5 // 盒子中心下移半高，顶面正好 y=0
  ground.receiveShadow = true
  scene.add(ground)

  // ---- 不透明静水：深色平面，只比地面高一点点避免 z-fight ----
  // 议题 #5 定：Webgiya 无透明，静水 = 不透明深色面，不做第二套水渲染。
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 30),
    makeNodeStandard(0x1e3340, 0.35, 0.0), // 深蓝灰，微反光质感
  )
  water.rotation.x = -Math.PI / 2 // 平面默认朝 +Z，躺平朝上
  water.position.set(0, 0.02, -8) // 河谷中后部一条河，略高于地面
  water.receiveShadow = true
  scene.add(water)

  // ---- 程序树：树干 + 两层树冠，散布在河谷两岸（静态、不可倒、不可啃）----
  const treeSpots: Array<[number, number, number]> = [
    // [x, z, 缩放]
    [-18, -14, 1.6],
    [-12, 2, 1.2],
    [-7, -20, 1.4],
    [14, -16, 1.7],
    [19, 4, 1.1],
    [9, 12, 1.3],
    [23, -5, 1.5],
    [-24, -6, 1.2],
  ]
  for (const [x, z, s] of treeSpots) {
    scene.add(makeTree(x, z, s))
  }

  // ---- 盒子狸：本刀静态占位盒，站在 sim 给的狸位姿 ----
  const beaver = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.2, 1.1),
    makeNodeStandard(0x8b5a2b, 0.7, 0), // 木棕色
  )
  beaver.position.set(BEAVER_POSITION.x, 0.6, BEAVER_POSITION.z) // 底贴地：半高 0.6
  beaver.castShadow = true
  scene.add(beaver)

  return { scene, dirLight }
}

/**
 * 程序树：树干圆柱 + 两个叠放的树冠圆锥。
 * 全部静态，不参与物理；将来「啃树」是另一张票。
 */
function makeTree(x: number, z: number, scale: number): THREE.Group {
  const tree = new THREE.Group()
  tree.position.set(x, 0, z)
  tree.scale.setScalar(scale)

  // 树干：矮胖圆柱，棕色
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.5, 3, 8),
    makeNodeStandard(0x6b4a2b, 0.9, 0),
  )
  trunk.position.y = 1.5
  trunk.castShadow = true
  tree.add(trunk)

  // 树冠：两层圆锥叠放，深绿 + 浅绿，形成「程序树」的轮廓
  const crownLow = new THREE.Mesh(
    new THREE.ConeGeometry(2.0, 2.4, 8),
    makeNodeStandard(0x3d5c33, 0.85, 0),
  )
  crownLow.position.y = 3.6
  crownLow.castShadow = true
  tree.add(crownLow)

  const crownTop = new THREE.Mesh(
    new THREE.ConeGeometry(1.3, 1.8, 8),
    makeNodeStandard(0x4c7a3a, 0.85, 0),
  )
  crownTop.position.y = 5.2
  crownTop.castShadow = true
  tree.add(crownTop)

  return tree
}
