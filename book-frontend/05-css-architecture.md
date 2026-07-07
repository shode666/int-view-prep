# บท 5 — CSS Architecture & Design System: ทำไม CSS ถึง "พังทั้งระบบ" ได้ และจะออกแบบยังไงไม่ให้พัง

> Dev backend มักมอง CSS ว่า "ก็แค่แต่งหน้า" จนวันที่แก้สีปุ่มหนึ่งปุ่มแล้วหน้า checkout เพี้ยนทั้งหน้า — CSS คือระบบ global mutable state ที่ใหญ่ที่สุดในแอปคุณ ทุก rule มองเห็นกันหมด ไม่มี encapsulation โดย default บทนี้ว่าด้วยกลไกที่ตัดสินว่า rule ไหนชนะ และสถาปัตยกรรมที่ทำให้ทีม 30 คนเขียน CSS ร่วมกันได้โดยไม่ฆ่ากันเอง

## เข็มทิศก่อนอ่าน

บท 4 อธิบายว่า browser วาดหน้าจออย่างไร ส่วนบทนี้ลงลึกว่า "สิ่งที่ถูกวาด" ถูกกำหนดด้วยกติกาอะไรบ้าง CSS ไม่ใช่แค่เรื่องความสวย แต่เป็นระบบ global ที่ถ้าออกแบบไม่ดีจะสร้าง coupling ข้ามทั้งแอป คล้าย shared mutable state ในระบบ backend เพียงแต่ซ่อนตัวอยู่ใน selector และ cascade

ให้อ่านบทนี้เป็นสองชั้นพร้อมกัน: ชั้นแรกคือกลไกระดับภาษา เช่น specificity, inheritance และ stacking context; ชั้นที่สองคือกฎการอยู่ร่วมกันของทีม เช่น naming, token และ component boundary ถ้าแยกสองชั้นนี้ได้ เนื้อหาเรื่อง design system และ production issue จะต่อเนื่องขึ้นมาก

## 5.1 Specificity — ศาลที่ตัดสินว่า rule ไหนชนะ

### สถานการณ์จริง

คุณเขียน `.btn-primary { background: blue }` แต่ปุ่มยังแดงอยู่ เปิด DevTools เจอ `#checkout .actions button { background: red }` ขีดฆ่า rule ของคุณ เพื่อนแนะนำ "ใส่ `!important` สิ" — และนั่นคือวินาทีที่หนี้ก้อนแรกถูกกู้

### กลไกจริง

เมื่อหลาย rule ชี้ element เดียวกัน browser ตัดสินตาม **cascade** เรียงลำดับ: (1) origin — style ของ browser/user/author, (2) cascade layer (หัวข้อ 5.2), (3) **specificity**, (4) ลำดับในไฟล์ (มาทีหลังชนะ) — specificity คือด่านที่คนตกบ่อยสุด

Specificity เป็น tuple สามช่อง **(A, B, C)** เทียบทีละช่องจากซ้าย — เหมือนเทียบเลข version (1,0,0) ชนะ (0,99,99) เสมอ ไม่มีการทด:

| ช่อง | นับจาก | ตัวอย่าง |
|---|---|---|
| A | `#id` | `#checkout` → (1,0,0) |
| B | `.class`, `[attr]`, `:pseudo-class` | `.btn:hover` → (0,2,0) |
| C | `element`, `::pseudo-element` | `button::before` → (0,0,2) |

ลองคำนวณจริงทีละตัว:

```css
#checkout .actions button   /* (1,1,1) — id หนึ่ง class หนึ่ง element หนึ่ง */
.btn-primary                /* (0,1,0) — แพ้ตั้งแต่ช่อง A: 0 < 1 จบเกม */
.actions .btn.btn-primary   /* (0,3,0) — ก็ยังแพ้ ต่อให้ class ซ้อนร้อยตัว */
button:hover.btn            /* (0,2,1) — pseudo-class นับช่อง B */
```

