import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './', // 使用相对路径
  build: {
    outDir: 'dist', // 构建输出目录
  }
})
