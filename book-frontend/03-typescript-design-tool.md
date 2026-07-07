# บท 3 — TypeScript เป็นเครื่องมือ Design ไม่ใช่แค่ตัวจับ typo

> คน Java มักเข้าใจ TypeScript เร็ว — มี type มี generic มี interface เหมือนกัน — แล้วก็มักใช้มันผิดวิธีด้วยเหตุผลเดียวกัน: เอาไปเขียนแบบ Java บทนี้ปรับมุมมองสองเรื่องใหญ่ — (1) type ของ TS คือ**สัญญาเชิงโครงสร้าง**ที่หายไปตอน runtime และ (2) senior ใช้ type system เป็นเครื่องมือ*ออกแบบ* ให้ compiler บังคับ invariant แทนที่จะหวังพึ่ง discipline ของคน

หมายเหตุเวอร์ชัน: ณ กลางปี 2026 TypeScript อยู่ช่วง 5.9/6.0 และ TS 7 — compiler ที่ port ไปเป็น Go (native) เร็วขึ้นราว 10 เท่าโดยรักษา semantics การตรวจ type เดิม — อยู่ช่วง Release Candidate (กำหนดการอาจเลื่อนได้ ตามธรรมเนียมโปรเจกต์ขนาดนี้) ตัว**ภาษา**แทบไม่เปลี่ยน สิ่งที่เขียนในบทนี้ใช้ได้ยาว

## เข็มทิศก่อนอ่าน

สองบทแรกให้รากเรื่อง runtime กับกลไกภาษา ส่วนบทนี้คือชั้นที่ทำให้เรา "บังคับความคิดให้ชัด" ก่อนปล่อยโค้ดไปเจอ runtime จริง TypeScript ไม่ได้ทำให้ JavaScript ปลอดภัยขึ้นเอง แต่มันช่วยบังคับให้ design, data shape และ edge case ถูกพูดออกมาตั้งแต่ตอนเขียน

ให้อ่านบทนี้โดยถือว่า type คือภาษาสื่อสารระหว่างคนในทีมพอ ๆ กับที่เป็นเครื่องมือของ compiler ถ้าจับแกนนี้ได้ บท data fetching, testing และ system design จะต่อกันง่ายขึ้น เพราะคุณจะมอง type เป็นส่วนหนึ่งของ architecture ไม่ใช่ของแต่งเสริม

## 3.1 มุมมองแกน: type คือสัญญา และ TS เป็น structural typing

TS ตรวจ type ตอน compile แล้ว**ลบทิ้งหมด** (type erasure) — runtime คือ JS เพียว ๆ ดังนั้น type คือ "สัญญาที่ตรวจตอนเซ็น ไม่มีผู้คุมตอนอยู่จริง"

**Analogy สัญญาเช่าบ้าน:** type annotation คือสัญญาเช่า — นิติกร (compiler) ตรวจเข้มตอนเซ็นว่าทุกข้อสอดคล้อง แต่พอเข้าอยู่จริง (runtime) ไม่มีตำรวจเฝ้าหน้าบ้าน ถ้าของที่ส่งเข้าบ้านมาจากนอกระบบ (API, localStorage, user input) สัญญาช่วยอะไรไม่ได้ — ต้องตรวจของจริงที่ประตู (หัวข้อ 3.11)

ต่างจาก Java ข้อที่สอง: Java เป็น **nominal typing** — type เข้ากันได้เมื่อ*ชื่อ/สายการ implements* ตรงกัน แต่ TS เป็น **structural typing** — เข้ากันได้เมื่อ*โครงสร้าง*ตรงกัน:

```ts
interface Point { x: number; y: number }
const p = { x: 1, y: 2, z: 3 };
const q: Point = p; // ผ่าน! ไม่ต้อง "implements Point" — หน้าตาครบก็คือ Point
```

"เดินเหมือนเป็ด ร้องเหมือนเป็ด = เป็ด" — ผลเชิง design: consumer ประกาศ interface ที่ตัวเองต้องการ แล้วใครหน้าตาตรงก็เสียบได้เลย นี่คือ DIP (Dependency Inversion Principle — ฝั่ง business เป็นเจ้าของ port ให้ infrastructure มา implement, เล่ม backend บท 3–4) ในเวอร์ชันที่แทบไม่มีพิธีกรรม: ไม่ต้องแก้ class ต้นทางให้ implements อะไรเพิ่ม