- ช่องซ้ายตัดสินก่อนเสมอ — ต่อให้เขียน class ซ้อนอีกสิบชั้นก็ไม่มีทางชนะ id เดียว
- Inline style (`style=""`) อยู่เหนือ tuple ทั้งหมด — แพ้แค่ `!important`
- `:where(...)` = specificity ศูนย์เสมอ, `:is(...)`/`:has(...)` = นับตาม argument ที่แรงสุด — library สมัยใหม่ใช้ `:where()` ห่อ default style เพื่อให้ user override ง่าย

### ทำไม `!important` คือหนี้

`!important` ไม่ได้ "เพิ่มแต้ม" — มัน **กลับด้านลำดับ origin ทั้งชั้น** ทางเดียวที่จะชนะ `!important` คือ `!important` ที่ specificity สูงกว่า ทีมจึงเข้าสู่ arms race: important ซ้อน important จนไฟล์ CSS กลายเป็นสนามกับระเบิด — แตะ rule ไหนไม่รู้จะระเบิดตรงไหน เหมือนกู้เงินโปะหนี้เดิม: แก้วันนี้เร็ว แต่ดอกทบทุกครั้งที่มีคนต้อง override ต่อ ที่ยอมรับได้จริงๆ มีที่เดียว: utility class ที่ **ตั้งใจ** ให้ชนะเสมอ (เช่น `.hidden { display: none !important }`)

แนวตอบ senior: "ผมคุม specificity ให้แบนที่สุด — selector เป็น single class, ห้าม id ใน stylesheet, แล้วให้ลำดับชั้นถูกจัดการด้วย @layer แทนการแข่งความแรงของ selector"

## 5.2 Cascade Layers — จบสงคราม specificity ด้วยการประกาศลำดับชั้น

`@layer` (Baseline widely available แล้ว — ทุก browser หลักรองรับตั้งแต่ 2022 ใช้ production ได้เต็มตัวในปี 2026) เพิ่มด่านตัดสิน **ก่อน** specificity: rule ใน layer ที่ประกาศทีหลังชนะ layer ก่อนหน้า **โดยไม่สน specificity ข้าม layer เลย**

```css
/* ประกาศลำดับครั้งเดียวที่ต้นทาง — ซ้ายแพ้ขวา */
@layer reset, vendor, components, utilities;

@layer vendor {
  /* CSS ของ library ภายนอก — ต่อให้ selector แรงแค่ไหน */
  #datepicker .day.selected { background: purple; } /* (1,2,1) */
}
@layer components {
  /* ก็แพ้ class เดียวของเรา เพราะ components อยู่ชั้นสูงกว่า */
  .day-selected { background: var(--brand); }       /* (0,1,0) ชนะ! */
}
```

นี่คือการเปลี่ยนกติกาจาก "ใครตะโกนดังกว่าชนะ" เป็น "ผังองค์กรชัดเจนว่าใครมีอำนาจเหนือใคร" — vendor CSS ที่เคยต้อง `!important` สู้ ตอนนี้แค่จับยัดลง layer ล่าง (`@import url(vendor.css) layer(vendor);`) จบ ข้อควรระวังเดียว: style **นอก layer ชนะทุก layer** — ทีมต้องตกลงว่าทุกอย่างอยู่ใน layer ไม่งั้นของหลุด layer กลายเป็น boss ลับ

## 5.3 Stacking Context — ทำไม z-index: 9999 ไม่ทำงาน

### สถานการณ์จริง

Dropdown ของคุณ `z-index: 9999` แต่โดน header `z-index: 10` ทับ เพิ่มเป็น 999999 ก็ไม่ช่วย — เพราะปัญหาไม่ใช่ตัวเลข

### กลไกจริง

`z-index` ไม่ใช่เลขชั้น global — มันเทียบกันได้เฉพาะใน **stacking context** เดียวกัน คิดแบบเลขที่บ้าน: บ้านเลขที่ 9999 ใน**ซอย 3** ไม่ได้อยู่ "หลัง" บ้านเลขที่ 10 ใน**ซอย 5** — ลำดับซอยตัดสินก่อน เลขบ้านตัดสินแค่ภายในซอย ถ้า parent ของ dropdown สร้าง context ที่ตัวมันอยู่ต่ำกว่า header ทั้งซอย ลูกข้างในจะเบ่งเลขแค่ไหนก็ออกไม่พ้นซอยตัวเอง

