# 100 Drills — Data Structures (Easy → Medium)

โจทย์แนว LeetCode 100 ข้อ เขียนเป็น TypeScript stub + vitest — **ไม่มีเฉลย** ตั้งใจให้ลงมือเอง

## วิธีใช้

```bash
pnpm test:drills          # รันทั้งหมดครั้งเดียว (ตอนนี้แดงหมด = ยังไม่ได้ทำ)
pnpm drills:watch         # โหมด watch — แก้แล้วรันเทสให้อัตโนมัติ
pnpm test:drills -- arrays   # รันเฉพาะไฟล์ arrays
pnpm typecheck            # เช็ค type ทั้งโปรเจกต์
```

**วิธีทำโจทย์:** เปิดไฟล์ใน `src/drills/` → หาข้อที่จะทำ → **ลบ `return todo();` ทิ้ง แล้วเขียน implementation** → เทสจากแดงเป็นเขียว

```ts
// ก่อน
export const singleNumber = (nums: readonly number[]): number => {
  return todo();          // ← ลบบรรทัดนี้
};

// หลัง
export const singleNumber = (nums: readonly number[]): number => {
  return nums.reduce((acc, n) => acc ^ n, 0);
};
```

## แผนที่โจทย์

| ไฟล์ | DRILL | จำนวน | หัวข้อ |
|---|---|---|---|
| `arrays.ts` | 1–20 | 20 | two pointers, sliding window, prefix sum, binary search, in-place ops |
| `strings.ts` | 21–35 | 15 | palindrome, anagram, substring, parsing, sliding window |
| `hashmap.ts` | 36–50 | 15 | frequency count, Set, prefix sum + map, top-K |
| `stackQueue.ts` | 51–62 | 12 | monotonic stack, deque, MinStack/MyQueue/MyStack |
| `linkedList.ts` | 63–74 | 12 | reverse, slow/fast pointer, cycle detection, merge |
| `tree.ts` | 75–88 | 14 | DFS/BFS, traversal (recursive + iterative), BST, LCA |
| `graph.ts` | 89–94 | 6 | grid BFS/DFS, multi-source BFS, topological sort, clone |
| `heapTrieInterval.ts` | 95–100 | 6 | top-K, MinHeap, Trie, merge/insert intervals |

`_types.ts` = ของแถมที่ทำให้แล้ว (`ListNode`, `TreeNode`, `arrayToList`, `listToArray`, `arrayToTree`, `treeToArray`, `todo`) — **ห้ามแก้** ใช้สร้าง input/assert output

## ลำดับที่แนะนำให้ซ้อม

1. **`arrays` → `strings` → `hashmap`** — ออกบ่อยที่สุดในรอบแรก ทำให้แม่นก่อน
2. **`stackQueue` → `linkedList`** — ท่ามาตรฐานที่กรรมการชอบดู pointer manipulation
3. **`tree` → `graph`** — BFS/DFS เป็นรากเดียวกัน ทำ tree ก่อนแล้ว graph จะง่ายขึ้นมาก
4. **`heapTrieInterval`** — เฉพาะทางกว่า เก็บไว้ท้าย

## กติกาที่ควรบังคับตัวเอง (ให้เหมือนห้องสัมภาษณ์จริง)

- **พูดออกเสียงว่ากำลังคิดอะไร** ก่อนเริ่มพิมพ์ — บอก approach + complexity ที่ตั้งใจ
- **อ่าน Hint ใน JSDoc ทุกข้อ** — มันบอก target complexity ไว้ ถ้าทำได้แต่ช้ากว่านั้น ให้กลับมาคิดใหม่
- **เริ่มจาก brute force ที่ทำงานได้ก่อน** แล้วค่อย optimize — ดีกว่านั่งคิดท่าเทพแล้วไม่ได้โค้ดอะไรเลย
- **ไล่ edge case เองก่อนรันเทส**: ว่าง, ตัวเดียว, ซ้ำ, ค่าติดลบ, ยาวมาก
- **จับเวลา** — Easy ควรจบใน 10–15 นาที, Medium 20–30 นาที

## ติดตามความคืบหน้า

```bash
# นับข้อที่ยังไม่ทำ (ยังมี todo() อยู่)
grep -c 'return todo();' src/drills/*.ts
```
