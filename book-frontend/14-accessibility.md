# บท 14 — Accessibility: ทำไมโค้ดที่ใช้คีย์บอร์ดได้ครบคือ proxy ของคุณภาพโค้ดทั้งระบบ

> ประโยคแกนของบท: **Accessibility ไม่ใช่ฟีเจอร์พิเศษสำหรับคนกลุ่มเล็ก — มันคือ proxy ของคุณภาพโค้ด**: แอปที่ใช้ keyboard ได้ครบ แปลว่าโครงสร้าง DOM ถูกต้อง, state ชัด, focus ถูกจัดการ — ซึ่งเป็นสิ่งเดียวกับที่ทำให้ test ง่ายและบั๊กน้อย

## เข็มทิศก่อนอ่าน

บทนี้ไม่ใช่ภาคเสริมของงาน frontend แต่เป็นบทที่เอาหลายหลักการก่อนหน้ามาตรวจสอบคุณภาพจริงอีกที ถ้า DOM semantics จากบท 4 ผิด, state flow จากบท 7 มั่ว, หรือ interaction timing จากบท 13 แย่ accessibility จะเป็นจุดแรก ๆ ที่ฟ้องออกมา

ให้อ่านด้วยมุมว่า a11y เป็น design constraint ตั้งแต่ต้น ไม่ใช่ checklist ท้ายโปรเจกต์ ถ้าเปลี่ยนมุมนี้ได้ เนื้อหาบท testing และ production จะเห็นชัดขึ้นทันทีว่าทำไมทีมที่ใส่ใจ accessibility มักได้ทั้ง quality และ maintainability ตามมาด้วย

## Accessibility คืออะไร ก่อนจะคุยว่าทำไมมันสำคัญ

**Accessibility** ในบริบทของเว็บคือการออกแบบและพัฒนาให้คนที่มีข้อจำกัดต่างกันยัง **รับรู้ (perceive), เข้าใจ (understand), เดินทางในระบบ (navigate), และสั่งงานได้ (operate)** โดยไม่ถูกกันออกจากประสบการณ์หลักของแอป

แปลเป็นภาษาง่ายที่สุด: เรากำลังพยายามทำให้ "การใช้เว็บ" **ไม่ผูกกับความสามารถแบบเดียว** เช่น ต้องมองเห็นดี, ต้องใช้เมาส์ได้คล่อง, ต้องได้ยินเสียง, ต้องอ่านตัวอักษรเล็กเร็ว, หรือต้องมีมือสองข้างว่างพร้อมกัน

คนที่ได้ประโยชน์จาก accessibility ไม่ได้มีแค่ผู้ใช้ที่มีความพิการถาวร แต่รวมถึง:

- คนที่ใช้ **screen reader** เพราะมองไม่เห็นหรือมองเห็นจำกัด
- คนที่ใช้ **keyboard อย่างเดียว** เพราะใช้เมาส์ไม่ได้หรือไม่สะดวก
- คนที่ต้องการ **ตัวอักษรชัด โครงสร้างชัด contrast พอ** เพราะสายตาไม่ดีหรืออยู่กลางแดด
- คนที่มีข้อจำกัดชั่วคราวหรือเชิงสถานการณ์ เช่น มือข้างหนึ่งไม่ว่าง, เมาส์เสีย, เน็ตช้า, เครื่องเก่า, สมาธิสั้น, หรือกำลังใช้งานในสภาพแวดล้อมที่รบกวนมาก

ถ้ามองในเชิงวิศวกรรม accessibility จึงไม่ใช่ "โหมดพิเศษ" ที่ค่อยเติมให้คนบางกลุ่มทีหลัง แต่มันคือการถามว่า:

- element นี้สื่อความหมายชัดพอไหม
- ใช้ได้โดยไม่ต้องพึ่งเมาส์อย่างเดียวไหม
- เมื่อ state เปลี่ยน ผู้ใช้ทุกแบบรับรู้ไหม
- ถ้าผู้ใช้ไม่ได้เห็นหน้าจอแบบที่เราเห็น เขายังทำงานเดียวกันสำเร็จไหม

ตัวอย่างง่ายที่สุด:

```html
<!-- คนเห็นอาจพอเดาได้ว่ากดได้ แต่เครื่องมือช่วยอ่านไม่รู้ว่าคืออะไร -->
<div onclick="save()">บันทึก</div>

<!-- browser และ assistive tech รู้ตรงกันว่านี่คือปุ่ม -->
<button type="button" onclick="save()">บันทึก</button>
```

สองบรรทัดนี้หน้าตาอาจแต่งให้เหมือนกันได้ แต่ "ความหมาย" และ "ความสามารถในการเข้าถึง" ต่างกันมาก บทนี้ทั้งบทจึงไม่ได้คุยแค่ว่าใช้ tag ไหน แต่กำลังคุยว่าทำอย่างไรให้ **ความหมาย, interaction, state และ feedback** ของ UI ไปถึงผู้ใช้ทุกแบบได้จริง

## ทำไม a11y ไม่ใช่ nice-to-have

สถานการณ์จริง: ทีมทำ e-commerce เสร็จ ส่งมอบ ลูกค้าฝั่งยุโรปตีกลับพร้อมรายงาน audit หนา 40 หน้า — ปุ่ม checkout เป็น `<div>` ที่ screen reader มองไม่เห็น, modal เปิดแล้ว keyboard หลุดไปหลังฉาก, form error ไม่มีใครได้ยิน ทีมต้องรื้อ component library ทั้งชุด เพราะ **a11y (accessibility — ย่อจาก a + 11 ตัวอักษร + y) เป็นสิ่งที่ retrofit แพงที่สุดอย่างหนึ่ง** — มันฝังอยู่ในโครงสร้าง ไม่ใช่สีทาทับ

เหตุผลที่ senior ต้องไล่ได้ครบสี่ข้อ:

1. **ผู้ใช้จริงจำนวนมาก** — WHO ประเมินว่า ~16% ของประชากรโลก (1.3 พันล้านคน) มีความพิการรูปแบบใดรูปแบบหนึ่ง และนั่นยังไม่นับ situational impairment: แขนหักชั่วคราว, ถือลูกมือเดียว, จอกลางแดด, เมาส์พัง — ทุกคนเป็น "ผู้ใช้ keyboard-only" ได้ในบางวัน
2. **กฎหมายบังคับแล้ว ไม่ใช่กำลังจะ** — **EAA (European Accessibility Act)** มีผลบังคับใช้ 28 มิถุนายน 2025: e-commerce, banking, ticketing ที่ขายให้ผู้บริโภคใน EU ต้อง accessible ไม่ว่าบริษัทอยู่ที่ไหน โทษสูงได้ถึงหลักแสนยูโรหรือ % ของรายได้ และเริ่มมีคดีจริงแล้ว (ในฝรั่งเศส ศาล (tribunal de Caen) สั่งให้ Carrefour ทำเว็บ e-commerce ให้ accessible ภายใน 6 เดือน — คดีอยู่ระหว่างอุทธรณ์ ตรวจสถานะล่าสุดก่อนอ้างในห้องสัมภาษณ์) เกณฑ์เทคนิคที่ใช้อ้างอิงคือ EN 301 549 ซึ่งอิง **WCAG (Web Content Accessibility Guidelines)** ระดับ AA — ฝั่งอเมริกามี **ADA (Americans with Disabilities Act)** ที่ฟ้องกันเป็นพันคดีต่อปีอยู่แล้ว
3. **SEO** — Google bot คือ "ผู้ใช้ตาบอดที่รวยที่สุดในโลก": มันอ่าน semantic structure, heading, alt text แบบเดียวกับ screen reader — หน้าที่ a11y ดีมักถูก index ดีไปด้วย
4. **Proxy ของ quality** — ถ้า Tab ไล่ครบทุก interaction ได้ แปลว่า DOM เป็น interactive element จริง, ถ้า screen reader อ่าน state ออก แปลว่า state สะท้อนอยู่ใน DOM ไม่ได้ซ่อนใน JS — และนั่นคือเหตุผลที่ Testing Library query ด้วย role ได้ (บท 15)