สิ่งที่สร้าง stacking context ใหม่ (ตัวที่เจอบ่อย):

- `position: relative/absolute` + `z-index` ที่ไม่ใช่ `auto` / `position: fixed`, `sticky` (สองตัวหลังสร้างเสมอ)
- `opacity < 1`, `transform`, `filter`, `will-change`, `contain: paint` — **กลุ่มนี้คือฆาตกรเงียบ**: ใส่ `transform` เพื่อ animate (บท 4) แล้ว z-index ลูกพังโดยไม่รู้ตัว
- `isolation: isolate` — สร้าง context ตรงๆ แบบตั้งใจ (ใช้กันลูก "ทะลุ" ออกไปตีกับชาวบ้าน)

วิธี debug อย่างเป็นระบบ: เปิด DevTools ไล่จาก element ที่ซ้อนผิดขึ้นไปหา ancestor ที่สร้าง context (Chrome/Edge มี Layers panel, Firefox ติด badge บอกเลย) แล้วถามว่า "สองซอยนี้ ซอยไหนถูกวางไว้สูงกว่า" — แก้ที่ลำดับของซอย ไม่ใช่เบ่งเลขบ้าน ทางแก้เชิงโครงสร้างที่ดีที่สุดสำหรับ modal/dropdown/toast: render ผ่าน **portal ไปที่ท้าย `<body>`** (React `createPortal` — บท 6) หรือใช้ `<dialog>`/Popover API ที่ browser วางบน **top layer** — ชั้นพิเศษเหนือ stacking ทั้งหมด — ให้เลย

## 5.4 Position ทั้งห้า และเงื่อนไขที่ sticky ไม่ทำงาน

| ค่า | อยู่ใน flow? | อ้างพิกัดจาก | จุดที่คนพลาด |
|---|---|---|---|
| `static` | ✅ | — (top/left ไม่มีผล) | default — ใส่ z-index ไปก็เฉย |
| `relative` | ✅ (จองที่เดิม) | ตำแหน่งเดิมของตัวเอง | ขยับภาพ แต่ที่ว่างเดิมยังค้าง |
| `absolute` | ❌ หลุดจาก flow | ancestor ใกล้สุดที่ positioned | ลืมใส่ `relative` ที่ parent → ไปอ้าง viewport |
| `fixed` | ❌ | viewport | ancestor มี `transform` → กลายเป็นอ้าง ancestor นั้นแทน! |
| `sticky` | ✅ จนถึง threshold | scroll container ใกล้สุด | เงื่อนไขเยอะ — ดูข้างล่าง |

`sticky` = relative จนกระทั่ง scroll ถึงเส้น (`top: 0`) แล้วกลายเป็น fixed **ภายในกรอบ parent เท่านั้น** — เหมือนหมาผูกสายจูง: เดินตามฝูงไปเรื่อยๆ จนสายตึงก็หยุดค้างอยู่กับที่ แต่พ้นระยะสายจูง (ขอบ parent) เมื่อไหร่ก็โดนลากไปต่อ

sticky "ไม่ทำงาน" เมื่อ: (1) ลืมกำหนด `top/bottom` — ไม่มีเส้น threshold ก็ไม่มีอะไร trigger, (2) ancestor ใดๆ ระหว่างทางมี `overflow: hidden/auto/scroll` — scroll container กลายเป็นตัวนั้นแทน viewport แล้วมันไม่ scroll ก็เลยไม่ sticky (บั๊กอันดับหนึ่งของ sticky — ไล่หาด้วยการ loop เช็ค `getComputedStyle(el).overflow` ขึ้นไปทีละชั้น), (3) parent สูงเท่าตัว sticky พอดี — สายจูงยาวศูนย์ ไม่มีระยะให้ค้าง

## 5.5 Flexbox vs Grid — เกณฑ์เลือกที่ไม่ใช่ความชอบ

เกณฑ์เดียวที่ใช้ได้จริง: **เนื้อหากำหนดขนาด หรือโครงกำหนดขนาด?**

