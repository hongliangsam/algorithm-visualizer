<script setup>
import { ref, onMounted, watch, reactive, computed } from 'vue';
import { useRoute } from 'vue-router';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import { VideoPlay, Download, Share, CaretTop, CaretBottom } from '@element-plus/icons-vue';

// 导入所有章节文件
// 使用 Vite 的动态导入功能
const modules = import.meta.glob('../scripts/chapters/**/*.js', { as: 'raw', eager: true });
// 导入所有模块文件作为原始内容
const moduleFiles = import.meta.glob('../scripts/chapters/modules/*.js', { as: 'raw', eager: true });

const props = defineProps({
  filePath: String
});

const route = useRoute();
const code = ref('');
const fileName = ref('');
const consoleOutput = ref([]);
const isLoading = ref(false);
const isExecuting = ref(false);
const outputClass = ref('');
const consoleHeight = ref(200);
const isDragging = ref(false);
const startY = ref(0);
const startHeight = ref(0);

// 解析后的代码行，包含是否是console语句的标记
const codeLines = reactive([]);
// 每行的输出结果
const lineOutputs = reactive({});

// 获取文件内容
const fetchFileContent = async (path) => {
  if (!path) return;

  isLoading.value = true;
  fileName.value = path.split('/').pop();

  // 清空之前的数据
  codeLines.length = 0;
  Object.keys(lineOutputs).forEach(key => delete lineOutputs[key]);

  try {
    // 构建文件路径
    const filePath = `../scripts/chapters/${path}`;

    // 查找匹配的文件
    const matchingPaths = Object.keys(modules).filter(key => key.endsWith(`/${path}`));

    if (matchingPaths.length > 0) {
      // 找到匹配的文件，使用第一个匹配项
      code.value = modules[matchingPaths[0]];

      // 处理代码行
      processCodeLines();
    } else {
      // 未找到匹配的文件，显示错误信息
      code.value = `// 找不到文件: ${path}\n// 请检查文件路径是否正确`;
      console.error(`找不到文件: ${path}`);
    }
  } catch (error) {
    console.error('获取文件内容失败:', error);
    code.value = `// 加载文件时出错: ${error.message}`;
  } finally {
    isLoading.value = false;
  }
};

// 处理代码行，识别代码块
const processCodeLines = () => {
  const lines = code.value.split('\n');
  let inComment = false;
  let commentStack = 0;
  let codeBlocks = [];

  // 检测Driver Code
  let driverCodeIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Driver Code')) {
      driverCodeIndex = i;
      break;
    }
  }

  if (driverCodeIndex !== -1) {
    // 从Driver Code开始，识别每个代码块
    let currentBlockStart = -1;
    let isInBlock = false;

    for (let i = driverCodeIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();

      // 跳过空行
      if (line === '') {
        continue;
      }

      // 如果找到代码块注释标记（通常是 /* 某操作 */）
      if (line.startsWith('/*') && line.endsWith('*/') && !line.includes('Driver Code')) {
        // 结束前一个代码块（如果存在）
        if (isInBlock && currentBlockStart !== -1) {
          codeBlocks.push({
            start: currentBlockStart,
            end: i - 1
          });
        }

        // 开始新代码块
        currentBlockStart = i;
        isInBlock = true;
      }
      // 如果已经在代码块中且遇到console输出后的下一个注释块，则结束当前代码块
      else if (isInBlock && line.startsWith('/*') && line.endsWith('*/')) {
        // 检查前面几行是否有console语句
        let hasConsoleBeforeThisBlock = false;
        for (let j = i - 1; j >= currentBlockStart && j >= i - 5; j--) {
          if (lines[j].includes('console.')) {
            hasConsoleBeforeThisBlock = true;
            break;
          }
        }

        if (hasConsoleBeforeThisBlock) {
          // 结束当前代码块
          codeBlocks.push({
            start: currentBlockStart,
            end: i - 1
          });

          // 开始新代码块
          currentBlockStart = i;
        }
      }
    }

    // 添加最后一个代码块
    if (isInBlock && currentBlockStart !== -1) {
      codeBlocks.push({
        start: currentBlockStart,
        end: lines.length - 1
      });
    }
  }

  // 如果没有识别到代码块，将整个文件作为一个代码块
  if (codeBlocks.length === 0) {
    codeBlocks.push({
      start: 0,
      end: lines.length - 1
    });
  }

  // 创建代码行对象
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let isBlockEnd = false;
    let blockData = null;

    // 检查当前行是否是某个代码块的结束行
    for (const block of codeBlocks) {
      if (i === block.end) {
        isBlockEnd = true;
        blockData = block;
        break;
      }
    }

    codeLines.push({
      index: i,
      text: line,
      isCodeBlockEnd: isBlockEnd
    });

    // 为代码块结束行添加输出对象
    if (isBlockEnd && blockData) {
      lineOutputs[i] = {
        logs: [],
        status: '',
        loading: false,
        blockStart: blockData.start,
        blockEnd: blockData.end
      };
    }
  }
};