แนวตอบ senior: *"ผมมอง a11y เป็น requirement ตั้งแต่ design ไม่ใช่ backlog ท้ายโปรเจกต์ — เหตุผลเชิงธุรกิจคือ EAA บังคับใช้แล้วตั้งแต่กลางปี 2025 และเหตุผลเชิงวิศวกรรมคือโค้ดที่ accessible คือโค้ดที่โครงสร้างดี ซึ่งได้ testability ฟรีมาด้วย"*

## Semantic HTML ก่อน ARIA เสมอ

บั๊กคลาสสิก: `<div onClick={submit}>` ดูเหมือนปุ่มทุกประการ — จนผู้ใช้กด Tab แล้วข้ามมันไป, กด Enter แล้วเงียบ, screen reader อ่านว่า "submit" เฉยๆ โดยไม่บอกว่ากดได้

เทียบสิ่งที่ browser ให้ฟรีเมื่อใช้ element ถูกตัว:

| ความสามารถ | `<button>` | `<div onClick>` |
|---|---|---|
| อยู่ใน tab order (โฟกัสได้) | ✅ ฟรี | ❌ ต้องเติม `tabindex="0"` |
| กด Enter/Space แล้วทำงาน | ✅ ฟรี | ❌ ต้องเขียน `onKeyDown` เอง |
| Screen reader ประกาศว่า "button" | ✅ ฟรี | ❌ ต้องเติม `role="button"` |
| สถานะ disabled + หลุดจาก tab order | ✅ `disabled` | ❌ ทำเองทั้งหมด |
| ทำงานใน form (submit) | ✅ ฟรี | ❌ ไม่มีทาง |

```html
<!-- ❌ ต้องเขียนเลียนแบบ 4 อย่างและมักลืมสักอย่าง -->
<div class="btn" tabindex="0" role="button"
     onclick="save()" onkeydown="if(e.key==='Enter'||e.key===' ') save()">บันทึก</div>

<!-- ✅ ทุกอย่างข้างบนได้ฟรี -->
<button type="button" class="btn" onclick="save()">บันทึก</button>
```

**ARIA (Accessible Rich Internet Applications)** คือชุด attribute ที่บอก assistive technology ว่า element นี้ "เป็นอะไร อยู่สถานะไหน" — แต่กฎข้อแรกของ ARIA จากสเปกเองคือ **"don't use ARIA"**: ถ้ามี native element ที่ทำหน้าที่นั้น ให้ใช้ native ก่อนเสมอ เพราะ ARIA เป็นแค่**ป้ายบอกทาง ไม่ใช่ถนน** — `role="button"` ทำให้ screen reader *พูดว่า* button แต่ไม่ได้ทำให้กด Enter ได้จริง ป้ายเขียนว่า "สะพานข้างหน้า" ทั้งที่ไม่มีสะพาน อันตรายกว่าไม่มีป้ายเสียอีก

ใช้ผิดพังยังไง: ARIA ที่ใส่มั่วแย่กว่าไม่ใส่ — `role="menu"` บน navigation ธรรมดาทำให้ screen reader คาดหวัง arrow-key navigation แบบ menu จริง (ตาม **APG — ARIA Authoring Practices Guide** ของ W3C) พอกดแล้วไม่ตอบสนอง ผู้ใช้ติดกับดักที่เราสร้างเอง

แนวตอบ senior: *"หลักผมคือ semantic HTML ก่อน ARIA เสมอ — button, a, label, select ให้ focus, keyboard, role ฟรีทั้งหมด ARIA ใช้เฉพาะ pattern ที่ HTML ไม่มี เช่น tabs หรือ combobox และต้องทำ keyboard behavior ตาม APG ให้ครบ ไม่ใช่แปะ role อย่างเดียว"*

## Landmark และ Heading Structure

Screen reader ไม่ได้ "อ่านไล่บนลงล่าง" — ผู้ใช้ที่ชำนาญกระโดดด้วย landmark และ heading เหมือนเราสแกนหน้าด้วยตา ถ้าหน้าไม่มีโครงสร้าง เขาต้องฟังทีละบรรทัดเหมือนหาห้องในตึกที่ไม่มีป้ายชั้น

