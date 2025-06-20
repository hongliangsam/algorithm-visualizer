<script setup>
import { ref, onMounted, watch, reactive, computed, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import { VideoPlay, Download, Share, CaretTop, CaretBottom } from '@element-plus/icons-vue';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

// 添加函数定义和调用的存储结构
const functionDefinitions = ref({}); // 存储函数定义信息
const linePositions = ref([]); // 存储行位置信息，用于跳转
const highlightedLine = ref(null); // 添加高亮行引用

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
  functionDefinitions.value = {};

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

            // 解析函数定义
      parseFunctionDefinitions();

      // 稍后会通过watch触发工具提示初始化
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

// 解析代码中的函数定义
const parseFunctionDefinitions = () => {
  if (!code.value) return;

  functionDefinitions.value = {};
  const lines = code.value.split('\n');

  console.log('开始解析函数定义:', fileName.value);

  // 正则表达式匹配不同的函数定义方式
  const functionPatterns = [
    // function declaration: function name(...) {...}
    { regex: /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/, type: 'declaration' },
    // function expression: const/let/var name = function(...) {...}
    { regex: /(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*function\s*\(([^)]*)\)/, type: 'expression' },
    // arrow function: const/let/var name = (...) => {...}
    { regex: /(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\(([^)]*)\)\s*=>/, type: 'arrow' },
    // class method: methodName(...) {...}
    { regex: /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*{/, type: 'method' }
  ];

  // 存储每个函数的定义行号和参数
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 跳过明显是注释的行
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      continue;
    }

    for (const pattern of functionPatterns) {
      const match = line.match(pattern.regex);

      if (match) {
        let funcName, params;

        if (pattern.type === 'declaration') {
          funcName = match[1];
          params = match[2];
        } else if (pattern.type === 'expression') {
          funcName = match[2];
          params = match[3];
        } else if (pattern.type === 'arrow') {
          funcName = match[2];
          params = match[3];
        } else if (pattern.type === 'method') {
          funcName = match[1];
          params = match[2];

          // 跳过for循环等非函数定义
          if (funcName === 'for' || funcName === 'if' || funcName === 'while' || funcName === 'switch') {
            continue;
          }
        }

        // 获取函数定义的上下文（包括注释）
        let startLine = i;
        // 向上查找注释
        while (startLine > 0) {
          const prevLine = lines[startLine - 1].trim();
          if (prevLine.startsWith('//') || prevLine.startsWith('/*') || prevLine.startsWith('*')) {
            startLine--;
          } else {
            break;
          }
        }

        // 提取函数定义的代码块
        let endLine = i;
        let braceCount = line.split('{').length - line.split('}').length;

        // 如果第一行有未闭合的花括号，继续向下查找
        if (braceCount > 0) {
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j];
            braceCount += nextLine.split('{').length - nextLine.split('}').length;

            if (braceCount <= 0) {
              endLine = j;
              break;
            }
          }
        }

        // 构建函数定义对象
        const definition = {
          name: funcName,
          params: params.split(',').map(p => p.trim()).filter(p => p),
          startLine: startLine,
          endLine: endLine,
          lineNumber: i,
          definitionText: lines.slice(startLine, endLine + 1).join('\n')
        };

        functionDefinitions.value[funcName] = definition;
        break; // 找到一个匹配后不再继续
      }
    }
  }

  // 存储所有行的位置信息，用于跳转
  nextTick(() => {
    const codeLineElements = document.querySelectorAll('.code-line');
    linePositions.value = Array.from(codeLineElements).map(el => {
      const rect = el.getBoundingClientRect();
      return {
        top: rect.top,
        height: rect.height
      };
    });
  });

  console.log('解析到的函数定义:', functionDefinitions.value);

  // 将函数定义信息存储在window对象上，方便调试
  window._functionDefinitions = functionDefinitions.value;
};