- **Flexbox = หนึ่งมิติ, content-out**: เรียงของตามแถวหรือคอลัมน์เดียว ให้ขนาดเนื้อหาเจรจากันเอง (ยืด/หด) — navbar, toolbar, ปุ่มชิดขวา, tag list ที่ wrap เอง
- **Grid = สองมิติ, layout-in**: ประกาศโครงตารางก่อนแล้ววางของลงช่อง แถวกับคอลัมน์สัมพันธ์กัน — page shell (header/sidebar/main/footer), card gallery, form สองคอลัมน์ที่ label ต้องตรงแนว

```css
/* Grid สำหรับโครงหน้า — โครงกำหนดขนาด */
.shell {
  display: grid;
  grid-template-areas: "side head" "side main";
  grid-template-columns: 240px 1fr;
  grid-template-rows: 56px 1fr;
}
/* Flexbox สำหรับแถวเครื่องมือ — เนื้อหากำหนดขนาด */
.toolbar { display: flex; gap: 8px; align-items: center; }
.toolbar .spacer { flex: 1; } /* ดันของที่เหลือไปชิดขวา */
```

ตัวอย่างชี้ขาด: card grid ที่ "ทุกใบต้องสูงเท่ากันและปุ่มอยู่ล่างเสมอ" — Grid จัดแถวให้สูงเท่ากันข้ามใบ (สิ่งที่ flexbox ทำไม่ได้เพราะแต่ละแถว wrap เป็นอิสระ) และ `subgrid` (Baseline แล้ว — ทุก browser หลักตั้งแต่ปลาย 2023) ให้ **ลูก** ของ card แชร์เส้นแถวของ grid ปู่ได้ — title/body/ปุ่ม ของทุกใบตรงแนวกันจริงๆ โดยไม่ต้อง hack ความสูง และสองตัวนี้ไม่ใช่คู่แข่ง: grid วางโครง flexbox จัดของในช่อง — ใช้ซ้อนกันคืองานปกติ

## 5.6 Responsive สมัยใหม่ — จาก viewport สู่ container

Media query ถามคำถามเดียว: "จอกว้างเท่าไหร่" แต่ component ยุค design system ไม่รู้ว่าตัวเองจะถูกวางที่ไหน — Card ตัวเดียวกันอยู่ใน sidebar แคบก็ได้ อยู่ใน main กว้างก็ได้ **Container queries** (`@container` — Baseline ตั้งแต่ 2023, widely available แล้ว) ให้ component ถาม **กล่องที่ตัวเองอยู่** แทน:

```css
.card-slot { container-type: inline-size; } /* ประกาศให้กล่องนี้เป็นจุดอ้างอิง */

@container (min-width: 400px) {
  .card { grid-template-columns: 120px 1fr; } /* ที่กว้างพอ → รูปซ้ายข้อความขวา */
}
/* ต่ำกว่า 400px → เรียงแนวตั้งตาม default — ไม่ว่าจออะไรก็ตาม */
```

นี่คือการย้าย responsive จาก "ออกแบบทั้งหน้า" เป็น "component รับผิดชอบตัวเอง" — media query ยังใช้กับเรื่องระดับหน้า (ซ่อน sidebar, เปลี่ยน nav) ส่วนภายใน component เป็นเขตของ container query

เครื่องมือเสริมอีกสองตัวที่เป็น Baseline แล้วทั้งคู่: **`clamp(min, preferred, max)`** ทำ fluid typography ไร้ breakpoint — `font-size: clamp(1rem, 0.8rem + 1vw, 1.5rem)` ไต่ตามจอแบบมีเพดาน-มีพื้น และ **`:has()`** (parent selector ที่รอกันมาสิบปี — รองรับครบทุก browser หลักแล้ว) ให้ style ไหลขึ้นได้: `form:has(.error) .submit { opacity: .5 }` — เดิมต้องใช้ JS toggle class เท่านั้น ระวังอย่างเดียว: `:has()` แพงกว่า selector ปกติ อย่าใช้แบบกวาดกว้าง (`body:has(...)`) บน DOM ใหญ่

อีกตัวที่ตัด tooling ออกจากสมการ: **CSS nesting แบบ native** เป็น Baseline แล้วเช่นกัน (ทุก browser หลักตั้งแต่ปลาย 2023) — เขียนซ้อนได้เลยไม่ต้องพึ่ง Sass:

```css
.card {
  padding: 16px;
  & .title { font-weight: 600; }      /* = .card .title */
  &:hover { box-shadow: var(--elev-2); }
  @container (min-width: 400px) {      /* ซ้อน at-rule ได้ด้วย */
    display: grid;
  }
}
```

กับดักของ nesting คือกับดักเดิมของ Sass: ซ้อนลึก = selector ยาว = specificity สูงขึ้นและผูก style ติดกับโครง DOM — กติกาทีมที่ใช้ได้จริงคือซ้อนไม่เกิน 2 ชั้น และซ้อนเฉพาะ state/variant (`&:hover`, `&[aria-expanded="true"]`) ไม่ใช่ซ้อนตามโครงสร้าง markup

## 5.7 สี่สาย Styling — วิเคราะห์ตามบริบท ไม่เชียร์ค่าย

| | BEM (convention) | CSS Modules | Tailwind (v4.x ปี 2026) | CSS-in-JS (runtime) |
|---|---|---|---|---|
| Scoping | วินัยล้วน — เครื่องมือไม่บังคับ | build-time hash — ชนกันไม่ได้ | utility ไม่มี scope ให้ชน | อัตโนมัติต่อ component |
| Performance | CSS เพียว เร็วสุด | CSS เพียว + code-split ตาม component | ไฟล์ CSS เดียวเล็กมาก (utility ซ้ำใช้ร่วม) | จ่าย runtime ทุก render; ขัดกับ RSC/streaming (บท 6) |
| DX | เขียนยาว ตั้งชื่อเหนื่อย | สลับไฟล์ไปมา | เร็วมากเมื่อชิน; class ยาวอ่านยาก | style อยู่กับ logic, dynamic ง่ายสุด |
| ทีมใหญ่ | พังถ้าคนใหม่ไม่รู้ convention | ปลอดภัย แต่ต้องคุม design consistency เอง | consistency มาจาก config กลาง; review เห็น style ใน markup เลย | เสี่ยง style กระจัดกระจาย + ผูกกับ framework |

วิธีอ่านตารางแบบ senior — เลือกจาก**ข้อจำกัดของทีมและระบบ** ไม่ใช่รสนิยม:

- ทีมมี design system เข้มแข็ง + อยาก enforce ผ่านเครื่องมือ → **Tailwind** (v4 ย้าย config มาเป็น CSS-first ผ่าน `@theme` และ token ทั้งหมดกลายเป็น CSS custom properties — เข้ากับหัวข้อ 5.8 พอดี)
- ทีมที่ CSS แข็งแรงอยู่แล้ว อยากได้ scope โดยไม่เปลี่ยนวิธีเขียน → **CSS Modules**
- Legacy codebase / ทีมผสม backend เขียนบ้าง → **BEM** เพราะไม่ต้องพึ่ง build tooling
- ต้องการ theme ที่คำนวณ runtime จริงจัง → CSS-in-JS แบบ **zero-runtime** (vanilla-extract, StyleX ที่ compile ทิ้งตอน build) — ส่วน runtime CSS-in-JS ดั้งเดิมกำลังถูกบีบออกจากสมการเพราะ Server Components (บท 6) ไม่มี runtime ฝั่ง client ให้มันเกาะ

ใช้ผิดพังยังไง: เลือก Tailwind แต่ไม่ล็อค design token → class ตามใจฉัน (`mt-[13px]`) เกลื่อน = ได้ inline style ที่แต่งตัวมาดี; เลือก BEM ในทีม 40 คนไม่มี linter คุมชื่อ → global namespace แตกภายในสองไตรมาส

## 5.8 Design Token — สามชั้นที่ทำให้ dark mode ไม่ใช่การไล่แก้สี

Design token คือ "การตัดสินใจเชิง design ที่ถูกตั้งชื่อ" — ไม่ใช่แค่ตัวแปรสี โครงสร้างที่ scale ได้ต้องมี **สามชั้น** เหมือนโครงสร้างเงินเดือน: ค่าเงินดิบ (primitive) → ตำแหน่งงาน (semantic) → เงินเดือนของพนักงานคนหนึ่ง (component) — HR ปรับฐานเงินเดือนที่ตำแหน่ง ไม่ไล่แก้ทีละคน

