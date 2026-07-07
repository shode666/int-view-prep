# บท 9 — Change Detection & Signals: framework รู้ได้ยังไงว่าต้องวาดหน้าจอใหม่

> เป้าหมายของบทนี้: ตอบคำถามที่เป็นหัวใจของทุก UI framework — **"framework รู้ได้ยังไงว่าข้อมูลเปลี่ยนแล้ว ต้องวาดหน้าจอใหม่?"** — Angular ตอบคำถามนี้มาแล้วสองยุค (zone.js → signals) และการอธิบาย "ทำไมถึงย้าย" ได้ครบ คือเส้นแบ่ง senior กับคนท่อง API ชัดที่สุดในสาย Angular

> **สถานะ ณ ปี 2026 (verify แล้ว):** zoneless change detection เป็น **stable ตั้งแต่ v20.2** และเป็น **default ของแอปใหม่ตั้งแต่ v21** · **Angular v22 ทำให้ OnPush เป็น default strategy** ของ component ใหม่ (strategy เดิมถูกเปลี่ยนชื่อเป็น `Eager` และ deprecated — `ng update` ใส่ Eager ให้ component เก่าอัตโนมัติ) · `signal`/`computed`/`effect`/`linkedSignal` stable ครบ · `resource`/`rxResource`/`httpResource` และ Signal Forms เป็น stable ใน v22

## เข็มทิศก่อนอ่าน

ถ้าบท 8 วางภาพรวมว่า Angular มี component tree และ DI container อย่างไร บทนี้อธิบายเครื่องยนต์ที่ทำให้ tree นั้นขยับตามข้อมูลจริง ความสำคัญของบทนี้ไม่ใช่แค่ตอบคำถามสัมภาษณ์ แต่เพื่อให้ผู้อ่านเห็นเหตุผลทางสถาปัตยกรรมว่าทำไม Angular ถึงค่อย ๆ ขยับจากโลกของ zone.js ไปสู่ signals และ zoneless

ระหว่างอ่านให้จับว่า Angular มี "ยุคความคิด" มากกว่ามีแค่ API เวอร์ชันใหม่ ถ้าเข้าใจว่าแต่ละยุคพยายามแก้ต้นทุนอะไร คุณจะอ่าน codebase เก่าและโปรเจกต์ใหม่ด้วยสายตาเดียวกันได้

## 9.1 ปัญหาตั้งต้น — สามคำตอบของคำถามเดียว

ทุก framework ต้อง sync ระหว่างสองโลก: **ข้อมูลใน memory** กับ **pixel บนจอ** ปัญหาคือข้อมูลเปลี่ยนได้จากร้อยทาง (user คลิก, HTTP ตอบกลับ, timer, WebSocket) — framework จะรู้ได้ยังไงว่า "ตอนนี้แหละ ต้องวาดใหม่"?

| แนวทาง | ใครใช้ | หลักการ | ราคา |
|---|---|---|---|
| **บอกเอง** | React (บท 6) | dev เรียก `setState` — ไม่เรียกก็ไม่ render | ภาระอยู่ที่ dev, ลืมเรียก = UI ค้าง |
| **ดักทุกอย่างแล้วเช็คหมด** | Angular ยุค zone.js | ดักทุก async event → สงสัยว่า "อะไรก็เปลี่ยนได้" → ตรวจทั้ง tree | ไม่ต้องบอกอะไรเลย แต่ตรวจเหวี่ยงแห แพง |
| **ข้อมูลรายงานตัวเอง** | Angular ยุค signals (และ Vue/Solid) | state เป็น reactive value ที่รู้ว่าใครอ่านมัน → เปลี่ยนปุ๊บชี้จุดได้เลยว่าใครกระทบ | ต้องเขียน state ในรูปแบบที่ framework กำหนด |

Analogy: ร้านอาหารอยากรู้ว่าโต๊ะไหนต้องการอะไรเพิ่ม — React คือ "ลูกค้าต้องยกมือเรียกเอง", zone.js คือ "ทุกครั้งที่มีเสียงอะไรก็ตามในร้าน พนักงานเดินไล่ถามทุกโต๊ะทั้งร้าน", signals คือ "ทุกโต๊ะมีปุ่มกด แล้วไฟขึ้นบอกเลขโต๊ะที่ครัว" — สองแบบแรก work แต่แบบที่สาม scale