- **Landmark** = `<header>` `<nav>` `<main>` `<aside>` `<footer>` — ควรมี `<main>` เดียวต่อหน้า, `<nav>` หลายตัวให้ตั้งชื่อด้วย `aria-label="หลัก"` / `aria-label="breadcrumb"`
- **Heading** = `<h1>`–`<h6>` ไล่ตามลำดับชั้นเนื้อหา *ไม่ใช่ตามขนาดฟอนต์* — อยากได้ตัวเล็กให้แก้ CSS ไม่ใช่กระโดดจาก h1 ไป h4 ถ้าลำดับกระโดด ผู้ใช้ screen reader จะสงสัยว่าพลาดส่วนไหนไป

## Keyboard Navigation

กติกาแกน: **ทุก interaction ต้องมี keyboard path** — hover-only dropdown, drag-only reorder, swipe-only delete คือ dead end ของผู้ใช้ keyboard (WCAG 2.2 เพิ่ม SC "Dragging Movements" มาบังคับเรื่องนี้ตรงๆ: ทุก drag ต้องมีทางเลือกแบบ single pointer/ปุ่ม)

- **Tab order เดินตาม DOM order** — อยากให้ลำดับ focus ถูก ให้เรียง DOM ให้ถูก อย่าใช้ CSS `order` สลับภาพจนตาเห็นอย่าง focus เดินอีกอย่าง
- `tabindex="0"` = เข้า tab order ตามธรรมชาติ / `tabindex="-1"` = โฟกัสได้ด้วยโค้ด (`el.focus()`) แต่ Tab ไม่แวะ / **`tabindex="5"` (บวก) = ห้ามใช้** เพราะสร้างลำดับพิเศษที่แซงทุก element ปกติ — เหมือนแทรกคิวโรงพยาบาล ระบบคิวทั้งตึกพังเพราะคนเดียว
- **Focus visible** — `outline: none` โดยไม่มีอะไรทดแทน = ปิดตาผู้ใช้ keyboard ทั้งเว็บ ใช้ `:focus-visible` แทน: โชว์ ring เฉพาะตอนมาด้วย keyboard ไม่โชว์ตอนคลิกเมาส์ (แก้ pain ที่ designer เกลียด ring) และ WCAG 2.2 เพิ่ม "Focus Not Obscured" — focus แล้วต้องไม่โดน sticky header/cookie banner บัง

