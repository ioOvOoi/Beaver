// @ts-nocheck
/**
 * Webgiya Surfel GI 管线适配层（议题 #3 / #6 / #9）。
 *
 * 策略：直接 import 子模块源码（pgengine/third_party/webgiya），不改上游，
 * 只在本仓写薄装配层 —— 复刻 webgiya demo 的 main.ts 流程，
 * 去掉 UI / 场景切换 / debug，换成我们的河谷静物。
 *
 * 类型豁免说明：webgiya 上游自身没有类型清洁保证（它只跑 vite build
 * 不跑 tsc，源码里大量 @ts-ignore），本文件是唯一 import 上游源码的
 * 适配层，故整文件 @ts-nocheck，对外只暴露本仓自定的 GiPipeline 接口。
 *
 * 管线事实（议题 #3 备忘）：
 * - 必须 THREE.WebGPURenderer（forceWebGL: false），WebGL 跑不了
 * - createSceneBVH 把 matrixWorld 烙进顶点，之后几何静态
 * - 恰好 1 个 DirectionalLight + 1 张 HDR/EXR
 * - 木头不进 BVH（议题 #6）：BVH 构建时木头组不在场景里
 */
import * as THREE from 'three/webgpu'
import { mrt, output, pass, screenUV, texture } from 'three/tsl'
import { fxaa } from 'three/examples/jsm/tsl/display/FXAANode.js'
import { EXRLoader, HDRLoader } from 'three/examples/jsm/Addons.js'

// ------------------------------------------------------------------
// webgiya 上游 import 顺序有讲究（不要重排！）：
// surfelRadialDepth 与 surfelIntegratePass 互为循环依赖（上游源码设计）。
// ESM 求值顺序取决于「谁先被 import」——必须先求值 surfelRadialDepth，
// 它在依赖链里让 surfelIntegratePass 先完成，导出 consts 就绪；
// 反过来先 import surfelIntegratePass 会触发 "Cannot access 'consts'
// before initialization"（TDZ）。这就是 demo 在 vite 下能跑的原因。
// ------------------------------------------------------------------
import { applyOcclusionSettings } from 'webgiya/surfelRadialDepth'
import { MAX_SURFELS } from 'webgiya/constants'
import { createGBuffer } from 'webgiya/gbuffer'
import { createSurfelPool } from 'webgiya/surfelPool'
import { createSurfelPreparePass } from 'webgiya/surfelPreparePass'
import { createSurfelAgePass } from 'webgiya/surfelAgePass'
import { createSurfelFindMissingPass } from 'webgiya/surfelFindMissingPass'
import { createSurfelAllocatePass } from 'webgiya/surfelAllocatePass'
import { createSurfelDispatchArgs } from 'webgiya/surfelDispatchArgs'
import { createSurfelHashGrid } from 'webgiya/surfelHashGrid'
import { createSceneBVH, type SceneBVHBundle } from 'webgiya/sceneBvh'
import { createSurfelIntegratePass } from 'webgiya/surfelIntegratePass'
import { createSurfelGIResolvePass } from 'webgiya/surfelGIResolvePass'
import { createIntegratorDispatchArgs } from 'webgiya/integratorDispatchArgs'

/**
 * GI 管线的全部 GPU 状态。由 createGiPipeline 一次性装配，
 * renderGiFrame 每帧推进。view 层只跟它打交道。
 */