## 9.2 zone.js ทำงานยังไงจริง — ความมหัศจรรย์ที่มีใบเสร็จ

**zone.js** คือ library ที่ **monkey-patch** (สวมทับ implementation เดิมตอน runtime) async API แทบทุกตัวของ browser: `setTimeout`, `Promise.then`, `addEventListener`, `XMLHttpRequest`, `fetch` — ตั้งแต่ก่อนแอปเริ่มรัน

กลไกทีละขั้น:

1. ตอน load, zone.js แทนที่ `window.setTimeout` ฯลฯ ด้วย wrapper ของตัวเอง
2. Angular รันโค้ดแอปทั้งหมดข้างใน "zone" ชื่อ `NgZone` — ทุก async operation ที่เกิดในนั้นถูกนับว่าเป็นงานของแอป
3. เมื่อ async งานหนึ่ง**จบ** (callback ของ setTimeout รันเสร็จ, Promise resolve, click handler return) zone.js ส่งสัญญาณ `onMicrotaskEmpty` ให้ Angular
4. Angular ตีความว่า "เพิ่งมีโค้ดแอปรันไป **อะไรก็อาจเปลี่ยนแล้ว**" → เรียก `tick()`: ไล่ตรวจ component **ทั้ง tree จากบนลงล่าง** เทียบทุก binding ใน template (`{{ name }}`, `[value]="x"`) กับค่าที่จำไว้รอบก่อน (dirty checking) — ค่าไหนต่างค่อยอัปเดต DOM ตรงนั้น

จุดที่คนเข้าใจผิดบ่อย: Angular **ไม่ได้** วาด DOM ใหม่ทั้งหน้า — มัน"ตรวจ" ทั้ง tree แต่ "แก้" เฉพาะจุดที่ค่าต่าง ของแพงคือ**การตรวจ** ไม่ใช่การวาด

### ทำไมถึงแพง — และแพงฟรีบ่อยด้วย

ลองนึกภาพแอป 800 components, มี `setInterval` อัปเดตนาฬิกาที่มุมจอทุกวินาที: ทุก tick zone.js เห็น async จบ → Angular ตรวจ binding **ทั้ง 800 components** ทั้งที่สิ่งที่เปลี่ยนคือ string เดียว — นี่คือ "ตรวจฟรี" ที่โจทย์ในตำนานอย่าง `mousemove` handler ยิ่งขยี้: ขยับเมาส์ 60 ครั้ง/วินาที = full-tree check 60 รอบ/วินาที

เทียบ backend: เหมือนระบบที่ทุกครั้งมี request อะไรก็ตามเข้ามา ก็รัน full table scan เช็คว่ามี row ไหน dirty บ้าง — ถูกต้องเสมอ (correctness ดีมาก — นี่คือเหตุผลที่ zone.js อยู่มาสิบปี) แต่จ่าย O(ทั้งระบบ) ต่อ event ไม่ใช่ O(สิ่งที่เปลี่ยน)

escape hatch ที่ควรรู้ไว้อ่านโค้ดเก่า: `NgZone.runOutsideAngular(() => ...)` — รันงานถี่ๆ (เช่น canvas animation) นอก zone เพื่อไม่ trigger การตรวจ แล้วค่อย `zone.run()` กลับเข้ามาเมื่อมีผลกับ UI จริง

## 9.3 Default(Eager) vs OnPush — สัญญาแลกความเร็ว

**OnPush** คือการทำสัญญากับ Angular ว่า "component นี้ ตรวจข้ามได้ ยกเว้นเข้าเงื่อนไขที่ตกลงกัน" — เมื่อ subtree ไหนไม่เข้าเงื่อนไข Angular ตัดทิ้งทั้งกิ่งจากรอบตรวจ

**สี่เงื่อนไขที่ทำให้ OnPush component ถูกตรวจ** (ต้องท่องได้ครบในสัมภาษณ์):