// 获取代码行的高亮HTML
const getHighlightedLine = (line) => {
  const html = Prism.highlight(line, Prism.languages.javascript, 'javascript');
  return html;
};

// 运行代码块
const runCodeBlock = async (lineNumber) => {
  if (isExecuting.value || !lineOutputs[lineNumber]) return;

  // 设置加载状态
  lineOutputs[lineNumber].loading = true;
  lineOutputs[lineNumber].logs = [];
  lineOutputs[lineNumber].status = '';

  isExecuting.value = true;

  try {
    const blockStart = lineOutputs[lineNumber].blockStart;
    const blockEnd = lineOutputs[lineNumber].blockEnd;
    const lines = code.value.split('\n');

    // 获取代码块的内容
    const blockLines = lines.slice(blockStart, blockEnd + 1);
    const blockCode = blockLines.join('\n');

    // 处理上下文：包含函数定义和前面代码块的变量操作，但忽略console语句
    const contextLines = [];

    // 添加当前代码块之前的所有代码行，但注释掉console语句
    for (let i = 0; i < blockStart; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // 检查是否是console语句
      if (trimmedLine.includes('console.log') ||
          trimmedLine.includes('console.error') ||
          trimmedLine.includes('console.warn') ||
          trimmedLine.includes('console.info')) {
        // 将console语句注释掉
        contextLines.push('// ' + line);
      } else {
        // 保留其他语句
        contextLines.push(line);
      }
    }

    const contextCode = contextLines.join('\n');

    // 保存原始的 console 方法
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleInfo = console.info;
    const logs = [];

    // 拦截 console 方法
    console.log = (...args) => {
      originalConsoleLog(...args);
      logs.push({
        type: 'log',
        content: args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')
      });
    };

    console.error = (...args) => {
      originalConsoleError(...args);
      logs.push({
        type: 'error',
        content: args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')
      });
    };

    console.warn = (...args) => {
      originalConsoleWarn(...args);
      logs.push({
        type: 'warn',
        content: args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')
      });
    };

    console.info = (...args) => {
      originalConsoleInfo(...args);
      logs.push({
        type: 'info',
        content: args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')
      });
    };

    // 执行代码
    try {
      // 准备模块数据
      const moduleData = {};
      Object.keys(moduleFiles).forEach(path => {
        const moduleName = path.split('/').pop().replace('.js', '');
        moduleData[moduleName] = moduleFiles[path];
      });

      // 创建沙箱代码，保留前面的变量定义和操作，但不执行console
      const sandboxCode = `
        (function() {
          "use strict";

          // 创建模块缓存
          const moduleCache = ${JSON.stringify(moduleData)};

          // 创建模拟的 require 函数
          const require = function(modulePath) {
            // 从路径中提取模块名
            const moduleName = modulePath.includes('/')
              ? modulePath.split('/').pop()
              : modulePath;

            // 如果模块缓存中有该模块
            if (moduleCache[moduleName]) {
              // 从模块内容创建模块
              const moduleContent = moduleCache[moduleName];
              const moduleExports = {};
              const module = { exports: moduleExports };

              // 执行模块代码
              try {
                const moduleFn = new Function('module', 'exports', 'require', moduleContent);
                moduleFn(module, module.exports, require);
                return module.exports;
              } catch (error) {
                console.error(\`加载模块 \${moduleName} 失败: \${error.message}\`);
                return {};
              }
            }

            // 模拟一些常用模块
            switch (modulePath) {
              case './ListNode':
              case '../modules/ListNode':
                return {
                  ListNode: class ListNode {
                    constructor(val, next = null) {
                      this.val = val;
                      this.next = next;
                    }
                  }
                };
              case './TreeNode':
              case '../modules/TreeNode':
                return {
                  TreeNode: class TreeNode {
                    constructor(val, left = null, right = null) {
                      this.val = val;
                      this.left = left;
                      this.right = right;
                    }
                  }
                };
              case './PrintUtil':
              case '../modules/PrintUtil':
                return {
                  printLinkedList: (head) => {
                    let result = '';
                    let current = head;
                    while (current) {
                      result += current.val + ' -> ';
                      current = current.next;
                    }
                    console.log(result + 'null');
                    return result + 'null';
                  },
                  printTree: (root) => {
                    const result = JSON.stringify(root, null, 2);
                    console.log(result);
                    return result;
                  },
                  printHeap: (arr) => {
                    console.log('堆的数组表示：');
                    console.log(arr);
                    console.log('堆的树状表示：');
                    console.log(JSON.stringify(arr, null, 2));
                  }
                };
              case './Vertex':
              case '../modules/Vertex':
                return {
                  Vertex: class Vertex {
                    constructor(val) {
                      this.val = val;
                      this.neighbors = [];
                    }

                    addNeighbor(vertex) {
                      this.neighbors.push(vertex);
                    }
                  }
                };
              default:
                console.warn(\`模块 "\${modulePath}" 未找到，返回空对象\`);
                return {};
            }
          };

          // 执行上下文代码，包含函数定义和前面的变量操作，但不执行console
          ${contextCode}

          // 执行当前代码块
          ${blockCode}
        })();
      `;

      // 使用 Function 构造器运行代码
      new Function(sandboxCode)();

      // 设置成功状态
      lineOutputs[lineNumber].status = 'success';
    } catch (err) {
      logs.push({
        type: 'error',
        content: err.toString()
      });

      // 设置错误状态
      lineOutputs[lineNumber].status = 'error';
    }

    // 恢复原始的 console 方法
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;

    // 更新输出
    lineOutputs[lineNumber].logs = logs;
  } finally {
    lineOutputs[lineNumber].loading = false;
    isExecuting.value = false;
  }
};

