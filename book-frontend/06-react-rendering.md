# บท 6 — React Rendering Model: ทำไม component ถึง re-render ทั้งที่ props ไม่เปลี่ยน

> ครึ่งหนึ่งของคำถามสัมภาษณ์ React senior วนอยู่กับคำถามเดียว: **"อะไรทำให้ component render และมันแพงตรงไหน"** — คนที่ตอบผิดมักไม่ได้จำผิด แต่ถือ mental model ผิดมาตั้งแต่ต้น บทนี้รื้อ model นั้นใหม่ทีละชั้น

## เข็มทิศก่อนอ่าน

หกบทแรกของเล่มเริ่มรวมกันตรงนี้พอดี: event loop จากบท 1, closure จากบท 2, type/modeling จากบท 3 และการวาดจอจากบท 4 จะถูก React ครอบอีกชั้นหนึ่งจนหลายคนลืมว่าใต้ framework ยังเป็น browser และ JavaScript ตัวเดิมอยู่ บทนี้จึงมีหน้าที่ทำให้ mental model กลับมาตรงก่อนจะไปคุยเรื่อง architecture ในบท 7

ระหว่างอ่านให้แยกคำว่า render, commit, re-render และ DOM update ออกจากกันให้ชัด ถ้าคำสี่คำนี้ปนกันเมื่อไร การตัดสินใจเรื่อง memo, state placement และ performance optimization จะเริ่มมั่วทันที

## 6.1 Mental model แกน: UI = f(state) และสองเฟสของการ render

### สถานการณ์จริง

ทีมหนึ่งเจอว่าแค่พิมพ์ตัวอักษรเดียวใน search box หน้าทั้งหน้ากระตุก มือใหม่วินิจฉัยว่า "DOM มัน update เยอะ" แล้วไปไล่ optimize DOM — แต่เปิด profiler จริงพบว่า DOM แทบไม่ถูกแตะเลย เวลาหมดไปกับการ **เรียก function component ซ้ำนับร้อยตัว** ทุก keystroke การเข้าใจว่า "render" กับ "DOM update" เป็นคนละเรื่องคือกุญแจดอกแรก

### กลไก

React มองว่า UI คือผลลัพธ์ของฟังก์ชัน: เอา state ปัจจุบันใส่เข้าไป ได้คำอธิบายหน้าจอออกมา (declarative) เราไม่เคยสั่ง "เพิ่ม row นี้เข้า table" — เราแค่บอกว่า "ด้วยข้อมูลชุดนี้ table ควรหน้าตาแบบนี้" แล้ว React หาทางเปลี่ยน DOM ให้ตรงเอง (เทียบกับ jQuery ยุคก่อนที่เป็น imperative — สั่งแก้ทีละจุดเอง แล้ว state กับจอค่อยๆ เหลื่อมกันจนเกิดบั๊กประเภท "จอไม่ตรงกับข้อมูล")

การทำงานแบ่งเป็น **สองเฟส**:

1. **Render phase** — React เรียก function component ของเราเพื่อคำนวณว่า UI *ควร* เป็นอะไร ผลลัพธ์คือ tree ของ object ธรรมดา (React element) เฟสนี้**ไม่แตะ DOM เลย** ต้องเป็น pure function: input เดิมได้ output เดิม ห้ามมี side effect เพราะ React (โหมด concurrent) มีสิทธิ์เรียกเฟสนี้ซ้ำ, ทิ้งผลลัพธ์กลางทาง, หรือพักไว้ก่อนก็ได้
2. **Commit phase** — React เอาผลเทียบ (diff) จาก render phase ไปแก้ DOM จริงเฉพาะจุดที่ต่าง จากนั้นค่อยรัน effect

Analogy: render phase คือ**สถาปนิกเขียนแบบใหม่ทั้งแปลน** (ถูกมาก แค่กระดาษ) commit phase คือ**ช่างก่อสร้างเทียบแบบเก่า-ใหม่แล้วทุบเฉพาะผนังที่เปลี่ยน** (แพง แต่ทำน้อยจุด) — บั๊ก performance ส่วนใหญ่ของ React ไม่ได้อยู่ที่ช่าง แต่อยู่ที่การจ้างสถาปนิกเขียนแบบทั้งตึกใหม่ทุกครั้งที่ย้ายแจกันหนึ่งใบ

