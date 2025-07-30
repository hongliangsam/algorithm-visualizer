<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import FileTree from '../components/FileTree.vue';
import CodeViewer from '../components/CodeViewer.vue';

const route = useRoute();
const activeFile = ref('');
const currentFilePath = ref('');

// 处理文件选择事件
const handleFileSelect = (file) => {
  activeFile.value = file.path;
  currentFilePath.value = file.path;
};
</script>

<template>
  <div class="home-page">
    <div class="page-header">
      <div class="logo">
        <span class="logo-text">算法可视化</span>
        <div class="logo-sub">Algorithm Visualizer</div>
      </div>
      <div class="header-right">
        <el-button type="primary" round>开始学习</el-button>
      </div>
    </div>

    <div class="main-content">
      <div class="sidebar">
        <FileTree :active-file="activeFile" @select-file="handleFileSelect" />
      </div>
      <div class="content">
        <CodeViewer :file-path="currentFilePath" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #1a1b26;
  color: #a9b1d6;
  overflow: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(90deg, #1a1b2a, #232338);
  border-bottom: 1px solid #2d2d3f;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.logo {
  display: flex;
  flex-direction: column;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: bold;
  background: linear-gradient(to right, #8be9fd, #50fa7b);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  position: relative;
}

.logo-text::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(to right, #8be9fd, #50fa7b);
  opacity: 0.7;
}

.logo-sub {
  font-size: 0.8rem;
  color: #6272a4;
  margin-top: 2px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 280px;
  flex-shrink: 0;
  overflow: hidden;
  background-color: #1e1e2e;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.2);
  position: relative;
}

.sidebar::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 100%;
  background: linear-gradient(to bottom, #8be9fd, #50fa7b);
  opacity: 0.3;
}

.content {
  flex: 1;
  overflow: hidden;
}

@keyframes pulse {
  0% { box-shadow: 0 0 5px rgba(139, 233, 253, 0.5); }
  50% { box-shadow: 0 0 15px rgba(139, 233, 253, 0.8); }
  100% { box-shadow: 0 0 5px rgba(139, 233, 253, 0.5); }
}

:deep(.el-button--primary) {
  animation: pulse 3s infinite;
  background: linear-gradient(135deg, #8be9fd, #50fa7b);
  border: none;
  color: #282a36;
  font-weight: bold;
}

:deep(.el-button--primary:hover) {
  animation: none;
  background: linear-gradient(135deg, #9df0ff, #69ff95);
  box-shadow: 0 0 15px rgba(80, 250, 123, 0.6);
  transform: translateY(-2px);
  transition: transform 0.2s;
}
</style>