/**
 * File: binary_search_tree.js
 * Created Time: 2022-12-14
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

/* 二叉搜索树 */
class BinarySearchTree {
    #root;

    /* 构造方法 */
    constructor() {
        this.#root = null;
    }

    /* 获取二叉树根节点 */
    getRoot() {
        return this.#root;
    }

    /* 查找节点 */
    search(num) {
        let cur = this.#root;
        // 循环查找，越过叶节点后跳出
        while (cur !== null) {
            // 目标节点在 cur 的右子树中
            if (cur.val < num) cur = cur.right;
            // 目标节点在 cur 的左子树中
            else if (cur.val > num) cur = cur.left;
            // 找到目标节点，跳出循环
            else break;
        }
        // 返回目标节点
        return cur;
    }

    /* 插入节点 */
    insert(num) {
        // 若树为空，则初始化根节点
        if (this.#root === null) {
            this.#root = new TreeNode(num);
            return;
        }
        let cur = this.#root,
            pre = null;
        // 循环查找，越过叶节点后跳出
        while (cur !== null) {
            // 找到重复节点，直接返回
            if (cur.val === num) return;
            pre = cur;
            // 插入位置在 cur 的右子树中
            if (cur.val < num) cur = cur.right;
            // 插入位置在 cur 的左子树中
            else cur = cur.left;
        }
        // 插入节点
        const node = new TreeNode(num);
        if (pre.val < num) pre.right = node;
        else pre.left = node;
    }

    /* 删除节点 */
    remove(num) {
        // 若树为空，直接提前返回
        if (this.#root === null) return;
        let cur = this.#root,
            pre = null;
        // 循环查找，越过叶节点后跳出
        while (cur !== null) {
            // 找到待删除节点，跳出循环
            if (cur.val === num) break;
            pre = cur;
            // 待删除节点在 cur 的右子树中
            if (cur.val < num) cur = cur.right;
            // 待删除节点在 cur 的左子树中
            else cur = cur.left;
        }
        // 若无待删除节点，则直接返回
        if (cur === null) return;
        // 子节点数量 = 0 or 1
        if (cur.left === null || cur.right === null) {
            // 当子节点数量 = 0 / 1 时， child = null / 该子节点
            const child = cur.left !== null ? cur.left : cur.right;
            // 删除节点 cur
            if (cur !== this.#root) {
                if (pre.left === cur) pre.left = child;
                else pre.right = child;
            } else {
                // 若删除节点为根节点，则重新指定根节点
                this.#root = child;
            }
        }
        // 子节点数量 = 2
        else {
            // 获取中序遍历中 cur 的下一个节点
            let tmp = cur.right;
            while (tmp.left !== null) {
                tmp = tmp.left;
            }
            // 递归删除节点 tmp
            this.remove(tmp.val);
            // 用 tmp 覆盖 cur
            cur.val = tmp.val;
        }
    }

    /* 中序遍历 */
    #inOrder(root, list) {
        if (root === null) return;
        this.#inOrder(root.left, list);
        list.push(root.val);
        this.#inOrder(root.right, list);
    }

    /* 层序遍历 */
    levelOrder() {
        // 初始化队列，加入根节点
        const queue = [this.#root];
        // 初始化一个列表，用于保存遍历序列
        const list = [];
        if (this.#root === null) {
            return list;
        }
        // 循环遍历直至队列为空
        while (queue.length) {
            let node = queue.shift(); // 队列出队
            list.push(node.val); // 保存节点值
            if (node.left !== null) queue.push(node.left); // 左子节点入队
            if (node.right !== null) queue.push(node.right); // 右子节点入队
        }
        return list;
    }
}

/* Driver Code */
// 初始化二叉搜索树
const bst = new BinarySearchTree();
// 插入节点
bst.insert(8);
bst.insert(4);
bst.insert(12);
bst.insert(2);
bst.insert(6);
bst.insert(10);
bst.insert(14);
bst.insert(1);
bst.insert(3);
bst.insert(5);
bst.insert(7);
bst.insert(9);
bst.insert(11);
bst.insert(13);
bst.insert(15);
console.log('\n初始化的二叉树为\n');
printTree(bst.getRoot());

/* 查找节点 */
const node = bst.search(7);
console.log('\n查找到的节点对象为: ' + node + '，节点值 = ' + node.val);

/* 删除节点 */
bst.remove(1); // 删除节点 1
bst.remove(10); // 删除节点 10
bst.remove(4); // 删除节点 4
console.log('\n删除节点 1, 10, 4 后，二叉树为\n');
printTree(bst.getRoot());

/* 层序遍历 */
const list = bst.levelOrder();
console.log('\n层序遍历节点列表 = ' + list);