```tsx
function Price({ amount }: { amount: number }) {
  console.log('render');            // รันทุกครั้งที่ render phase — ไม่ได้แปลว่า DOM เปลี่ยน
  return <span>{amount} บาท</span>; // ถ้า amount เท่าเดิม commit phase จะไม่แตะ DOM เลย
}
```

**แนวตอบ senior:** "render ใน React คือการเรียก function เพื่อคำนวณ UI ที่ควรเป็น ไม่ใช่การแก้ DOM — DOM ถูกแก้ใน commit phase เฉพาะจุดที่ diff แล้วต่างจริง ดังนั้น component ที่ render บ่อยไม่ได้แปลว่า DOM ทำงานหนัก แต่ถ้า render phase เองแพง (tree ใหญ่, คำนวณเยอะ) ก็กระตุกได้โดย DOM ไม่ขยับสักนิด"

## 6.2 Reconciliation และเรื่อง key — ทำไม key={index} คือระเบิดเวลา

Reconciliation คือขั้นตอนที่ React เทียบ element tree รอบใหม่กับ tree รอบก่อน เพื่อตัดสินว่า DOM node ไหน "ตัวเดิม แก้ค่าได้" กับตัวไหน "คนละตัว ทุบสร้างใหม่" กติกาหลักสั้นมาก:

- **type ต่างกัน** (`<div>` → `<span>`, `<UserCard>` → `<AdminCard>`) → ทิ้ง subtree เดิมทั้งก้อน สร้างใหม่ **state ข้างในหายหมด**
- **type เดิม** → เก็บ DOM node กับ state ไว้ update เฉพาะ attribute/props ที่ต่าง
- **ลูกที่เป็น list** → ใช้ `key` จับคู่ว่า element รอบใหม่ตัวไหนคือตัวเดิมของรอบก่อน

### บั๊กจริงจาก key={index}

```tsx
// รายชื่อแขก แต่ละแถวมี input ให้กรอกอาหารที่แพ้ (state อยู่ใน DOM/local state ของแถว)
{guests.map((g, i) => (
  <GuestRow key={i} guest={g} />   // ← ระเบิดเวลา
))}
```

ผู้ใช้กรอก "แพ้กุ้ง" ให้แขกแถวแรก แล้วกดลบแขกแถวแรกออก — สิ่งที่เกิด: แขกคนที่สองเลื่อนขึ้นมาเป็น index 0 React เห็น `key=0` เหมือนเดิม type เดิม → สรุปว่า "แถวเดิม แค่ props เปลี่ยน" → **เก็บ state/input เดิมไว้** ผลคือแขกคนที่สองได้ป้าย "แพ้กุ้ง" ติดมาด้วยทั้งที่ไม่เคยกรอก ถ้านี่คือระบบโรงพยาบาลแทนงานแต่ง ความเสียหายไม่ใช่เรื่องตลก

key ที่ถูกคือ **identity ที่เสถียรของข้อมูล** (`key={g.id}`) — เมื่อลบแขกคนแรก React เห็นว่า key นั้นหายไปจริง จึง unmount แถวนั้นพร้อม state ของมัน key={index} ปลอดภัยเฉพาะ list ที่ **ไม่ reorder/insert/delete และแถวไม่มี state** เท่านั้น และห้ามใช้ `Math.random()` เป็น key เด็ดขาด — นั่นคือการบอก React ว่า "ทุกแถวเป็นคนใหม่ทุกรอบ" ได้ unmount/remount ทั้ง list ทุก render

เกร็ดที่ใช้ประโยชน์ได้: การ**เปลี่ยน key โดยตั้งใจ**คือวิธี reset state ของ component ทั้งก้อน (`<ProfileForm key={userId} />` — เปลี่ยน user แล้วฟอร์มเคลียร์เอง ไม่ต้องเขียน effect ล้างค่า)

### แล้ว Virtual DOM ยังเป็นจุดขายไหม

