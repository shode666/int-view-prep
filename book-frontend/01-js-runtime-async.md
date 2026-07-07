# บท 1 — JavaScript Runtime & Async: ทำไม thread เดียวแต่หน้าไม่ค้าง

> คุณมาจากโลก Java ที่ request หนึ่งได้ thread หนึ่ง อยากรอ I/O ก็ block ไปเลยเดี๋ยว thread อื่นทำงานแทน แต่ JavaScript ใน browser มี **main thread เดียว** ที่ต้องทั้งรันโค้ด ทั้งวาดหน้าจอ ทั้งตอบ user คลิก — บทนี้อธิบายว่าโมเดลนี้อยู่รอดได้ยังไง และทำไมคำถามสัมภาษณ์ frontend แทบทุกบริษัทเริ่มที่ event loop

## เข็มทิศก่อนอ่าน

บทนี้เป็นฐานของทั้งเล่ม ถ้ายังไม่เห็นภาพว่า main thread, queue, render และ network callback สลับกันอย่างไร บทหลัง ๆ เรื่อง React, Angular, performance และ data fetching จะดูเหมือนเป็น API หลายกองที่ไม่เกี่ยวกัน ทั้งที่จริงผูกอยู่กับ event loop ตัวเดียว

ระหว่างอ่านให้จับสามคำถามนี้ไว้ตลอด: งานไหนกำลังรันบน call stack, งานไหนถูกผลักไปเข้าคิว, และงานไหนมีสิทธิ์แทรกก่อนระหว่าง microtask, macrotask และการวาดเฟรม ถ้าตอบสามคำถามนี้ได้ คุณจะอธิบายบั๊ก async ส่วนใหญ่ใน frontend ได้ด้วยเหตุผล ไม่ใช่ด้วยการเดา

## 1.1 สถานการณ์จริง: setTimeout(fn, 0) ทำไมไม่รันทันที

บั๊กคลาสสิกที่คนย้ายมาจาก backend เจอ:

```js
console.log('start');
setTimeout(() => console.log('timeout'), 0);   // ตั้ง delay = 0 มิลลิวินาที
heavyCalculation();                             // สมมติกิน CPU 3 วินาที
console.log('end');
// ผลจริง: start → end (หลัง 3 วิ) → timeout
// ไม่ใช่: start → timeout → ...
```

delay 0 แต่รอ 3 วินาที? เพราะ `setTimeout` ไม่ได้แปลว่า "รันในอีก X ms" แต่แปลว่า "**เอาเข้าคิว**หลังผ่านไปอย่างน้อย X ms" — และคิวจะถูกหยิบก็ต่อเมื่อ main thread ว่าง กลไกที่ตัดสินว่า "ว่างเมื่อไหร่ หยิบอะไรก่อน" คือ event loop

## 1.2 Event Loop เต็มวงจร: call stack → Web APIs → task queue → microtask queue

องค์ประกอบมี 4 ชิ้น:

1. **Call stack** — stack ของ function ที่กำลังรันอยู่ ณ ตอนนี้ JS รันทีละ frame แบบ synchronous ล้วน ๆ ไม่มีการสลับกลางคัน (ต่างจาก JVM — Java Virtual Machine — ที่ OS สลับ thread ได้ทุกเมื่อ ดูเล่ม backend บท 22)
2. **Web APIs** — ตัวช่วยที่ **browser** จัดให้ (ไม่ใช่ตัวภาษา JS): timer, `fetch` (HTTP client), DOM event (DOM = Document Object Model โครงสร้างต้นไม้ของหน้าเว็บ) พวกนี้ทำงานนอก main thread ได้ เช่น network request วิ่งบน thread ของ browser เอง
3. **Task queue** (หรือ macrotask queue) — คิวของงานที่ Web APIs ทำเสร็จแล้วอยากส่ง callback กลับมารัน เช่น timer ครบเวลา, user คลิก
4. **Microtask queue** — คิวพิเศษความสำคัญสูงกว่า ใส่โดย `Promise.then`, `queueMicrotask`, `MutationObserver`

