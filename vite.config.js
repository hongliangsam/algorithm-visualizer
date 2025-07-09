import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/algorithm-visualizer/', // 为GitHub Pages设置正确的基本路径
  build: {
    outDir: 'dist', // 构建输出目录
  },
  // 保留自定义的HTML标题和图标设置
  html: {
    transformHtml(html) {
      return html
        .replace(/<title>(.*?)<\/title>/, '<title>Algorithm Visualizer</title>')
        .replace(/href="\/vite\.svg"/, 'href="/algorithm-visualizer/algorithm-visualizer-logo.svg"');
    }
  }
})