1. **Input reference เปลี่ยน** — เทียบด้วย `===` เท่านั้น (mutate ข้างในไม่นับ!)
2. **Event เกิดใน component นี้หรือลูกของมัน** — click, submit ฯลฯ ที่ bind ใน template
3. **`async` pipe ใน template ได้ค่าใหม่** (มันเรียก `markForCheck` ให้ — หัวข้อ 9.5)
4. **มีคนเรียก `markForCheck()` ตรงๆ** (หรือ signal ที่ template อ่านอยู่เปลี่ยนค่า — โลกใหม่)

> **อัปเดต v22:** OnPush กลายเป็น **default ของ component ใหม่** แล้ว — strategy เก่าเปลี่ยนชื่อเป็น `Eager` และถูก deprecated (`ng update` เติม `Eager` ให้ component เดิมที่ไม่ได้ระบุ strategy เพื่อรักษาพฤติกรรม) — คำถามสัมภาษณ์จึงกลับด้าน: จาก "เมื่อไหร่ควรเปิด OnPush" เป็น "อธิบายได้ไหมว่าทำไมมันถึงกลายเป็น default ได้"

### บั๊กคลาสสิก: "ใส่ OnPush แล้ว UI ไม่ update"

```ts
// parent — โหลด user แล้ว "แก้ไข" ข้อมูล
@Component({ template: `<user-card [user]="user" />` })
export class ProfilePage {
  user = { name: 'Somchai', points: 100 };

  addPoints() {
    this.user.points += 50;     // 💣 mutate object เดิม — reference ไม่เปลี่ยน
    // UserCard (OnPush): เงื่อนไขข้อ 1 ไม่เข้า (=== ตัวเดิม), ข้อ 2 ไม่เข้า
    // (event เกิดที่ parent ไม่ใช่ใน UserCard) → ไม่ตรวจ → จอค้างที่ 100
  }

  addPointsFixed() {
    this.user = { ...this.user, points: this.user.points + 50 };  // ✅ reference ใหม่
  }
}
```

อาการหลอน: กดปุ่มแล้วเลขไม่ขยับ แต่พอ**คลิกที่ตัว card** เลขเด้งเป็นค่าใหม่ทันที (เพราะ click เข้าเงื่อนไขข้อ 2 — ตรวจแล้วเจอว่าค่าใน object เปลี่ยนไปแล้วตั้งนาน) — บั๊กที่ "หายเองบางที" แบบนี้คือลายเซ็นของ mutation + OnPush

นี่คือเหตุผลที่ **immutability ไม่ใช่รสนิยมแต่เป็นสัญญา**: OnPush เร็วเพราะเช็คแค่ reference (`===` เดียว, O(1)) แทนการ deep-compare — คุณจึงต้องรักษาสัญญาฝั่งตัวเอง: ข้อมูลเปลี่ยน = object ใหม่ เหมือน `equals`/`hashCode` contract ใน Java (เล่ม backend บท 13) — framework เชื่อสัญญา ใครโกหก (mutate แล้วบอกว่าไม่เปลี่ยน) ระบบพังแบบเงียบ

## 9.4 `markForCheck` vs `detectChanges` — ติดธง vs สั่งตรวจเดี๋ยวนี้

สองตัวนี้โดนใช้สลับกันมั่วบ่อยที่สุดใน codebase เก่า:

- **`markForCheck()`** — *ไม่ตรวจอะไรตอนนี้เลย* แค่ "ติดธง" component นี้และไล่ติดขึ้นไปถึง root ว่า "รอบตรวจหน้า อย่าข้ามพวกฉัน" แล้วรอรอบตรวจปกติมาถึง → ปลอดภัย, ใช้เมื่อรู้ว่าข้อมูลเปลี่ยนนอกเงื่อนไข OnPush (เช่น callback ของ library ภายนอก)
- **`detectChanges()`** — *ตรวจ subtree นี้เดี๋ยวนี้ ทันที แบบ synchronous* → ใช้เฉพาะกรณีต้องการผลก่อนบรรทัดถัดไปจริงๆ (แทบไม่มี) — ใช้พร่ำเพรื่อคือสร้างรอบตรวจซ้อนเกินจำเป็น และถ้าเรียกผิดจังหวะ (เช่นระหว่าง Angular กำลังตรวจอยู่) จะเจอ `ExpressionChangedAfterItHasBeenCheckedError` อันโด่งดัง