**Analogy ครัวเชฟเดี่ยว:** ร้านอาหารมีเชฟคนเดียว (main thread) ทำได้ทีละจาน (call stack) แต่มีเครื่องช่วย — เตาอบ, เครื่องต้มไข่ (Web APIs) — เชฟกดตั้งเวลาแล้วไปทำจานอื่นต่อได้ พอเครื่องดัง "ติ๊ง" จานนั้นจะไปต่อ**คิวออเดอร์** (task queue) ไม่ใช่แทรกมือเชฟทันที ส่วน microtask คือ**โพสต์อิทแปะหน้าเชฟ** — กติกาบังคับว่าก่อนหยิบออเดอร์ใบถัดไป ต้องเคลียร์โพสต์อิททุกใบให้หมดก่อน

วงจรของ event loop ต่อหนึ่งรอบ (หนึ่ง "tick"):

1. หยิบ **macrotask ที่เก่าสุด 1 งาน** มารันจนจบ (รันจน call stack ว่าง)
2. เคลียร์ **microtask queue จนเกลี้ยง** — ถ้า microtask สร้าง microtask ใหม่ ก็รันต่อจนหมดจริง ๆ
3. ถ้าถึงจังหวะต้องวาดเฟรม → รัน `requestAnimationFrame` callbacks แล้วทำ render steps (style → layout → paint ดูบท 4)
4. วนกลับข้อ 1

จุดที่คนพลาดบ่อย: **render เกิดระหว่าง task ได้ แต่เกิดกลาง task ไม่ได้** ดังนั้นถ้า task เดียวกิน 3 วินาที หน้าจอค้าง 3 วินาที — นี่คือเหตุผลที่ metric INP (Interaction to Next Paint ดูบท 13) วัดความยาว task เป็นหลัก

## 1.3 Microtask vs Macrotask: ไล่ A-D-C-B ทีละขั้น

โจทย์บังคับของทุกการสัมภาษณ์:

```js
console.log('A');
setTimeout(() => console.log('B'), 0);          // macrotask
Promise.resolve().then(() => console.log('C')); // microtask
console.log('D');
// output: A, D, C, B
```

ไล่ทีละขั้น:

| ขั้น | Call stack | Microtask queue | Task queue | Output |
|---|---|---|---|---|
| 1 | script ทั้งก้อน (ตัว script เองคือ macrotask แรก) | — | — | A |
| 2 | `setTimeout` ลงทะเบียน timer กับ Web API แล้ว return ทันที | — | — | A |
| 3 | timer 0ms ครบแทบทันที → callback B เข้า task queue | — | B | A |
| 4 | `.then` ลงทะเบียน callback C — promise resolved แล้ว C จึงเข้า microtask queue ทันที | C | B | A |
| 5 | `console.log('D')` รัน — script จบ, stack ว่าง | C | B | A D |
| 6 | เคลียร์ microtask ก่อนเสมอ → รัน C | — | B | A D C |
| 7 | หยิบ macrotask ถัดไป → รัน B | — | — | A D C B |

หัวใจที่ต้องพูดให้ได้: **B เข้าคิวก่อน C แต่ C ออกก่อน** เพราะ microtask queue ถูกเคลียร์ทุกครั้งที่ stack ว่าง ก่อนจะแตะ macrotask ถัดไปเสมอ ไม่ใช่เพราะ Promise "เร็วกว่า"

### Microtask starvation — ใช้ผิดแล้วพังยังไง

microtask มีสิทธิ์สูงกว่า แปลว่ามันแย่งคิวได้ตลอดกาล:

```js
function greedy() {
  Promise.resolve().then(greedy); // microtask สร้าง microtask ตัวเองไม่รู้จบ
}
greedy();
// หน้าค้างสนิท: render ไม่เกิด, click ไม่ตอบ, setTimeout ไม่มีวันรัน
```

เพราะกติกาข้อ 2 บอกว่า "เคลียร์ microtask จนเกลี้ยง" — ถ้ามันไม่มีวันเกลี้ยง event loop ไปต่อไม่ได้เลย ต่างจากเวอร์ชัน `setTimeout(greedy)` ที่หน้าไม่ค้าง เพราะระหว่าง macrotask แต่ละตัว browser ยังแทรก render และ input ได้ นี่คือ trade-off ตรง ๆ: microtask ได้ความไว (รันก่อน render — เหมาะกับงานที่ต้องเสร็จก่อน user เห็นเฟรม) แลกกับความเสี่ยง starve ทั้งหน้า

## 1.4 Promise ข้างใน: state machine + then chaining