## 3.2 interface vs type: ต่างจริงแค่ไหน

| | `interface` | `type` alias |
|---|---|---|
| รูป object/class contract | ได้ | ได้ |
| union / intersection / mapped / conditional | ไม่ได้ | **ได้** — ของเด่นฝั่งนี้ |
| **Declaration merging** (ประกาศชื่อซ้ำแล้ว merge กัน) | ได้ | ไม่ได้ — ชื่อซ้ำ = error |
| extends | `extends` (error ชัดเมื่อขัดกัน) | `&` (ขัดกันได้ type ประหลาดเงียบ ๆ เช่น never) |

ต่างจริงมีแค่นั้น — ที่เหลือคือธรรมเนียม declaration merging มีที่ใช้จริงเดียวคือ**เติม type ให้ library ภายนอก** (เช่น augment `Window`) แต่ในโค้ดแอปมันคืออันตราย: ใครก็ merge เพิ่ม field ให้ interface เราจากไฟล์ไหนก็ได้ ธรรมเนียมปัจจุบันเสียงแตกเบา ๆ แต่แนวที่พบมาก: **ใช้ `type` เป็นค่าเริ่มต้น** (ทำได้ทุกอย่าง พฤติกรรมคาดเดาได้) และใช้ `interface` เมื่อประกาศ contract ให้ class implements หรือเขียน public API ของ library ที่*ตั้งใจ*ให้คนอื่น augment ได้ — คำตอบที่ดีในห้องสัมภาษณ์คือบอกว่าทีมควรเลือกแนวเดียวแล้ว consistent ไม่ใช่เถียงศาสนา

## 3.3 Generic: parameterize type เมื่อ logic ไม่สน type

ใช้ generic เมื่อ **logic เหมือนเดิมทุก type แต่อยากรักษาความสัมพันธ์ระหว่างขาเข้า-ขาออก** — ถ้าเขียน `function f<T>(x: T): string` แล้ว T โผล่จุดเดียว นั่นคือ generic เก๊ ใช้ type ตรง ๆ พอ ตัวอย่างที่สัมภาษณ์ชอบ: custom hook ยิง API

```ts
// T ผูก "สิ่งที่ endpoint นี้คืน" เข้ากับ "สิ่งที่ caller ได้" — คือเหตุผลที่ต้อง generic
function useFetch<T>(url: string): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T | null>(null);
  /* ... fetch แล้ว setData(json as T) — จุดอ่อนตรง as นี้ เดี๋ยวแก้ในหัวข้อ 3.11 ... */
}
const { data } = useFetch<User[]>('/api/users'); // data: User[] | null — autocomplete มาครบ
```

ส่วน **constraint** (`extends`) คือการบอกขั้นต่ำที่ T ต้องมี เพื่อให้ในฟังก์ชันแตะ property นั้นได้:

```ts
function sortBy<T extends { id: number }>(items: T[]): T[] { /* อ่าน item.id ได้ */ }
// เทพขึ้นอีกขั้น — ผูกสอง parameter เข้าด้วยกัน:
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; }
pluck(user, 'name');   // type ถูก infer เป็น string
pluck(user, 'nmae');   // compile error — typo กลายเป็นบั๊กที่เกิดไม่ได้
```

## 3.4 Union, Discriminated Union และ exhaustive check ด้วย never

Union (`A | B`) คือ "เป็นอย่างใดอย่างหนึ่ง" — ของที่ Java เพิ่งได้ใกล้เคียงผ่าน sealed interface ส่วนท่าไม้ตายของ TS คือ **discriminated union**: ทุกสมาชิกมี field ตัวแยกร่วมกัน (discriminant) แล้ว compiler จะ narrow ให้ตาม field นั้น

สถานการณ์จริง: state ของการโหลดข้อมูล ถ้าเขียนแบบ "ถุงรวม field" จะเกิด state ผิดกฎหมายได้ เช่น `loading: true` พร้อม `error` มีค่า:

```ts
type ApiResult<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }      // data มีเฉพาะตอน success — บังคับด้วยโครงสร้าง
  | { status: 'error'; error: string }; // ไม่มีทางถือ data กับ error พร้อมกัน

function render(r: ApiResult<User>) {
  switch (r.status) {
    case 'loading': return spinner();
    case 'success': return show(r.data);   // ในกิ่งนี้ r ถูก narrow — r.data ใช้ได้เลย
    case 'error':   return alert(r.error);
    default:        return assertNever(r); // exhaustive check
  }
}
function assertNever(x: never): never { throw new Error(`unreachable: ${x}`); }
```

กลไกของ `assertNever`: ถ้า switch ครอบทุก case แล้ว ใน default ตัว `r` ถูก narrow จนเหลือ `never` (type ที่ไม่มีค่าใดเป็นสมาชิก) — ส่งเข้า `assertNever` ได้พอดี แต่วันหนึ่งมีคนเพิ่ม `{ status: 'empty' }` เข้า union แล้วลืมแก้ switch → `r` ใน default เหลือ type `empty` ซึ่งใส่ never ไม่ได้ → **compile error ชี้ทุกจุดที่ต้องแก้** นี่คือการเปลี่ยน "บั๊กที่ต้องรอ QA เจอ" เป็น "build แดง" — ทักษะ design ด้วย type ที่ตรงหัวใจสุด (แนวเดียวกับ state machine เล่ม backend บท 21: ทำ invalid state ให้ represent ไม่ได้)

## 3.5 Type narrowing / guards

TS ตาม control flow แล้วบีบ type ให้แคบลงเอง — เครื่องมือ narrow ที่ต้องใช้คล่อง:

```ts
if (typeof x === 'string') { ... }        // primitive
if (x instanceof Date) { ... }            // class instance (เช็ค prototype chain — บท 2)
if ('data' in x) { ... }                  // มี property นี้ไหม
// custom type guard — บอก compiler ว่า boolean นี้มีความหมายเชิง type:
function isUser(x: unknown): x is User {
  return typeof x === 'object' && x !== null && 'id' in x;
}
```

`x is User` คือคำสัญญาที่ **compiler เชื่อโดยไม่ตรวจ logic ข้างใน** — เขียน guard โกหก (เช็คไม่ครบแต่บอกว่าเป็น User) ระบบ type ทั้งเส้นหลังจากนั้นตั้งอยู่บนความเท็จ จึงควรเขียน guard ให้จืดและตรง หรือให้ schema library generate ให้ (3.11)

## 3.6 Utility types ที่ใช้จริง

| Utility | ทำอะไร | ตัวอย่างงานจริง |
|---|---|---|
| `Partial<T>` | ทุก field เป็น optional | payload ของ PATCH: `updateUser(id, changes: Partial<User>)` |
| `Pick<T, K>` | เลือกเฉพาะ field | ฟอร์มแก้โปรไฟล์: `Pick<User, 'name' \| 'avatar'>` |
| `Omit<T, K>` | ตัด field ทิ้ง | ตอนสร้างยังไม่มี id: `Omit<User, 'id' \| 'createdAt'>` |
| `Record<K, V>` | object map key → value | `Record<OrderStatus, string>` — เพิ่ม status ใหม่แล้วลืม map สี = compile error |
| `ReturnType<F>` | ดึง type ผลลัพธ์ของ function | `type Store = ReturnType<typeof createStore>` — ให้ type ไหลตาม implementation ไม่ต้องประกาศซ้ำ |

จุดขายเชิง design: ทั้งหมด **derive จาก type ต้นทางเดียว** — `User` เปลี่ยน ทุก type ที่ derive ขยับตาม ไม่มี copy ที่ค่อย ๆ เหลื่อมกันเหมือนการประกาศ DTO (Data Transfer Object) ซ้ำ ๆ ด้วยมือ

## 3.7 any vs unknown vs never

- `any` = ปิด type checker ทิ้ง — ใช้ได้ทุกอย่าง ไม่มีการเช็ค และ**ติดเชื้อ**: ค่า any ไหลไปไหน ตรงนั้นก็หลุดการเช็คต่อ
- `unknown` = "ไม่รู้ว่าอะไร" แบบปลอดภัย — รับอะไรก็ได้เหมือน any แต่**ห้ามใช้จนกว่าจะ narrow** — compiler บังคับให้พิสูจน์ก่อน
- `never` = ไม่มีค่าใดเป็นไปได้ — ใช้ทำ exhaustive check (3.4) และเป็น type ของ function ที่ throw เสมอ