// 运行全部代码
const runCode = async () => {
  if (isExecuting.value) return;

  consoleOutput.value = [];
  isExecuting.value = true;
  outputClass.value = '';

  try {
    // 保存原始的 console 方法
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleInfo = console.info;
    const logs = [];

    // 拦截 console 方法
    console.log = (...args) => {
      originalConsoleLog(...args);
      logs.push({
        type: 'log',
        content: args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')
      });
    };

    console.error = (...args) => {
      originalConsoleError(...args);
      logs.push({
        type: 'error',
        content: args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')
      });
    };

    console.warn = (...args) => {
      originalConsoleWarn(...args);
      logs.push({
        type: 'warn',
        content: args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')
      });
    };

    console.info = (...args) => {
      originalConsoleInfo(...args);
      logs.push({
        type: 'info',
        content: args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')
      });
    };

    // 执行代码
    try {
      // 准备模块数据
      const moduleData = {};
      Object.keys(moduleFiles).forEach(path => {
        const moduleName = path.split('/').pop().replace('.js', '');
        moduleData[moduleName] = moduleFiles[path];
      });

      // 创建沙箱代码
      const sandboxCode = `
        (function() {
          "use strict";

          // 创建模块缓存
          const moduleCache = ${JSON.stringify(moduleData)};

          // 创建模拟的 require 函数
          const require = function(modulePath) {
            // 从路径中提取模块名
            const moduleName = modulePath.includes('/')
              ? modulePath.split('/').pop()
              : modulePath;

            // 如果模块缓存中有该模块
            if (moduleCache[moduleName]) {
              // 从模块内容创建模块
              const moduleContent = moduleCache[moduleName];
              const moduleExports = {};
              const module = { exports: moduleExports };

              // 执行模块代码
              try {
                const moduleFn = new Function('module', 'exports', 'require', moduleContent);
                moduleFn(module, module.exports, require);
                return module.exports;
              } catch (error) {
                console.error(\`加载模块 \${moduleName} 失败: \${error.message}\`);
                return {};
              }
            }

            // 模拟一些常用模块
            switch (modulePath) {
              case './ListNode':
              case '../modules/ListNode':
                return {
                  ListNode: class ListNode {
                    constructor(val, next = null) {
                      this.val = val;
                      this.next = next;
                    }
                  }
                };
              case './TreeNode':
              case '../modules/TreeNode':
                return {
                  TreeNode: class TreeNode {
                    constructor(val, left = null, right = null) {
                      this.val = val;
                      this.left = left;
                      this.right = right;
                    }
                  }
                };
              case './PrintUtil':
              case '../modules/PrintUtil':
                return {
                  printLinkedList: (head) => {
                    let result = '';
                    let current = head;
                    while (current) {
                      result += current.val + ' -> ';
                      current = current.next;
                    }
                    return result + 'null';
                  },
                  printTree: (root) => {
                    return JSON.stringify(root, null, 2);
                  },
                  printHeap: (arr) => {
                    console.log('堆的数组表示：');
                    console.log(arr);
                    console.log('堆的树状表示：');
                    console.log(JSON.stringify(arr, null, 2));
                  }
                };
              case './Vertex':
              case '../modules/Vertex':
                return {
                  Vertex: class Vertex {
                    constructor(val) {
                      this.val = val;
                      this.neighbors = [];
                    }

                    addNeighbor(vertex) {
                      this.neighbors.push(vertex);
                    }
                  }
                };
              default:
                console.warn(\`模块 "\${modulePath}" 未找到，返回空对象\`);
                return {};
            }
          };

          // 执行代码
          ${code.value}
        })();
      `;

      // 使用 Function 构造器运行代码
      new Function(sandboxCode)();
      outputClass.value = 'success';
    } catch (err) {
      logs.push({
        type: 'error',
        content: err.toString()
      });
      outputClass.value = 'error';
    }

    // 恢复原始的 console 方法
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;

    // 更新控制台输出
    consoleOutput.value = logs;
  } finally {
    isExecuting.value = false;
  }
};

