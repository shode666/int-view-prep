# บท 7 — React Architecture & State Placement: state ก้อนนี้บ้านมันควรอยู่ไหน

> ถ้าบท 6 ตอบว่า "React render ยังไง" บทนี้ตอบคำถามที่แยก senior ออกจาก mid ชัดที่สุดในงานจริง: **"state ก้อนนี้ บ้านมันควรอยู่ไหน"** — โค้ด React ที่พังเรื้อรังเกือบทุก codebase สืบสาวได้ถึงการวาง state ผิดบ้าน แล้วเอาเครื่องมือ (Redux, Context) มาถมทับแทนที่จะย้ายบ้าน

## เข็มทิศก่อนอ่าน

บท 6 ให้กลไกว่าทำไม component ถึง render ส่วนบทนี้ตอบว่าเราควรจัดบ้านของข้อมูลอย่างไรเพื่อไม่สร้าง render เกินจำเป็นตั้งแต่แรก นี่คือจุดเปลี่ยนจาก "เข้าใจ React" ไปสู่ "ออกแบบ React app ได้" เพราะหลายปัญหา performance และ maintainability ไม่ได้เริ่มจาก hook ตัวไหน แต่เริ่มจากการวาง state ผิดระดับ

อ่านบทนี้ด้วยภาพใหญ่ทั้งแอป ไม่ใช่แค่ component เดี่ยว ถ้าคุณเห็นว่า state ก้อนไหนควรอยู่ local, URL, server cache หรือ global client ตั้งแต่ต้น บท 12, 15 และ 17 จะเชื่อมกันแทบอัตโนมัติ

## 7.1 สี่บ้านของ state

### สถานการณ์จริง

Codebase อายุห้าปีที่ผมเคยรับช่วง: Redux store 40 slice — ในนั้นมี `isModalOpen`, ข้อมูล user จาก API ที่ copy มาแช่จน stale, ค่า filter ของหน้า search ที่หายทุกครั้งที่ refresh, และ theme ปนกันหมด ทีมบ่นว่า "Redux มัน boilerplate เยอะ" แต่ปัญหาจริงไม่ใช่เครื่องมือ — คือ **ทุก state ถูกยัดบ้านเดียวกันทั้งที่ธรรมชาติต่างกันสี่แบบ**:

| บ้าน | ธรรมชาติของ state | ตัวอย่าง | เครื่องมือ |
|---|---|---|---|
| **Local** | UI ชั่วคราว ตายพร้อม component ไม่มีใครอื่นสน | modal เปิด/ปิด, ค่า input ระหว่างพิมพ์, hover, accordion | `useState`/`useReducer` |
| **URL** | ผู้ใช้ควร share/bookmark/กด back ได้ | filter, sort, page, tab ที่เลือก, id ของของที่เปิดดู | search params, route params |
| **Server cache** | ข้อมูลของ server เราถือแค่ **สำเนา** ที่มีวันหมดอายุ | user profile, product list, order — ทุกอย่างจาก API | TanStack Query / SWR / framework loader (บท 12) |
| **Global client** | ของ client แท้ๆ ที่หลายหน้าต้องเห็นตรงกัน | auth session, theme, ตะกร้า (ก่อน sync), feature flag | Context / Zustand / Jotai |

ประเด็นที่ต้องพูดในสัมภาษณ์ให้ได้: **global client state ที่แท้จริงเหลือน้อยมาก** — พอแยก server cache ออกไปให้ query library, แยกของ shareable ไปอยู่ URL, ที่เหลือมักมีแค่ auth กับ theme สองสามตัว "Redux ทั้งแอป" ยุคก่อนคือการเอาบ้านหลังเดียวรับผู้อยู่อาศัยสี่ประเภท

### เดินเคสเต็ม: หน้า search ที่มี filter 10 ตัว

โจทย์: หน้า e-commerce search มี keyword, category, ช่วงราคา, แบรนด์ (multi-select), rating, สถานะสต็อก, sort, page, page size, view mode — มือใหม่จะเปิด `useState` สิบตัว หรือหนักกว่านั้นคือตั้ง Redux slice ชื่อ `searchFilters` ทั้งสองทางพังแบบเดียวกัน: ผู้ใช้ filter จนเจอชุดที่ต้องการ **ส่ง link ให้เพื่อน — เพื่อนเห็นหน้าเปล่า**, กด back จากหน้าสินค้า — filter หายหมด, refresh — เริ่มใหม่, ฝ่าย marketing อยากยิง ads เข้าหน้า "โน้ตบุ๊ก < 20,000 เรียงราคา" — ทำไม่ได้เพราะ state อยู่ในหน่วยความจำของ tab นั้น