```css
/* ชั้น 1 — Primitive: ค่าดิบ ไม่มีความหมาย ห้ามใช้ตรงๆ ใน component */
:root {
  --blue-600: oklch(0.55 0.18 260);
  --gray-900: oklch(0.2 0 0);
  --gray-50:  oklch(0.98 0 0);
}
/* ชั้น 2 — Semantic: ตั้งชื่อตาม "บทบาท" — ชั้นเดียวที่ theme สลับ */
:root {
  --color-bg: var(--gray-50);
  --color-text: var(--gray-900);
  --color-action: var(--blue-600);
}
[data-theme="dark"] {
  --color-bg: var(--gray-900);   /* สลับ mapping ไม่ใช่เขียนสีใหม่ */
  --color-text: var(--gray-50);
}
/* ชั้น 3 — Component: อ้าง semantic เท่านั้น */
.button-primary { background: var(--color-action); }
```

Dark mode ที่ทำถูกคือ **สลับ mapping ชั้น semantic ชั้นเดียว** — component ไม่ต้องรู้ด้วยซ้ำว่ามี theme อยู่ ทำผิดคือ `.dark .button { background: #1a1a2e }` ไล่ override รายตัว: component ที่ร้อยจะมีร้อย override แล้ววันที่เพิ่ม theme ที่สาม คุณจะเขียนใหม่ทั้งหมด อย่าลืมตั้ง `color-scheme: light dark` ให้ browser ปรับ scrollbar/form control ตาม theme ด้วย

ข่าวใหญ่ที่ interviewer ปี 2026 อาจโยน: **W3C DTCG (Design Tokens Community Group) ออก spec เวอร์ชัน stable แรกแล้ว (2025.10, ตุลาคม 2025)** — ไฟล์ token กลาง (JSON `.tokens` มี `$value`/`$type`) ที่ Figma, Penpot, Style Dictionary, Tokens Studio อ่านร่วมกัน แปลว่า pipeline "designer แก้ token ใน Figma → build ออกมาเป็น CSS custom properties อัตโนมัติ" กลายเป็นมาตรฐานจริง ไม่ใช่ของเล่นเฉพาะทีมอีกต่อไป

## 5.9 Modal ที่ถูกต้องเชิง CSS และงาน CSS ในทีมใหญ่

Modal คือจุดที่ทุกหัวข้อในบทนี้มาบรรจบ ทางที่ถูกในปี 2026 คือ `<dialog>`:

```html
<dialog id="confirm">
  <p>ยืนยันการลบ?</p>
  <button>ลบ</button> <button autofocus>ยกเลิก</button>
</dialog>
```

```js
confirm.showModal(); // ไม่ใช่ .show() — modal จริงต้อง showModal()
```

สิ่งที่ได้ฟรี: อยู่บน **top layer** (จบปัญหา z-index/stacking ของ 5.3 ถาวร — ไม่มีเลขไหนทับได้), `::backdrop` ให้ style ฉากหลัง, Esc ปิดให้, focus trap และการกัน interact กับพื้นหลังให้ระดับ browser เดิมต้อง JS ร้อยบรรทัด (รายละเอียด focus management + ARIA ที่ยังต้องทำเองอยู่ → บท 14) จุดที่ต้องเสริมเองเชิง CSS: กัน background scroll ด้วย `body:has(dialog[open]) { overflow: hidden }` — `:has()` ใช้งานจริงแล้วตามหัวข้อ 5.6

ปิดท้ายด้วยเรื่องที่ทำให้ CSS "อยู่รอด" ในทีมใหญ่ — เครื่องมือทั้งบทนี้ต้องถูกประกอบเป็นระบบ:

1. **ประกาศผัง @layer เดียวทั้งแอป** (reset → vendor → tokens → components → utilities) — จบสงคราม specificity เชิงโครงสร้าง
2. **Stylelint บังคับกติกา** — ห้าม id selector, ห้ามสี hardcode (ต้องผ่าน token), เพดาน specificity — วินัยที่ enforce ด้วยเครื่องเท่านั้นที่รอดในทีมใหญ่ (หลักเดียวกับ architecture test ในเล่ม backend บท 5)
3. **Visual regression test** — CSS ไม่มี type checker, ผลลัพธ์คือภาพ ดังนั้น test ที่ตรงไปตรงมาที่สุดคือถ่าย screenshot component เทียบ pixel กับ baseline ทุก PR (Chromatic/Playwright — วิธี set up และจัดการ flaky → บท 15) ทีมที่ไม่มีสิ่งนี้จะไม่มีวันกล้า refactor CSS