**Analogy พัสดุนิรนาม:** `any` คือพัสดุที่ยามปล่อยเข้าตึกโดยไม่สแกน แถมประทับตราให้ผ่านทุกด่านชั้นใน — `unknown` คือพัสดุนิรนามที่ระบบบังคับสแกน (narrow) ก่อนถึงจะแกะได้ ผลลัพธ์: `catch (e)` type เป็น `unknown` ตั้งแต่ TS 4.4, ขาเข้าจากภายนอกทุกทางควรเริ่มที่ unknown — และทีมควรเปิด `strict: true` + lint ห้าม any โผล่ใหม่

## 3.8 as const + literal types + satisfies

TS มอง `let s = 'GET'` เป็น `string` (widen) แต่บางงานเราต้องการ type แคบระดับค่า:

```ts
const ROUTES = ['home', 'orders', 'settings'] as const;
// type: readonly ['home', 'orders', 'settings'] — ไม่ widen เป็น string[]
type Route = (typeof ROUTES)[number]; // 'home' | 'orders' | 'settings' — union ฟรีจากข้อมูล
```

ส่วน `satisfies` (มีตั้งแต่ TS 4.9) แก้ dilemma เก่า: annotate type แล้วเสีย literal, ไม่ annotate ก็ไม่ถูกตรวจ —

```ts
const palette = {
  primary: '#0055ff',
  danger: [255, 0, 0],
} satisfies Record<string, string | [number, number, number]>;
// ถูกตรวจว่าเข้า contract และ palette.danger ยังรู้ว่าเป็น tuple — .map ได้ ไม่ถูก widen
// ถ้าใช้ ": Record<...>" แทน — danger จะกลายเป็น string | tuple ต้อง narrow ก่อนใช้ทุกครั้ง
```

## 3.9 tsconfig ที่เป็น design decision ไม่ใช่แค่ config

flag สามตัวที่บอกวุฒิภาวะของทีมได้จาก tsconfig เดียว:

- `strict: true` — เปิดครอบครัว strict ทั้งชุด โดยเฉพาะ `strictNullChecks` ที่ทำให้ `null`/`undefined` เป็น type แยก ต้อง handle ก่อนใช้ — นี่คือคำตอบของ JS ต่อ "billion dollar mistake" แบบเดียวกับ `Optional` ของ Java แต่บังคับทั่วทั้งภาษา ปิด flag นี้ = ทิ้งคุณค่าครึ่งหนึ่งของ TS
- `noUncheckedIndexedAccess` — ทำให้ `arr[i]` และ `record[key]` ได้ type `T | undefined` ตามความจริง (index อาจไม่มีของ) — ตัวจับบั๊ก out-of-range ที่ strict ปกติยังปล่อยผ่าน
- `erasableSyntaxOnly` (TS 5.8+) — บังคับให้ใช้เฉพาะ syntax ที่ strip ทิ้งได้เฉย ๆ (แบน enum/namespace ที่ generate โค้ด) เพื่อให้รันด้วยเครื่องมือ strip-type อย่าง Node ได้ตรง ๆ

จุดขายตอนสัมภาษณ์: การเลือก flag คือการเลือกว่า "ให้ compiler ทำงานแทน reviewer แค่ไหน" — เข้มตั้งแต่วันแรกถูกกว่ามาเปิดทีหลังแล้วเจอ error พันจุดเสมอ

## 3.10 enum vs union literal: ธรรมเนียม 2026 เอียงไปทางไหน

ธรรมเนียมปัจจุบันเอียงชัดไปทาง **union literal / `as const` object** ด้วยเหตุผลเชิงกลไก ไม่ใช่แฟชั่น:

1. `enum` เป็น feature เดียวไม่กี่ตัวที่ **generate โค้ด runtime** (object จริง) — ขัดหลัก type erasure, ตัวเลือก `erasableSyntaxOnly` (TS 5.8+, เกิดมาเพื่อให้ Node/เครื่องมือสาย strip type รัน TS ตรง ๆ ได้) แบน enum ทิ้งเลย
2. numeric enum รับ "เลขอะไรก็ได้" ในบางเวอร์ชันเก่าและมี reverse mapping ที่คนงง, `const enum` มีปัญหากับ isolatedModules
3. union literal ได้ทุกอย่างที่ต้องการ — autocomplete, exhaustive check — โดยไม่มีต้นทุน runtime และ interop กับ JSON จาก API ตรง ๆ (API ส่ง `"ACTIVE"` มาเทียบกับ union string ได้เลย ไม่ต้อง map เข้า enum)