บ้านที่ถูกของทั้งสิบตัวคือ **URL**:

```tsx
// /search?q=laptop&cat=computer&min=10000&max=20000&brand=asus,lenovo&sort=price_asc&page=2
import { useSearchParams } from 'react-router-dom'; // Next.js ก็มี useSearchParams เช่นกัน

function useSearchFilters() {
  const [params, setParams] = useSearchParams();

  return {
    // อ่าน: URL คือ single source of truth — ไม่มี state ซ้ำซ้อนให้เหลื่อมกัน
    q: params.get('q') ?? '',
    brands: params.get('brand')?.split(',') ?? [],
    page: Number(params.get('page') ?? 1),

    setFilter(key: string, value: string) {
      setParams(prev => {
        const next = new URLSearchParams(prev);
        value ? next.set(key, value) : next.delete(key);
        if (key !== 'page') next.set('page', '1'); // เปลี่ยน filter → รีเซ็ตหน้า (กติกา business อยู่ที่เดียว)
        return next;
      });
    },
  };
}
```

สิ่งที่ได้ฟรีโดยไม่เขียนสักบรรทัด: share/bookmark ได้, back/forward เดินประวัติ filter ได้, refresh ไม่หาย, deep link จาก ads ได้, และ SSR อ่าน filter จาก request ได้เลย ส่วน**ผลลัพธ์การค้นหา**เป็น server cache — query library ใช้ params เหล่านี้เป็น cache key ต่อ (บท 12) จะเห็นว่าทั้งหน้าไม่มี global client state เลยสักตัว

### Flowchart เกณฑ์ตัดสิน

```text
state ก้อนใหม่เกิดขึ้น
 │
 ├─ ข้อมูลนี้ server เป็นเจ้าของ (มาจาก/ต้อง sync กับ API)?
 │   └─ ใช่ → SERVER CACHE (TanStack Query ฯลฯ) — จบ อย่า copy เข้า store
 │
 ├─ ผู้ใช้ควร share link / bookmark / กด back แล้วได้สภาพนี้คืน?
 │   └─ ใช่ → URL
 │
 ├─ มี component นอก subtree นี้ต้องอ่าน/แก้มันไหม?
 │   ├─ ไม่ → LOCAL (useState ใกล้จุดใช้ที่สุด)
 │   └─ ใช่ → พ่อร่วมที่ใกล้ที่สุด (lift up) ยังไหวไหม?
 │        ├─ ไหว → lift + ส่ง props / composition
 │        └─ ไม่ไหว (คนใช้กระจายทั้งแอป) → GLOBAL CLIENT
 │             ├─ เปลี่ยนน้อย (theme, auth) → Context
 │             └─ เปลี่ยนบ่อย/logic เยอะ → Zustand/Jotai (7.4)
```

**แนวตอบ senior:** "ผมเริ่มจากถามว่าใครเป็นเจ้าของข้อมูล — server เป็นเจ้าของก็เป็น server cache, ผู้ใช้ควร share ได้ก็คือ URL, ที่เหลือเริ่ม local แล้ว lift ขึ้นเมื่อจำเป็นจริง global client แท้ๆ ควรเหลือแค่ auth/theme ไม่กี่ตัว — ถ้า store กลางบวม แปลว่ามี state ผิดบ้านปนอยู่"

## 7.2 Prop drilling — composition ก่อน แล้วค่อย context

Prop drilling คืออาการที่ props ต้องเดินผ่าน component กลางทางหลายชั้นที่ไม่ได้ใช้มันเอง — เหมือน**ฝากพัสดุผ่านเพื่อนบ้านห้าคนกว่าจะถึงผู้รับ** ทุกคนกลางทางต้องรู้จักกล่อง (พิมพ์ type, ส่งต่อ, แก้ทุกไฟล์เมื่อกล่องเปลี่ยนรูป) ทั้งที่ไม่ได้เปิดใช้

ท่าแรกที่คนมองข้าม — **composition**: แทนที่จะส่ง "ข้อมูล" ลงไปให้ชั้นล่างประกอบ ให้**ประกอบ component ที่ชั้นบนแล้วส่ง "ตัวสำเร็จ" ลงไปแทน**