Promise คือ **state machine** (เครื่องจักรสถานะ — object ที่มีสถานะจำกัดและกติกาการเปลี่ยนชัดเจน เทียบเล่ม backend บท 21) มี 3 สถานะ:

- `pending` → เปลี่ยนได้ครั้งเดียวไปเป็น
- `fulfilled` (พร้อมค่า value) หรือ
- `rejected` (พร้อมเหตุผล reason) — สองสถานะหลังเรียกรวมว่า *settled* และ**ย้อนกลับไม่ได้** resolve ซ้ำถูกเมิน

กลไกของ `.then(onFulfilled, onRejected)` ที่คนมักไม่รู้:

1. `.then` **คืน Promise ตัวใหม่เสมอ** — ไม่ใช่ตัวเดิม นี่คือสิ่งที่ทำให้ chain ได้
2. callback ใน `.then` ถูกใส่ **microtask queue เสมอ** แม้ promise จะ settled ไปแล้ว — การันตีว่า `.then` ไม่มีวันรัน synchronous (กัน "โค้ดบางทีก็ sync บางทีก็ async" ที่ debug นรกมาก)
3. ค่าที่ return จาก callback ตัดสินชะตา promise ใหม่: return ค่าธรรมดา → fulfilled ด้วยค่านั้น, return promise → **รอตาม** promise นั้น (เรียกว่า flattening), throw → rejected

```js
fetch('/api/user')                    // Promise<Response>
  .then(res => res.json())            // return promise → ตัวถัดไปรอ json เสร็จ
  .then(user => user.name)            // return ค่าธรรมดา → fulfilled('ชื่อ')
  .then(name => { throw new Error('x') })  // throw → promise ใหม่ rejected
  .catch(err => 'fallback')           // catch คือ then(undefined, onRejected)
  .then(v => console.log(v));         // 'fallback' — catch กู้สถานะกลับมา fulfilled ได้
```

**Analogy ใบนัดรับพัสดุ:** Promise คือใบนัด ไม่ใช่พัสดุ — สั่งของแล้วได้ใบนัดทันที (pending) ของมาถึง (fulfilled) หรือหาย (rejected) แล้วสถานะตีตราถาวร `.then` คือการฝากคำสั่ง "ของถึงแล้วทำนี่ต่อ" ซึ่งได้**ใบนัดใบใหม่**สำหรับผลของงานต่อนั้น — เอาใบใหม่ไปฝากงานต่อได้เรื่อย ๆ

## 1.5 async/await คือ syntax sugar ของอะไร

`async/await` ไม่ได้เพิ่มความสามารถใหม่ให้ runtime เลย มันคือการให้ compiler แปลงโค้ดหน้าตา synchronous เป็น then chain ให้:

```ts
async function getUserName(): Promise<string> {
  const res = await fetch('/api/user');
  const user = await res.json();
  return user.name;
}

// เทียบเท่า (สิ่งที่เกิดจริงเชิงกลไก):
function getUserName(): Promise<string> {
  return fetch('/api/user')
    .then(res => res.json())
    .then(user => user.name);
}
```

กติกาที่ต้องแม่น:

- ฟังก์ชัน `async` **คืน Promise เสมอ** — `return x` ถูกห่อเป็น `Promise.resolve(x)`, `throw` กลายเป็น rejection
- `await` **หยุดเฉพาะฟังก์ชันตัวเอง** ไม่หยุด main thread — เครื่องมือจริงข้างใต้คือ generator + state machine: เจอ `await` ฟังก์ชัน *suspend* เก็บตำแหน่งไว้ คืน control ให้ caller ทันที แล้วโค้ดหลัง `await` ถูกนัดกลับมารันเป็น **microtask** เมื่อ promise settle
- ดังนั้น `await` ไม่ได้ "block" อะไรทั้งนั้น — event loop ยังวิ่ง render ยังเกิด คลิกยังตอบ

บั๊กจริงยอดฮิต — await เรียงกันโดยไม่จำเป็น:

```ts
// ช้า: รอ user เสร็จก่อนค่อยเริ่มยิง orders — latency บวกกัน (2 x RTT)
const user = await fetchUser();
const orders = await fetchOrders();

// เร็ว: ยิงพร้อมกัน แล้วค่อยรอทั้งคู่
const [user, orders] = await Promise.all([fetchUser(), fetchOrders()]);
```