คำตอบแบบมี nuance: **Virtual DOM คือ implementation detail ไม่ใช่ feature** มันเป็นวิธีที่ React เลือกใช้เพื่อให้ programming model แบบ "เขียนใหม่ทั้งแปลนทุกรอบ" มีราคาที่จ่ายไหว ไม่ใช่ของวิเศษที่ "เร็วกว่า DOM จริง" (มันคือ overhead เพิ่มด้วยซ้ำ — Svelte compile ทิ้ง, Vue/SolidJS/Angular ยุคใหม่ใช้ fine-grained reactivity/signals ที่รู้เจาะจงว่าอะไรเปลี่ยน ไม่ต้อง diff ทั้ง tree) สิ่งที่ React ขายจริงคือ declarative model + ecosystem — และ React Compiler (หัวข้อ 6.4) คือการยอมรับกลายๆ ว่า diff ทั้ง subtree โดยไม่ช่วยอะไรเลยนั้นแพงเกินไป จึงให้ compiler ช่วย memo อัตโนมัติ

**แนวตอบ senior:** "key คือ identity ที่ React ใช้จับคู่ element ข้าม render — key={index} ทำให้ identity ผูกกับตำแหน่งแทนตัวข้อมูล พอ list ถูก reorder หรือลบ state จะไปเกาะผิดตัว ส่วน Virtual DOM ผมมองเป็น implementation detail: มันไม่ได้เร็วกว่า DOM แต่ทำให้ declarative model จ่ายไหว framework อื่นแก้โจทย์เดียวกันด้วย compiler หรือ signals"

## 6.3 กติกา re-render ที่แท้จริง — ไขความเข้าใจผิดอันดับหนึ่ง

ความเชื่อผิดที่แพร่ที่สุดในตลาด: *"component จะ re-render เมื่อ props เปลี่ยน"* — **ผิด** กติกาจริงมีข้อเดียว:

> **เมื่อ state ของ component ไหนเปลี่ยน component นั้นจะ render ใหม่ พร้อมลูกหลานทั้ง subtree — โดยไม่สนว่า props ของลูกจะเปลี่ยนหรือไม่**

props ไม่ใช่ trigger — props เป็นแค่ข้อมูลที่ไหลผ่านตอนพ่อ render ลูก render เพราะ**พ่อ render** ไม่ใช่เพราะ props มันเปลี่ยน (ยกเว้นเจอ `React.memo` ซึ่งเป็นการ opt-out — หัวข้อถัดไป) และ context consumer จะ render เมื่อ value ของ context เปลี่ยน (บท 7)

```tsx
function Page() {
  const [query, setQuery] = useState('');
  return (
    <>
      <SearchBox value={query} onChange={setQuery} />
      <ExpensiveChart data={STATIC_DATA} />
      {/* ทุก keystroke: Page render → ExpensiveChart render ด้วย
          ทั้งที่ props ของมันคือค่าคงที่ก้อนเดิมเป๊ะ */}
    </>
  );
}
```

Analogy: เหมือน**ประชุมทั้งแผนกเพราะหัวหน้าแก้เอกสารหนึ่งบรรทัด** — ทุกคนต้องมานั่งฟัง (render) แม้เนื้องานตัวเอง (props) ไม่เปลี่ยนเลย ส่วนใหญ่ประชุมสั้นจึงไม่มีใครบ่น แต่ถ้ามีคนที่ต้อง "เตรียมสไลด์ 500 หน้า" ทุกครั้งที่ถูกเรียกประชุม (component แพง) ถึงจะเริ่มเจ็บ

วิธีเลี่ยงที่**ไม่ต้องใช้ memo เลย** — จัดโครงสร้างให้ state อยู่ใกล้จุดใช้ที่สุด (colocate) หรือส่ง subtree แพงเข้ามาเป็น `children`:

```tsx
function Layout({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('');
  return (
    <>
      <SearchBox value={query} onChange={setQuery} />
      {children}
      {/* children ถูกสร้างโดย "พ่อของ Layout" ซึ่งไม่ได้ render รอบนี้
          → element ก้อนเดิม (reference เดิม) → React ข้ามได้เลย */}
    </>
  );
}
// การใช้: <Layout><ExpensiveChart data={STATIC_DATA} /></Layout>
```

**แนวตอบ senior:** "trigger ของ re-render คือ state เปลี่ยน แล้วลาม subtree ลงไปทั้งแถบ — props ไม่ใช่เงื่อนไข มันแค่ไหลตามพ่อ ก่อนจะคว้า memo ผมจะดูก่อนว่าย้าย state ลงใกล้จุดใช้ หรือดัน subtree แพงออกไปเป็น children ได้ไหม เพราะสองท่านั้นแก้ที่โครงสร้าง ไม่เพิ่ม maintenance cost"