// 下载代码
const downloadCode = () => {
  const blob = new Blob([code.value], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.value;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 分享代码
const shareCode = async () => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: fileName.value,
        text: '查看这个算法代码',
        url: window.location.href
      });
    } catch (err) {
      console.error('分享失败:', err);
    }
  } else {
    // 如果浏览器不支持原生分享，则复制链接到剪贴板
    await navigator.clipboard.writeText(window.location.href);
    // 可以添加一个提示，告知用户链接已复制
  }
};

// 控制台大小调整相关方法
const startDrag = (e) => {
  e.preventDefault(); // 防止选中文本
  isDragging.value = true;
  startY.value = e.clientY;
  startHeight.value = consoleHeight.value;

  // 添加事件监听器到document对象
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);

  // 添加阻止文本选择的类
  document.body.classList.add('no-select');
  document.body.style.cursor = 'ns-resize';
};

const onDrag = (e) => {
  if (!isDragging.value) return;

  e.preventDefault(); // 防止选中文本

  // 计算高度差值（向上拖动为正，向下拖动为负）
  const diff = startY.value - e.clientY;
  // 更新控制台高度，确保在100到600之间
  consoleHeight.value = Math.max(100, Math.min(600, startHeight.value + diff));
};

const stopDrag = (e) => {
  if (!isDragging.value) return;

  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);

  // 移除阻止文本选择的类
  document.body.classList.remove('no-select');
  document.body.style.cursor = '';
};

// 折叠/展开控制台
const toggleConsole = () => {
  if (consoleHeight.value < 50) {
    consoleHeight.value = 200; // 展开到默认高度
  } else {
    consoleHeight.value = 40; // 折叠到最小高度
  }
};

watch(() => props.filePath, (newPath) => {
  if (newPath) {
    fetchFileContent(newPath);
  }
});

onMounted(() => {
  const path = route.params.filePath;
  if (path) {
    fetchFileContent(path);
  }
});
</script>