คนจาก Java มักมองว่านี่คือ `Future.get()` — ใกล้เคียงแต่ต่างตรงสำคัญ: `Future.get()` block thread จริง ๆ ส่วน `await` คืน thread ให้ event loop ไปทำงานอื่น ใกล้ virtual threads / CompletableFuture chain มากกว่า (เล่ม backend บท 22)

## 1.6 Error handling: try/catch กับ await, .catch, unhandled rejection

`await` ทำให้ rejection กลายเป็น exception ธรรมดา — `try/catch` จึงใช้ได้ตรง ๆ:

```ts
try {
  const res = await fetch('/api/user');
  if (!res.ok) throw new Error(`HTTP ${res.status}`); // fetch ไม่ reject กับ 4xx/5xx!
  return await res.json();   // await ก่อน return เพื่อให้ catch ตรงนี้จับ json พังได้
} catch (err) {
  // จับทั้ง network error และ HTTP error ที่เรา throw เอง
  reportError(err);
  return null;
}
```

จุดพังที่เจอบ่อย:

```ts
try {
  doAsyncThing();        // ลืม await — promise ลอย (floating promise)
} catch (err) {
  // ไม่มีวันเข้าตรงนี้! error เกิด "หลัง" try block จบไปแล้ว
}
```

พอไม่มีใครรับ rejection เลย browser ยิง event `unhandledrejection` (ควรมี global handler เก็บ log เข้า monitoring — ดูบท 17) ทีม lint จึงเปิดกฎ `no-floating-promises` กัน `return promise` vs `return await promise` ก็ต่างในบริบท try: แบบแรก catch ในฟังก์ชันนั้นจับไม่ได้ แบบหลังจับได้

ส่วน `.catch()` เหมาะเมื่ออยาก recover เฉพาะจุดกลาง chain หรือใส่ fallback ให้ promise เดี่ยว ๆ โดยไม่ต้องแตก try/catch ครอบใหญ่ — เลือกตามความอ่านง่าย ไม่มีผลต่างเชิงกลไก

## 1.7 Promise.all vs allSettled vs race vs any

| Combinator | Resolve เมื่อ | Reject เมื่อ | เคสใช้จริง |
|---|---|---|---|
| `Promise.all` | **ทุกตัว** fulfilled (ได้ array ตามลำดับเดิม) | ตัวใดตัวหนึ่ง reject (**fail-fast**) | โหลดข้อมูลหลายก้อนที่ "ขาดตัวเดียวก็แสดงหน้าไม่ได้" เช่น user + permissions |
| `Promise.allSettled` | เสมอ — ได้ `{status, value/reason}` ทุกตัว | ไม่มีวัน reject | ยิงหลายงานอิสระกัน อยากรู้ผลรายตัว เช่น sync หลาย widget บน dashboard, batch upload |
| `Promise.race` | ตัวแรกที่ **settle** (สำเร็จหรือพังก็นับ) | ตัวแรก settle เป็น reject | ทำ timeout: `race([fetch(...), timeout(5000)])` |
| `Promise.any` | ตัวแรกที่ **fulfilled** (ข้ามตัวที่พัง) | ทุกตัว reject (ได้ `AggregateError`) | ยิงหลาย mirror/CDN เอาตัวที่ตอบก่อน |

โค้ดใช้จริงสองท่าที่ interviewer ชอบให้เขียน:

```ts
// 1) timeout ที่ "ยกเลิกจริง" — race เฉย ๆ แค่เลิกรอ แต่ request ยังวิ่ง เปลือง connection
async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal }); // ครบเวลา → fetch reject ด้วย AbortError
  } finally {
    clearTimeout(timer); // สำเร็จก่อนเวลาต้องเก็บ timer — ไม่งั้น callback ค้างถือ closure (บท 2)
  }
}
```

```ts
// 2) กับดัก async กับ array method
items.forEach(async (item) => await save(item));
// พังเงียบ: forEach ไม่สน promise ที่ callback คืน — โค้ดบรรทัดถัดไปรันทั้งที่ save ยังไม่เสร็จ
// และ rejection กลายเป็น unhandled ทันที

await Promise.all(items.map((item) => save(item))); // ขนาน + รอครบ + error รวมมาที่เดียว
for (const item of items) await save(item);         // เรียงทีละตัว — เมื่อ order/โหลด backend สำคัญ
```