## 6.4 React.memo, useMemo, useCallback — และ React Compiler เปลี่ยนเกมยังไง

`React.memo(Component)` สร้าง component ที่ **เทียบ props เก่า-ใหม่แบบ shallow (Object.is รายตัว)** ก่อน — เท่ากันหมดก็ข้าม render ไปเลย นี่คือสวิตช์ที่เปลี่ยนกติกาจาก "พ่อ render ฉัน render" เป็น "props เปลี่ยนจริงค่อย render"

### ทำไม memo ถึงพังบ่อย

เพราะการเทียบเป็น **reference equality** และ JavaScript สร้าง object/array/function literal เป็น**ก้อนใหม่ทุกครั้ง**ที่ function รัน:

```tsx
const List = React.memo(ListImpl);

function Parent() {
  const [q, setQ] = useState('');
  return (
    <List
      style={{ margin: 8 }}          // object ใหม่ทุก render → memo มองว่า "เปลี่ยน"
      onSelect={(id) => select(id)}  // function ใหม่ทุก render → memo พังเช่นกัน
    />
  ); // ผล: จ่ายค่า memo (เทียบ props ทุกรอบ) แต่ไม่เคยได้ของ
}
```

ทางแก้คือทำ reference ให้เสถียร: `useMemo(() => value, deps)` จำ**ค่า**ข้าม render, `useCallback(fn, deps)` จำ**ฟังก์ชัน** (มันคือ `useMemo(() => fn, deps)` นั่นเอง) — สามตัวนี้จึงเป็นแพ็กเกจเดียวกัน: **memo ที่ปลายทาง ต้องมี useMemo/useCallback คุมต้นทาง ไม่งั้นเสียเปล่า**

### เกณฑ์ว่าเมื่อไหร่คุ้ม เมื่อไหร่เป็นพิธีกรรม

| ใช้ | คุ้มเมื่อ | เป็นพิธีกรรม/โทษเมื่อ |
|---|---|---|
| `React.memo` | component render แพงจริง (list ใหญ่, chart) และพ่อ render บ่อยด้วยเหตุที่ไม่เกี่ยวกับมัน | component เบาๆ — ค่าเทียบ props อาจแพงกว่า render ทิ้ง |
| `useMemo` | คำนวณแพงจริง (sort/filter หลักหมื่นแถว) หรือต้องรักษา reference ให้ memo/deps ปลายทาง | `useMemo(() => a + b, [a, b])` — จำเลขบวกด้วยต้นทุน closure + เทียบ deps |
| `useCallback` | ส่ง function เข้า component ที่ memo แล้ว หรือเข้า deps ของ effect | แปะทุก handler "เผื่อไว้" — อ่านยากขึ้นโดยไม่มีใครได้ประโยชน์ |

หลักตัดสินใจ: **วัดก่อน (React DevTools Profiler) แล้วค่อย memo จุดที่เจ็บจริง** — memoization ทุกตัวมีต้นทุน: หน่วยความจำเก็บค่าเดิม, การเทียบ deps ทุก render, และต้นทุนที่แพงสุดคือ**คนอ่าน**ต้องไล่ deps array ว่าถูกไหม

### React Compiler

React Compiler (stable 1.0 ตั้งแต่ตุลาคม 2025 — ecosystem หลักอย่าง Next.js/Expo/TanStack Start ผนวกเข้า build pipeline ให้เปิดใช้ได้ทันที) คือ build-time compiler ที่วิเคราะห์ code แล้วใส่ memoization ให้อัตโนมัติในระดับละเอียดกว่าที่มือคนทำไหว — เขียน component ตรงๆ ได้ผลเทียบเท่า (มักดีกว่า) การโปรย memo/useMemo/useCallback เอง โดยมีเงื่อนไขว่า code ต้องเคารพ Rules of React (render บริสุทธิ์ ไม่ mutate props/state) ซึ่ง compiler + ESLint plugin ช่วยตรวจให้ ทิศทางตลาดปี 2026: โปรเจกต์ใหม่เปิด compiler แล้วเลิกเขียน manual memo เป็น default แต่**ความเข้าใจกลไกยังจำเป็น** — เพื่ออ่าน codebase เก่า, debug จุดที่ compiler ข้าม (code ที่ผิด rules จะถูก skip ทั้ง component), และตอบสัมภาษณ์