Analogy: markForCheck คือ "หย่อนเรื่องเข้าคิวประชุมรอบหน้า" — detectChanges คือ "เดินไปลากทุกคนมาประชุมเดี๋ยวนี้" — ถ้าคุณลากคนมาประชุมกลางการประชุมอื่น ความวุ่นวายคือ error ข้างต้น · โค้ดที่โรย `detectChanges()` ทั่วไฟล์คือ code smell ระดับเดียวกับ `Thread.sleep()` ใน test (เล่ม backend บท 12): มันคือการ "ทุบให้หาย" โดยไม่เข้าใจ root cause

## 9.5 `async` pipe — สามงานที่ได้ฟรี

ก่อน signals, การเอา Observable (บท 10) มาแสดงใน template แบบถูกต้องต้องทำเอง 3 อย่าง: subscribe ตอนเกิด, `markForCheck` ทุกครั้งที่ค่ามา (เพื่อให้ OnPush ตรวจ), unsubscribe ตอนตาย — `async` pipe ทำครบ:

```html
<!-- subscribe + markForCheck ทุก emit + unsubscribe ตอน destroy — ในหนึ่งคำ -->
@if (order$ | async; as order) {
  <order-summary [order]="order" />
}
```

มันคือเหตุผลที่ยุคก่อน signals คำแนะนำมาตรฐานคือ "OnPush + async pipe ทุก component": เพราะสองตัวนี้รวมกันได้ระบบที่ update ตรงจุดโดยไม่มี subscription leak — ปี 2026 บทบาทนี้กำลังถูก `toSignal()` (หัวข้อ 9.9) แทนที่ แต่ async pipe ยังอยู่ทั่ว codebase จริง ต้องอ่านออกและอธิบายได้

## 9.6 Function call ใน template — ทำไมช้า และแก้ยังไง

```html
<!-- 💣 ถูกเรียกใหม่ทุกรอบ change detection — Angular ไม่รู้ว่า pure ไหม เลย cache ไม่ได้ -->
<div>{{ calculateTotal(items) }}</div>
<div *ngFor="let p of filterActive(products)">...</div>
```

เหตุผลเชิงกลไก: ตอน Angular ตรวจ binding มันต้อง**ได้ค่าปัจจุบันมาเทียบ** — ค่าจาก property อ่านฟรี แต่ค่าจาก function ต้อง**เรียก function นั้น** และเพราะ Angular พิสูจน์ไม่ได้ว่า function pure มันจึงเรียกใหม่ทุกรอบ — `filterActive` ที่ filter array 1,000 ตัว คูณจำนวนรอบตรวจต่อวินาที = jank (เฟรมกระตุก เพราะทำงานเกิน frame budget — บท 4)

ซ้ำร้าย `filterActive` คืน **array ใหม่ทุกครั้ง** (reference ใหม่) → ลูกที่เป็น OnPush เห็น input เปลี่ยนตลอดเวลา → ตรวจฟรีทั้งกิ่ง — ปัญหาเดียวกับ inline object ใน JSX ของ React (บท 6) เป๊ะ

ทางแก้เรียงตามยุค: (1) **pure pipe** — memoize ให้ตามบท 8 (2) คำนวณล่วงหน้าเก็บใน property ตอนข้อมูลเปลี่ยน (3) ทางปัจจุบันที่ตรงสุด — **`computed()`**: cache จนกว่า dependency เปลี่ยนจริง

## 9.7 Signals ลึก — dependency tracking ทำงานยังไง

**Signal** = กล่องใส่ค่าที่ **จดว่าใครมาอ่าน** — สามตัวหลัก:

```ts
const price = signal(100);                       // writable state
const qty = signal(2);
const total = computed(() => price() * qty());   // derived — cache + จด dependency เอง

effect(() => {                                    // side effect เมื่อ dependency เปลี่ยน
  console.log(`total = ${total()}`);
});

price.set(150);        // → total ถูก mark stale → effect รันรอบถัดไปด้วยค่า 300
qty.update(q => q + 1);
```