// 从HTML内容中提取纯文本内容（移除HTML标签）
const stripHtml = (html) => {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

// 获取代码行的高亮HTML
const getHighlightedLine = (line) => {
  try {
    // 使用Prism进行基本的语法高亮
    const html = Prism.highlight(line, Prism.languages.javascript, 'javascript');

    // 返回高亮后的HTML
    return html;
  } catch (error) {
    console.error('高亮处理出错:', error);
    // 出错时返回原始行
    return line;
  }
};

  // 在DOM更新后处理函数调用高亮
const processCodeLineHighlighting = () => {
  nextTick(() => {
    // 确保已经解析了函数定义
    if (Object.keys(functionDefinitions.value).length === 0) {
      return;
    }

    // 获取所有代码行内容
    const codeLineContents = document.querySelectorAll('.line-content');

    // 遍历每一行
    codeLineContents.forEach(lineElement => {
      // 获取行的文本内容
      const lineText = lineElement.textContent || '';

      // 遍历所有函数定义
      for (const funcName of Object.keys(functionDefinitions.value)) {
        // 检查这一行是否包含函数调用
        if (lineText.includes(funcName + '(')) {
          // 获取函数定义对象
          const funcDef = functionDefinitions.value[funcName];

          // 使用DOM操作直接处理函数调用
          const textNodes = [];
          lineElement.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              textNodes.push(node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              // 检查元素节点内的文本
              const nodeText = node.textContent || '';
              if (nodeText === funcName &&
                  lineElement.textContent.substring(
                    lineElement.textContent.indexOf(nodeText) + nodeText.length,
                    lineElement.textContent.indexOf(nodeText) + nodeText.length + 1
                  ) === '(') {
                // 创建高亮元素
                const highlightSpan = document.createElement('span');
                highlightSpan.className = 'function-call-highlight';

                // 设置函数名属性，用于查找函数定义
                highlightSpan.setAttribute('data-function', funcName);

                // 设置函数文本
                highlightSpan.textContent = funcName;

                // 添加点击事件
                highlightSpan.onclick = () => jumpToFunction(funcName);

                // 替换原始节点
                node.parentNode.replaceChild(highlightSpan, node);
              }
            }
          });

          // 处理文本节点
          textNodes.forEach(textNode => {
            const text = textNode.textContent;
            const parts = text.split(funcName + '(');

            if (parts.length > 1) {
              // 创建文档片段
              const fragment = document.createDocumentFragment();

              // 添加第一部分
              if (parts[0]) {
                fragment.appendChild(document.createTextNode(parts[0]));
              }

              // 遍历剩余部分
              for (let i = 1; i < parts.length; i++) {
                // 创建高亮元素
                const highlightSpan = document.createElement('span');
                highlightSpan.className = 'function-call-highlight';
                highlightSpan.setAttribute('data-function', funcName);
                highlightSpan.textContent = funcName;

                // 添加点击事件
                highlightSpan.onclick = () => jumpToFunction(funcName);

                // 添加到片段
                fragment.appendChild(highlightSpan);
                fragment.appendChild(document.createTextNode('('));

                // 添加剩余文本
                if (parts[i]) {
                  fragment.appendChild(document.createTextNode(parts[i]));
                }
              }

              // 替换原始节点
              textNode.parentNode.replaceChild(fragment, textNode);
            }
          });
        }
      }
    });

    // 初始化工具提示
    initTooltips();
  });
};

// 跳转到函数定义
const jumpToFunction = (funcName) => {
  const funcDef = functionDefinitions.value[funcName];
  if (funcDef && linePositions.value.length > 0) {
    const targetLine = funcDef.lineNumber;
    const codeContainer = document.querySelector('.code-container');

    if (codeContainer && linePositions.value[targetLine]) {
      // 计算目标行的位置并滚动到该位置
      codeContainer.scrollTop = linePositions.value[targetLine].top - linePositions.value[0].top;

      // 闪烁高亮目标行
      highlightTargetLine(targetLine);
    }
  }
};

