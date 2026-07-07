# บท 2 — JavaScript Language Mechanics: closure, this, prototype และกับดักที่ interview ชอบขุด

> บทนี้คือ "ไส้ใน" ของภาษา — เรื่องที่เขียน React/Angular ทุกวันโดยไม่รู้ก็รอด แต่พอสัมภาษณ์ senior จะโดนขุดทันที เพราะมันแยก "คนใช้ framework เป็น" ออกจาก "คนเข้าใจว่าทำไมโค้ดถึงทำแบบนั้น" สำหรับคน Java: หลายเรื่องในบทนี้คือจุดที่ JS **ตั้งใจ**ต่างจาก OOP แบบ class-based — อ่านด้วยตาใหม่ อย่าเอา mental model ของ Java มาทาบตรง ๆ

## เข็มทิศก่อนอ่าน

ถ้าบท 1 อธิบายว่าโค้ด JavaScript ถูกจัดคิวยังไง บทนี้อธิบายว่าเมื่อโค้ดได้รันแล้ว ภาษาแปลความหมายของตัวแปร, function และ object กันแบบไหน หลายบั๊กที่ดูเหมือนเป็นปัญหา React หรือ Angular จริง ๆ แล้วเริ่มจาก closure, `this`, prototype หรือ coercion ที่เข้าใจคลาดเคลื่อนตั้งแต่ชั้นภาษา

อ่านบทนี้แบบคนกำลังเก็บเครื่องมือวินิจฉัย ไม่ใช่แบบคนกำลังท่อง definition ยิ่งคุณไล่ย้อนจากอาการกลับมาหากลไกภาษาได้ชัดเท่าไร บท framework และบท debug production ที่ตามมาจะยิ่งอ่านรู้เรื่องขึ้นเท่านั้น

## 2.1 Closure: function ที่หอบ environment ติดตัว

### สถานการณ์จริง

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// คาด: 0 1 2 — ได้จริง: 3 3 3
```

### กลไก

closure = **function + lexical environment ที่มันถูกสร้าง** — ทุกครั้งที่สร้าง function มันจะจดจำ "ที่อยู่" ของ scope รอบตัว (environment record) และเข้าถึงตัวแปรใน scope นั้นได้แม้ function แม่จะ return ไปนานแล้ว จุดสำคัญ: closure จับ**ตัวแปร** (reference ไปยังช่องเก็บของ) ไม่ใช่**ค่า ณ ขณะนั้น**

โค้ดข้างบนพังเพราะ `var` เป็น function-scoped — ทั้ง loop มี `i` **ช่องเดียว** arrow function ทั้ง 3 ตัวชี้ช่องเดียวกัน พอ callback รัน (หลัง loop จบ ตาม event loop บท 1) ช่องนั้นเป็น 3 ไปแล้ว แก้ด้วย `let` เพราะ spec กำหนดให้ `let` ใน for-loop สร้าง **binding ใหม่ทุก iteration** — closure แต่ละตัวเลยได้ช่องของใครของมัน

**Analogy เป้สะพายหลัง:** function ทุกตัวเกิดมาพร้อมเป้ที่ใส่ "ลิงก์ไปยังตู้เก็บของ" ของบ้านที่มันเกิด ย้ายไปไหนเป้ก็ติดตัว — แต่ในเป้คือ*ลิงก์*ไม่ใช่*ของ copy* ถ้าใครแก้ของในตู้ ทุก function ที่ถือลิงก์เดียวกันเห็นค่าใหม่หมด

### ใช้แก้ปัญหาอะไรจริง

```ts
// 1) Encapsulation — สร้าง private state โดยไม่มี class
function createCounter() {
  let count = 0;                       // เข้าถึงไม่ได้จากข้างนอกเด็ดขาด
  return {
    inc: () => ++count,
    get: () => count,
  };
}

