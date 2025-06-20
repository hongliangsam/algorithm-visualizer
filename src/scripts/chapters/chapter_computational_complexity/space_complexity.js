/**
 * File: space_complexity.js
 * Created Time: 2023-02-05
 * Author: Justin (xiefahit@gmail.com)
 */

// 直接在文件内定义需要的类，以避免模块导入问题
/**
 * 链表节点类
 */
class ListNode {
    constructor(val, next) {
        this.val = val === undefined ? 0 : val;
        this.next = next === undefined ? null : next;
    }
}

/**
 * 二叉树节点类
 */
class TreeNode {
    constructor(val, left, right) {
        this.val = val === undefined ? 0 : val;
        this.left = left === undefined ? null : left;
        this.right = right === undefined ? null : right;
    }
}

/* 函数 */
function constFunc() {
    // do something
    return 0;
}

/* 常数阶 */
function constant(n) {
    // 常量、变量、对象占用 O(1) 空间
    const a = 0;
    const b = 0;
    const nums = new Array(10000);
    const node = new ListNode(0);
    // 循环中的变量占用 O(1) 空间
    for (let i = 0; i < n; i++) {
        const c = 0;
    }
    // 循环中的函数占用 O(1) 空间
    for (let i = 0; i < n; i++) {
        constFunc();
    }
}

/* 线性阶 */
function linear(n) {
    // 长度为 n 的数组占用 O(n) 空间
    const nums = new Array(n);
    // 长度为 n 的列表占用 O(n) 空间
    const nodes = [];
    for (let i = 0; i < n; i++) {
        nodes.push(new ListNode(i));
    }
    // 长度为 n 的哈希表占用 O(n) 空间
    const map = new Map();
    for (let i = 0; i < n; i++) {
        map.set(i, i.toString());
    }
}

/* 线性阶（递归实现） */
function linearRecur(n) {
    console.log(`递归 n = ${n}`);
    if (n === 1) return;
    linearRecur(n - 1);
}

/* 平方阶 */
function quadratic(n) {
    // 矩阵占用 O(n^2) 空间
    const numMatrix = Array(n)
        .fill(null)
        .map(() => Array(n).fill(null));
    // 二维列表占用 O(n^2) 空间
    const numList = [];
    for (let i = 0; i < n; i++) {
        const tmp = [];
        for (let j = 0; j < n; j++) {
            tmp.push(0);
        }
        numList.push(tmp);
    }
}

/* 平方阶（递归实现） */
function quadraticRecur(n) {
    if (n <= 0) return 0;
    const nums = new Array(n);
    console.log(`递归 n = ${n} 中的 nums 长度 = ${nums.length}`);
    return quadraticRecur(n - 1);
}

/* 指数阶（建立满二叉树） */
function buildTree(n) {
    if (n === 0) return null;
    const root = new TreeNode(0);
    root.left = buildTree(n - 1);
    root.right = buildTree(n - 1);
    return root;
}

// 简单的树打印函数
function simplePrintTree(node) {
    if (!node) return null;
    return {
        val: node.val,
        left: simplePrintTree(node.left),
        right: simplePrintTree(node.right)
    };
}

// ASCII树形显示函数
function asciiTree(root) {
    if (!root) return '';

    // 获取树的深度
    function getDepth(node) {
        if (!node) return 0;
        return 1 + Math.max(getDepth(node.left), getDepth(node.right));
    }

    const depth = getDepth(root);
    // 字符宽度估计值
    const width = Math.pow(2, depth) * 3;

    // 创建一个二维字符数组表示树
    const matrix = Array(depth * 2).fill().map(() => Array(width).fill(' '));

    // 递归填充矩阵
    function fillMatrix(node, row, left, right) {
        if (!node) return;

        const mid = Math.floor((left + right) / 2);

        // 填充当前节点值
        const valStr = String(node.val);
        const valPos = mid - Math.floor(valStr.length / 2);
        for (let i = 0; i < valStr.length; i++) {
            matrix[row][valPos + i] = valStr[i];
        }

        // 处理左子树
        if (node.left) {
            const leftMid = Math.floor((left + mid) / 2);
            // 画左连接线
            for (let i = leftMid + 1; i < mid; i++) {
                matrix[row + 1][i] = '_';
            }
            matrix[row + 1][leftMid] = '/';

            // 处理左子树
            fillMatrix(node.left, row + 2, left, mid - 1);
        }

        // 处理右子树
        if (node.right) {
            const rightMid = Math.floor((mid + right) / 2);
            // 画右连接线
            for (let i = mid + 1; i < rightMid; i++) {
                matrix[row + 1][i] = '_';
            }
            matrix[row + 1][rightMid] = '\\';

            // 处理右子树
            fillMatrix(node.right, row + 2, mid + 1, right);
        }
    }

    // 填充矩阵
    fillMatrix(root, 0, 0, width - 1);

    // 将矩阵转换为字符串
    let result = '';
    for (const row of matrix) {
        // 删除每行末尾的空格
        let line = row.join('').replace(/\s+$/, '');
        // 只有当行不为空时才添加
        if (line.trim().length > 0) {
            result += line + '\n';
        }
    }

    return result;
}

/* Driver Code */
const n = 5;
// 常数阶
constant(n);
// 线性阶
linear(n);
linearRecur(n);
// 平方阶
quadratic(n);
quadraticRecur(n);
// 指数阶
const root = buildTree(n);
// 使用ASCII方式打印树
console.log("Binary Tree ASCII Structure:");
console.log(asciiTree(root));

// 同时显示JSON格式的树结构
console.log("\nBinary Tree JSON Structure:");
console.log(JSON.stringify(simplePrintTree(root), null, 2));