nuance ระดับ senior เรื่อง fail-fast ของ `all`: มัน reject ทันทีที่ตัวแรกพัง แต่ **promise ตัวอื่นไม่ได้ถูกยกเลิก** — request ยังวิ่งต่อจนจบเฉย ๆ แค่ผลถูกทิ้ง JS ไม่มี cancellation ในตัว Promise ต้องใช้ `AbortController` (กลไกส่ง signal ยกเลิกให้ `fetch`) คู่กันเอง ประเด็นนี้โยงตรงกับ race condition ตอนพิมพ์ search แล้วผลเก่ามาทับผลใหม่ (บท 12)

## 1.8 requestAnimationFrame กับตำแหน่งของ render ใน loop

`requestAnimationFrame(cb)` (rAF) นัด callback ให้รัน **ก่อน render steps ของเฟรมถัดไป** — ตำแหน่งใน loop คือ: macrotask → microtasks → *rAF callbacks* → style/layout/paint จึงเหมาะกับงานแก้ DOM เพื่อ animation เพราะการันตีว่ารันจังหวะเดียวกับ refresh rate (60Hz = งบประมาณ ~16.7ms/เฟรม) และไม่รันฟรีตอน tab อยู่ background (browser throttle ให้)

**Analogy ช่างภาพกับม่านเวที:** rAF คือช่างแต่งหน้าที่ได้สิทธิ์แต่งตัวนักแสดงหนึ่งครั้ง**ก่อนม่านเปิดทุกรอบพอดี** — แต่งด้วย `setTimeout` คือแต่งเวลาสุ่ม บางทีม่านเปิดไปแล้วครึ่งทาง (เฟรมขาด กระตุก)

ของใหม่ที่ควรรู้ ณ ปี 2026 — **Prioritized Task Scheduling API**: `scheduler.postTask(fn, {priority})` ให้ยัดงานเข้า loop พร้อมระดับความสำคัญ (`user-blocking` / `user-visible` / `background`) และ `scheduler.yield()` ให้ task ยาว ๆ "พักให้ browser หายใจ" แล้วกลับมาต่อโดยได้คิวหัวแถว:

```js
async function processBigList(items) {
  for (const [i, item] of items.entries()) {
    process(item);
    if (i % 100 === 0) await scheduler.yield(); // ตัด long task → input/render แทรกได้
  }
}
```

สถานะรองรับ (ก.ค. 2026): Chromium มี `postTask` ตั้งแต่ Chrome 94, `scheduler.yield` ใช้ได้ใน Chrome (129+) และ Firefox (142+ กลาง–ปลายปี 2025 เป็นต้นมา) ส่วน **Safari ยังไม่รองรับทั้งคู่** — production ต้อง feature-detect หรือใช้ polyfill ของ Chrome team ท่า fallback ดั้งเดิมคือแตกงานด้วย `setTimeout(..., 0)` ซึ่งเสียตรงไปต่อท้ายคิวและโดน clamp ราว 4ms เมื่อซ้อนลึก (ตัวเลขเวอร์ชันเปลี่ยนได้ — ตรวจ caniuse ก่อนใช้ production)

## 1.9 เกร็ด runtime ที่โดนถามพ่วงบ่อย

- **`queueMicrotask(fn)`** — ยัด microtask ตรง ๆ โดยไม่ต้องสิ้นเปลืองสร้าง Promise ใช้เมื่ออยากเลื่อนงานไป "หลังโค้ดปัจจุบันจบ แต่ก่อน render/task ถัดไป" เช่น รวบ (batch) การ notify ผู้ subscribe หลายรายให้เหลือรอบเดียว
- **Node.js ต่างจาก browser** — event loop ของ Node (libuv) แบ่งเป็น phase (timers → I/O callbacks → setImmediate ฯลฯ) และมีคิวพิเศษ `process.nextTick` ที่รัน*ก่อน* microtask ปกติอีกชั้น ไม่มี render step เพราะไม่มีจอ — คำตอบปลอดภัยตอนสัมภาษณ์: หลัก microtask-ก่อน-macrotask เหมือนกัน แต่รายละเอียดการจัดคิว macrotask ต่างกัน
- **Web Worker** — ทางหนีจริงของงาน CPU-bound: thread แยกที่**ไม่แชร์ memory** กับ main thread (ต่างจาก Java ที่ heap แชร์กันแล้วต้องคุมด้วย lock — เล่ม backend บท 22) คุยกันผ่าน `postMessage` ซึ่ง copy ข้อมูลด้วย structured clone (บท 2) — ไม่มี race condition ระดับ memory แลกกับต้นทุน serialize