// 2) Factory ที่ config ค้างไว้
const withRetry = (times: number) => (fn: () => Promise<unknown>) => {
  /* fn ถูกห่อด้วย retry logic ที่จำค่า times ได้ */
};
```

และ closure คือหัวใจของ debounce/throttle (หัวข้อ 2.9) กับ hooks ของ React (บท 6 — บั๊ก "stale closure" ใน useEffect คือเรื่องนี้เป๊ะ ๆ)

**แนวตอบ senior:** closure คือ function ที่ผูกกับ lexical scope ที่มันถูกประกาศ ทำให้เก็บ state ส่วนตัวได้โดยไม่ต้องมี class — ผมใช้ทำ encapsulation, factory, debounce และมันคือกลไกเดียวกับที่ทำให้เกิด stale closure bug ใน React hooks

## 2.2 this: สี่กติกา + arrow function

`this` ใน JS **ไม่ได้ผูกกับ object ตอนประกาศ แต่ผูกตอนเรียก** (call-site) — ตรงข้ามกับ Java ที่ `this` คือ instance ปัจจุบันเสมอ กติกาไล่จากแรงสุด:

| ลำดับ | กติกา | รูปแบบการเรียก | this คือ |
|---|---|---|---|
| 1 | **new binding** | `new Foo()` | object ใหม่ที่เพิ่งสร้าง |
| 2 | **explicit binding** | `fn.call(obj)` / `fn.apply(obj)` / `fn.bind(obj)` | obj ที่ระบุ |
| 3 | **implicit binding** | `obj.fn()` | object หน้าจุด |
| 4 | **default binding** | `fn()` เรียกโดด ๆ | `undefined` (strict mode) / `globalThis` (sloppy) |

ส่วน **arrow function ไม่มี this ของตัวเอง** — มันหยิบ `this` จาก scope ที่ล้อมรอบตอนประกาศ (เหมือนตัวแปรธรรมดาตัวหนึ่งใน closure) และ `call/bind` เปลี่ยนมันไม่ได้

บั๊กจริงที่เจอประจำ — method หลุดจาก object:

```js
class Timer {
  seconds = 0;
  tick() { this.seconds++; }
  start() {
    setTimeout(this.tick, 1000);        // พัง! ส่ง "ตัว function" ไปเฉย ๆ
    // ตอน setTimeout เรียก มันเรียกแบบโดด ๆ → default binding → this = undefined
    setTimeout(() => this.tick(), 1000); // ถูก: arrow ดึง this จาก start()
  }
}
```

**แนวตอบ senior:** this ตัดสินที่ call-site ตามสี่กติกา new > explicit > implicit > default ส่วน arrow ไม่มี this ของตัวเองจึงเหมาะกับ callback — บั๊กคลาสสิกคือส่ง method เป็น callback แล้ว this หาย แก้ด้วย arrow หรือ bind

## 2.3 Prototype chain: lookup ยังไง และ class คือ sugar

JS ไม่มี class จริงแบบ Java — มันมี **object ชี้ไปยัง object ต้นแบบ** (prototype) เวลาอ่าน property เอนจินไล่หา: ตัว object เอง → `[[Prototype]]` ของมัน → ต่อขึ้นไปเรื่อย ๆ จนเจอหรือถึง `null` (ปลายทางคือ `Object.prototype`)

**Analogy สายบังคับบัญชา:** ถาม property กับพนักงานคนหนึ่ง ถ้าเขาไม่รู้เขาส่งเรื่องให้หัวหน้า หัวหน้าไม่รู้ส่งต่อผู้จัดการ — คนถามไม่ต้องรู้ว่าคำตอบมาจากชั้นไหน และถ้าจ้างพนักงานพันคนใต้หัวหน้าคนเดียว ความรู้ของหัวหน้าไม่ถูก copy พันชุด (นี่คือเหตุผลเชิง memory ที่ method อยู่บน prototype ไม่ใช่บน instance)

```js
class Dog {                 // 'class' คือ syntax sugar
  constructor(name) { this.name = name; }  // property ต่อ instance
  bark() { return `${this.name}!`; }       // ลงไปอยู่ที่ Dog.prototype — แชร์กันทุกตัว
}
// เทียบเท่ายุคก่อน ES2015:
function Dog(name) { this.name = name; }
Dog.prototype.bark = function () { return this.name + '!'; };
```

จุดสับสนตลอดกาล: `Dog.prototype` (property ของ constructor — ว่าที่ต้นแบบของ instance ที่จะ new) กับ `dog.__proto__` / `Object.getPrototypeOf(dog)` (ลิงก์จริงของ instance) — สองชื่อนี้ชี้ object เดียวกันหลัง `new` แต่คนละบทบาท

**แนวตอบ senior:** อ่าน property แล้วไม่เจอบน object เอนจินไล่ขึ้น prototype chain จนเจอหรือชน null — class ใน JS คือ sugar ครอบกลไกนี้ method ถูกแชร์ผ่าน prototype ไม่ได้ copy ลงทุก instance

## 2.4 Hoisting + TDZ: var/let/const ต่างกันตรงไหนจริง ๆ

ทุก declaration ถูก "รู้จักล่วงหน้า" ตอนเอนจินสแกน scope (hoisting) — ที่ต่างคือ**สถานะก่อนถึงบรรทัดประกาศ**:

| | scope | ก่อนถึงบรรทัดประกาศ | ประกาศซ้ำ/assign ใหม่ |
|---|---|---|---|
| `var` | function | อ่านได้ ค่า `undefined` (บั๊กเงียบ) | ได้ทั้งคู่ |
| `let` | block | อยู่ใน **TDZ** — แตะแล้ว `ReferenceError` | assign ได้ ประกาศซ้ำไม่ได้ |
| `const` | block | TDZ เช่นกัน | ไม่ได้ทั้งคู่ (แต่ mutate ข้างใน object ได้ — const ล็อก binding ไม่ใช่ค่า) |

TDZ (Temporal Dead Zone) คือช่วงตั้งแต่เข้า scope จนถึงบรรทัดประกาศ — ตัวแปร "มีตัวตนแล้วแต่ห้ามแตะ" ออกแบบมาเพื่อเปลี่ยนบั๊กเงียบของ `var` (ได้ undefined ไปคำนวณต่อ) ให้เป็น error ดัง ๆ ที่เจอเร็ว `function` declaration ถูก hoist ทั้งก้อน (เรียกก่อนบรรทัดประกาศได้) ส่วน function expression / arrow ที่เก็บใน const เจอ TDZ ตามปกติ ธรรมเนียมปัจจุบัน: `const` เป็นค่าเริ่มต้น, `let` เมื่อต้อง reassign, `var` ไม่มีเหตุผลให้ใช้แล้ว

## 2.5 Shallow vs deep copy: spread ตื้นแค่ชั้นเดียว

```js
const user = { name: 'A', address: { city: 'BKK' } };
const copy = { ...user };            // shallow: copy ชั้นแรกเท่านั้น
copy.address.city = 'CNX';
console.log(user.address.city);      // 'CNX' — ต้นฉบับโดนด้วย! address ยังเป็นก้อนเดียวกัน
```

spread/`Object.assign` copy แค่ระดับบนสุด ค่าที่เป็น object ข้างในถูก copy แค่ *reference* ปัญหานี้กัด React/Angular ตรง ๆ เพราะการเทียบ state ใช้ reference equality (บท 6) — mutate ลึก ๆ แล้ว UI ไม่อัปเดต

ทางเลือก deep copy:

- `structuredClone(obj)` — มาตรฐานปัจจุบัน รองรับทุก browser หลักตั้งแต่ราวปี 2022 (และ Node 17+) จัดการ Date, Map, Set, TypedArray, **circular reference** ได้ — แต่ **clone function ไม่ได้, DOM node ไม่ได้** (โยน `DataCloneError`), prototype/getter/setter หาย (ได้ plain object กลับมา)
- `JSON.parse(JSON.stringify(obj))` — ท่าโบราณ: Date กลายเป็น string, `undefined`/function หายเงียบ, circular ระเบิด — เลิกใช้ได้แล้วถ้าไม่ติด environment เก่า
- ในงาน state ปกติมักไม่ deep copy ทั้งก้อน แต่ spread เฉพาะเส้นทางที่แก้ (หรือใช้ Immer) เพราะ deep copy ทั้ง tree แพงและทำลาย reference ที่ไม่เกี่ยว

## 2.6 == coercion กับเหตุผลที่ใช้ === เสมอ

`==` ไม่ได้ "เทียบหลวม ๆ" มั่ว ๆ — มันมี algorithm (Abstract Equality) ที่**แปลง type ให้ก่อนเทียบ** ฉบับย่อ: type เดียวกัน → เทียบแบบ `===`; `null == undefined` → true (คู่พิเศษ); number กับ string → แปลง string เป็น number; มี boolean → แปลง boolean เป็น number; object กับ primitive → เรียก `valueOf`/`toString` ก่อน

ผลคือความสมเหตุสมผลรายขั้น แต่รวมกันแล้วเดายาก:

| นิพจน์ | ผล | เพราะ |
|---|---|---|
| `'' == 0` | true | string → number: `'' → 0` |
| `'0' == 0` | true | `'0' → 0` |
| `'' == '0'` | **false** | type เดียวกัน เทียบตรง — ความสัมพันธ์ไม่ transitive! |
| `[] == false` | true | `[] → '' → 0` และ `false → 0` |
| `null == 0` | false | null จับคู่ได้กับ undefined เท่านั้น |
| `NaN == NaN` | false | NaN ไม่เท่ากับอะไรเลยแม้ตัวเอง — เช็คด้วย `Number.isNaN` |

นี่คือเหตุผลจริงที่ทีมบังคับ `===`: ไม่ใช่เพราะ `==` "ผิด" แต่เพราะคนอ่านต้องรัน algorithm ในหัวทุกครั้ง ต้นทุน review ไม่คุ้ม ข้อยกเว้นเดียวที่บางทีมยอม: `x == null` เพื่อเช็ค null และ undefined พร้อมกัน (แม้ปัจจุบันนิยมเขียน `x === null || x === undefined` หรือใช้ `??` แทน)

## 2.7 0.1 + 0.2 ≠ 0.3: IEEE 754 กับวิธีจัดการเงิน

`0.1 + 0.2 === 0.30000000000000004` — ไม่ใช่บั๊กของ JS แต่เป็นธรรมชาติของ **IEEE 754 double** (มาตรฐาน floating point 64 bit ที่ JS ใช้กับ number ทุกตัว): 0.1 ในฐานสองคือทศนิยมซ้ำไม่รู้จบ (เหมือน 1/3 ในฐานสิบ) เก็บได้แค่ค่าประมาณ พอบวกกันเศษความคลาดเคลื่อนโผล่ Java ก็เจอเหมือนกันกับ `double` — ต่างแค่ JS ไม่มี type อื่นให้หนี

วิธีจัดการเงินฝั่ง frontend:

1. **เก็บเป็นหน่วยย่อยจำนวนเต็ม** (สตางค์/cent) — integer บวกลบเป๊ะเสมอในช่วง `Number.MAX_SAFE_INTEGER` (2^53 − 1) — ท่าเดียวกับที่ backend ใช้ `long` ของ minor unit
2. ให้ **backend เป็นเจ้าของการคำนวณเงินจริง** ส่งมาทั้งค่าและ string ที่ format แล้ว — frontend แสดงผลอย่างเดียว (หลักเดียวกับที่ Java ใช้ `BigDecimal` ไม่ใช่ double — เล่ม backend บท 13)
3. จำเป็นต้องคำนวณจริงบน FE → ใช้ library decimal (`big.js`) และอย่าใช้ `toFixed` เป็นเครื่องมือปัดเงิน (มันเป็นเครื่องมือ format และมี edge case ปัดเพี้ยน)

## 2.8 Optional chaining และ ?? vs || — กับดัก 0 กับ ''

`a?.b?.c` — เจอ `null`/`undefined` ระหว่างทางแล้วคืน `undefined` เลย ไม่โยน error ส่วนการใส่ default:

```js
const pageSize = settings.pageSize || 20;  // กับดัก! user ตั้ง 0 → ได้ 20
const pageSize = settings.pageSize ?? 20;  // ถูก: แทนเฉพาะ null/undefined
```

`||` มองหา falsy ทั้งครอบครัว (`0`, `''`, `false`, `NaN` โดนหมด) แต่ `??` (nullish coalescing) แทนค่าเฉพาะ "ไม่มีค่า" จริง ๆ — ฟอร์มที่ user กรอก 0 หรือ string ว่างแล้วค่าเด้งกลับ default คือบั๊กจาก `||` แทบทั้งนั้น กติกาง่าย: default ของ "ค่าที่อาจยังไม่ถูกตั้ง" ใช้ `??` เสมอ

## 2.9 เขียน debounce กับ throttle เอง (โจทย์ machine coding ยอดฮิต)

**Analogy ลิฟต์กับประตูหมุน:** debounce คือลิฟต์ — มีคนกดเพิ่มก็รีเซ็ตเวลารอ ปิดประตูเมื่อ "เงียบ" ครบกำหนด (เหมาะกับ search box: ยิง API เมื่อ user หยุดพิมพ์) ส่วน throttle คือประตูหมุน — ปล่อยผ่านอย่างมากหนึ่งคนต่อช่วงเวลา ไม่สนว่าข้างหลังต่อคิวแค่ไหน (เหมาะกับ scroll/resize handler: อัปเดตทุก 100ms พอ)

```ts
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timerId: ReturnType<typeof setTimeout> | undefined; // closure เก็บ timer ข้ามการเรียก
  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timerId);          // ทุกครั้งที่ถูกเรียก: ล้มนัดเดิมทิ้ง (หัวใจของ debounce)
    timerId = setTimeout(() => {
      fn.apply(this, args);         // apply เพื่อรักษา this + args ชุดล่าสุด
    }, delay);                      // นัดใหม่ — จะรันจริงต่อเมื่อไม่มีใครมาล้มนัดใน delay ms
  };
}