## คำถามสัมภาษณ์ที่ต้องตอบได้

1. **specificity คำนวณยังไง แล้วทำไม !important ถึงเรียกว่าหนี้?** → tuple (id, class/attr/pseudo-class, element) เทียบทีละช่องไม่มีทด; `!important` กลับด้าน cascade ทั้งชั้น ทางแก้เดียวคือ important ที่แรงกว่า เกิด arms race ที่ทุก override ในอนาคตแพงขึ้น — คุมด้วย selector แบนๆ + @layer แทน

2. **z-index: 9999 แล้วยังโดนทับ — เกิดอะไรขึ้น?** → element อยู่ใน stacking context ที่ ancestor สร้าง (มักโดน `transform`/`opacity`/`filter` แบบไม่ตั้งใจ) z-index เทียบได้เฉพาะในซอยเดียวกัน — ไล่หา ancestor ที่สร้าง context แล้วแก้ลำดับระดับซอย หรือย้ายไป portal/top layer (`<dialog>`)

3. **sticky ไม่ติด — debug ยังไง?** → เช็คสามอย่าง: มี `top/bottom` เป็น threshold ไหม, มี ancestor `overflow` ที่ไม่ใช่ visible คั่นไหม (ตัวการอันดับหนึ่ง), parent มีความสูงเหลือให้ค้างไหม

4. **เลือก flexbox หรือ grid ด้วยเกณฑ์อะไร?** → เนื้อหากำหนดขนาด (หนึ่งมิติ, เจรจากันเอง) → flex; โครงกำหนดขนาด (สองมิติ, แถว-คอลัมน์สัมพันธ์กัน) → grid; ใช้ซ้อนกันคือเรื่องปกติ — grid วางโครง flex จัดในช่อง; ต้องการแนวตรงข้าม card → subgrid

5. **จะออกแบบ theming ให้รองรับ dark mode และ theme อนาคตยังไง?** → token สามชั้น primitive → semantic → component; component อ้าง semantic เท่านั้น theme คือการสลับ mapping ชั้น semantic ชั้นเดียว ไม่ใช่ override สีรายตัว; ปี 2026 มี DTCG spec stable ให้ sync token จาก design tool เข้ามาเป็น pipeline เดียว

6. **ทีม 30 คนเขียน CSS ยังไงไม่พัง?** → โครงสร้าง (@layer + scoping จากเครื่องมือ เช่น CSS Modules/Tailwind) + วินัยที่ enforce ด้วยเครื่อง (stylelint ห้าม hardcode/id) + ตาข่ายนิรภัย (visual regression ทุก PR) — สามขาขาดขาไหนก็ล้ม

## สรุปท้ายบท

- CSS เป็นระบบ global ที่ไม่มี encapsulation โดยธรรมชาติ จึงต้องเข้าใจทั้งกติกาภาษาและกติกาการอยู่ร่วมกันของทีม
- specificity, cascade, layout และ stacking context คือกลไกพื้นฐานที่อธิบายอาการ "แก้จุดเดียวพังอีกจุด" ได้แทบทั้งหมด
- สถาปัตยกรรม CSS ที่ดีไม่ได้ทำให้แค่เขียนสวยขึ้น แต่ทำให้ dependency ระหว่าง component และทีมลดลง
- design system จะยั่งยืนก็ต่อเมื่อเชื่อม token, component boundary และวิธีใช้งานจริงเข้าหากัน

## ก่อนไปบทถัดไป

หลังจากปูพื้น browser และ CSS แล้ว บทถัดไปจะเริ่มเข้าสู่ React โดยดูคำถามแกนที่สุดก่อนว่า framework นี้ render อย่างไร และเพราะอะไร component ถึง re-render ได้แม้ DOM แทบไม่เปลี่ยน
