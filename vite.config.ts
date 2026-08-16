/**
 * Vite 配置（议题 #1：浏览器壳）。
 *
 * 要点：
 * - webgiya 是子模块源码，经 alias `webgiya/*` 直接引用（不改上游）
 * - tsc 侧对应映射到 src/webgiya-shims.d.ts（类型壳，见该文件说明）
 * - three 必须走预构建（ESM 依赖），box3d-wasm 同理
 * - 不引入 React/R3F（议题 #6 定：第一刀不上 R3F）
 */
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      // 运行时：webgiya/* → 子模块真实源码（tsc 侧见 tsconfig paths）
      webgiya: resolve(__dirname, 'pgengine/third_party/webgiya/src'),
    },
  },
  optimizeDeps: {
    // box3d-wasm 是 emscripten 产物，靠 import.meta.url 找同目录 .wasm；
    // 预构建会把 wasm 路径打散导致 dev 下 404，排除掉让它走源文件
    exclude: ['box3d-wasm', 'box3d-wasm/standard'],
    // 只扫我们自己入口的依赖；否则 vite 会把 webgiya 的演示
    // public/visualizations/*.html（引 lil-gui）也当入口扫描
    entries: ['index.html'],
  },
  server: {
    // 允许从子模块目录读源码（vite 默认限制在 workspace root 内，pgengine 在仓库里，无需放开；
    // 这里显式声明根目录即可）
    fs: { allow: ['.'] },
  },
  build: {
    // WebGPU 管线体积大，放宽告警阈值避免刷屏
    chunkSizeWarningLimit: 2000,
  },
})