function throttle<T extends (...args: any[]) => void>(fn: T, interval: number) {
  let last = 0;                                    // เวลาที่ยิงจริงครั้งล่าสุด
  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - last >= interval) {   // ผ่านช่วงคูลดาวน์แล้วเท่านั้นถึงยิง
      last = now;
      fn.apply(this, args);         // เรียกระหว่างคูลดาวน์ = ทิ้งเงียบ ๆ
    }
  };
}
```

ของแถมที่ทำให้ดูเก๋าขึ้นทันที — เติม `cancel` ให้ debounce (จำเป็นจริงตอน component unmount ไม่งั้น callback ค้างยิงหลัง component ตายไปแล้ว — โยง cleanup ใน useEffect บท 6):

```ts
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timerId: ReturnType<typeof setTimeout> | undefined;
  const debounced = function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), delay);
  };
  debounced.cancel = () => clearTimeout(timerId); // ให้ lifecycle ภายนอกสั่งล้มนัดได้
  return debounced;
}
```

จุดที่กรรมการมองหา: (1) closure เก็บ state ข้ามการเรียก (2) รักษา `this`/args ด้วย function ธรรมดา + apply — ใช้ arrow ตรง return จะเสีย this ของผู้เรียก (3) type generic ไม่หลุด (4) พูด trade-off ได้: debounce เวอร์ชันนี้คือ trailing-edge (รอจบค่อยยิง) บางงานต้องการ leading edge หรือ `cancel()` เพิ่ม ส่วน throttle เวอร์ชันนี้ทิ้ง call สุดท้าย — งาน UI จริงมักเติม trailing call ให้ state สุดท้ายไม่หาย

## 2.10 Memory leak ฝั่ง frontend + GC ของ JS

GC (Garbage Collector) ของ JS เป็น **mark-and-sweep**: เริ่มจาก root (global, stack, closure ที่ยังถูกอ้าง) ไล่ mark ทุกอย่างที่ *reachable* แล้วกวาดที่เหลือทิ้ง — V8 แบ่งรุ่นเป็น young/old generation คล้าย JVM (เล่ม backend บท 22) ต่างที่สำคัญ: JS จูน GC ไม่ได้ เลือก collector ไม่ได้ และรันบนเครื่อง user ที่เราคุมสเปคไม่ได้ — leak ฝั่ง FE จึงสะสมเงียบ ๆ ใน SPA (Single-Page Application — แอปที่ไม่ reload หน้า memory เลยไม่ถูกล้างอัตโนมัติแบบยุคเปลี่ยนหน้าเว็บ)

leak ไม่ได้แปลว่า GC พัง — แปลว่า**เราเผลอถือ reference ไว้** จนของนั้น reachable ตลอดกาล สี่ตัวการหลัก:

| ตัวการ | กลไก | ทางแก้ |
|---|---|---|
| Event listener ไม่ remove | element โดนถอดจาก DOM แต่ listener ที่ผูกกับ object อายุยืน (เช่น `window`) ยังถือ closure → closure ถือ element | `removeEventListener` ตอน cleanup / `AbortController` signal / `{ once: true }` |
| Timer ไม่ clear | `setInterval` ยังยิงอยู่ = callback + ทุกอย่างที่มัน close over ถูกถือตลอด | `clearInterval` ใน cleanup (useEffect return / ngOnDestroy) |
| Detached DOM | เก็บ element ไว้ในตัวแปร/array แล้ว DOM จริงถูกลบ — JS ยังถืออยู่ GC เก็บไม่ได้ทั้ง subtree | อย่า cache element ข้ามอายุ component; ใช้ WeakMap ถ้าต้อง map ข้อมูลกับ element |
| Cache โตไม่หยุด | `Map` เก็บผลลัพธ์ไม่มี eviction | จำกัดขนาด (LRU) หรือ key เป็น object ใช้ `WeakMap` ให้ entry ตายตาม key |

ตัวอย่างท่า WeakMap ที่แก้ตัวการข้อ 3–4 พร้อมกัน:

```ts
const meta = new Map<HTMLElement, RowMeta>();     // ❌ element โดนถอดจาก DOM แล้ว
                                                  //    Map ยังถือ key → ทั้ง subtree ไม่ถูกเก็บ