```css
button:focus { outline: none; }          /* ❌ บาปคลาสสิก */
button:focus-visible {                   /* ✅ เห็นเฉพาะผู้ใช้ keyboard */
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

**Skip link** — ของเล็กที่ audit เจอบ่อยสุด: ผู้ใช้ keyboard เข้าเว็บแล้วต้อง Tab ผ่าน nav 40 ลิงก์ก่อนถึงเนื้อหา*ทุกหน้า* แก้ด้วยลิงก์แรกสุดของ DOM ที่ซ่อนไว้จนกว่าจะถูก focus:

```html
<a class="skip-link" href="#main">ข้ามไปเนื้อหาหลัก</a>
<!-- CSS: ซ่อนนอกจอ แล้วโผล่เมื่อ :focus — ห้ามใช้ display:none เพราะจะโฟกัสไม่ได้เลย -->
<main id="main" tabindex="-1">...</main>
```

**Roving tabindex** — pattern สำหรับ composite widget (toolbar, tabs, menu): ทั้งกลุ่มกิน tab stop เดียว (ตัว active มี `tabindex="0"` ที่เหลือ `-1`) แล้วเลื่อนภายในด้วย arrow key — ถ้าทุกปุ่มใน toolbar 20 ปุ่มเป็น tab stop ผู้ใช้ต้องกด Tab 20 ครั้งเพื่อผ่านมันไป

## Focus Management ใน SPA

ปัญหาที่ MPA (Multi-Page Application) ไม่เคยมี: โหลดหน้าใหม่ browser reset focus ไปบนสุดและ screen reader ประกาศ title ให้เอง แต่ **SPA (Single-Page Application) เปลี่ยน "หน้า" โดย swap DOM เฉยๆ** — focus ยังค้างอยู่ที่ลิงก์เดิม (หรือหายไปเลยถ้า element ถูกถอด) ผู้ใช้ screen reader คลิก "ไปหน้าชำระเงิน" แล้ว...เงียบ ไม่รู้ด้วยซ้ำว่าหน้าเปลี่ยนแล้ว

แนวแก้มาตรฐาน: หลัง route เปลี่ยน ย้าย focus ไปที่ heading ของหน้าใหม่ (ให้ `tabindex="-1"` เพื่อรับ focus ทางโค้ดได้) — screen reader จะอ่านชื่อหน้าออกมา = ทดแทนพฤติกรรม browser ที่หายไป

```tsx
// ต่อ route change หนึ่งครั้ง — focus heading ของหน้าใหม่
function PageTitle({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus(); }, []); // mount = เข้าหน้านี้
  return <h1 tabIndex={-1} ref={ref}>{children}</h1>;
}
```

## Focus Trap และ Modal ครบสูตร

**Focus trap** = การขัง Tab ให้วนอยู่ใน container เดียว ใช้กับ modal: เปิด modal แล้ว Tab ต้องวนเฉพาะใน modal ไม่ทะลุไปหน้าหลัง — เหมือน**ประตูหมุนของโรงแรม**: เข้าไปแล้ววนอยู่ในวงจนกว่าจะออกทางที่กำหนด กลไกทำเอง: ดัก keydown ของ Tab, ถ้าอยู่ที่ focusable ตัวสุดท้ายแล้วกด Tab → ย้ายไปตัวแรก (Shift+Tab กลับกัน) ของจริงมี edge case เยอะ (element ที่ display:none, iframe, Shadow DOM) จึงนิยมใช้ lib (`focus-trap`) หรือ headless component ที่ทำให้แล้ว

Checklist modal ที่ accessible ครบ — เดินทีละข้อพร้อมโค้ด:

```tsx
function Modal({ open, onClose, title, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null); // ใครเปิดฉัน

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement; // ① จำจุดที่ focus อยู่ก่อนเปิด
    panelRef.current?.focus();                                  // ② ย้าย focus เข้า modal ทันที
    const appRoot = document.getElementById("app-root");
    appRoot?.setAttribute("inert", "");   // ③ inert: หน้าหลังโฟกัส/คลิก/อ่านไม่ได้เลย
    return () => {
      appRoot?.removeAttribute("inert");
      triggerRef.current?.focus();        // ④ ปิดแล้ว "คืน focus" ให้ปุ่มที่เปิด — ห้ามลืม
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div
      ref={panelRef}
      role="dialog"            // ⑤ ประกาศว่าเป็น dialog
      aria-modal="true"        // ⑥ บอก AT ว่าหน้าหลังใช้ไม่ได้ชั่วคราว
      aria-labelledby="modal-title" // ⑦ ตั้งชื่อ dialog จาก heading จริง
      tabIndex={-1}
      onKeyDown={(e) => e.key === "Escape" && onClose()} // ⑧ Esc ปิดได้เสมอ
    >
      <h2 id="modal-title">{title}</h2>
      {children}
    </div>,
    document.body
  );
}
```

`inert` (attribute มาตรฐาน, browser หลักรองรับครบแล้ว) ตัดหน้าหลังออกจากทั้ง tab order และ accessibility tree — คู่กับ focus trap คือกันสองชั้น ทางลัดปี 2026: `<dialog>` native + `showModal()` ได้ trap + Esc + backdrop ฟรีเกือบหมด เหลือแค่คืน focus ที่ควรตรวจเอง

ใช้ผิดพังยังไง: ลืมข้อ ④ (คืน focus) เจอบ่อยสุด — ปิด modal แล้ว focus เด้งไป `<body>` ผู้ใช้ keyboard ต้อง Tab ใหม่จากบนสุดของหน้า ทุกครั้งที่ปิด dialog

## ARIA ที่ใช้บ่อยจริง

สามตัวที่คนสับสนสุด — จำด้วยคำถามที่มันตอบ:

| Attribute | ตอบคำถาม | ตัวอย่าง |
|---|---|---|
| `aria-label` | "สิ่งนี้ชื่ออะไร" (ป้ายใหม่ ไม่มีในจอ) | ปุ่มไอคอน ✕ → `aria-label="ปิด"` |
| `aria-labelledby` | "สิ่งนี้ชื่ออะไร" (ชี้ไป element ที่มีอยู่แล้ว) | dialog ชี้ไป `id` ของ `<h2>` |
| `aria-describedby` | "มีรายละเอียดเพิ่มไหม" (คำอธิบายรอง อ่านต่อท้ายชื่อ) | input ชี้ไปข้อความ error/hint |

กติกา: labelledby ชนะ label ถ้าใส่ทั้งคู่, ส่วน describedby เป็น "ข้อมูลเสริม" เสมอ ไม่ใช่ชื่อ

- **`aria-live`** — พื้นที่ประกาศสำหรับ dynamic content: DOM ที่เปลี่ยนเฉยๆ screen reader *ไม่รู้* เพราะโฟกัสไม่ได้อยู่ตรงนั้น `aria-live="polite"` = ประกาศเมื่อว่าง (toast, ผลค้นหา "พบ 12 รายการ"), `assertive` = ขัดจังหวะทันที (error ร้ายแรงเท่านั้น) — เหมือน**เสียงประกาศในสถานีรถไฟ**: polite รอจังหวะ, assertive คือประกาศฉุกเฉินที่ตัดทุกอย่าง ใช้ assertive พร่ำเพรื่อ = ผู้ใช้โดนขัดจนใช้งานไม่ได้ ข้อควรระวัง: region ต้อง**อยู่ใน DOM ก่อน** แล้วค่อยเปลี่ยนเนื้อหาข้างใน — inject ทั้ง region พร้อมข้อความมักไม่ถูกประกาศ
- **`aria-expanded` + `aria-controls`** — บนปุ่ม toggle (accordion, dropdown): `aria-expanded="true|false"` บอกสถานะ, `aria-controls` ชี้ id ของสิ่งที่ถูกคุม — screen reader จะอ่าน "เมนู ปุ่ม ย่ออยู่/ขยายอยู่"

## Form Accessibility

Form คือจุดที่ a11y พังบ่อยสุดและเจ็บสุด (พังตรงนี้ = ผู้ใช้จ่ายเงินไม่ได้) สูตรครบ:

```html
<label for="email">อีเมล</label> <!-- ① ผูกจริงด้วย for/id — คลิก label แล้ว focus, SR อ่านชื่อถูก -->
<input id="email" type="email"
       aria-invalid="true"                 <!-- ② ประกาศสถานะผิด (ใส่เมื่อ error จริงเท่านั้น) -->
       aria-describedby="email-error" />   <!-- ③ ผูก error เข้ากับ field — อ่านต่อท้ายชื่อ field -->
