import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage
  },
  {
    path: '/code/:filePath(.*)',
    name: 'code',
    component: HomePage
  }
]

// 确定基本路径，支持GitHub Pages
// 对于GitHub Pages，如果仓库名是algorithm-visualizer，基本路径应该是/algorithm-visualizer/
const base = import.meta.env.BASE_URL || '/'

const router = createRouter({
  history: createWebHistory(base),
  routes
})

export default router