```ts
// แทน enum ด้วยของสองชิ้นนี้พอ:
const OrderStatus = { Draft: 'draft', Paid: 'paid', Shipped: 'shipped' } as const;
type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]; // 'draft'|'paid'|'shipped'
```

เคสที่ enum ยังโอเค: codebase เดิมใช้ทั่วแล้ว consistency ชนะ — อย่ารื้อเพื่อความบริสุทธิ์

## 3.11 TS ไม่กัน runtime error — ขอบระบบต้อง validate จริง

จุดที่แยก senior ชัดที่สุดของบทนี้ สถานการณ์จริง: TS เขียวทั้ง repo แต่ prod ระเบิด `Cannot read properties of undefined` เพราะ backend เปลี่ยน field `user.address` เป็น nullable — type ที่เราประกาศคือ**ความเชื่อ** ไม่ใช่ความจริง

```ts
// ❌ ความเชื่อไม่มีหลักฐาน — as คือการเซ็นรับรองเอกสารที่ไม่ได้อ่าน
const user = (await res.json()) as User;
```

หลัก: **validate at the boundary** — ทุกขาเข้าที่ compiler มองไม่เห็นต้นทาง (HTTP response, localStorage, URL params, WebSocket, postMessage) ต้องผ่านการตรวจจริงหนึ่งครั้ง แล้วข้างในระบบจึงเชื่อ type ได้เต็มที่ เครื่องมือมาตรฐานคือ schema library ที่ประกาศ schema ครั้งเดียวได้ทั้ง runtime validator และ static type — ล้อแนวคิด Pydantic ของ Python (เล่ม backend บท 13):

```ts
import { z } from 'zod';

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.object({ city: z.string() }).nullable(), // สัญญาตรงความจริงใหม่
});
type User = z.infer<typeof UserSchema>;  // type ถูก generate จาก schema — ไม่มีวันเหลื่อมกัน

const parsed = UserSchema.safeParse(await res.json());
if (!parsed.success) {
  reportSchemaError(parsed.error);  // รู้ "ตอน fetch" ว่า contract แตก — ไม่ใช่ตอน user คลิกลึกไป 5 หน้า
  throw new ApiContractError();
}
const user = parsed.data;           // จากจุดนี้ type = ความจริง 100%
```

ปิดวงจรกับ `useFetch<T>` จากหัวข้อ 3.3 — จุดอ่อนของมันคือ `as T` ที่ไม่มีหลักฐาน ท่าที่ถูกคือให้ caller ส่ง schema มา แล้ว type ไหลออกจาก schema เอง ไม่มีใครต้องพิมพ์ `<User>` ลอย ๆ อีก:

```ts
// generic ผูกกับ schema — T ถูก infer จากของจริงที่ validate แล้ว
async function fetchParsed<S extends z.ZodType>(url: string, schema: S): Promise<z.infer<S>> {
  const res = await fetch(url);
  if (!res.ok) throw new HttpError(res.status);       // แยก error ชั้น HTTP (บท 12)
  return schema.parse(await res.json());              // แยก error ชั้น contract — โยนพร้อมรายละเอียด field
}
const users = await fetchParsed('/api/users', z.array(UserSchema)); // type: User[] — ไม่มี as สักตัว
```

สนามนี้ ณ กลางปี 2026: **zod** ยังเป็นตัวที่คนรู้จักกว้างสุด — ตลาดกำลังทยอยย้ายจาก v3 → **v4** (เร็วกว่า v3 หลายเท่า มี `zod/mini` แบบ tree-shakeable และ `z.toJSONSchema()`) แต่ ecosystem ยังผสมสองเวอร์ชันอยู่, **valibot** ชนะเรื่อง bundle เล็กมากสำหรับงาน edge/ฟอร์มที่ serious เรื่องขนาด, **ArkType** มาแรงเรื่องความเร็ว ชื่อไหนไม่สำคัญเท่า concept: *schema เป็น source of truth เดียว แล้ว infer type ออกมา* — trade-off ที่ต้องพูดได้คือ validate มีต้นทุน CPU/bundle จึงทำที่**ขอบ** ไม่ใช่ทุก function ข้างใน และทีมที่มี OpenAPI (สเปค REST API แบบ machine-readable) ควร generate schema จาก spec แทนเขียนมือ เพื่อผูก contract กับ backend จริง ๆ (โยง contract testing บท 15)

