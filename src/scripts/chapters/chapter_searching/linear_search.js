/**
 * File: linear_search.js
 * Created Time: 2022-12-12
 * Author: Justin (xiefahit@gmail.com)
 */

// ListNode class definition (inline instead of import)
class ListNode {
    constructor(val, next) {
        this.val = val === undefined ? 0 : val;
        this.next = next === undefined ? null : next;
    }
}

// Helper function to convert array to linked list
function arrToLinkedList(arr) {
    const dum = new ListNode(0);
    let head = dum;
    for (const val of arr) {
        head.next = new ListNode(val);
        head = head.next;
    }
    return dum.next;
}

/* 线性查找（数组） */
function linearSearchArray(nums, target) {
    // 遍历数组
    for (let i = 0; i < nums.length; i++) {
        // 找到目标元素，返回其索引
        if (nums[i] === target) {
            return i;
        }
    }
    // 未找到目标元素，返回 -1
    return -1;
}

/* 线性查找（链表） */
function linearSearchLinkedList(head, target) {
    // 遍历链表
    let index = 0;
    while (head !== null) {
        // 找到目标结点，返回其索引
        if (head.val === target) {
            return index;
        }
        head = head.next;
        index += 1;
    }
    // 未找到目标结点，返回 -1
    return -1;
}

const target = 3;

/* 线性查找（数组）*/
const nums = [1, 5, 3, 2, 4, 7, 5, 9, 10, 8];
const index = linearSearchArray(nums, target);
console.log('目标元素 3 的索引 = ' + index);

/* 线性查找（链表）*/
const head = arrToLinkedList(nums);
const index1 = linearSearchLinkedList(head, target);
console.log('目标结点值 3 的索引 = ' + index1);
