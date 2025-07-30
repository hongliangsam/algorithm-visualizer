/**
 * File: binary_tree_bfs.js
 * Created Time: 2022-12-04
 * Author: IsChristina (christinaxia77@foxmail.com)
 */

// TreeNode class and arrToTree function (inline instead of import)
class TreeNode {
    constructor(val, left, right) {
        this.val = val === undefined ? 0 : val;
        this.left = left === undefined ? null : left;
        this.right = right === undefined ? null : right;
    }
}

function arrToTree(arr) {
    if (arr.length === 0) return null;

    let root = new TreeNode(arr[0]);
    let queue = [root];
    let i = 0;
    while (queue.length) {
        let node = queue.shift();
        if (++i >= arr.length) break;
        if (arr[i] !== null) {
            node.left = new TreeNode(arr[i]);
            queue.push(node.left);
        }
        if (++i >= arr.length) break;
        if (arr[i] !== null) {
            node.right = new TreeNode(arr[i]);
            queue.push(node.right);
        }
    }

    return root;
}

// Helper function for printTree
function Trunk(prev, str) {
    this.prev = prev;
    this.str = str;
}

// Helper function to print branches of the binary tree
function showTrunks(p) {
    if (!p) {
        return '';
    }

    let result = '';
    let trunk = p;
    while (trunk !== null) {
        result = trunk.str + result;
        trunk = trunk.prev;
    }

    return result;
}

// Helper function for printTree
function printTreeHelper(root, prev, isLeft) {
    if (root === null) {
        return;
    }

    let prev_str = '    ';
    let trunk = new Trunk(prev, prev_str);

    printTreeHelper(root.right, trunk, true);

    if (!prev) {
        trunk.str = '———';
    } else if (isLeft) {
        trunk.str = '/———';
        prev_str = '   |';
    } else {
        trunk.str = '\\———';
        prev.str = prev_str;
    }

    const trunkStr = showTrunks(trunk);
    console.log(trunkStr + ' ' + root.val);

    if (prev) {
        prev.str = prev_str;
    }
    trunk.str = '   |';

    printTreeHelper(root.left, trunk, false);
}

// Print tree function (inline instead of import)
function printTree(root) {
    printTreeHelper(root, null, false);
}

/* 层序遍历 */
function levelOrder(root) {
    // 初始化队列，加入根节点
    let queue = [root];
    // 初始化一个列表，用于保存遍历序列
    let list = [];
    while (queue.length) {
        let node = queue.shift(); // 队列出队
        list.push(node.val); // 保存节点值
        if (node.left) queue.push(node.left); // 左子节点入队
        if (node.right) queue.push(node.right); // 右子节点入队
    }
    return list;
}

/* 层序遍历 II */
function levelOrder2(root) {
    // 初始化队列，加入根节点
    let queue = [root];
    // 初始化一个二维列表，用于保存遍历序列
    let res = [];
    while (queue.length) {
        let levelSize = queue.length;
        let level = [];
        for (let i = 0; i < levelSize; i++) {
            let node = queue.shift(); // 队列出队
            level.push(node.val); // 保存节点值
            if (node.left) queue.push(node.left); // 左子节点入队
            if (node.right) queue.push(node.right); // 右子节点入队
        }
        res.push(level);
    }
    return res;
}

const arr = [1, 2, 3, 4, 5, 6, 7];
const root = arrToTree(arr);
console.log('\n初始化二叉树\n');
printTree(root);

const list = levelOrder(root);
console.log('\n层序遍历结果：' + list);

const res = levelOrder2(root);
console.log('\n层序遍历 II 结果：');
console.log(JSON.stringify(res));