**แนวตอบ senior:** "memo/useMemo/useCallback เป็นแพ็กเกจเดียวกัน — memo เทียบ props แบบ shallow ดังนั้น object/function literal ที่เกิดใหม่ทุก render จะทำให้มันพังเงียบๆ ผมใช้เมื่อ profiler ชี้ว่าแพงจริงเท่านั้น และในโปรเจกต์ที่เปิด React Compiler ได้ ผมปล่อยให้ compiler จัดการแล้วเก็บ manual memo ไว้เป็นข้อยกเว้น"

## 6.5 useState ลึก: batching, functional update, lazy init

```tsx
function Counter() {
  const [n, setN] = useState(0);

  const wrong = () => {
    setN(n + 1); setN(n + 1); setN(n + 1);
    // n ในสาม call นี้คือค่าเดียวกันจาก closure ของ render รอบนี้ (เช่น 0)
    // สามคำสั่ง = setN(1) สามครั้ง → ผลลัพธ์ 1
  };

  const right = () => {
    setN(p => p + 1); setN(p => p + 1); setN(p => p + 1);
    // functional update: React ต่อคิวฟังก์ชัน รันไล่จากค่าล่าสุด → ได้ 3
  };
}
```

สามเรื่องต้องแม่น:

1. **setState ไม่เปลี่ยนค่าทันที** — มัน "ขอ render รอบใหม่" ตัวแปรใน scope ปัจจุบันเป็นค่าเดิมตลอด (มาจาก closure — บท 2) ค่าใหม่มีจริงใน render รอบหน้า
2. **Automatic batching** — React 18+ รวม setState หลาย call ให้ render รอบเดียว ครอบคลุมทุกที่ (event handler, promise, setTimeout) ต่างจาก React 17 ที่ batch เฉพาะใน event handler — จะอ่านค่าหลัง update ทันทีจึงทำไม่ได้ ต้องคิดแบบ "ค่าถัดไป" ผ่าน functional update
3. **Lazy initialization** — `useState(buildHeavyThing())` เรียกฟังก์ชันแพง**ทุก render** แล้วทิ้งผล 99% ของรอบ ให้ส่ง function แทน: `useState(() => buildHeavyThing())` React เรียกครั้งเดียวตอน mount

## 6.6 useEffect ลึก: timing, deps, cleanup, stale closure และทำไมมันไม่ใช่ที่ fetch

`useEffect(fn, deps)` คือการบอก React ว่า "หลัง commit DOM เสร็จแล้ว ช่วย sync ระบบภายนอกกับ state ชุดนี้ให้หน่อย" — คำสำคัญคือ **synchronization กับโลกภายนอก React** (WebSocket, subscription, timer, DOM API ที่ React ไม่คุม) ไม่ใช่ "lifecycle hook เอาไว้ทำอะไรก็ได้หลัง render"

กติกา:

- รัน**หลัง commit** (จอวาดแล้ว) — ต่างจาก `useLayoutEffect` ที่รันหลัง DOM เปลี่ยนแต่**ก่อน** browser paint (ใช้เมื่อต้องวัด layout แล้วแก้ก่อนผู้ใช้เห็น ไม่งั้นภาพกระพริบ)
- deps array: `[]` = รันครั้งเดียวหลัง mount, `[a, b]` = รันเมื่อ a หรือ b เปลี่ยน (เทียบ Object.is), ไม่ใส่ = รันทุก render
- **cleanup function** ที่ return ออกมา จะรัน**ก่อน effect รอบถัดไป**และตอน unmount — คู่ setup/cleanup ต้องสมมาตรเสมอ (subscribe/unsubscribe, addEventListener/remove, setInterval/clear) ใน StrictMode dev React จง mount→unmount→mount ซ้ำเพื่อบังคับให้เราเขียน cleanup ถูก

### กับดัก stale closure — บั๊กคลาสสิก

```tsx
function Ticker() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1);   // ❌ count ถูก "แช่แข็ง" ไว้ที่ 0 จาก closure รอบ mount
    }, 1000);                //    ทุกวินาทีคือ setCount(0 + 1) → ค้างที่ 1 ตลอดกาล
    return () => clearInterval(id);
  }, []);                    // deps ว่าง = effect เห็นโลกเฉพาะ ณ ตอน mount

  // ✅ ทางแก้: setCount(c => c + 1) — ไม่ต้องอ้าง count จาก closure เลย
  //    หรือใส่ [count] ใน deps (interval จะถูกรื้อ-ตั้งใหม่ทุกวินาที — ทำงานถูกแต่เปลือง)
}
```