const meta = new WeakMap<HTMLElement, RowMeta>(); // ✅ key ถูกถือแบบ weak —
                                                  //    ไม่มีใครอื่นอ้าง element แล้ว entry ตายตามเอง
```

ข้อจำกัดที่ต้องรู้: WeakMap วน iterate ไม่ได้ ถามขนาดไม่ได้ — ตั้งใจออกแบบมาแบบนั้น เพราะถ้า iterate ได้ ผลลัพธ์จะขึ้นกับจังหวะ GC ซึ่ง non-deterministic

**Analogy กุญแจตึกร้าง:** detached DOM คือการถือกุญแจห้องของตึกที่สั่งรื้อไปแล้ว — ตราบใดที่ยังมีคนถือกุญแจ (reference) เทศบาล (GC) รื้อตึกไม่ได้ ต้องรอทุกคนทิ้งกุญแจก่อน

เสริมสถานะ 2026: `WeakRef` / `FinalizationRegistry` (อ้างอิงแบบไม่ขวาง GC + callback หลัง object ถูกเก็บ) รองรับทุก browser หลักมาตั้งแต่ปี 2021 แต่ธรรมเนียมคือ**ใช้ให้น้อยที่สุด** — จังหวะ GC ไม่การันตี ห้ามเอา logic ไปแขวนกับมัน เคสชอบธรรมมีแค่ cache ขั้นสูงประเภทเดียว วิธีหา leak จริง: Chrome DevTools ถ่าย heap snapshot สองจุดแล้ว diff หา detached element (ลงมือจริงในบท 13)

**แนวตอบ senior:** GC ของ JS เป็น mark-and-sweep เก็บเฉพาะของที่ unreachable — leak ฝั่ง FE เกือบทั้งหมดคือเราถือ reference ค้าง: listener บน window, setInterval ไม่ clear, ตัวแปรถือ detached DOM ผมกันด้วย cleanup ตาม lifecycle ของ component และพิสูจน์ด้วย heap snapshot diff

## คำถามสัมภาษณ์ที่ต้องตอบได้

1. **closure คืออะไร ใช้ทำอะไรจริง?** → function ที่ผูกกับ lexical environment ตอนประกาศ ทำให้เข้าถึงตัวแปร scope แม่ได้แม้แม่ return ไปแล้ว — ใช้ทำ private state, factory, debounce และเป็นต้นเหตุ stale closure ใน hooks; จับ "ตัวแปร" ไม่ใช่ "ค่า" — กับดัก var ใน loop มาจากตรงนี้

2. **ไล่กติกา this ให้หน่อย ทำไม callback ถึง this หาย?** → ตัดสินที่ call-site: new > call/bind > object หน้าจุด > default (undefined ใน strict) — ส่ง method ไปเป็น callback คือเรียกแบบโดด ๆ เลยตก default binding แก้ด้วย arrow (ดึง this จาก scope รอบ) หรือ bind

3. **spread copy ลึกไหม แล้ว deep copy ทำยังไง?** → ตื้นชั้นเดียว object ซ้อนยังแชร์ reference — deep copy มาตรฐานคือ structuredClone (รองรับ circular, Date, Map แต่ clone function/DOM ไม่ได้และ prototype หาย) ส่วน JSON round-trip มี pitfall เยอะ เลิกใช้

4. **ทำไม 0.1 + 0.2 ไม่เท่ากับ 0.3 แล้วระบบเงินทำยังไง?** → number ของ JS คือ IEEE 754 double — 0.1 เป็นเลขฐานสองซ้ำไม่รู้จบ เก็บได้แค่ค่าประมาณ ระบบเงินจึงเก็บหน่วยย่อยเป็น integer หรือให้ backend คำนวณด้วย decimal type แล้ว FE แค่แสดงผล เหมือนเหตุผลที่ Java ใช้ BigDecimal ไม่ใช่ double

5. **?? ต่างจาก || ยังไง?** → || แทนค่าเมื่อเจอ falsy ทุกชนิดรวม 0, '', false ส่วน ?? แทนเฉพาะ null/undefined — ค่า config หรือ input ที่ 0 กับ string ว่างเป็นค่า valid ต้องใช้ ?? ไม่งั้น default ไปทับค่าที่ user ตั้งใจกรอก

6. **จะหา memory leak ใน SPA ยังไง?** → reproduce เส้นทางที่สงสัย → heap snapshot ก่อน/หลัง แล้ว diff หา object ที่โตผิดปกติ โดยเฉพาะ detached element → ไล่ retainer path ว่าใครถืออยู่ — เกือบทุกครั้งจบที่ listener/timer ไม่ cleanup ตาม lifecycle

## สรุปท้ายบท

- กลไกอย่าง closure, `this`, prototype และ coercion ไม่ใช่เกร็ดภาษาย่อย ๆ แต่เป็นรากของพฤติกรรมที่เราเห็นใน React, Angular และโค้ด async ทุกวัน
- การเข้าใจว่า JavaScript จับ reference ไม่ใช่ copy value ในหลายกรณี ช่วยอธิบายบั๊กที่ดูเหมือนสุ่มได้เป็นระบบ
- เรื่อง copy, equality และ garbage collection เป็นจุดที่เชื่อมจาก "เขียนให้ทำงาน" ไปสู่ "เขียนให้ปลอดภัยและดูแลง่าย"
- ถ้าภาษายังไม่ชัด การ optimize หรือ debug ในชั้น framework มักจะแก้ที่ปลายเหตุ

## ก่อนไปบทถัดไป

เมื่อกลไกของภาษาเริ่มนิ่งแล้ว บทถัดไปจะเพิ่มชั้นของ TypeScript เข้ามา เพื่อเปลี่ยนความเข้าใจเรื่องค่ากับโครงสร้างให้กลายเป็นสัญญาการออกแบบที่ compiler ช่วยตรวจให้ตั้งแต่ก่อนรันจริง