<template>
  <div class="code-viewer">
    <div class="code-header">
      <h2 v-if="fileName">{{ fileName }}</h2>
      <div class="code-actions">
        <el-button type="primary" :icon="VideoPlay" :loading="isExecuting" @click="runCode">
          运行全部代码
        </el-button>
        <el-button :icon="Download" @click="downloadCode">
          下载
        </el-button>
        <el-button :icon="Share" @click="shareCode">
          分享
        </el-button>
      </div>
    </div>

    <div class="code-container" v-loading="isLoading">
      <div v-if="codeLines.length > 0" class="code-content">
        <!-- 逐行渲染代码 -->
        <div v-for="line in codeLines" :key="line.index" class="code-line-wrapper">
          <!-- 代码行 -->
          <div class="code-line">
            <span class="line-number">{{ line.index + 1 }}</span>
            <span class="line-content" v-html="getHighlightedLine(line.text)"></span>
          </div>

          <!-- 如果是代码块结束行，添加运行框和输出区域 -->
          <div v-if="line.isCodeBlockEnd" class="run-frame">
            <el-button
              class="run-line-btn"
              type="success"
              size="small"
              :loading="lineOutputs[line.index]?.loading"
              @click="runCodeBlock(line.index)">
              运行此代码块
            </el-button>

            <div
              class="line-output"
              :class="lineOutputs[line.index]?.status">
              <!-- 加载状态 -->
              <div v-if="lineOutputs[line.index]?.loading" class="loading-indicator">
                执行中...
              </div>

              <!-- 空输出状态 -->
              <div v-else-if="lineOutputs[line.index]?.logs.length === 0" class="empty-output">
                运行后查看输出
              </div>

              <!-- 输出日志 -->
              <div
                v-else
                v-for="(log, logIndex) in lineOutputs[line.index]?.logs"
                :key="`${line.index}-${logIndex}`"
                class="log-line"
                :class="log.type">
                <span v-if="log.type === 'error'" class="error-icon">⚠</span>
                <span v-if="log.type === 'warn'" class="warn-icon">⚠</span>
                <span v-if="log.type === 'info'" class="info-icon">ℹ</span>
                {{ log.content }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        请从左侧选择一个文件查看
      </div>
    </div>

    <div class="resize-handle" @mousedown="startDrag"></div>

    <div class="console-container" :class="outputClass" :style="{ height: `${consoleHeight}px` }">
      <div class="console-header">
        <div class="console-title">
          <h3>全局控制台输出</h3>
          <el-button
            class="toggle-console-btn"
            size="small"
            :icon="consoleHeight < 50 ? CaretTop : CaretBottom"
            @click="toggleConsole">
            {{ consoleHeight < 50 ? '展开' : '折叠' }}
          </el-button>
        </div>
        <el-button size="small" @click="consoleOutput = []">清空</el-button>
      </div>
      <div class="console-output">
        <div v-if="consoleOutput.length === 0" class="console-empty">
          <p>运行代码后查看输出结果</p>
        </div>
        <div v-for="(log, index) in consoleOutput" :key="index"
             class="console-line" :class="log.type">
          <span v-if="log.type === 'error'" class="error-icon">⚠</span>
          <span v-if="log.type === 'warn'" class="warn-icon">⚠</span>
          <span v-if="log.type === 'info'" class="info-icon">ℹ</span>
          {{ log.content }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.code-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #282a36;
  color: #f8f8f2;
  overflow: hidden;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #2b2b3d, #353555);
  border-bottom: 1px solid #414558;
}

.code-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #50fa7b;
  text-shadow: 0 0 8px rgba(80, 250, 123, 0.4);
}

.code-actions {
  display: flex;
  gap: 8px;
}

.code-container {
  flex: 1;
  overflow: auto;
  padding: 16px;
  background-color: #282a36;
  position: relative;
}

.code-content {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0;
  padding: 8px;
  background-color: #282a36;
  border-radius: 4px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
}

.code-line-wrapper {
  margin-bottom: 4px;
}

.code-line {
  display: flex;
  white-space: pre;
}

.line-number {
  width: 3em;
  text-align: right;
  padding-right: 1em;
  color: #6272a4;
  user-select: none;
}

.line-content {
  flex: 1;
}

.run-frame {
  margin: 4px 0 12px 3em;
  padding: 8px 12px;
  background-color: #21222c;
  border-left: 3px solid #50fa7b;
  border-radius: 0 4px 4px 0;
}

.run-line-btn {
  margin-bottom: 8px;
}

.line-output {
  padding: 8px;
  background-color: #282a36;
  border-radius: 4px;
  min-height: 30px;
}

