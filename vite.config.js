import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/algorithm-visualizer/', // 为GitHub Pages设置正确的基本路径
  build: {
    outDir: 'dist', // 构建输出目录
  }
})