### `computed` รู้ได้ยังไงว่าตัวเองพึ่งใคร — ไม่ใช่ magic

กลไกจริงเรียบง่ายกว่าที่คิด:

1. ตอน `total()` ถูกอ่านครั้งแรก Angular set ตัวแปร global ประมาณ "consumer ที่กำลังทำงาน = total" แล้วรัน function ข้างใน
2. ทุกครั้งที่ `price()` ถูกเรียก ตัว signal เช็คว่า "ตอนนี้ใครเป็น consumer อยู่?" → เจอ total → **ลงทะเบียน edge** price → total
3. จบการรัน ได้ dependency graph ที่แม่นยำระดับ "การอ่านที่เกิดขึ้นจริงรอบนี้" — ไม่ใช่ static analysis
4. `price.set(...)` → เดินตาม edge ไป mark total ว่า **stale** (ยังไม่คำนวณใหม่! — lazy) → ใครมาอ่าน total ครั้งหน้าค่อยคำนวณ แล้ว track dependency ใหม่อีกรอบ

ข้อ 3–4 ให้ผลพลอยได้สำคัญ: **dynamic dependency** — ถ้า `computed(() => useA() ? a() : b())` และรอบนี้ useA เป็น true, `b` จะ**ไม่ถูกลงทะเบียน**เลย → b เปลี่ยนก็ไม่มีอะไร recompute — ประหยัดแบบที่ dependency array มือของ React (`useMemo`) ทำให้ไม่ได้

**Glitch-free**: เพราะ update เป็นแบบ mark-stale-then-pull (ไม่ push ค่าไล่ทันที) จึงไม่มีจังหวะที่โลกเห็นค่า "ครึ่งๆ กลางๆ" — ตัวอย่างคลาสสิก: `fullName = computed(() => first() + last())` แล้ว set ทั้ง first และ last ติดกันสองบรรทัด — ระบบ push แบบซุ่มซ่ามอาจ emit "สมชาย-นามสกุลเก่า" หนึ่งจังหวะ แต่ signals ไม่มีทาง: fullName แค่ stale จนมีคนอ่าน แล้วอ่านทีเดียวได้ค่าที่ new ทั้งคู่ — เทียบ database คือได้ read consistency ไม่อ่านเจอ transaction ที่ commit ไปครึ่งเดียว (เล่ม backend บท 7)

ข้อควรระวังของ `effect()`: มันคือประตูสู่ side effect — ใช้กับงานขอบระบบ (log, sync ไป localStorage, สั่ง library ภายนอก) เท่านั้น **ห้ามใช้ effect เขียน signal อื่นเป็นทอดๆ** (ท่านั้นคือ `computed`/`linkedSignal` ที่ declarative กว่า) — effect chain คือ callback hell ยุคใหม่ · ของที่ควรรู้จักเพิ่ม: **`linkedSignal()`** (stable ตั้งแต่ v20) — writable signal ที่ reset ตัวเองเมื่อ source เปลี่ยน เช่น "ตัวเลือกสีที่ user เลือก ต้อง reset เมื่อเปลี่ยนสินค้า" และ **`resource()`/`httpResource()`** (stable v22) — ผูก async data เข้า signal โลก โดยมี loading/error state ให้เสร็จ (รายละเอียดฝั่ง data fetching อยู่บท 12)

## 9.8 Signals แก้เกม Change Detection ยังไง + zoneless

จุดเปลี่ยนเชิงสถาปัตยกรรม: เมื่อ template อ่าน signal (`{{ total() }}`) ตัว **template เองกลายเป็น consumer** ใน dependency graph — Angular จึงรู้ระดับ "component ไหน (อนาคตคือ view ย่อยไหน) พึ่ง signal ตัวไหน"

ผลคือสมการกลับด้าน: จากยุค zone.js ที่รู้แค่ "**มีบางอย่าง**เปลี่ยน" (สัญญาณหยาบ → ต้องตรวจหมด) มาเป็น "**price ของ component นี้**เปลี่ยน" (สัญญาณละเอียด → ตรวจเฉพาะ component ที่ถูก mark) — งานเปลี่ยนจาก O(ขนาด tree) ต่อ event เป็น O(จุดที่กระทบจริง)