## คำถามสัมภาษณ์ที่ต้องตอบได้

1. **TS ต่างจาก Java type system ยังไงบ้างที่กระทบการออกแบบ?** → structural ไม่ใช่ nominal — เข้ากันได้เมื่อโครงสร้างตรง ไม่ต้อง implements ทำ DIP ได้แทบไม่มีพิธีกรรม และ type ถูก erase ตอน runtime — ไม่มี reflection แบบ JVM ขอบระบบจึงต้อง validate เอง

2. **interface กับ type เลือกยังไง?** → ความต่างจริงมีสองข้อ: type ทำ union/mapped/conditional ได้ ส่วน interface มี declaration merging — ผมใช้ type เป็น default เพราะครอบคลุมกว่าและ merge เงียบ ๆ ไม่ได้ ใช้ interface กับ contract ที่ให้ class implements หรือ public API ที่ตั้งใจให้ augment แล้วยึดแนวเดียวทั้งทีม

3. **discriminated union + never ช่วยอะไรในงานจริง?** → ทำ invalid state ให้แทนค่าไม่ได้ (เช่น success ที่ไม่มี data) และ exhaustive check ทำให้การเพิ่ม variant ใหม่กลายเป็น compile error ทุกจุดที่ยังไม่ handle — เปลี่ยนบั๊ก runtime เป็น build แดง

4. **ทำไม unknown ปลอดภัยกว่า any?** → any ปิด checker แล้วติดเชื้อไปทั้งเส้นทางข้อมูล ส่วน unknown รับอะไรก็ได้เหมือนกันแต่บังคับ narrow ก่อนใช้ — ของจากภายนอกควรเข้าระบบเป็น unknown แล้วพิสูจน์ผ่าน guard หรือ schema

5. **ทีมคุณใช้ enum ไหม เพราะอะไร?** → เลี่ยง — enum สร้างโค้ด runtime ขัด type erasure จนถูก erasableSyntaxOnly แบน union literal ให้ autocomplete และ exhaustive check เท่ากันแบบ zero-cost แถม interop กับ JSON ตรง ๆ ยกเว้น codebase เก่าที่ใช้ทั่วแล้ว consistency สำคัญกว่า

6. **TS การันตีว่าไม่มี runtime type error ไหม? แล้วจัดการยังไง?** → ไม่ — type หายตอน runtime และ type ของ API response คือความเชื่อ ผม validate at the boundary ด้วย zod/valibot: schema เป็น source of truth, infer type ออกมา, safeParse ที่ขาเข้า — contract แตกจะรู้ทันทีที่ fetch พร้อม error รายงานได้ ไม่ใช่ undefined ระเบิดลึก ๆ ใน UI

## สรุปท้ายบท

- TypeScript ที่ใช้เป็นจะช่วยออกแบบระบบ ไม่ใช่แค่ช่วยจับสะกดผิด
- จุดแข็งหลักของมันคือการทำให้ invariant และ state model ชัดขึ้นตั้งแต่ตอนเขียน โดยเฉพาะผ่าน union, narrowing และ generic ที่ออกแบบดี
- แต่ TypeScript ไม่ได้มีอำนาจใน runtime ดังนั้นข้อมูลจากโลกภายนอกยังต้อง validate ที่ boundary เสมอ
- ถ้าใช้ถูก มันจะกลายเป็นสะพานระหว่าง design, implementation และ testing มากกว่าจะเป็นชั้นเอกสารประกอบโค้ด

## ก่อนไปบทถัดไป

จากนี้เราจะขยับจากโลกของภาษาและ type system ไปสู่ browser โดยตรง เพื่อดูว่าโค้ดและ markup ที่เราเขียนถูกเปลี่ยนเป็นภาพบนจอผ่านขั้นตอนอะไรบ้าง และต้นทุนแต่ละขั้นอยู่ตรงไหน