```tsx
// ❌ drilling: user เดินผ่าน Layout → Sidebar ที่ไม่ได้ใช้
<Layout user={user}>...</Layout>
function Layout({ user }) { return <Sidebar user={user} />; }
function Sidebar({ user }) { return <UserBadge user={user} />; }

// ✅ composition: ประกอบที่จุดที่มีข้อมูล — Layout/Sidebar กลายเป็น "กรอบ" ที่มีรู (slot)
<Layout sidebar={<Sidebar footer={<UserBadge user={user} />} />}>
  <Dashboard />
</Layout>
function Layout({ sidebar, children }) {
  return <div className="grid">{sidebar}<main>{children}</main></div>;
}
```

ของแถมสองต่อ: ชั้นกลางไม่ผูกกับ shape ของ user อีกเลย และตามบท 6.3 — element ที่ประกอบจากข้างบนเป็น reference เดิมเมื่อชั้นกลาง render จึงลด re-render ฟรีๆ ด้วย เมื่อ composition ไม่พอ (ของที่ต้องอ่านจาก**ทุกที่**จริงๆ) ค่อยขยับไป Context

## 7.3 Context ลึก — ทำไมทุก consumer render และแก้ยังไง

กลไก: `<Ctx.Provider value={...}>` (React 19 เขียน `<Ctx value={...}>` ได้เลย) — เมื่อ `value` เปลี่ยน (เทียบ `Object.is`) **ทุก component ที่ `useContext(Ctx)` จะ re-render ทั้งหมด** ไม่ว่าจะใช้แค่เสี้ยวไหนของ value และ memo กั้นกลางทางก็ช่วยไม่ได้ เพราะ context "ทะลุ" memo โดย design

บั๊กยอดฮิตสองชั้น:

```tsx
function AppProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState('light');

  return (
    // ❌ ชั้นที่ 1: object literal ใหม่ทุก render ของ AppProvider
    //    → value "เปลี่ยน" ทุกครั้งแม้ user/theme เท่าเดิม → consumer ทั้งแอป render
    // ❌ ชั้นที่ 2: ยัด user กับ theme ถุงเดียวกัน
    //    → สลับ theme ทีเดียว component ที่ใช้แค่ user ก็โดนลาก render ไปด้วย
    <AppCtx.Provider value={{ user, setUser, theme, setTheme }}>
      {children}
    </AppCtx.Provider>
  );
}
```

ทางแก้มาตรฐาน:

```tsx
// 1) split context ตามอัตราการเปลี่ยน + แยก state ออกจาก dispatch
//    (setter จาก useState เป็น reference เสถียรอยู่แล้ว — provider ฝั่ง dispatch ไม่เคยทำใคร render)
const UserCtx = createContext<User | null>(null);
const ThemeCtx = createContext<Theme>('light');

// 2) ถ้าจำเป็นต้องเป็น object — memo ตัว value
const value = useMemo(() => ({ user, setUser }), [user]);
```

ข้อสรุปเชิงสถาปัตยกรรม: **Context เป็นกลไก dependency injection (DI — การส่งของจากข้างบนแทนให้ข้างล่าง import เอง เทียบ DI ของเล่ม backend บท 3) ไม่ใช่ state manager** — มันไม่มี selector ให้เลือก subscribe เสี้ยวเดียว เหมาะกับของที่**เปลี่ยนน้อยและอ่านกว้าง**: theme, locale, auth session, instance ของ service ส่วนของที่เปลี่ยนถี่ (ตำแหน่ง cursor, form state, list ใหญ่) อยู่ใน context แล้วจะลาก render ทั้งแอป — นั่นคือจุดที่ store library เข้ามา

## 7.4 เลือก state library ยังไงในปี 2026