export interface GiPipeline {
  renderer: THREE.WebGPURenderer
  /** 每帧调用：跑 gbuffer → surfel 生命周期 → 积分 → resolve → 合成 */
  renderFrame: (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => void
  /** 窗口尺寸变化时调用 */
  resize: () => void
  dispose: () => void
}

/**
 * 初始化 WebGPU renderer（去掉 webgiya demo 的 Inspector/UI 依赖）。
 */
async function initRenderer(container: HTMLElement): Promise<THREE.WebGPURenderer> {
  const renderer = new THREE.WebGPURenderer({
    forceWebGL: false,
    antialias: true,
    requiredLimits: {
      maxStorageBuffersPerShaderStage: 10,
      maxComputeWorkgroupSizeX: 1024,
      maxComputeInvocationsPerWorkgroup: 1024,
    },
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1
  container.appendChild(renderer.domElement)
  await renderer.init()
  return renderer
}

/**
 * 装配整条 Surfel GI 管线。
 * @param container 挂载画布的 DOM 元素
 * @param scene     河谷静物场景（木头组此时还不能在 scene 里！）
 * @param camera    肩后相机
 * @param dirLight  唯一方向光（Surfel 恰好需要 1 个 DirectionalLight —— 议题 #3）
 */
export async function createGiPipeline(
  container: HTMLElement,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  dirLight: THREE.DirectionalLight,
): Promise<GiPipeline> {
  const renderer = await initRenderer(container)

  // 蓝噪纹理：surfel 积分用的随机源（webgiya demo 同款资源，已复制到游戏仓 public）
  const texLoader = new THREE.TextureLoader()
  const blueNoise = await texLoader.loadAsync(
    `${import.meta.env.BASE_URL}textures/LDR_RGBA_0.png`,
  )
  blueNoise.wrapS = blueNoise.wrapT = THREE.RepeatWrapping
  blueNoise.minFilter = THREE.NearestFilter
  blueNoise.magFilter = THREE.NearestFilter
  blueNoise.generateMipmaps = false

  // HDR 环境：阳光天空（议题 #3：恰好 1 张 HDR/EXR）
  const hdrLoader = new HDRLoader()
  const envTex = (await hdrLoader.loadAsync(
    `${import.meta.env.BASE_URL}exr/kloppenheim_05_puresky_2k.hdr`,
  )) as THREE.DataTexture
  envTex.generateMipmaps = true
  envTex.mapping = THREE.EquirectangularReflectionMapping

  // ---- 装配各 pass（顺序照 webgiya main.ts）----
  const gbuffer = createGBuffer(renderer)
  const surfelPool = createSurfelPool()
  surfelPool.ensureCapacity(MAX_SURFELS)
  const surfelPrepare = createSurfelPreparePass()
  const surfelAge = createSurfelAgePass()
  const surfelFindMissing = createSurfelFindMissingPass()
  const surfelAllocate = createSurfelAllocatePass()
  const surfelDispatchArgs = createSurfelDispatchArgs()
  const uniformGrid = createSurfelHashGrid()
  const integratorDispatchArgs = createIntegratorDispatchArgs()
  const surfelIntegrate = createSurfelIntegratePass(blueNoise, envTex)
  const surfelResolve = createSurfelGIResolvePass(uniformGrid, surfelPool)
  // 默认遮挡参数（webgiya 默认值，避免跨表面漏光）
  applyOcclusionSettings({})

  // 静态几何烙进 BVH（此时木头组不在 scene，动态物不进 BVH —— 议题 #6）
  const sceneBVH: SceneBVHBundle = createSceneBVH(renderer, scene)

  // ---- 合成：直接光 + 间接光（Surfel resolve 输出）----
  const postProcessing = new THREE.PostProcessing(renderer)
  const scenePass = pass(scene, camera)
  scenePass.setMRT(
    mrt({
      output: output,
    }),
  )
  const scenePassColor = scenePass.getTextureNode('output')
  let mustRebuildComposite = true

  const buildComposite = () => {
    const giTex = surfelResolve.getOutputTexture()
    if (!giTex) return
    const directLight = scenePassColor
    const albedo = texture(gbuffer.target.textures[1], screenUV)
    const indirectLight = texture(giTex, screenUV).mul(albedo)
    // 合成：直接光 + 间接光，FXAA 抗锯齿（webgiya demo 默认 Combined 模式）
    postProcessing.outputNode = fxaa(directLight.add(indirectLight))
    postProcessing.needsUpdate = true
    mustRebuildComposite = false
  }

  // ---- 每帧推进 ----
  // 上一帧相机位置：surfel「找缺失」pass 用它判断哪些 surfel 该换批（webgiya 同款逻辑）
  const prevCameraPos = new THREE.Vector3()
  prevCameraPos.copy(camera.position)

  const renderFrame = (scene: THREE.Scene, cam: THREE.PerspectiveCamera) => {
    cam.updateMatrixWorld()

    // 1) 离屏 GBuffer：为 surfel 生成提供法线/深度/漫反射。
    // 与 webgiya demo 同款：先摘掉背景，避免 env 贴图这种「无限远」像素混进 surfel 生成
    scene.background = null
    const prevTarget = renderer.getRenderTarget()
    renderer.setMRT(gbuffer.sceneMRT)
    renderer.setRenderTarget(gbuffer.target)
    renderer.render(scene, cam)
    renderer.setRenderTarget(prevTarget)
    renderer.setMRT(null)

    // 2) surfel 生命周期：准备 → 找缺失 → 老化 → 分配 → 重建网格
    surfelPrepare.run(renderer, surfelPool)
    const findResult = surfelFindMissing.run(
      renderer,
      cam,
      gbuffer,
      surfelPool,
      uniformGrid,
      prevCameraPos,
    )
    surfelDispatchArgs.run(renderer, surfelPool)
    const indirectAttr = surfelDispatchArgs.getIndirectAttr()
    surfelAge.run(renderer, surfelPool, surfelFindMissing, uniformGrid, prevCameraPos, indirectAttr)
    surfelAllocate.run(renderer, surfelPool, surfelFindMissing, findResult.tileCount)
    uniformGrid.build(renderer, surfelPool, cam)

    // 3) 积分：surfel 采样 BVH 求光照
    integratorDispatchArgs.run(renderer, surfelPool)
    surfelIntegrate.run(
      renderer,
      surfelPool,
      sceneBVH,
      uniformGrid,
      cam,
      dirLight,
      integratorDispatchArgs.getIndirectAttr(),
    )

    // 4) Resolve：把 surfel 光照写进间接光纹理
    surfelResolve.run(renderer, cam, gbuffer)

    // 5) 合成最终画面（间接光纹理就绪后第一次重建合成节点）
    if (mustRebuildComposite) buildComposite()
    scene.background = envTex
    postProcessing.render()

    // 记录本帧相机位置，供下一帧的 surfel 生命周期 pass 使用
    prevCameraPos.copy(cam.position)
    surfelPool.swapMoments()
  }

  const resize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h)
    gbuffer.resize(renderer)
    postProcessing.needsUpdate = true
    mustRebuildComposite = true
  }

  const dispose = () => {
    postProcessing.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }

  return { renderer, renderFrame, resize, dispose }
}