// 临时高亮目标行
const highlightTargetLine = (lineIndex) => {
  highlightedLine.value = lineIndex; // 设置高亮行
  const targetLine = document.querySelectorAll('.code-line')[lineIndex];
  if (targetLine) {
    targetLine.classList.add('target-highlight');
    setTimeout(() => {
      targetLine.classList.remove('target-highlight');
      highlightedLine.value = null; // 清除高亮行
    }, 2000);
  }
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

// 在每次DOM更新后初始化工具提示
const initTooltips = () => {
  // 使用延迟执行，确保DOM已完全渲染
  setTimeout(() => {
    try {
      // 查找所有带有函数调用标记的元素
      const functionCalls = document.querySelectorAll('.function-call-highlight');

      if (functionCalls.length > 0) {
        console.log('找到函数调用元素:', functionCalls.length);

        // 清除之前的工具提示实例
        if (window._tippyInstances) {
          window._tippyInstances.forEach(instance => {
            try {
              instance.destroy();
            } catch (e) {
              // 忽略销毁错误
            }
          });
        }

              // 移除所有现有的弹窗
      document.querySelectorAll('.custom-code-popover').forEach(popover => {
        if (document.body.contains(popover)) {
          document.body.removeChild(popover);
        }
      });

        // 为每个函数调用元素添加交互事件
        functionCalls.forEach(el => {
          // 添加点击事件
          el.onclick = (event) => {
            const funcName = el.getAttribute('data-function');
            if (funcName && functionDefinitions.value[funcName]) {
              console.log('点击函数调用:', funcName);
              jumpToFunction(funcName);
              event.preventDefault();
              event.stopPropagation();
            }
          };

          // 添加键盘导航
          el.setAttribute('tabindex', '0');
          el.setAttribute('role', 'button');
          el.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              const funcName = el.getAttribute('data-function');
              if (funcName) {
                jumpToFunction(funcName);
                event.preventDefault();
              }
            }
          });

          // 添加鼠标悬停事件
          el.addEventListener('mouseenter', function(event) {
            const funcName = el.getAttribute('data-function');
            if (!funcName) return;

            // 获取元素位置
            const rect = el.getBoundingClientRect();

            // 创建方块形弹窗
            const popover = document.createElement('div');
            popover.className = 'custom-code-popover';

            // 设置弹窗样式 - 强制方块形状
            popover.style.cssText = `
              position: fixed;
              z-index: 9999;
              width: 500px;
              height: 500px;
              background-color: #282a36;
              border: 1px solid #414558;
              border-radius: 6px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
              overflow: hidden;
              display: flex;
              flex-direction: column;
              aspect-ratio: 1 / 1;
            `;

            // 计算位置 - 调整尺寸为500px
            let topPos = rect.top - 510; // 向上增加空间
            let leftPos = rect.left;

            // 调整位置避免超出视口
            if (topPos < 10) topPos = rect.bottom + 10;
            if (leftPos + 500 > window.innerWidth) leftPos = window.innerWidth - 510;
            if (leftPos < 10) leftPos = 10;

            // 设置位置
            popover.style.top = `${topPos}px`;
            popover.style.left = `${leftPos}px`;

            // 创建加载中内容
            popover.innerHTML = `
              <div style="
                height: 36px;
                background-color: #1d1e27;
                color: #50fa7b;
                font-weight: bold;
                border-bottom: 1px solid #414558;
                padding: 8px 12px;
                font-size: 14px;
              ">函数定义: ${escapeHtml(funcName)}</div>
              <div style="
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #f8f8f2;
              ">加载中...</div>
            `;

            // 添加到DOM
            document.body.appendChild(popover);

            // 保存弹窗引用
            el._popover = popover;

            // 处理鼠标离开
            const handleMouseLeave = function(evt) {
              // 检查是否移动到弹窗上
              if (evt.relatedTarget === popover ||
                  (popover.contains(evt.relatedTarget))) {
                return;
              }

              // 删除弹窗
              if (document.body.contains(popover)) {
                document.body.removeChild(popover);
              }

              // 移除事件监听
              el.removeEventListener('mouseleave', handleMouseLeave);
              popover.removeEventListener('mouseleave', handleMouseLeave);
            };

            // 添加鼠标离开监听
            el.addEventListener('mouseleave', handleMouseLeave);
            popover.addEventListener('mouseleave', handleMouseLeave);

            // 异步加载函数定义
            findFunctionDefinition(funcName).then(definitionCode => {
              if (document.body.contains(popover)) {
                popover.innerHTML = generateCodeDisplay(definitionCode, funcName);
              }
            }).catch(error => {
              console.error('加载函数定义失败:', error);
              if (document.body.contains(popover)) {
                popover.innerHTML = `
                  <div style="
                    height: 36px;
                    background-color: #1d1e27;
                    color: #50fa7b;
                    font-weight: bold;
                    border-bottom: 1px solid #414558;
                    padding: 8px 12px;
                    font-size: 14px;
                  ">函数定义: ${escapeHtml(funcName)}</div>
                  <div style="
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #f8f8f2;
                  ">未找到函数定义</div>
                `;
              }
            });
          });
        });

        console.log('成功初始化自定义弹窗');
      } else {
        console.log('未找到函数调用元素');
        // 如果没找到元素，再尝试一次
        setTimeout(initTooltips, 500);
      }
    } catch (error) {
      console.error('初始化工具提示失败:', error);
    }
  }, 100);
};