| | **Zustand** | **Jotai** | **Redux Toolkit (RTK)** |
|---|---|---|---|
| Model | store เดียว (หรือหลาย) + selector | atom เล็กๆ ประกอบกัน (bottom-up) | store กลาง + slice/reducer/action |
| Re-render | เฉพาะ component ที่ selector ชี้ค่าเปลี่ยน | เฉพาะคนที่ใช้ atom นั้น | เฉพาะที่ useSelector ค่าเปลี่ยน |
| Boilerplate | ต่ำมาก (~เขียน hook หนึ่งตัว) | ต่ำ | ปานกลาง (RTK ลดจาก Redux ดิบมากแล้ว) |
| เด่น | เรียบ, bundle ~1KB, ใช้นอก component ได้ | derived state ซับซ้อน (form builder, กราฟ dependency) | วินัยทีมใหญ่, DevTools time-travel, RTK Query |
| ระวัง | อิสระสูง — ทีมใหญ่ต้องตั้ง convention เอง | คิดแบบ atom ต้องปรับหัว, tree ของ atom โตแล้ว trace ยาก | น้ำหนักเยอะสุด, พิธีกรรมเยอะสุด |

ธรรมเนียมตลาดปัจจุบัน (สำรวจ/ข้อมูลการใช้งานช่วง 2025–2026): **Zustand กลายเป็นคำตอบ default ของโปรเจกต์ใหม่** — สัดส่วนการใช้พุ่งจาก ~28% เป็นราวครึ่งหนึ่งของ React dev ภายในสองปี, Redux/RTK อยู่ตัวถึงถดถอย (ยังครอง codebase องค์กรเดิมจำนวนมาก — ต้องอ่านเป็น), Jotai โตต่อเนื่องในงานสาย derived state ราว 1 ใน 5 ทิศทางรวมชัด: ตลาดย้ายจาก "store กลางพิธีกรรมครบ" ไปหา "เครื่องมือเล็กที่เกิดหลังแยก server state ออกไปแล้ว"

```ts
// Zustand ครบใน ~10 บรรทัด — เทียบ boilerplate กับ slice ของ RTK เองได้เลย
import { create } from 'zustand';

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
};
export const useCart = create<CartState>((set) => ({
  items: [],
  add: (item) => set((s) => ({ items: [...s.items, item] })),
}));

// ใช้: const items = useCart((s) => s.items);  ← selector = subscribe เฉพาะเสี้ยวนี้
```

**แนวตอบ senior:** "ผมเลือกตามที่เหลือหลังแยกบ้าน state แล้ว — ถ้า global client แท้ๆ เหลือนิดเดียวและเปลี่ยนน้อย Context พอ, เกินนั้น default ปี 2026 คือ Zustand เพราะ selector คุม re-render ได้และแทบไม่มี boilerplate, Jotai เมื่อ derived state ซับซ้อนจริง, ส่วน RTK ผมเลือกเมื่อทีมใหญ่ต้องการวินัยกลางหรือ codebase เป็น Redux อยู่แล้ว — migrate ทิ้งไม่คุ้มถ้ามันยังทำงานดี"

## 7.5 Custom hooks — แยก logic ไม่ใช่ย้ายกอง

Custom hook ที่ดีไม่ใช่ "ตัด JSX ไม่ได้เลยยกโค้ดไปซุกไฟล์อื่น" — มันคือการ**แยกความรับผิดชอบหนึ่งเรื่องออกมาเป็นหน่วยที่ตั้งชื่อได้ ทดสอบได้ ใช้ซ้ำได้** หลักเดียวกับ Single Responsibility (เล่ม backend บท 3): หนึ่ง hook หนึ่งเหตุผลในการเปลี่ยน

สัญญาณว่า hook ออกแบบผิด: ชื่อบอกอะไรไม่ได้ (`useHomePageLogic` — ยัดทุกอย่างของหน้านั้น = ย้าย god component ไปเป็น god hook), return 15 ค่า, รับ boolean flag มาสลับพฤติกรรมสองโหมด (นั่นคือสอง hook ที่ถูกจับมัดรวม)

```tsx
// ✅ หนึ่ง hook หนึ่งเรื่อง — ประกอบกันที่ component
function useDebouncedValue<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);       // cleanup สมมาตรตามบท 6.6
  }, [value, ms]);
  return debounced;
}

function SearchPage() {
  const { q, setFilter } = useSearchFilters();   // เรื่อง: sync filter กับ URL (7.1)
  const debouncedQ = useDebouncedValue(q);       // เรื่อง: จังหวะเวลา
  const results = useProducts(debouncedQ);       // เรื่อง: server cache (บท 12)
  // component เหลือหน้าที่เดียว: ประกอบ + render — อ่านเหมือนสารบัญ
}
```

ผลพลอยได้เรื่อง test: hook เล็กที่ contract ชัด ทดสอบด้วย `renderHook` ได้ตรงๆ ไม่ต้อง mount ทั้งหน้า (บท 15) — testability เป็น **ตัวชี้วัดย้อนกลับ** ของ design: hook ที่ mock ยากเพราะมันทำหลายเรื่อง