component ยุค signal จึงหน้าตาสะอาดแบบนี้ — สังเกตว่าไม่มี markForCheck ไม่มี subscribe ไม่มี lifecycle จัดการ CD เลยสักบรรทัด:

```ts
@Component({
  selector: 'app-cart-badge',
  // v22: ไม่ต้องประกาศ OnPush แล้ว — เป็น default; แอป v21+ ไม่มี zone.js ด้วยซ้ำ
  template: `
    <button (click)="open()">
      ตะกร้า ({{ cart.count() }})   <!-- template อ่าน signal = ลงทะเบียนเป็น consumer -->
      @if (cart.count() > 9) { <span class="hot">ขายดี!</span> }
    </button>
  `,
})
export class CartBadge {
  cart = inject(CartService);   // count เป็น computed ใน service (บท 8)
  open() { /* ... */ }
  // ไม่มีใครสั่งตรวจอะไรทั้งนั้น: count เปลี่ยน → view นี้ถูก mark → Angular ตรวจเฉพาะจุดนี้
}
```

### Zoneless — เอา zone.js ออกได้เพราะอะไร

zone.js มีไว้ตอบคำถามเดียว: "**เมื่อไหร่**ควรตรวจ" — เมื่อ signals ตอบทั้ง "เมื่อไหร่" และ "**ตรงไหน**" ได้ดีกว่า zone.js ก็หมดหน้าที่ Angular จึงเหลือ trigger ตามธรรมชาติ: signal เปลี่ยน, event ใน template, `markForCheck` (ที่ async pipe เรียกให้) — ไม่ต้องดัก setTimeout ทั้ง browser อีกต่อไป

**สถานะจริง (verify 2026):** stable ตั้งแต่ v20.2 — และตั้งแต่ **v21 แอปใหม่เป็น zoneless โดย default** (ไม่มี zone.js ใน bundle เลย — เบาลง ~33KB และ stack trace สะอาดขึ้นมากเพราะไม่มี frame ของ zone คั่น) แอปเก่าเปิดด้วย `provideZonelessChangeDetection()`

**เงื่อนไขก่อนถอด zone ออกจากแอปเดิม** — checklist ที่ใช้ได้จริง:

1. component ทั้งหมดเป็น OnPush หรืออย่างน้อย "OnPush-compatible" (state เปลี่ยนผ่าน signal / async pipe / event — ไม่มีการ mutate เงียบๆ แล้วหวังให้ zone ช่วยเก็บกวาด)
2. ไม่มีโค้ดที่พึ่ง side effect ของ zone เช่น "setTimeout เฉยๆ แล้ว UI อัปเดตเอง" — พวกนี้จะโผล่เป็นบั๊ก "จอค้าง" ทันทีที่ถอด zone (จริงๆ คือบั๊กที่ zone ซ่อนไว้ให้ตลอด)
3. library ภายนอกที่แอบพึ่ง `NgZone` ต้องเช็ค/อัปเดต
4. เทคนิคทดสอบก่อนถอดจริง: เปิด `provideZoneChangeDetection({ ignoreChangesOutsideZone: ... })` แบบเข้มขึ้น หรือรัน test suite ใน zoneless mode ก่อน production

## 9.9 `toSignal` / `toObservable` — สะพานข้ามสองโลก

โลกจริงปี 2026 มีสอง paradigm อยู่ร่วมกัน: RxJS (บท 10) เก่งเรื่อง **event ตามเวลา** (debounce, retry, race) ส่วน signals เก่งเรื่อง **state ปัจจุบัน** — สะพานสองตัวใน `@angular/core/rxjs-interop`:

```ts
// Observable → Signal: subscribe ให้ + unsubscribe อัตโนมัติตอน component ตาย
searchResults = toSignal(
  this.query$.pipe(debounceTime(300), switchMap(q => this.api.search(q))),
  { initialValue: [] as Product[] },   // signal ต้องมีค่าเสมอ — Observable ไม่การันตี จึงต้องบอก
);

// Signal → Observable: ต่อ signal เข้าท่อ RxJS
readonly filter = signal('');
results$ = toObservable(this.filter).pipe(debounceTime(300), /* ... */);
```