.line-output.success {
  border-left: 3px solid #50fa7b;
}

.line-output.error {
  border-left: 3px solid #ff5555;
}

.loading-indicator {
  color: #6272a4;
  font-style: italic;
  text-align: center;
}

.empty-output {
  color: #6272a4;
  font-style: italic;
  text-align: center;
}

.log-line {
  padding: 4px 0;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.4;
}

.log-line.error {
  color: #ff5555;
  background-color: rgba(255, 85, 85, 0.1);
  padding: 8px;
  border-radius: 4px;
  margin: 4px 0;
}

.log-line.warn {
  color: #ffb86c;
  background-color: rgba(255, 184, 108, 0.1);
  padding: 6px;
  border-radius: 4px;
  margin: 4px 0;
}

.log-line.info {
  color: #8be9fd;
  background-color: rgba(139, 233, 253, 0.1);
  padding: 6px;
  border-radius: 4px;
  margin: 4px 0;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6272a4;
  font-style: italic;
}

.resize-handle {
  height: 8px; /* 增加高度使更容易点击 */
  margin-top: -2px; /* 向上偏移以保持视觉一致性 */
  background-color: #414558;
  cursor: ns-resize;
  position: relative;
  z-index: 10;
  touch-action: none; /* 防止触摸设备上的默认行为 */
}

.resize-handle::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 2px;
  background-color: #6272a4;
  border-radius: 2px;
}

.resize-handle:hover::before {
  background-color: #8be9fd;
}

.console-container {
  display: flex;
  flex-direction: column;
  background-color: #1d1e27;
  border-top: 1px solid #414558;
  transition: height 0.3s, border-color 0.3s, box-shadow 0.3s;
  overflow: hidden;
}

.console-container.success {
  border-top-color: #50fa7b;
  box-shadow: 0 -2px 10px rgba(80, 250, 123, 0.2);
}

.console-container.error {
  border-top-color: #ff5555;
  box-shadow: 0 -2px 10px rgba(255, 85, 85, 0.2);
}

.console-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #21222c;
  min-height: 36px;
}

.console-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.console-header h3 {
  margin: 0;
  font-size: 0.9rem;
  color: #bd93f9;
}

.console-output {
  flex: 1;
  padding: 8px 16px;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9rem;
}

.console-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6272a4;
  font-style: italic;
}

.console-line {
  padding: 4px 0;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.4;
}

.console-line.log {
  color: #f8f8f2;
}

.console-line.error {
  color: #ff5555;
  background-color: rgba(255, 85, 85, 0.1);
  padding: 8px;
  border-radius: 4px;
  margin: 4px 0;
}

.console-line.warn {
  color: #ffb86c;
  background-color: rgba(255, 184, 108, 0.1);
  padding: 6px;
  border-radius: 4px;
  margin: 4px 0;
}

.console-line.info {
  color: #8be9fd;
  background-color: rgba(139, 233, 253, 0.1);
  padding: 6px;
  border-radius: 4px;
  margin: 4px 0;
}

.error-icon, .warn-icon, .info-icon {
  display: inline-block;
  margin-right: 8px;
  font-size: 1.1rem;
}

:deep(.el-button) {
  background: linear-gradient(135deg, #44475a, #383a59);
  border-color: #6272a4;
  color: #f8f8f2;
}

:deep(.el-button:hover) {
  background: linear-gradient(135deg, #50536a, #444669);
  border-color: #8be9fd;
  box-shadow: 0 0 10px rgba(139, 233, 253, 0.4);
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #8be9fd, #50fa7b);
  border-color: #50fa7b;
  color: #282a36;
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #9df0ff, #69ff95);
  border-color: #69ff95;
  box-shadow: 0 0 10px rgba(80, 250, 123, 0.6);
}

:deep(.el-button--success) {
  background: linear-gradient(135deg, #50fa7b, #8be9fd);
  border-color: #50fa7b;
  color: #282a36;
}

:deep(.el-button--success:hover) {
  background: linear-gradient(135deg, #69ff95, #9df0ff);
  border-color: #69ff95;
  box-shadow: 0 0 10px rgba(80, 250, 123, 0.6);
}

/* 阻止文本选择 */
:deep(.no-select) {
  user-select: none !important;
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
}
</style>