## 7.6 Component patterns ที่ยังใช้จริง

### Compound components — ตัวอย่างเต็ม: Tabs

โจทย์: สร้าง `<Tabs>` ให้ทีมอื่นใช้ ถ้าออกแบบเป็น prop ก้อนเดียว (`<Tabs items={[{label, content, icon?, disabled?...}]}/>`) ทุก requirement ใหม่ = เพิ่ม prop = API บวมไม่รู้จบ ท่า compound components คือ**แตกเป็นชิ้นที่ผู้ใช้ประกอบเองใน JSX แต่คุยกันเองผ่าน context ภายใน** — เหมือน `<select>`/`<option>` ของ HTML: สองแท็กแยกกันแต่รู้ใจกัน

```tsx
type TabsCtxType = { active: string; setActive: (id: string) => void };
const TabsCtx = createContext<TabsCtxType | null>(null);

export function Tabs({ defaultTab, children }: { defaultTab: string; children: React.ReactNode }) {
  const [active, setActive] = useState(defaultTab);
  const value = useMemo(() => ({ active, setActive }), [active]); // กัน object ใหม่ทุก render (7.3)
  return <TabsCtx.Provider value={value}>{children}</TabsCtx.Provider>;
}

function useTabsCtx() {
  const ctx = useContext(TabsCtx);
  if (!ctx) throw new Error('ต้องใช้ภายใน <Tabs>'); // fail fast — ประกอบผิดรู้ตั้งแต่ dev
  return ctx;
}

Tabs.Trigger = function Trigger({ id, children }: { id: string; children: React.ReactNode }) {
  const { active, setActive } = useTabsCtx();
  return (
    <button role="tab" aria-selected={active === id} onClick={() => setActive(id)}>
      {children}
    </button>
  );
};

Tabs.Panel = function Panel({ id, children }: { id: string; children: React.ReactNode }) {
  const { active } = useTabsCtx();
  return active === id ? <div role="tabpanel">{children}</div> : null;
};

// ผู้ใช้ประกอบอิสระ — แทรก badge, จัด layout, เรียงยังไงก็ได้ โดย Tabs ไม่ต้องรู้จักสักอย่าง:
<Tabs defaultTab="spec">
  <nav>
    <Tabs.Trigger id="spec">สเปก</Tabs.Trigger>
    <Tabs.Trigger id="review">รีวิว <Badge count={12} /></Tabs.Trigger>
  </nav>
  <Tabs.Panel id="spec"><SpecSheet /></Tabs.Panel>
  <Tabs.Panel id="review"><Reviews /></Tabs.Panel>
</Tabs>
```

นี่คือ pattern เบื้องหลัง library ที่ครองตลาด design system ปัจจุบัน (Radix UI, Headless UI, React Aria) — trade-off คือผู้ใช้ประกอบผิดได้ จึงต้องมี guard แบบ `useTabsCtx` ข้างบน

### Pattern อื่น — ตอบแบบ nuance

- **Container/Presentational** (แยก component "หาข้อมูล" กับ "แสดงผล") — ในฐานะ*กฎแข็ง*มันตายแล้วตั้งแต่มี hooks: custom hook ทำหน้าที่แยก logic ได้ดีกว่า แต่*แก่นความคิด*ยังจริงอยู่: component ที่รับ props ล้วนๆ ไม่รู้จัก data source นั้น test ง่าย, ลง Storybook ง่าย, ใช้ซ้ำได้ — เพียงแต่เส้นแบ่งย้ายจาก "สอง component" เป็น "hook กับ component"
- **HOC (Higher-Order Component — function รับ component คืน component ที่ห่อความสามารถเพิ่ม)** — เหลือใน legacy code และเคสห่อแบบ declarative ที่ hook ทำไม่ได้ เช่น error boundary wrapper, `React.memo` เองก็คือ HOC — เขียนใหม่ไม่ควรเริ่มจาก HOC
- **Render props** (ส่ง function เป็น children ให้ component เรียกพร้อมข้อมูล) — จำเป็นเมื่อ "ผู้ให้" ต้องคุมจังหวะ render ของ "ผู้รับ" เช่น virtualization (`rowRenderer` ของ list ใหญ่ — บท 13) นอกนั้น custom hook แทนได้เกือบหมด