จุดที่คนพลาด: `toSignal` **subscribe ทันที** (eager) — Observable ที่มี side effect ตอน subscribe จะยิงเลยไม่รอใครอ่าน และประเด็น `initialValue` สะท้อนความต่างเชิงปรัชญา: signal คือ "ค่าปัจจุบันที่**ต้องมีเสมอ**" ส่วน Observable คือ "สายธาร event ที่อาจยังไม่มีอะไรไหลมา" — ถ้าไม่ให้ initial value จะได้ `undefined` ปนใน type เตือนอยู่ตรงนั้น

## 9.10 หา component ที่กิน CD ด้วย Angular DevTools

วัดก่อนแก้เสมอ (หลักเดียวกับบท 13): Angular DevTools (extension ของ browser) แท็บ **Profiler** — กดอัด → ทำ interaction ที่ช้า → หยุด แล้วดู:

- **bar chart ต่อ change detection cycle** — cycle ไหนนานผิดปกติ (เกิน ~16ms คือกินเกิน frame budget ที่ 60fps)
- เจาะลง cycle เห็น **flame graph รายชื่อ component + เวลาที่แต่ละตัวใช้** — component ที่โผล่ซ้ำๆ ด้วยเวลาสูงคือผู้ต้องสงสัย (มักเป็น: function call ใน template, impure pipe, list ใหญ่ไม่มี track, subtree ที่ยังเป็น Eager)
- ดูได้ด้วยว่าอะไร trigger cycle นั้น — event? timer? — ช่วยจับ "ตรวจฟรี" จาก interval/mousemove ได้ตรงจุด

## 9.11 เกณฑ์เลือก: state ใหม่ใช้ signal เมื่อไหร่ RxJS เมื่อไหร่

| โจทย์ | ใช้ | เหตุผล |
|---|---|---|
| state ที่ template แสดงผล (ค่าปัจจุบันของอะไรสักอย่าง) | **signal** | sync, มีค่าเสมอ, CD เจาะจุด, อ่านง่าย |
| ค่า derive จาก state อื่น | **computed** | cache + dependency อัตโนมัติ |
| ค่า async ต่อ template (HTTP ที่ template ใช้) | **resource/httpResource** หรือ toSignal | ได้ loading/error state มาด้วย |
| event ตามเวลา: typeahead, debounce, retry, cancel, race | **RxJS** | operator จัดการ "เวลา" คือจุดแข็งที่ signals ไม่มี |
| stream ต่อเนื่องจากภายนอก: WebSocket, user gesture ซับซ้อน | **RxJS** → toSignal ที่ปลายทาง | ประมวลผลในท่อ แล้วแปลงเป็น state ตอนจะแสดง |

หลักจำสั้นๆ: **"state = signal, event ตามเวลา = RxJS แล้วจบท่อด้วย toSignal"** — รายละเอียดฝั่ง RxJS เต็มๆ คือบท 10

## คำถามสัมภาษณ์ที่ต้องตอบได้

1. **อธิบาย zone.js — มันรู้ได้ยังไงว่าต้องรัน change detection?**
→ มัน monkey-patch async API ทั้งหมดของ browser (setTimeout, Promise, event listener) แล้วรันแอปใน NgZone — เมื่อ async งานใดจบ มันแจ้ง Angular ว่า "อาจมีอะไรเปลี่ยน" Angular จึง tick: ตรวจ binding ทั้ง tree จากบนลงล่างแบบ dirty checking — ถูกต้องเสมอแต่จ่าย O(ทั้ง tree) ต่อ event และตรวจฟรีบ่อยเพราะสัญญาณมันบอกแค่ "เมื่อไหร่" ไม่บอก "ตรงไหน"

2. **OnPush ถูกตรวจเมื่อไหร่บ้าง และเคส "ใส่ OnPush แล้ว UI ไม่อัปเดต" เกิดจากอะไร?**
→ สี่เงื่อนไข: input reference เปลี่ยน / event ใน component หรือลูก / async pipe ได้ค่าใหม่ / markForCheck (รวม signal ที่ template อ่านเปลี่ยนค่า) — เคสคลาสสิกคือ mutate object เดิมแล้วส่งเป็น input: reference ไม่เปลี่ยน เงื่อนไขแรกไม่เข้า UI เลยค้าง — OnPush จึงเป็นสัญญาที่ต้องแลกด้วย immutability และตั้งแต่ v22 OnPush เป็น default แล้ว

