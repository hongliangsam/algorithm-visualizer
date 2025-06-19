<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Folder, Document, ArrowRight as CaretRight } from '@element-plus/icons-vue';

const props = defineProps({
  activeFile: String
});

const emit = defineEmits(['select-file']);

const router = useRouter();
const fileTree = ref([]);
const expandedFolders = ref(new Set());

// 获取文件树数据
const fetchFileTree = async () => {
  // 这里模拟从后端获取文件树数据的过程
  // 在实际项目中可以通过API请求获取
  const chaptersData = [
    {
      name: 'chapter_array_and_linkedlist',
      path: 'chapter_array_and_linkedlist',
      type: 'folder',
      children: [
        { name: 'array.js', path: 'chapter_array_and_linkedlist/array.js', type: 'file' },
        { name: 'linked_list.js', path: 'chapter_array_and_linkedlist/linked_list.js', type: 'file' },
        { name: 'list.js', path: 'chapter_array_and_linkedlist/list.js', type: 'file' },
        { name: 'my_list.js', path: 'chapter_array_and_linkedlist/my_list.js', type: 'file' }
      ]
    },
    {
      name: 'chapter_binary_search',
      path: 'chapter_binary_search',
      type: 'folder',
      children: [
        { name: 'binary_search.js', path: 'chapter_binary_search/binary_search.js', type: 'file' }
      ]
    },
    {
      name: 'chapter_computational_complexity',
      path: 'chapter_computational_complexity',
      type: 'folder',
      children: [
        { name: 'space_complexity.js', path: 'chapter_computational_complexity/space_complexity.js', type: 'file' },
        { name: 'time_complexity.js', path: 'chapter_computational_complexity/time_complexity.js', type: 'file' },
        { name: 'worst_best_time_complexity.js', path: 'chapter_computational_complexity/worst_best_time_complexity.js', type: 'file' }
      ]
    },
    {
      name: 'chapter_graph',
      path: 'chapter_graph',
      type: 'folder',
      children: [
        { name: 'graph_adjacency_list.js', path: 'chapter_graph/graph_adjacency_list.js', type: 'file' },
        { name: 'graph_adjacency_matrix.js', path: 'chapter_graph/graph_adjacency_matrix.js', type: 'file' },
        { name: 'graph_bfs.js', path: 'chapter_graph/graph_bfs.js', type: 'file' },
        { name: 'graph_dfs.js', path: 'chapter_graph/graph_dfs.js', type: 'file' }
      ]
    },
    {
      name: 'chapter_sorting',
      path: 'chapter_sorting',
      type: 'folder',
      children: [
        { name: 'bubble_sort.js', path: 'chapter_sorting/bubble_sort.js', type: 'file' },
        { name: 'bucket_sort.js', path: 'chapter_sorting/bucket_sort.js', type: 'file' },
        { name: 'counting_sort.js', path: 'chapter_sorting/counting_sort.js', type: 'file' },
        { name: 'insertion_sort.js', path: 'chapter_sorting/insertion_sort.js', type: 'file' },
        { name: 'merge_sort.js', path: 'chapter_sorting/merge_sort.js', type: 'file' },
        { name: 'quick_sort.js', path: 'chapter_sorting/quick_sort.js', type: 'file' },
        { name: 'radix_sort.js', path: 'chapter_sorting/radix_sort.js', type: 'file' }
      ]
    },
    // 其他章节目录...
  ];

  fileTree.value = chaptersData;
};

// 切换文件夹展开/收起状态
const toggleFolder = (folderPath) => {
  if (expandedFolders.value.has(folderPath)) {
    expandedFolders.value.delete(folderPath);
  } else {
    expandedFolders.value.add(folderPath);
  }
};

// 处理文件点击事件
const handleFileClick = (file) => {
  emit('select-file', file);
  router.push({ path: `/code/${file.path}` });
};

// 格式化文件夹名称以便显示
const formatFolderName = (name) => {
  return name.replace('chapter_', '').split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

onMounted(() => {
  fetchFileTree();
  // 默认展开所有文件夹
  fileTree.value.forEach(folder => {
    expandedFolders.value.add(folder.path);
  });
});
</script>

<template>
  <div class="file-tree">
    <div class="tree-header">
      <h2>算法目录</h2>
    </div>
    <div class="tree-content">
      <ul class="tree-root">
        <li v-for="folder in fileTree" :key="folder.path" class="tree-folder">
          <div class="folder-header" @click="toggleFolder(folder.path)">
            <el-icon class="folder-icon"><Folder /></el-icon>
            <span class="folder-name">{{ formatFolderName(folder.name) }}</span>
            <el-icon class="arrow-icon" :class="{ expanded: expandedFolders.has(folder.path) }">
              <CaretRight />
            </el-icon>
          </div>
          <ul v-if="expandedFolders.has(folder.path)" class="folder-files">
            <li v-for="file in folder.children" :key="file.path"
                class="tree-file"
                :class="{ active: activeFile === file.path }"
                @click="handleFileClick(file)">
              <el-icon class="file-icon"><Document /></el-icon>
              <span class="file-name">{{ file.name }}</span>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.file-tree {
  height: 100%;
  overflow-y: auto;
  background-color: #1e1e2e;
  border-right: 1px solid #2d2d3f;
  color: #e0e0ff;
  user-select: none;
}

.tree-header {
  padding: 16px;
  border-bottom: 1px solid #2d2d3f;
  background: linear-gradient(135deg, #232336, #292945);
}

.tree-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #8be9fd;
  text-shadow: 0 0 8px rgba(139, 233, 253, 0.4);
}

.tree-content {
  padding: 8px;
}

.tree-root {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.tree-folder {
  margin-bottom: 8px;
}

.folder-header {
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.folder-header:hover {
  background-color: #2d2d45;
}

.folder-icon, .file-icon {
  margin-right: 8px;
  color: #bd93f9;
}

.folder-name {
  flex: 1;
  font-weight: 500;
}

.arrow-icon {
  transition: transform 0.2s;
}

.arrow-icon.expanded {
  transform: rotate(90deg);
}

.folder-files {
  list-style-type: none;
  padding-left: 24px;
  margin: 4px 0 0 0;
}

.tree-file {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.tree-file:hover {
  background-color: #2d2d45;
}

.tree-file.active {
  background-color: #44475a;
  box-shadow: 0 0 0 1px rgba(139, 233, 253, 0.3);
}

.file-name {
  font-size: 0.9rem;
}

@keyframes glow {
  0% { box-shadow: 0 0 5px rgba(139, 233, 253, 0.5); }
  50% { box-shadow: 0 0 10px rgba(139, 233, 253, 0.7); }
  100% { box-shadow: 0 0 5px rgba(139, 233, 253, 0.5); }
}

.tree-file.active {
  animation: glow 2s infinite;
}
</style>