นี่คือ closure ธรรมดาจากบท 2: effect ที่สร้างตอน mount จับตัวแปรของ render รอบนั้นไว้ — เหมือน**ถ่ายรูปห้องไว้แล้วทำงานกับรูปถ่าย** ห้องจริงเปลี่ยนไปแล้วแต่ในรูปยังเหมือนเดิม ESLint rule `exhaustive-deps` มีไว้จับเคสแบบนี้ **อย่าปิดมันด้วย comment** — ถ้า deps ที่ถูกต้องทำให้ effect รันบ่อยเกิน นั่นคือสัญญาณว่า design ผิด ไม่ใช่ lint ผิด

### ทำไม effect ไม่ใช่ที่ fetch ข้อมูลในยุคนี้

การ fetch ใน `useEffect` แบบดิบมีปัญหาเป็นชุด: race condition (พิมพ์ "ab" แล้ว response ของ "a" มาทีหลัง ทับคำตอบที่ถูก — ต้องเขียน ignore flag/AbortController เอง), ไม่มี cache (กลับมาหน้าเดิม fetch ซ้ำ), network waterfall (ลูก fetch ได้ต่อเมื่อพ่อ render เสร็จ), ไม่มี retry/dedupe แนวทางปี 2026 คือ **server state ใช้เครื่องมือเฉพาะทาง**: TanStack Query / SWR ฝั่ง client, loader ของ framework (Next.js/Remix/TanStack Start), หรือ fetch ใน Server Component ตรงๆ (หัวข้อ 6.8) — รายละเอียดเต็มในบท 12 ส่วน useEffect เก็บไว้ทำหน้าที่จริงของมัน: sync กับระบบ non-React

**แนวตอบ senior:** "ผมมอง useEffect เป็นเครื่องมือ sync กับระบบนอก React ไม่ใช่ lifecycle hook — deps array คือรายการ 'ค่าที่ effect นี้อ่าน' ไม่ใช่ปุ่มตั้งเวลา ถ้าอยากโกง deps เพื่อคุมจังหวะ แปลว่า design ผิดที่ ส่วน data fetching ผมไม่ทำใน effect ดิบแล้ว — ให้ query library หรือ server component จัดการ cache/race/retry"

## 6.7 useRef — กล่อง mutable ที่ไม่ปลุก render

`useRef(init)` คืน object `{ current }` ที่ **identity คงเดิมตลอดชีวิต component** และการแก้ `.current` **ไม่ trigger render** — ใช้สองงาน:

1. **จับ DOM node**: `<input ref={inputRef} />` แล้ว `inputRef.current.focus()` — และตั้งแต่ React 19 **ref ส่งเป็น prop ธรรมดาเข้าฟังก์ชัน component ได้เลย** (`function MyInput({ ref, ...props })`) ไม่ต้องห่อ `forwardRef` แล้ว (API เดิมยังใช้ได้ แต่ถูกวางแผน deprecate)
2. **เก็บค่า mutable ที่ไม่ใช่ข้อมูลแสดงผล**: timer id, ค่า previous, instance ของ library — กติกาแบ่งเส้น: **ค่าไหนโผล่บนจอ → state, ค่าไหนแค่กลไกภายใน → ref** ถ้าเอา ref มาเก็บของที่ต้องแสดงผลจะเจอ "จอไม่ update" เพราะไม่มี render เกิด และห้ามอ่าน/เขียน ref ระหว่าง render phase (มัน impure — compiler จะ skip ให้ด้วย)

## 6.8 Suspense, Server Components, และ hydration

### Suspense ทำงานยังไงจริงๆ

กลไกภายใน: component ที่ "ยังไม่พร้อม" จะ **throw promise** ออกมากลาง render — React จับได้ (เหมือน try/catch) ก็เดินขึ้น tree หา `<Suspense fallback={...}>` ที่ใกล้ที่สุด แสดง fallback ไปก่อน แล้ว subscribe promise นั้น พอ resolve ค่อย render ใหม่ ใน React 19 มี hook `use(promise)` เป็นทางการสำหรับอ่านค่า promise กลาง render ให้ Suspense จัดการรอแทนเรา (แต่ promise ควรมาจาก cache/library — สร้าง promise ใหม่ทุก render จะวนไม่จบ) จุดสวยของ design นี้: **การรอกลายเป็น declarative** — ที่ที่ประกาศ loading state แยกจากที่ที่โหลดข้อมูล ประกอบ fallback เป็นชั้นๆ ได้ตามโครง UI ไม่ใช่ if(isLoading) โปรยทั่ว code