## คำถามสัมภาษณ์ที่ต้องตอบได้

1. **JS single thread แล้วทำไมหน้าเว็บไม่ค้างตอนรอ API?** → เพราะงาน I/O ถูกโยนให้ Web APIs ของ browser ทำนอก main thread แล้วส่ง callback กลับผ่านคิว main thread จึงว่างไปตอบ user ระหว่างรอ ค้างจริงเฉพาะตอนโค้ด JS เองกิน CPU ยาวใน task เดียว

2. **microtask ต่างจาก macrotask ยังไง และมีผลอะไรกับ render?** → หลังแต่ละ macrotask จบ event loop ต้องเคลียร์ microtask queue จนหมดก่อนไปต่อ render จึงแทรกได้ระหว่าง macrotask แต่แทรกกลาง microtask chain ไม่ได้ — microtask วนไม่จบ = starvation หน้าค้างทั้ง render และ input

3. **await หยุดอะไร ไม่หยุดอะไร?** → หยุด (suspend) เฉพาะ async function ตัวนั้น คืน control ให้ event loop ทันที ไม่ block thread — โค้ดหลัง await กลับมารันเป็น microtask เมื่อ promise settle ดังนั้น await ในฟังก์ชันหนึ่งไม่ทำให้ UI ค้าง

4. **Promise.all ต่างจาก allSettled ยังไง เลือกใช้เมื่อไหร่?** → all เป็น fail-fast — พังตัวเดียว reject ทั้งก้อน เหมาะกับข้อมูลที่ต้องครบชุด; allSettled รอครบทุกตัวไม่ว่าดีร้าย เหมาะกับงานอิสระที่อยาก handle ผลรายตัว และต้องเสริมว่า all ไม่ cancel ตัวที่เหลือ ต้องใช้ AbortController เอง

5. **ทำไม `.then` callback ไม่รันทันทีแม้ promise resolved ไปแล้ว?** → spec บังคับให้เข้า microtask queue เสมอ เพื่อการันตีว่า callback เป็น async สม่ำเสมอ ไม่งั้นโค้ดเดียวกันจะ sync บ้าง async บ้างตาม timing แล้ว order ของ side effect คาดเดาไม่ได้

6. **มี long task บล็อกหน้า จะแตกงานยังไงให้ทันสมัย?** → ใช้ `scheduler.yield()` คั่นเป็นช่วง ๆ ให้ input/render แทรก (Chrome/Firefox; Safari ต้อง fallback เป็น setTimeout หรือ polyfill) ถ้างานหนัก CPU จริงจังย้ายไป Web Worker ไปเลย เพราะการแตกงานแค่แบ่งคิว ไม่ได้ลดเวลารวม

## สรุปท้ายบท

- JavaScript ใน browser อยู่รอดได้เพราะรู้จักผลักงานบางชนิดออกไปนอก main thread แล้วรับผลกลับผ่านคิว ไม่ใช่เพราะมันรันทุกอย่างพร้อมกันบน thread เดียว
- event loop จะเข้าใจได้จริงก็ต่อเมื่อแยก call stack, Web APIs, macrotask, microtask และ render step ออกจากกันชัด ๆ
- `Promise`, `async/await` และ combinator ต่าง ๆ เป็นเพียงรูปแบบที่สร้างงานเข้า queue ต่างกัน ไม่ได้เปลี่ยนกติกาพื้นฐานของ runtime
- ปัญหา async ส่วนใหญ่ใน frontend เช่น หน้าค้าง, race, starvation หรือ timeout handling ล้วนย้อนกลับมาอธิบายได้ด้วย model เดียวกันนี้

## ก่อนไปบทถัดไป

พอเห็นแล้วว่า runtime จัดคิวงานอย่างไร บทถัดไปจะขยับลงไปอีกชั้นว่าเมื่อโค้ดได้รันจริง ภาษา JavaScript ตีความ function, object, closure และค่าต่าง ๆ อย่างไร ซึ่งเป็นต้นน้ำของบั๊กระดับ framework จำนวนมาก