<p id="email-error" role="alert">รูปแบบอีเมลไม่ถูกต้อง</p> <!-- ④ role="alert" = live region ประกาศทันที -->
```

placeholder ไม่ใช่ label — มันหายตอนพิมพ์, contrast ต่ำ, screen reader บางตัวข้าม ส่วน error ที่โชว์เป็นตัวแดงเฉยๆ โดยไม่ผูก describedby คือ error ที่ผู้ใช้ตาบอด "มองไม่เห็นและไม่ได้ยิน" — submit แล้วเงียบทั้งที่ฟอร์มแดงทั้งหน้า

เก็บตกที่เกี่ยวเนื่อง: **รูปภาพ** — `alt` ต้องสื่อ*หน้าที่*ไม่ใช่บรรยายไฟล์ (`alt="โปรโมชั่นลด 50% ถึงสิ้นเดือน"` ไม่ใช่ `alt="banner-final-v2.png"`) และรูปตกแต่งล้วนใช้ `alt=""` โดยตั้งใจเพื่อให้ screen reader ข้าม — ปล่อย alt หายไปเลยแย่กว่า เพราะ AT จะอ่านชื่อไฟล์แทน / **animation** — เคารพ `prefers-reduced-motion` สำหรับผู้ใช้ที่ vestibular disorder: animation ใหญ่ๆ ควรปิดหรือลดเมื่อ media query นี้ติด

## Contrast และเกณฑ์ WCAG

WCAG ระดับ **AA** (ระดับที่กฎหมายส่วนใหญ่อ้าง): contrast ratio ข้อความปกติ ≥ **4.5:1**, ข้อความใหญ่ (≥24px หรือ ≥18.5px ตัวหนา) ≥ 3:1, ส่วน UI component/ไอคอน ≥ 3:1 — เครื่องมือ: DevTools color picker โชว์ ratio ให้เลย, WebAIM Contrast Checker, axe

สถานะมาตรฐานปี 2026 ที่ควรพูดได้: **WCAG 2.2** (W3C Recommendation ตุลาคม 2023) คือเวอร์ชันเสถียรล่าสุด เพิ่ม 9 SC จาก 2.1 — ที่กระทบงาน frontend ตรงๆ: **Target Size (Minimum)** ปุ่ม/จุดกด ≥ 24×24px, **Focus Not Obscured**, **Dragging Movements**, **Redundant Entry** (อย่าบังคับกรอกข้อมูลเดิมซ้ำใน flow เดียว), **Accessible Authentication** (ห้ามบังคับจำ/พิมพ์ซ้ำ password โดยไม่มีทางเลือก — ต้องยอมให้ paste/password manager) ส่วน WCAG 3.0 ยังเป็น working draft อีกหลายปี — เกณฑ์ที่ใช้สอบและใช้ตามกฎหมายวันนี้คือ 2.2 AA (EAA อ้าง EN 301 549 ซึ่งอิง 2.1 AA — ทำตาม 2.2 ครอบ 2.1 อัตโนมัติ)

## Custom Dropdown — ทำไมยากกว่าที่คิด

`<select>` native ได้ทุกอย่างฟรี: keyboard (arrow, Home/End, พิมพ์ตัวอักษรกระโดด), focus, ประกาศ option ที่เลือก, ทำงานบน mobile แบบ native picker แต่พอ designer อยากได้ dropdown สวย ทีมมัก build เองด้วย div — แล้วต้องเจอ **combobox pattern** ของ APG เต็มๆ: `role="combobox"`, `aria-expanded`, `aria-activedescendant` (focus จริงอยู่ที่ input แต่ "focus เสมือน" เลื่อนใน list), arrow key ทุกทิศ, Esc, พิมพ์เพื่อกรอง, ประกาศจำนวนผลลัพธ์ผ่าน live region — งานหลายสัปดาห์ที่พังง่ายมาก

คำแนะนำเชิงปฏิบัติ: ถ้า native `<select>` พอ ใช้มัน / ถ้าต้อง custom ใช้ **headless library** (Radix, React Aria, Headless UI, Angular CDK) ที่ implement APG ให้แล้วและเราคุมแค่หน้าตา — เขียน combobox เองจากศูนย์ควรเป็นทางเลือกสุดท้าย และต้องเทียบกับ APG ทีละ key

## การเทส a11y

ชั้นการเทสเรียงจากถูกไปแพง:

1. **Automated (axe)** — รันใน CI ผ่าน `jest-axe`/`vitest-axe` หรือใน E2E ด้วย `@axe-core/playwright` จับ contrast, missing label, ARIA ผิด syntax ได้ดี — แต่จับได้ราว **30–40% ของปัญหาจริง**เท่านั้น เพราะเครื่องตอบไม่ได้ว่า "alt text นี้*สื่อความ*ไหม" หรือ "ลำดับ focus นี้*สมเหตุสมผล*ไหม"
2. **Keyboard walk** — ถอดเมาส์แล้วใช้เว็บเองจนจบ flow: Tab ถึงครบไหม, focus เห็นตลอดไหม, ติดกับ/หลุด trap ตรงไหน — ฟรีและจับปัญหาใหญ่ได้เกินครึ่ง
3. **Screen reader เบื้องต้น** — VoiceOver (macOS, Cmd+F5) หรือ NVDA (Windows, ฟรี) เดิน flow หลักสักหนึ่งรอบ ฟังว่าปุ่มมีชื่อไหม error ถูกประกาศไหม
4. **โครงสร้างที่บังคับตัวเองผ่าน test ปกติ** — Testing Library ให้ query `getByRole("button", { name: "บันทึก" })` เป็นอันดับแรก: ถ้า query ไม่เจอ แปลว่า element ไม่มี role/ชื่อที่ AT มองเห็น — **การเขียน test ตามแนวนี้คือ a11y test ฟรีทุกครั้งที่รัน** (ขยายเต็มในบท 15)

## คำถามสัมภาษณ์ที่ต้องตอบได้

1. **ทำไม `<div onClick>` ถึงแย่กว่า `<button>` — อธิบายให้ครบ**
   → button ให้ฟรีสี่อย่างที่ div ต้องเลียนแบบเอง: อยู่ใน tab order, กด Enter/Space ได้, ประกาศ role "button" ต่อ screen reader, จัดการ disabled — ทีมที่ใช้ div มักทำครบไม่ถึงครึ่งและพังแบบเงียบ นี่คือที่มาของหลัก "semantic HTML ก่อน ARIA"

2. **First rule of ARIA คืออะไร ทำไมถึงพูดแบบนั้น**
   → "Don't use ARIA (if you can use native HTML)" — เพราะ ARIA เปลี่ยนแค่สิ่งที่ AT *พูด* ไม่ได้เพิ่ม behavior จริง role ที่แปะโดยไม่ implement keyboard ตาม APG คือคำสัญญาที่ผิด ทำให้ผู้ใช้คาดหวังแล้วเจอทางตัน แย่กว่าไม่ใส่

3. **SPA เปลี่ยน route แล้วต้องจัดการ focus ยังไง เพราะอะไร**
   → MPA ได้ reset focus + ประกาศ title ฟรีจาก browser แต่ SPA แค่ swap DOM — ต้องย้าย focus ไป h1 ของหน้าใหม่ (tabindex="-1" แล้ว .focus()) เพื่อให้ screen reader ประกาศหน้าใหม่และ keyboard เริ่มจากจุดที่ถูก

4. **เดิน checklist modal ที่ accessible ให้ครบ**
   → role="dialog" + aria-modal + aria-labelledby ชี้ heading, เปิดแล้วย้าย focus เข้า, trap focus ให้วนใน modal, หน้าหลังใส่ inert, Esc ปิดได้, และปิดแล้ว**คืน focus ให้ตัวเปิด** — ข้อสุดท้ายคือข้อที่ทีมส่วนใหญ่ลืม หรือใช้ native `<dialog>.showModal()` ที่ให้เกือบทั้งหมดฟรี

5. **aria-label / aria-labelledby / aria-describedby ต่างกันยังไง**
   → สองตัวแรกตอบ "ชื่ออะไร": label คือป้ายใหม่ที่ไม่มีในจอ (ปุ่มไอคอน), labelledby ชี้ element ที่เป็นชื่ออยู่แล้วและชนะ label / describedby เป็นข้อมูลเสริมที่อ่านต่อท้ายชื่อ — ใช้ผูก error/hint เข้ากับ input

6. **ทดสอบ a11y ยังไง — เครื่องมืออัตโนมัติพอไหม**
   → ไม่พอ: axe จับได้ราว 30–40% (พวกที่ตรวจเชิงกลไกได้) ที่เหลือต้อง keyboard walk ทั้ง flow + screen reader ผ่านสักรอบ + เขียน component test ด้วย getByRole ซึ่งบังคับให้ DOM accessible เป็นผลพลอยได้ทุกครั้งที่ CI รัน

## สรุปท้ายบท

- accessibility ไม่ใช่งานเสริม แต่เป็นตัวชี้วัดคุณภาพของโครงสร้าง UI ทั้งระบบ
- แอปที่ semantic ถูก, focus ถูกจัดการ และ keyboard flow ครบ มักเป็นแอปที่ test ง่ายและพังยากกว่าไปพร้อมกัน
- a11y ที่ดีต้องคิดตั้งแต่ design และ component API ไม่ใช่ค่อยมาพอกหลังจบโปรเจกต์
- การคุยเรื่อง accessibility ให้ดีจึงต้องเชื่อมทั้งผู้ใช้จริง กฎหมาย และคุณภาพเชิงวิศวกรรมเข้าด้วยกัน

## ก่อนไปบทถัดไป

เมื่อเริ่มเห็นแล้วว่า UI ที่ดีต้องเข้าถึงได้อย่างไร บทถัดไปจะตอบคำถามว่าเราจะพิสูจน์พฤติกรรมเหล่านี้อย่างไรด้วย test ที่เชื่อถือได้และไม่แตกทุกครั้งที่ refactor