### Server Components vs Client Components

React Server Components (RSC) แบ่ง component เป็นสองโลก:

| | Server Component | Client Component |
|---|---|---|
| รันที่ไหน | server เท่านั้น (build time หรือ request time) | server ครั้งแรก (SSR) + browser |
| bundle | **code ไม่ถูกส่งไป browser เลย** | ถูกส่งไป browser |
| ทำอะไรได้ | อ่าน DB/ไฟล์/secret ตรงๆ, async/await ใน body | useState/useEffect, event handler, browser API |
| ทำอะไรไม่ได้ | hooks ที่มี state, onClick, browser API | import server-only code |

`'use client'` ที่หัวไฟล์**ไม่ได้แปลว่า "รันเฉพาะ client"** — มันคือป้ายประกาศ **จุดตัดของ bundle**: จากไฟล์นี้ลงไป (รวมทุกอย่างที่มัน import) เป็นโลก client ที่ต้องส่ง JavaScript ไปให้ browser ค่า props ที่ข้ามพรมแดน server → client ต้อง **serialize ได้** (JSON + ชนิดพิเศษที่ React รองรับ เช่น promise) — ส่ง function, class instance, Date ที่ต้อง method ครบ ข้ามไปไม่ได้ (ข้อยกเว้นเดียวคือ Server Action ที่ประกาศ `'use server'`) ท่าสำคัญที่คนพลาด: server component **ส่งเป็น children เข้า client component ได้** — ดังนั้น "โลก client" ไม่จำเป็นต้องลามทั้ง subtree

Analogy: เหมือน**ครัวร้านอาหารกับโต๊ะลูกค้า** — ครัว (server) มีของครบ ทำอาหารเสร็จเป็นจาน (HTML/RSC payload) ส่งออกมา ลูกค้าไม่เห็นและไม่ต้องแบกเครื่องครัว ส่วนอุปกรณ์ที่ต้อง interact บนโต๊ะ (client component) เท่านั้นที่ต้องยกออกมาวางจริง

### Hydration และ hydration mismatch

Server-Side Rendering (SSR) ส่ง HTML สำเร็จมาให้เห็นเร็ว แต่ HTML นั้น "ตาย" — hydration คือขั้นที่ React ฝั่ง browser render tree ของตัวเองแล้ว**เดินเทียบกับ DOM ที่มีอยู่ เพื่อผูก event handler และ state เข้าไปโดยไม่สร้าง DOM ใหม่** (เหมือนเทน้ำใส่บะหมี่กึ่งสำเร็จรูป — เส้นมีอยู่แล้ว แค่ทำให้กลับมามีชีวิต)

**Hydration mismatch** เกิดเมื่อ HTML จาก server ไม่ตรงกับที่ client render ครั้งแรก — ต้นเหตุยอดฮิต: `new Date()`/`Math.random()` ใน render, code แบบ `typeof window !== 'undefined' ? A : B`, timezone/locale ต่างกันระหว่าง server กับเครื่องผู้ใช้, หรือ browser extension แก้ DOM ผลคือ React เตือนและอาจทิ้ง DOM ก้อนนั้น render ใหม่ทั้งแถบ (เสียทั้ง performance และอาจเห็นจอกระพริบ) ทางแก้มาตรฐาน: ทำให้ render แรกของ client ตรงกับ server เสมอ แล้วค่อยเปลี่ยนเป็นค่าจริงหลัง mount ผ่าน effect (`const [mounted, setMounted] = useState(false)` + `useEffect(() => setMounted(true), [])`) หรือใช้ `suppressHydrationWarning` เฉพาะจุดที่ต่างโดยธรรมชาติจริงๆ เช่น timestamp

**แนวตอบ senior:** "'use client' คือการประกาศพรมแดน bundle ไม่ใช่สถานที่รัน — client component ก็ยังถูก SSR ส่วน hydration คือการที่ React ฝั่ง browser เดินเทียบ DOM จาก server แล้วผูก interactivity เข้าไป mismatch เกิดเมื่อ render แรกสองฝั่งไม่ตรงกัน ซึ่งเกือบทุกเคสคือมีค่า non-deterministic หลุดเข้า render"