## 7.7 Forms — controlled vs uncontrolled, react-hook-form และ React 19 actions

**Controlled**: ค่า input อยู่ใน React state (`value` + `onChange`) — ทุก keystroke = setState = render ตามกติกาบท 6.3 ได้ความสามารถ "รู้ค่าและบังคับค่าได้ทุกขณะ" (validate สด, ปุ่ม disable ตามเงื่อนไข, input ที่ format ตัวเอง) แลกกับ render ถี่ **Uncontrolled**: ค่าอยู่ใน DOM (browser เก็บเองเหมือน form HTML ธรรมดา) React ไปอ่านตอนต้องใช้ผ่าน ref — ไม่ render เลยระหว่างพิมพ์ แต่ react กับค่าแบบ realtime ยาก

**react-hook-form (RHF)** ชนะตลาดเพราะเลือกข้างถูก: ฟอร์ม 30 ช่องแบบ controlled ที่ state รวมอยู่บนพ่อ = พิมพ์หนึ่งตัว render ทั้ง 30 ช่อง RHF ใช้ **uncontrolled + ref เป็นฐาน** (register แต่ละ input เข้า DOM ตรงๆ) แล้ว subscribe เฉพาะจุดที่ขอดู (`formState`, `watch`) — ได้ทั้ง performance ของ uncontrolled และ validation/dirty tracking แบบที่ controlled เคยผูกขาด บวก schema validation ผ่าน zod (บท 3) ที่ resolver เดียวจบ

**React 19 form actions เปลี่ยนภาพยังไง:** ส่ง async function เข้า `<form action={fn}>` ได้ตรงๆ พร้อมตระกูล hook ใหม่ — `useActionState` (ผูก state ผลลัพธ์/error ของ action กับ form), `useFormStatus` (อ่านสถานะ pending จากในลูก), `useOptimistic` (โชว์ค่าใหม่ก่อน server ยืนยัน) และใน framework ที่มี Server Actions ฟอร์มทำงานได้แม้ JavaScript ยังไม่โหลด (progressive enhancement) — ภาพตลาดปี 2026 จึงแบ่งงานกัน ไม่ใช่ฝ่ายใดแทนฝ่ายใด: **ฟอร์ม submit-แล้ว-จบ** (login, contact, ฟอร์มสั้น) ใช้ form action + validate ฝั่ง server ตรงๆ ได้เลย ส่วน**ฟอร์มหนัก client interaction** (multi-step, validate สดข้ามช่อง, dynamic field array) ยังเป็นแดนของ RHF — และประกบกันได้: RHF คุมประสบการณ์ฝั่ง client แล้ว submit ผ่าน action ให้ server validate ซ้ำ (กฎเหล็กจากเล่ม backend: client validation คือ UX, server validation คือ security — บท 16)

## 7.8 Error boundary — ทำไมต้อง class และวางตรงไหน

Error boundary คือ component ที่ดัก error ตอน render ของ subtree แล้วแสดง fallback แทนที่จะปล่อย**ทั้งแอปขาวโพลน** (React unmount ทั้ง tree เมื่อ error หลุดถึงราก) — เหตุที่ยังต้องเป็น class component: lifecycle `getDerivedStateFromError`/`componentDidCatch` ไม่มี hook เทียบเท่า (ถึงปัจจุบัน React 19 ก็ยังไม่มี) ทางปฏิบัติไม่มีใครเขียนเอง — ใช้ `react-error-boundary` ซึ่งห่อ class ไว้ให้พร้อม `onReset`/`resetKeys`

```tsx
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary
  fallbackRender={({ error, resetErrorBoundary }) => (
    <WidgetError onRetry={resetErrorBoundary} />   // ให้ผู้ใช้ลองใหม่ ไม่ใช่ทางตัน
  )}
  onError={(err, info) => reportToSentry(err, info)} // observability — เล่ม backend บท 20
>
  <RevenueChart />
</ErrorBoundary>
```

ข้อจำกัดที่โดนถามบ่อย: มันจับเฉพาะ error ตอน **render/lifecycle** — ไม่จับ error ใน event handler (ใช้ try/catch เอง), async/promise rejection, และ SSR การวางตำแหน่งคือการตัดสินใจ **blast radius** เหมือน bulkhead ของ microservice (เล่ม backend บท 10): ชั้นนอกสุดหนึ่งตัวกันแอปขาว + ครอบเป็นราย widget/route ที่พังอิสระได้ — chart คำนวณพลาดไม่ควรพาตะกร้าสินค้าดับไปด้วย และคู่กับ `<Suspense>` เป็นแพ็กเกจ: Suspense รับ "ยังไม่มา" error boundary รับ "มาแล้วแต่พัง"

