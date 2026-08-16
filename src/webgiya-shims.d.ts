/**
 * Webgiya 上游源码的类型壳（游戏仓侧）。
 *
 * 背景：webgiya 是「钉死的上游」子模块（pgengine/third_party），
 * 它自己没有类型清洁保证（只跑 vite build 不跑 tsc，源码大量 @ts-ignore）。
 * 游戏仓不改上游，所以 tsc 不直接读它的 .ts —— 而是经 tsconfig paths
 * 把 `webgiya/*` 映射到本壳；vite 运行时经 resolve.alias 读真实源码。
 *
 * 壳里全部 any：真正接线的 gi.ts 是 @ts-nocheck（唯一接触上游的文件），
 * 类型安全由本仓自定的 GiPipeline 接口在外围保证。
 */

// materials.ts
export declare function makeNodeStandard(
  hex: number,
  roughness?: number,
  metalness?: number,
): any

// constants.ts
export declare const MAX_SURFELS: number

// gbuffer.ts
export declare function createGBuffer(...args: any[]): any

// surfelPool.ts
export declare function createSurfelPool(...args: any[]): any

// surfelPreparePass.ts
export declare function createSurfelPreparePass(...args: any[]): any

// surfelAgePass.ts
export declare function createSurfelAgePass(...args: any[]): any

// surfelFindMissingPass.ts
export declare function createSurfelFindMissingPass(...args: any[]): any

// surfelAllocatePass.ts
export declare function createSurfelAllocatePass(...args: any[]): any

// surfelDispatchArgs.ts
export declare function createSurfelDispatchArgs(...args: any[]): any

// surfelHashGrid.ts
export declare function createSurfelHashGrid(...args: any[]): any

// sceneBvh.ts
export declare function createSceneBVH(...args: any[]): any
export type SceneBVHBundle = any

// surfelIntegratePass.ts
export declare function createSurfelIntegratePass(...args: any[]): any

// surfelGIResolvePass.ts
export declare function createSurfelGIResolvePass(...args: any[]): any

// integratorDispatchArgs.ts
export declare function createIntegratorDispatchArgs(...args: any[]): any

// surfelRadialDepth.ts
export declare function applyOcclusionSettings(...args: any[]): any
