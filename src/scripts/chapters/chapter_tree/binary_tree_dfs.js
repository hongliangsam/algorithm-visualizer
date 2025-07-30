/**
 * File: binary_tree_dfs.js
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

/* 前序遍历 */
function preOrder(root) {
    if (root === null) return;
    // 访问优先级：根节点 -> 左子树 -> 右子树
    console.log(root.val);
    preOrder(root.left);
    preOrder(root.right);
}

/* 中序遍历 */
function inOrder(root) {
    if (root === null) return;
    // 访问优先级：左子树 -> 根节点 -> 右子树
    inOrder(root.left);
    console.log(root.val);
    inOrder(root.right);
}

/* 后序遍历 */
function postOrder(root) {
    if (root === null) return;
    // 访问优先级：左子树 -> 右子树 -> 根节点
    postOrder(root.left);
    postOrder(root.right);
    console.log(root.val);
}

/* 列表用于存储遍历序列 */
const list = [];

/* 前序遍历：添加节点到列表 */
function preOrderAdd(root) {
    if (root === null) return;
    // 访问优先级：根节点 -> 左子树 -> 右子树
    list.push(root.val);
    preOrderAdd(root.left);
    preOrderAdd(root.right);
}

const arr = [1, 2, 3, 4, 5, 6, 7];
const root = arrToTree(arr);
console.log('\n初始化二叉树\n');
printTree(root);

console.log('\n前序遍历（递归）');
preOrder(root);

console.log('\n中序遍历（递归）');
inOrder(root);

console.log('\n后序遍历（递归）');
postOrder(root);

list.length = 0;
preOrderAdd(root);
console.log('\n前序遍历添加节点到列表\n' + list);