## คำถามสัมภาษณ์ที่ต้องตอบได้

1. **"จะตัดสินใจยังไงว่า state ก้อนหนึ่งควรอยู่ที่ไหน?"**
   → ไล่ตามเจ้าของ: server เป็นเจ้าของ → server cache (query library), ควร share/back ได้ → URL, ที่เหลือเริ่ม local แล้ว lift เมื่อจำเป็น, global client แท้ๆ (auth/theme) เหลือน้อยมาก — store กลางที่บวมคือกลิ่นของ state ผิดบ้าน

2. **"filter/sort/page ของหน้า list ควรเก็บที่ไหน เพราะอะไร?"**
   → URL — ได้ share/bookmark/back/refresh/deep link/SSR ฟรีทั้งหมด และกลายเป็น cache key ของ server state ต่อได้; เก็บใน useState หรือ store คือการโยนความสามารถเหล่านี้ทิ้งโดยไม่ได้อะไรแลกมา

3. **"Context ทำให้ re-render ยังไง แก้ยังไง และเมื่อไหร่ควรเลิกใช้ Context?"**
   → value เปลี่ยน (Object.is) → ทุก consumer render ทะลุ memo; แก้ด้วย split context ตามอัตราการเปลี่ยน + แยก state/dispatch + useMemo ตัว value; ถ้าข้อมูลเปลี่ยนถี่หรืออยากได้ selector — นั่นคืองานของ store (Zustand/Jotai) เพราะ Context เป็น DI ไม่ใช่ state manager

4. **"แก้ prop drilling ยังไงโดยไม่พึ่ง Context?"**
   → composition: ประกอบ component ที่ชั้นที่มีข้อมูลแล้วส่งเป็น children/slot ลงไป — ชั้นกลางไม่ต้องรู้จัก props นั้น แถมลด re-render เพราะ element จากข้างบนเป็น reference เดิม; Context เป็นท่าถัดไปเมื่อผู้ใช้ข้อมูลกระจายจริง

5. **"ทำไม react-hook-form ถึง performant กว่าฟอร์ม controlled ปกติ และ React 19 เปลี่ยนภาพนี้ไหม?"**
   → RHF ใช้ uncontrolled + ref — ค่าอยู่ใน DOM ไม่ trigger render ทุก keystroke แล้ว subscribe เฉพาะจุดที่ขอดู; React 19 form actions (useActionState/useFormStatus/useOptimistic) ครองฟอร์ม submit-จบ + progressive enhancement แต่ฟอร์มหนัก client interaction ยังใช้ RHF — และใช้ร่วมกันได้

6. **"Error boundary จับอะไรไม่ได้บ้าง แล้ววางไว้ตรงไหนดี?"**
   → ไม่จับ event handler, async, SSR — จับเฉพาะ render/lifecycle; วางแบบ blast radius: ชั้น root กันจอขาว + รอบ widget/route ที่ควรพังอิสระ และมักประกบกับ Suspense — ตัวหนึ่งรับ loading อีกตัวรับ error

## สรุปท้ายบท

- ปัญหา React app ระยะยาวมักเริ่มจากการวาง state ผิดบ้าน มากกว่าจะเริ่มจากการเลือก library ผิดตัว
- การแยก local, URL, server cache และ global client state ออกจากกันชัด ช่วยลดทั้ง bug และ render ที่ไม่จำเป็น
- architecture ที่ดีคือการทำให้ข้อมูลมีเจ้าของชัด มีทิศทางไหลชัด และไม่ต้อง sync ซ้ำหลายก้อนด้วย effect
- ถ้าวาง state ดีตั้งแต่ต้น เรื่อง testing, performance และ system design จะง่ายขึ้นพร้อมกัน

## ก่อนไปบทถัดไป

จากโลก React เราจะขยับไป Angular โดยเริ่มจาก mental model ของ framework ก่อน เพื่อให้เห็นว่าปัญหาเดียวกันเรื่อง component, dependency และ lifecycle ถูกแก้อีกแบบหนึ่งอย่างไร