// 生成代码显示HTML
const generateCodeDisplay = (codeContent, funcName) => {
  // 整理代码内容
  let content = codeContent || '函数定义未找到';
  if (content.length > 5000) {
    content = content.substring(0, 5000) + '...(省略部分内容)';
  }

  // 分行处理
  const codeLines = content.split('\n');

  // 查找函数签名行
  let functionSignature = '';
  if (codeLines.length > 0) {
    for (let i = 0; i < Math.min(5, codeLines.length); i++) {
      if (codeLines[i].includes(`function ${funcName}`) ||
          codeLines[i].includes(`${funcName} =`) ||
          codeLines[i].includes(`${funcName}(`)) {
        functionSignature = codeLines[i];
        break;
      }
    }

    // 如果没找到，使用第一行
    if (!functionSignature) {
      functionSignature = codeLines[0];
    }
  }

  // 限制行数使其方形显示，但增加行数以显示更多内容
  const displayLines = codeLines.length > 20
    ? [...codeLines.slice(0, 20), '...(省略部分内容)']
    : codeLines;

  // 限制每行长度 - 增加到60个字符，显示更多内容
  const formattedLines = displayLines.map(line => {
    if (line.length <= 60) return escapeHtml(line);
    return escapeHtml(line.substring(0, 60) + '...');
  });

  // 使用Prism进行代码高亮处理
  try {
    // 高亮完整代码，然后分行
    const highlightedCode = Prism.highlight(
      content,
      Prism.languages.javascript,
      'javascript'
    );

    // 按行分割高亮后的代码
    const highlightedLines = highlightedCode.split('\n');

    // 提取前20行
    const displayHighlightedLines = codeLines.length > 20
      ? [...highlightedLines.slice(0, 20), '<span class="token comment">// ...(省略部分内容)</span>']
      : highlightedLines;

    // 添加内联样式，确保代码高亮有正确颜色
    const codeStyles = `
      <style>
        .token.comment { color: #6272a4; }
        .token.keyword { color: #ff79c6; }
        .token.string { color: #f1fa8c; }
        .token.function { color: #50fa7b; }
        .token.number { color: #bd93f9; }
        .token.operator { color: #ff79c6; }
        .token.punctuation { color: #f8f8f2; }
        .token.parameter { color: #ffb86c; }
        .token.class-name { color: #8be9fd; }
        .token.boolean { color: #bd93f9; }
      </style>
    `;

    // 构建HTML - 使用高亮版本
    return `
      ${codeStyles}
      <div style="
        height: 36px;
        background-color: #1d1e27;
        color: #50fa7b;
        font-weight: bold;
        border-bottom: 1px solid #414558;
        padding: 8px 12px;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      ">函数定义: ${escapeHtml(funcName || '')}</div>

      <div style="
        padding: 8px 12px;
        background-color: #2a2a2a;
        color: #ff79c6;
        font-family: monospace;
        font-weight: bold;
        border-bottom: 1px solid #414558;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      ">${escapeHtml(functionSignature)}</div>

      <div style="
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      ">
        <div style="
          overflow-x: auto;
          width: 100%;
          position: relative;
        ">
          ${displayHighlightedLines.map((line, index) => `
            <div style="
              display: flex;
              border-bottom: 1px solid rgba(65, 69, 88, 0.1);
            ">
              <span style="
                width: 40px;
                flex-shrink: 0;
                text-align: right;
                padding-right: 8px;
                padding-left: 4px;
                background-color: #252733;
                color: #6272a4;
                border-right: 1px solid #414558;
                user-select: none;
              ">${index + 1}</span>
              <span style="
                padding-left: 8px;
                padding-right: 8px;
                color: #f8f8f2;
                white-space: pre;
                min-width: 400px;
              ">${line}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (e) {
    // 如果高亮处理失败，回退到原始版本
    console.error('代码高亮处理失败', e);

    // 构建HTML - 原始版本
    return `
      <div style="
        height: 36px;
        background-color: #1d1e27;
        color: #50fa7b;
        font-weight: bold;
        border-bottom: 1px solid #414558;
        padding: 8px 12px;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      ">函数定义: ${escapeHtml(funcName || '')}</div>

      <div style="
        padding: 8px 12px;
        background-color: #2a2a2a;
        color: #ff79c6;
        font-family: monospace;
        font-weight: bold;
        border-bottom: 1px solid #414558;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      ">${escapeHtml(functionSignature)}</div>

      <div style="
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      ">
        <div style="
          overflow-x: auto;
          width: 100%;
          position: relative;
        ">
          ${formattedLines.map((line, index) => `
            <div style="
              display: flex;
              border-bottom: 1px solid rgba(65, 69, 88, 0.1);
            ">
              <span style="
                width: 40px;
                text-align: right;
                padding-right: 8px;
                padding-left: 4px;
                background-color: #252733;
                color: #6272a4;
                border-right: 1px solid #414558;
                user-select: none;
              ">${index + 1}</span>
              <span style="
                padding-left: 8px;
                padding-right: 8px;
                color: #f8f8f2;
                white-space: pre;
                min-width: 400px;
              ">${line}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
};

// 查找函数定义的实现
const findFunctionDefinition = async (funcName) => {
  return new Promise((resolve, reject) => {
    try {
      // 从已存储的函数定义中获取
      if (functionDefinitions.value[funcName]) {
        const definition = functionDefinitions.value[funcName];
        resolve(definition.definitionText || `函数 ${funcName} 的定义未找到`);
      } else {
        // 如果未找到，返回提示信息
        resolve(`// 函数 ${funcName} 的定义未在当前文件中找到`);
      }
    } catch (error) {
      console.error('获取函数定义失败:', error);
      reject(error);
    }
  });
};

// HTML转义辅助函数
const escapeHtml = (unsafe) => {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

watch(() => props.filePath, (newPath) => {
  if (newPath) {
    fetchFileContent(newPath);
  }
});

// 监视代码行变化，处理函数调用高亮
watch(() => codeLines.length, (newLength) => {
  if (newLength > 0) {
    console.log('代码行数变化，处理函数调用高亮');
    // 等待DOM更新完成
    setTimeout(() => {
      processCodeLineHighlighting();
    }, 100);
  }
});

onMounted(() => {
  const path = route.params.filePath;
  if (path) {
    fetchFileContent(path);
  }

  // 添加全局函数供内联事件调用
  window.jumpToFunctionDef = (funcName) => {
    console.log('直接调用跳转函数:', funcName);
    jumpToFunction(funcName);
    return false; // 阻止默认行为
  };

  // 确保函数调用高亮处理
  setTimeout(() => {
    processCodeLineHighlighting();
  }, 1000);
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
          <div class="code-line" :class="{ 'target-highlight': line.index === highlightedLine }">
            <span class="line-number">{{ line.index + 1 }}</span>
            <!-- 使用计算属性处理高亮 -->
            <span class="line-content" ref="codeLineContent" v-html="getHighlightedLine(line.text)"></span>
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

/* 函数调用高亮样式 - 使用Element Plus风格 */
:deep(.function-call-highlight) {
  color: #409eff !important;
  cursor: pointer;
  font-weight: normal;
  padding: 0 2px;
  border-radius: 2px;
  transition: all 0.2s ease;
  border-bottom: 1px dashed #409eff;
  position: relative;
  text-decoration: none;
  outline: none;
}

:deep(.function-call-highlight:hover),
:deep(.function-call-highlight:focus) {
  color: #409eff !important;
  background-color: rgba(64, 158, 255, 0.1);
  border-bottom: 1px solid #409eff;
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.1);
}

:deep(.function-call-highlight:focus-visible) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.4);
}

/* 目标行高亮样式 */
.code-line.target-highlight {
  background-color: rgba(80, 250, 123, 0.2);
  animation: highlight-pulse 2s ease;
}

@keyframes highlight-pulse {
  0%, 100% { background-color: rgba(80, 250, 123, 0); }
  50% { background-color: rgba(80, 250, 123, 0.2); }
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

/* 代码提示工具样式 - Element Plus风格 */
:deep(.tippy-box[data-theme~='light']) {
  background-color: #282a36;
  border: 1px solid #414558;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  border-radius: 6px;
  color: #f8f8f2;
  font-size: 14px;
  line-height: 1.5;
  padding: 0;
  /* 尺寸在JS中设置，这里不再限制 */
}

:deep(.tippy-box[data-theme~='light'] .tippy-content) {
  padding: 0;
  height: 100%;
}

/* 重置可能干扰JS尺寸设置的样式 */
:deep(.tippy-box) {
  transform: none !important;
  max-width: none !important;
  max-height: none !important;
}

/* 正方形工具提示样式 */
:deep(.square-tooltip) {
  aspect-ratio: 1 / 1 !important;
  display: block !important;
  transform: none !important;
}

:deep(.square-tooltip .tippy-content) {
  aspect-ratio: 1 / 1 !important;
  height: 100% !important;
}

:deep(.square-tooltip .tippy-arrow) {
  transform: none !important;
}

/* 代码语法高亮 - 暗色主题 */
:deep(.code-tooltip .token.comment) { color: #6272a4; }
:deep(.code-tooltip .token.keyword) { color: #ff79c6; }
:deep(.code-tooltip .token.string) { color: #f1fa8c; }
:deep(.code-tooltip .token.function) { color: #50fa7b; }
:deep(.code-tooltip .token.number) { color: #bd93f9; }
:deep(.code-tooltip .token.operator) { color: #ff79c6; }
:deep(.code-tooltip .token.punctuation) { color: #f8f8f2; }
:deep(.code-tooltip .token.parameter) { color: #ffb86c; }
:deep(.code-tooltip .token.class-name) { color: #8be9fd; }
:deep(.code-tooltip .token.boolean) { color: #bd93f9; }

/* 箭头样式 */
:deep(.tippy-arrow) {
  color: #282a36;
}

:deep(.tippy-box[data-theme~='light'] .tippy-arrow::before) {
  border-color: #414558;
}

:deep(.tippy-box[data-theme~='light'][data-placement^='top'] > .tippy-arrow::before) {
  border-top-color: #414558;
}

/* 添加编辑器风格 */
:deep(.el-popover.el-popper.is-light) {
  --el-popover-padding: 0;
  --el-popover-border-radius: 4px;
  --el-popover-border-color: #414558;
  --el-popover-bg-color: #282a36;
  border-color: var(--el-popover-border-color);
  background-color: var(--el-popover-bg-color);
  border-radius: var(--el-popover-border-radius);
}

/* 添加更好的代码块样式 */
:deep(.code-tooltip-wrapper) {
  position: relative;
  padding: 0;
  border-radius: 6px;
  background-color: #282a36;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  /* 添加一些视觉效果增强方形感知 */
  border: 1px solid #414558;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
}

/* 方块式布局样式 */
:deep(.code-tooltip-wrapper.block-display) {
  width: 400px !important;
  height: 400px !important;
  max-width: 400px !important;
  max-height: 400px !important;
  aspect-ratio: 1 / 1 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
  margin: 0 !important;
  padding: 0 !important;
}

:deep(.code-tooltip) {
  position: relative;
  font-size: 0.9rem;
  line-height: 1.5;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace;
  color: #f8f8f2;
  white-space: pre-wrap; /* 允许在单词之间自动换行 */
  word-wrap: break-word; /* 允许长单词换行 */
  word-break: break-all; /* 强制在任何字符处换行 */
  tab-size: 2;
  -moz-tab-size: 2;
  flex: 1;
  overflow: auto;
  margin-top: 36px;
  padding: 8px 16px;
  width: calc(100% - 32px);
  height: calc(100% - 60px);
  box-sizing: border-box;
}

/* 添加代码块标题 */
:deep(.code-tooltip-wrapper)::before {
  content: attr(data-filename, 'Function Definition');
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 8px 16px;
  height: 36px;
  background-color: #1d1e27;
  color: #50fa7b;
  font-size: 0.85rem;
  font-weight: bold;
  border-bottom: 1px solid #414558;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  box-sizing: border-box;
  z-index: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 方块式代码展示 */
:deep(.function-signature) {
  padding: 8px 10px;
  background-color: #1d1e27;
  color: #ff79c6;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace;
  font-size: 14px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-bottom: 1px solid #414558;
  margin-top: 36px;
}

:deep(.code-blocks) {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  max-height: 320px;
  padding: 0;
  margin: 0;
  background-color: #282a36;
}

:deep(.code-blocks.square-layout) {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  padding: 0;
  margin: 0;
  background-color: #282a36;
  height: calc(100% - 70px);
  max-height: none;
}

:deep(.code-block-line) {
  display: flex;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace;
  font-size: 13px;
  padding: 0;
  margin: 0;
  line-height: 1.5;
  border-bottom: 1px solid rgba(65, 69, 88, 0.2);
}

:deep(.line-number) {
  display: inline-block;
  width: 30px;
  text-align: right;
  padding: 0 8px 0 4px;
  color: #6272a4;
  border-right: 1px solid #414558;
  background-color: #252733;
  user-select: none;
  flex-shrink: 0;
}

:deep(.line-content) {
  padding-left: 8px;
  padding-right: 8px;
  color: #f8f8f2;
  white-space: pre;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-grow: 1;
}
</style>