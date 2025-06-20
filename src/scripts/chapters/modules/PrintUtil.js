/**
 * File: PrintUtil.js
 * Created Time: 2022-12-04
 * Author: IsChristina (christinaxia77@foxmail.com)
 */

import { arrToTree } from './TreeNode.js';

/**
 * Print a linked list
 * @param head
 */
function printLinkedList(head) {
    let list = [];
    while (head !== null) {
        list.push(head.val.toString());
        head = head.next;
    }
    console.log(list.join(' -> '));
}

function Trunk(prev, str) {
    this.prev = prev;
    this.str = str;
}

/**
 * Helper function to print branches of the binary tree
 * @param p
 */
function showTrunks(p) {
    if (!p) {
        return;
    }

    let result = '';
    let trunk = p;
    while (trunk !== null) {
        result = trunk.str + result;
        trunk = trunk.prev;
    }

    // 在浏览器环境中直接返回字符串，不进行打印
    return result;
}

/**
 * Print a binary tree
 * @param root 树的根节点
 * @param prev 前一个Trunk对象
 * @param isLeft 是否是左子树
 */
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

/**
 * The interface of the tree printer
 * This tree printer is borrowed from TECHIE DELIGHT
 * https://www.techiedelight.com/c-program-print-binary-tree/
 * @param root
 */
function printTree(root) {
    printTreeHelper(root, null, false);
}

/**
 * Print a heap
 * @param arr
 */
function printHeap(arr) {
    console.log('堆的数组表示：');
    console.log(arr);
    console.log('堆的树状表示：');
    printTree(arrToTree(arr));
}

export {
    printLinkedList,
    printTree,
    printHeap,
};