## คำถามสัมภาษณ์ที่ต้องตอบได้

1. **"อะไร trigger ให้ component re-render บ้าง?"**
   → state ของตัวเองเปลี่ยน (setState/useReducer), พ่อ render (ลาม subtree โดยไม่สน props), หรือ context ที่ subscribe อยู่เปลี่ยน value — "props เปลี่ยน" ไม่ใช่ trigger ยกเว้นห่อ React.memo ไว้ซึ่งเป็นการ opt-out จากกติกาปกติ

2. **"render กับ commit ต่างกันยังไง และทำไมต้องแยก?"**
   → render phase คำนวณ UI จาก state เป็น pure function ไม่แตะ DOM — แยกไว้เพื่อให้ React ขัดจังหวะ/ทำซ้ำ/ทิ้งได้ (concurrent rendering) commit phase ค่อยเอา diff ไปแก้ DOM จริงจุดที่ต่าง แล้วรัน effect

3. **"ทำไม key={index} อันตราย ยกตัวอย่างบั๊กจริง"**
   → key คือ identity ข้าม render — ใช้ index แล้ว identity ผูกกับตำแหน่ง พอลบ/แทรก/เรียงใหม่ state ของแถว (input, checkbox, focus) จะไปเกาะแถวผิดตัว เช่น ลบแถวแรกแล้วค่าที่กรอกไว้กระโดดไปโผล่ที่คนถัดไป — ใช้ id ที่เสถียรของข้อมูลเสมอ

4. **"useMemo/useCallback ควรใช้เมื่อไหร่ และ React Compiler เปลี่ยนอะไร?"**
   → ใช้เมื่อ (1) คำนวณแพงจริงที่วัดแล้ว (2) ต้องรักษา reference ให้ React.memo หรือ deps ปลายทาง — นอกนั้นเป็นพิธีกรรมที่เพิ่มต้นทุนอ่าน React Compiler (stable แล้ว) ทำ memoization อัตโนมัติตอน build ทำให้โปรเจกต์ใหม่แทบไม่ต้องเขียนมือ แต่ต้องเขียนตาม Rules of React ไม่งั้น compiler ข้าม component นั้น

5. **"เจอ warning hydration mismatch จะไล่ยังไง?"**
   → หาค่า non-deterministic ใน render แรก: Date/random/locale/`typeof window` branch — แก้โดยให้ client render แรกตรงกับ server เป๊ะ แล้วเลื่อนค่าที่ต่างไปเปลี่ยนหลัง mount ด้วย effect; ถ้าต่างโดยธรรมชาติ (เวลา) ใช้ suppressHydrationWarning เฉพาะ node นั้น

6. **"ทำไมไม่ควร fetch ใน useEffect แล้วทางที่ถูกคืออะไร?"**
   → effect ดิบไม่มี cache/dedupe/retry และเปิดช่อง race condition กับ waterfall — server state ควรอยู่กับเครื่องมือเฉพาะ: TanStack Query/SWR, loader ของ framework, หรือ fetch ตรงใน Server Component; useEffect เก็บไว้ sync ระบบ non-React เช่น WebSocket, analytics, DOM API (ลึกต่อในบท 12)

## สรุปท้ายบท

- React render ไม่เท่ากับ DOM update และการแยกสองอย่างนี้ให้ออกคือรากของการ debug performance ฝั่ง React
- re-render เกิดจาก state และ context flow ไม่ใช่แค่เพราะ props เปลี่ยน
- เครื่องมืออย่าง `memo`, `useMemo` และ `useCallback` มีค่าเมื่อใช้เพื่อแก้ต้นทุนจริง ไม่ใช่เป็นพิธีกรรม
- การเข้าใจ render phase, commit phase, effect และ Suspense ทำให้มอง React เป็นระบบ ไม่ใช่ชุด hook แยกชิ้น

## ก่อนไปบทถัดไป

เมื่อเห็นแล้วว่า React ขยับ UI อย่างไร บทถัดไปจะตอบคำถามที่ใช้ตัดสินงานสถาปัตยกรรม React มากที่สุดคือ state แต่ละก้อนควรอยู่ตรงไหน เพื่อไม่ให้ทั้ง performance และความซับซ้อนบานปลาย
