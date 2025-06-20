/**
 * File: hashing_search.js
 * Created Time: 2022-12-12
 * Author: Justin (xiefahit@gmail.com)
 */

// Helper function to convert array to linked list
function arrToLinkedList(arr) {
    const dum = {
        val: 0,
        next: null
    };
    let head = dum;
    for (const val of arr) {
        head.next = {
            val: val,
            next: null
        };
        head = head.next;
    }
    return dum.next;
}

/* 哈希查找（数组） */
function hashingSearchArray(nums, target) {
    // 哈希表，记录元素到索引的映射
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        map.set(nums[i], i); // key: 元素，value: 索引
    }
    // 通过查询哈希表来判断是否存在 target
    if (map.has(target)) {
        return map.get(target);
    }
    return -1;
}

/* 哈希查找（链表） */
function hashingSearchLinkedList(head, target) {
    // 哈希表，记录元素到结点的映射
    const map = new Map();
    // 线性遍历链表
    let index = 0;
    while (head !== null) {
        map.set(head.val, index); // key: 结点值，value: 索引
        head = head.next;
        index += 1;
    }
    // 通过查询哈希表来判断是否存在 target
    if (map.has(target)) {
        return map.get(target);
    }
    return -1;
}

/* Driver Code */
const target = 3;

/* 哈希查找（数组） */
const nums = [1, 5, 3, 2, 4, 7, 5, 9, 10, 8];
const index = hashingSearchArray(nums, target);
console.log('目标元素 3 的索引 = ' + index);

/* 哈希查找（链表） */
const head = arrToLinkedList(nums);
const index1 = hashingSearchLinkedList(head, target);
console.log('目标结点值 3 的索引 = ' + index1);
