/**
 * File: binary_tree.js
 * Created Time: 2022-12-04
 * Author: IsChristina (christinaxia77@foxmail.com)
 */

// TreeNode class definition (inline instead of import)
class TreeNode {
    constructor(val, left, right) {
        this.val = val === undefined ? 0 : val;
        this.left = left === undefined ? null : left;
        this.right = right === undefined ? null : right;
    }
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

/* 初始化二叉树 */
// 初始化节点
let n1 = new TreeNode(1);
let n2 = new TreeNode(2);
let n3 = new TreeNode(3);
let n4 = new TreeNode(4);
let n5 = new TreeNode(5);
// 构建节点之间的引用（指针）
n1.left = n2;
n1.right = n3;
n2.left = n4;
n2.right = n5;
// 根节点
let root = n1;

console.log('\n初始化二叉树\n');
console.log('二叉树的根节点为 ' + root.val);
console.log('节点 1 的左子节点为 ' + root.left.val);
console.log('节点 1 的右子节点为 ' + root.right.val);
console.log('节点 2 的左子节点为 ' + root.left.left.val);
console.log('节点 2 的右子节点为 ' + root.left.right.val);

/* 插入与删除节点 */
let P = new TreeNode(0);
// 在 n1 -> n2 中间插入节点 P
n1.left = P;
P.left = n2;
console.log('\n插入节点 P 后，二叉树为\n');
printTree(root);

// 删除节点 P
n1.left = n2;
console.log('\n删除节点 P 后，二叉树为\n');
printTree(root);

/* 序列化 */
// 二叉树的广度优先遍历序列
let list = [];
let queue = [root];
// 广度优先遍历
while (queue.length) {
    let node = queue.shift();
    list.push(node);
    if (node.left) queue.push(node.left);
    if (node.right) queue.push(node.right);
}
// 序列化
let vals = [];
for (const node of list) {
    vals.push(node.val);
}
console.log('\n层序遍历的节点值列表为 ' + vals);

/* 反序列化 */
// 反序列化
function listToTree(arr) {
    // 构建二叉树各节点
    let nodes = [];
    for (const val of arr) {
        let node = null;
        if (val !== null) node = new TreeNode(val);
        nodes.push(node);
    }
    // 根节点
    let root = nodes[0];
    // 构建二叉树
    for (let i = 0; i * 2 + 2 < nodes.length; i++) {
        if (nodes[i] !== null) {
            nodes[i].left = nodes[i * 2 + 1];
            nodes[i].right = nodes[i * 2 + 2];
        }
    }
    return root;
}
// 序列化
let arr = [1, 2, 3, 4, 5, null, null, null, null, null, null];
// 反序列化
root = listToTree(arr);

console.log('\n反序列化后的二叉树为\n');
printTree(root);