3. **markForCheck กับ detectChanges ต่างกันยังไง?**
→ markForCheck แค่ติดธงตัวเองไล่ขึ้นถึง root ว่ารอบตรวจถัดไปห้ามข้าม — ไม่ตรวจทันที ปลอดภัย ส่วน detectChanges สั่งตรวจ subtree เดี๋ยวนี้แบบ synchronous — ใช้พร่ำเพรื่อคือสร้างรอบตรวจซ้อนและเสี่ยง ExpressionChangedAfterItHasBeenCheckedError โค้ดที่โรย detectChanges ทั่วไฟล์มักแปลว่ายังไม่เข้าใจว่าข้อมูลเปลี่ยนนอกเงื่อนไข OnPush ตรงไหน

4. **computed รู้ได้ยังไงว่าตัวเองขึ้นกับ signal ตัวไหน?**
→ runtime tracking: ตอน computed รัน มันประกาศตัวเป็น active consumer แล้วทุก signal ที่ถูกอ่านระหว่างนั้นลงทะเบียน edge กลับมา — ได้ graph ตามการอ่านจริง (dynamic dependency: branch ที่ไม่ถูกอ่านรอบนี้ไม่ถูก track) และ update เป็นแบบ mark-stale-then-pull จึง lazy และ glitch-free ไม่มีจังหวะเห็นค่าครึ่งๆ กลางๆ

5. **signals ทำให้ Angular ถอด zone.js ได้ยังไง และ zoneless ต้องเตรียมอะไร?**
→ zone.js ตอบแค่ "เมื่อไหร่ควรตรวจ" อย่างหยาบ แต่ signal graph ตอบทั้ง "เมื่อไหร่และตรงไหน" — Angular เลยเหลือ trigger จาก signal/event/markForCheck โดยไม่ต้องดัก async ทั้ง browser · zoneless stable ตั้งแต่ v20.2 และเป็น default แอปใหม่ตั้งแต่ v21 — แอปเก่าต้องทำ component ให้ OnPush-compatible ทั้งหมดและกำจัดโค้ดที่แอบพึ่ง zone (พวก "setTimeout แล้ว UI อัปเดตเอง") ก่อนถอด

6. **ทำไม function call ใน template ถึงเป็นปัญหา แล้วแก้ยังไง?**
→ ทุกรอบตรวจ Angular ต้องได้ค่ามาเทียบ จึงเรียก function ใหม่ทุกรอบเพราะพิสูจน์ความ pure ไม่ได้ — งานหนักคูณความถี่รอบตรวจ = jank และถ้าคืน object/array ใหม่ยังทำ OnPush ลูกพังด้วย — แก้ด้วย pure pipe, precompute หรือทางปัจจุบันคือ computed() ที่ cache จน dependency เปลี่ยนจริง

## สรุปท้ายบท

- change detection คือหัวใจของ Angular และการเข้าใจมันต้องมองเป็นวิวัฒนาการ ไม่ใช่แค่จำ API รุ่นล่าสุด
- zone.js, OnPush, zoneless และ signals คือคำตอบคนละยุคต่อคำถามเดียวกันเรื่อง "รู้อย่างไรว่าข้อมูลเปลี่ยน"
- signals ทำให้ Angular อธิบาย dependency และการ re-render ได้เป็นธรรมชาติมากขึ้น แต่ไม่ได้ลบความสำคัญของ mental model เดิม
- ถ้าเห็นต้นทุนของแต่ละแนวทางชัด คุณจะอ่านทั้ง codebase เก่าและใหม่ได้โดยไม่หลงศัพท์เวอร์ชัน

## ก่อนไปบทถัดไป

เมื่อ framework รู้แล้วว่าต้องวาดใหม่เมื่อไร บทถัดไปจะพาไปดูว่าข้อมูลแบบ stream และงาน async หลายเหตุการณ์ถูก model ใน Angular อย่างไรผ่าน RxJS
