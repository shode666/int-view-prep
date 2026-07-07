# บท 4 — Browser Rendering Pipeline: จาก HTML String สู่พิกเซลบนจอ

> คำถามสัมภาษณ์ senior frontend ที่โหดที่สุดมักไม่ใช่เรื่อง framework — แต่เป็น "ทำไม animation ตัวนี้กระตุก แล้วจะแก้ยังไง" ถ้าไม่รู้ว่า browser เปลี่ยน HTML เป็นพิกเซลยังไง คุณจะตอบได้แค่ "ลอง... ดูครับ" ซึ่งไม่ใช่คำตอบระดับ senior

## เข็มทิศก่อนอ่าน

บท 1 สอนเรื่อง event loop ฝั่งคิวงาน บทนี้สอนฝั่งการวาดจอว่าเมื่อ browser ได้เวลาทำงานแล้ว มันแปลง HTML, CSS และการเปลี่ยน DOM ไปเป็นพิกเซลอย่างไร สองบทนี้ต้องจับคู่กันเสมอ เพราะงานยาวบน main thread กับงานแพงใน rendering pipeline เป็นสองสาเหตุหลักของความหน่วงที่ผู้ใช้รู้สึกได้

ตอนอ่านอย่าจำแค่ว่า property ไหนเร็วหรือช้า แต่ให้มองเป็นเส้นทางต้นทุน: การเปลี่ยนค่า 1 บรรทัดทำให้ browser ต้อง parse ใหม่, layout ใหม่, paint ใหม่ หรือแค่ composite ใหม่ ถ้าเห็นเส้นทางนี้ชัด บท performance และ animation optimization จะไม่กระโดดเกินไป

## 4.1 สถานการณ์จริง: animation กระตุกทั้งที่โค้ด "ถูก"

ทีมคุณทำ sidebar เลื่อนเข้า-ออกด้วยการ animate `left: -300px → 0` ทุกอย่างทำงานถูกต้อง แต่บนมือถือระดับกลางมันกระตุกเป็นสไลด์โชว์ พอเปลี่ยนไป animate `transform: translateX(-300px) → translateX(0)` — โค้ดต่างกันบรรทัดเดียว — กลับลื่นปรื๊ด ทำไม?

คำตอบอยู่ที่ว่า property สองตัวนี้เข้า pipeline คนละ "ประตู" ตัวแรกบังคับ browser คำนวณ layout ใหม่ทุก frame ตัวหลังข้ามไปทำงานบน thread แยกที่ไม่ต้องคำนวณอะไรเลย บทนี้จะไล่กลไกทั้งเส้นให้เห็นว่าประตูพวกนั้นอยู่ตรงไหน

ถ้าเทียบกับฝั่ง backend: pipeline นี้เหมือน query execution plan ของ database (เล่ม backend บท 8) — SQL สองแบบให้ผลลัพธ์เดียวกันแต่ต้นทุนต่างกันร้อยเท่า เพราะเดินคนละ plan โค้ด CSS ก็เหมือนกัน หน้าตาเหมือนกันแต่ execution path ต่างกันคนละโลก senior คือคนที่อ่าน "plan" ของ browser ออก

## 4.2 เส้นทางเต็ม: parse → DOM/CSSOM → render tree → layout → paint → composite

ลองนึกภาพโรงงานผลิตหนังสือพิมพ์ — มีแผนกรับต้นฉบับ แผนกจัดหน้า แผนกพิมพ์ และแผนกเรียงแผ่นส่งแท่น แต่ละแผนกทำงานต่อกันเป็นสายพาน ถ้าแผนกไหนต้องทำซ้ำ แผนกหลังจากนั้นต้องทำซ้ำตามหมด นี่คือหัวใจของ pipeline

### ขั้น 1: Parse HTML → DOM

Browser อ่าน HTML เป็น byte stream แล้ว tokenize เป็น tag เพื่อสร้าง DOM (Document Object Model) — tree ของ node ที่ JavaScript เข้าถึงได้ จุดสำคัญที่คนมักไม่รู้:

- Parser ทำงานแบบ streaming — ไม่ต้องรอ HTML ครบก็เริ่มสร้าง DOM ได้ (นี่คือเหตุผลที่ SSR — Server-Side Rendering — แสดงผลเร็ว: browser วาดส่วนบนได้ก่อนที่ byte สุดท้ายจะมาถึง)
- เจอ `<script>` แบบไม่มี `defer`/`async` เมื่อไหร่ parser **หยุด** ทันที เพราะ script อาจ `document.write()` เปลี่ยนโครงสร้างเอกสารได้ — browser ไม่กล้าเดา

### ขั้น 2: Parse CSS → CSSOM

CSS ถูก parse เป็น CSSOM (CSS Object Model) — tree ของ rule ทั้งหมดที่ resolve การ cascade แล้ว จุดที่ต่างจาก HTML: **CSSOM สร้างแบบครึ่งๆ กลางๆ ไม่ได้** เพราะ rule บรรทัดสุดท้ายอาจ override บรรทัดแรก (`p { color: red }` ... ท้ายไฟล์ `p { color: blue }`) browser จึงต้องรอ CSS ครบก่อนวาดอะไรก็ตาม — นี่คือที่มาของคำว่า **CSS เป็น render-blocking**

### ขั้น 3: Render Tree

DOM + CSSOM ถูกรวมเป็น render tree — เอาเฉพาะ node ที่ "มองเห็นได้" มาจับคู่กับ style ที่คำนวณแล้ว:

- `display: none` → **ไม่อยู่ใน render tree เลย** (ไม่กินพื้นที่ ไม่ถูก layout)
- `visibility: hidden` → **อยู่ใน tree และกินพื้นที่** แค่ไม่ถูกวาด
- `<head>`, `<script>` → ไม่อยู่ใน tree ตั้งแต่แรก

ความต่างของสองบรรทัดแรกคือคำถามสัมภาษณ์คลาสสิก — คำตอบที่ลึกคืออธิบายผ่าน render tree ไม่ใช่ท่องว่า "อันหนึ่งกินที่ อันหนึ่งไม่กิน"

### ขั้น 4: Layout (Reflow)

Browser คำนวณ **ตำแหน่งและขนาดเชิงเรขาคณิต** ของทุก box ใน render tree — กว้างกี่พิกเซล อยู่พิกัดไหน ขั้นนี้แพงเพราะเรขาคณิตเป็นเรื่อง "ต่อเนื่องกันหมด": ขยาย div ตัวบนสูงขึ้น 10px ทุกอย่างข้างล่างต้องขยับตาม เหมือนดึงหนังสือเล่มกลางออกจากชั้น — เล่มที่เหลือล้มไล่กันทั้งแถว

### ขั้น 5: Paint

แปลงกล่องที่รู้ตำแหน่งแล้วเป็นคำสั่งวาดจริง — เติมสี วาดขอบ เงา ตัวหนังสือ ลง **layer** (บาง element ถูกแยกไปวาดบน layer ของตัวเอง — เดี๋ยวสำคัญมากในขั้นถัดไป)

### ขั้น 6: Composite

GPU เอา layer ทั้งหมดมาซ้อนกันตามลำดับความลึกเป็นภาพสุดท้าย ขั้นนี้ทำงานบน **compositor thread** ซึ่งเป็นคนละ thread กับ main thread ที่รัน JavaScript — จุดนี้คือกุญแจของหัวข้อ 4.8

สรุปสายพานทั้งเส้น พร้อมตัวอย่างว่าอะไรเกิดที่ขั้นไหน:

| ขั้น | ทำอะไร | ตัวอย่างงานที่เกิดที่นี่ |
|---|---|---|
| Parse | HTML→DOM, CSS→CSSOM | เจอ `<script>` ไม่มี defer → parser หยุด |
| Render tree | รวม DOM+CSSOM เอาเฉพาะที่เห็น | `display:none` หายไปจาก tree |
| Layout | คำนวณตำแหน่ง/ขนาด | เปลี่ยน `width`, อ่าน `offsetHeight` |
| Paint | วาดเป็นคำสั่ง raster ลง layer | เปลี่ยน `color`, `box-shadow` |
| Composite | GPU ซ้อน layer | เปลี่ยน `transform`, `opacity`, scroll |

## 4.3 Reflow vs Repaint vs Composite — property ไหนจ่ายเท่าไหร่

กติกาเหล็กของ pipeline: **เข้าที่ขั้นไหน ต้องจ่ายค่าขั้นนั้นและทุกขั้นหลังจากนั้น**

- แก้ property เรขาคณิต (`width`, `height`, `top`, `font-size`, `padding`) → **reflow**: layout → paint → composite ครบชุด แพงสุด
- แก้ property ภาพล้วน (`color`, `background`, `box-shadow`, `visibility`) → **repaint**: ข้าม layout ไป paint → composite
- แก้ `transform` / `opacity` → **composite-only**: element ถูกยกขึ้น layer ของตัวเองแล้ว GPU ขยับ/จางทั้ง layer โดยไม่แตะ layout และ paint เลย

| Property | Layout | Paint | Composite | ต้นทุน |
|---|:---:|:---:|:---:|---|
| `width`, `height`, `top/left`, `margin`, `font-size` | ✅ | ✅ | ✅ | แพงสุด |
| `color`, `background`, `box-shadow`, `outline` | — | ✅ | ✅ | กลาง |
| `transform`, `opacity` | — | — | ✅ | ถูกสุด |

**นี่คือคำตอบของบั๊กเปิดบท**: animate `left` = จ่าย reflow 60 ครั้ง/วินาทีบน main thread ที่ต้องรัน JavaScript ไปด้วย ส่วน animate `transform` = GPU เลื่อน layer บน compositor thread โดย main thread ไม่ต้องรู้เรื่องด้วยซ้ำ กติกาข้อเดียวจำง่าย: **animation ที่ต้องลื่น ใช้ได้แค่ `transform` กับ `opacity`** อย่างอื่นถือว่าติดหนี้ performance ไว้ก่อน

ข้อควรระวังฝั่งตรงข้าม: อย่าเหมาว่ายก layer เยอะ = ดี การใส่ `will-change: transform` พร่ำเพรื่อทำให้ browser สร้าง layer ค้างไว้กิน memory GPU — บนมือถือ memory ตึงอยู่แล้ว layer ระเบิด (layer explosion) ทำให้ crash ได้ ใช้เฉพาะ element ที่กำลังจะ animate จริงและถอดออกเมื่อจบ

## 4.4 Layout Thrashing — บั๊กที่มองไม่เห็นในโค้ดสวยๆ

Browser ฉลาดพอที่จะ **ไม่ layout ทันที** เวลาคุณแก้ style — มันจดคิวไว้แล้วทำทีเดียวตอนจบ frame แต่มีตัวทำลายคิวอยู่: **การอ่านค่าเรขาคณิต** (`offsetHeight`, `getBoundingClientRect()`, `scrollTop`, `getComputedStyle()` บาง property) เพราะ browser ต้องให้ค่าที่ถูกต้อง ณ ตอนนั้น มันจึงถูกบังคับ layout เดี๋ยวนั้นเลย — เรียกว่า **forced synchronous layout**

อ่านสลับเขียนวนใน loop = บังคับ layout ซ้ำทุกรอบ = **layout thrashing**:

```js
// ❌ Before — thrashing: อ่าน-เขียน-อ่าน-เขียน สลับกันใน loop
function equalizeHeights(cards) {
  cards.forEach((card) => {
    const h = card.parentElement.offsetHeight; // อ่าน → บังคับ layout ทันที
    card.style.height = h + 'px';              // เขียน → ทำ layout เดิม dirty
    // รอบถัดไปอ่านอีก → browser ต้อง layout ใหม่ซ้ำ... × จำนวน card
  });
}
```

การ์ด 200 ใบ = layout 200 รอบใน frame เดียว เหมือนจ้างสถาปนิกมาวัดบ้านใหม่ทั้งหลังทุกครั้งที่ขยับเก้าอี้หนึ่งตัว ทั้งที่ควรขยับเฟอร์นิเจอร์ให้ครบก่อนแล้วค่อยวัดจบทีเดียว

วิธีแก้: **แยกเฟสอ่านกับเฟสเขียนออกจากกัน**

```js
// ✅ After — batch: อ่านให้หมดก่อน แล้วค่อยเขียนรวดเดียว
function equalizeHeights(cards) {
  // เฟสอ่าน: layout เกิดแค่ครั้งเดียว (ครั้งแรก) ที่เหลืออ่านจาก cache
  const heights = cards.map((card) => card.parentElement.offsetHeight);
  // เฟสเขียน: ทุกการเขียนเข้าคิว รอ layout รอบเดียวตอนจบ frame
  cards.forEach((card, i) => { card.style.height = heights[i] + 'px'; });
}
```

ถ้างานเขียนมาจากหลายที่ (เช่น scroll handler หลายตัว) ใช้ `requestAnimationFrame` (rAF) — callback ที่ browser เรียกให้ **ก่อนวาด frame ถัดไปพอดี** — เป็นจุดรวมการเขียน:

```js
let scheduled = false;
const writes = [];

function scheduleWrite(fn) {
  writes.push(fn);
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    // รันงานเขียนทั้งหมดติดกันก่อน browser layout+paint หนึ่งรอบ
    writes.splice(0).forEach((fn) => fn());
    scheduled = false;
  });
}
```

แนวตอบ senior: "ผมจะหา read-after-write ใน loop ก่อน — เปิด Performance panel ดูแถบ layout สีม่วงที่มี warning 'forced reflow' แล้วแก้ด้วยการแยกเฟสอ่าน/เขียน หรือ batch ผ่าน rAF"

## 4.5 Frame Budget 16.7ms และ Long Task ที่ฆ่า INP

จอ 60Hz วาด 60 ภาพ/วินาที → แต่ละ frame มีเวลา 1000/60 ≈ **16.7ms** ในงบนี้ main thread ต้องจ่ายให้: JavaScript (event handler, rAF callback) → style recalculation → layout → paint แล้วส่งต่อ compositor ถ้ารวมกันเกินงบ frame นั้น **หลุด (dropped frame)** — ผู้ใช้เห็นเป็นอาการกระตุก และจอ 120Hz ยิ่งโหด: งบเหลือ 8.3ms

ที่หนักกว่ากระตุกคือ **long task** — งานใดก็ตามที่ยึด main thread เกิน **50ms** ระหว่างนั้น browser ตอบสนอง input ไม่ได้เลย (คลิกแล้วเงียบ) ตัวชี้วัดที่จับอาการนี้คือ **INP (Interaction to Next Paint)** — Core Web Vital ที่แทน FID (First Input Delay) ตั้งแต่มีนาคม 2024 และในปี 2026 เป็น metric หลักด้าน responsiveness: วัดเวลาจากผู้ใช้ interact จนจอ **วาด frame ถัดไป** เกณฑ์ "ดี" คือ **≤ 200ms ที่ percentile 75** — INP โยงกับบทนี้ตรงๆ เพราะมันนับครบทั้ง input delay (รอ long task จบ) + เวลารัน handler + เวลา render — แปลว่า handler เร็วแต่ trigger reflow มหาศาลก็ทำ INP พังได้ (เจาะลึกวิธี optimize ในบท 13)

วิธีคืน main thread: หั่นงานยาว, ย้ายงานคำนวณหนักไป Web Worker, และเลื่อนงานที่ไม่ด่วนออกจาก interaction path ตัวอย่างการหั่นด้วย `scheduler.yield()` (รองรับใน Chromium และ Firefox แล้ว — fallback เป็น `setTimeout(0)` ได้):

```js
async function processItems(items) {
  for (const [i, item] of items.entries()) {
    process(item);
    if (i % 100 === 0) {
      // คืน main thread ให้ browser จัดการ input/paint ที่ค้างอยู่ก่อน
      // แล้วงานเรากลับมาต่อหัวคิว (ต่างจาก setTimeout ที่ไปต่อท้ายคิว)
      await scheduler.yield();
    }
  }
}
```

จุดที่คนพลาด: หั่นงานแล้วแต่ **หั่นหลัง handler รันจบ** — INP นับถึง paint ถัดไป ดังนั้นใน click handler ให้ทำเฉพาะงานที่จำเป็นต่อ feedback บนจอ (เช่น เปิด spinner) แล้วโยนงานหนักไปหลัง paint ด้วย `setTimeout`/`scheduler.postTask` — ผู้ใช้เห็นผลตอบสนองใน frame แรก งานจริงตามมาทีหลัง

## 4.6 Layout Shift — หน้ากระโดดเพราะอะไร กันยังไง

CLS (Cumulative Layout Shift) คือ Core Web Vital ที่วัดว่า element บนจอ "กระโดด" มากแค่ไหนหลังแสดงผลแล้ว อาการคลาสสิก: กำลังจะกดปุ่ม Cancel แล้วโฆษณา inject เข้ามาดันปุ่มลง กลายเป็นกด Buy แทน สาเหตุหลักมีสามตัว และแต่ละตัวมียากันเฉพาะ:

| สาเหตุ | กลไก | วิธีกัน |
|---|---|---|
| รูปไม่มี dimension | browser ไม่รู้ขนาดจนโหลดเสร็จ → จองที่ 0px แล้วค่อยดันเนื้อหา | ใส่ `width`/`height` attribute หรือ CSS `aspect-ratio` ให้ browser จองที่ตั้งแต่ layout แรก |
| Font swap | fallback font ↔ web font ขนาด metric ต่างกัน → ข้อความ reflow | `font-display: swap` คู่กับ `size-adjust`/`font-size-adjust` จูน fallback ให้ metric ใกล้กัน, preload font สำคัญ |
| Inject banner/ad/embed | เนื้อหาโผล่ทีหลังดันของเดิม | จองพื้นที่ล่วงหน้า (`min-height` บน container), แสดง skeleton, ห้าม insert เหนือ viewport ปัจจุบัน |

```css
/* จองพื้นที่รูปด้วยอัตราส่วน — ไม่ต้องรอรูปโหลดก็รู้ความสูง */
.thumbnail {
  width: 100%;
  aspect-ratio: 16 / 9;  /* layout ขั้นที่ 4 คำนวณความสูงได้ทันที */
  object-fit: cover;
}
```

หลักคิดรวบยอด: **ทุกอย่างที่มาทีหลัง ต้องมีที่นั่งจองไว้ก่อน** — เหมือนโรงหนังที่ขายตั๋วระบุที่นั่ง ไม่ใช่ให้คนมาทีหลังเบียดแถวหน้า

## 4.7 Critical Rendering Path — อะไรบล็อคการวาดจอครั้งแรก

CRP (Critical Rendering Path) คือเส้นทางสั้นที่สุดจาก byte แรกถึงพิกเซลแรก สิ่งที่ขวางเส้นทางนี้:

1. **CSS ทุกไฟล์ใน `<head>` เป็น render-blocking** (เหตุผลจาก 4.2 — CSSOM ต้องครบ) → CSS ที่ไม่จำเป็นกับ first paint ควรแยกโหลด เช่น `media="print"` หรือโหลด async แล้ว inline เฉพาะ critical CSS
2. **`<script>` ธรรมดาเป็น parser-blocking** และแย่กว่านั้น — ต้องรอ CSSOM เสร็จก่อนรันด้วย (เพราะ script อาจอ่าน `getComputedStyle`) → CSS ช้าลากให้ JS ช้าตาม

ทางออกคือบอก browser ว่า script ตัวไหนไม่ต้องรีบ:

| | ดาวน์โหลด | บล็อค parser? | รันเมื่อไหร่ | ลำดับรับประกัน? | ใช้เมื่อ |
|---|---|---|---|---|---|
| `<script>` | ทันที | ✅ บล็อคจนรันเสร็จ | เจอปุ๊บรันปั๊บ | ✅ ตามลำดับ | แทบไม่ควรใช้แล้ว |
| `defer` | ขนานกับ parse | ❌ | หลัง parse จบ ก่อน `DOMContentLoaded` | ✅ ตามลำดับ | script หลักของแอป |
| `async` | ขนานกับ parse | ❌ (แต่บล็อคตอนรัน) | โหลดเสร็จปุ๊บรันปั๊บ — กลาง parse ก็ได้ | ❌ ใครมาก่อนรันก่อน | analytics, ads ที่ไม่พึ่ง DOM/กันเอง |
| `type="module"` | ขนาน (+dependency graph) | ❌ | เหมือน defer โดย default | ✅ | โค้ด ESM สมัยใหม่ |

จุดพลาดที่เจอบ่อย: ใช้ `async` กับ script ที่พึ่งพากัน (เช่น library + plugin) แล้วพังแบบ random เพราะลำดับรันไม่การันตี — บั๊กชนิด "เครื่องผมไม่เป็น" เพราะขึ้นกับความเร็ว network

**เสริมปี 2026 (verify แล้ว)**: `content-visibility: auto` — สั่งให้ browser ข้าม rendering (layout+paint) ของเนื้อหานอกจอ — เป็น Baseline รองรับครบทุก major browser แล้ว (Firefox ตามมาปิดท้ายปี 2024) ใช้คู่ `contain-intrinsic-size` เพื่อจองความสูงกัน scrollbar เด้ง เหมาะกับหน้า list/article ยาวๆ ส่วน **Speculation Rules API** (ประกาศ prerender/prefetch หน้าถัดไปล่วงหน้าด้วย JSON ใน `<script type="speculationrules">`) ยัง **Chromium-only ไม่เป็น Baseline** — ใช้เป็น progressive enhancement ได้ (browser อื่นแค่เมิน) แต่อย่าออกแบบให้ระบบพึ่งมัน

## 4.8 Compositor Thread — ทำไม scroll ยังลื่นทั้ง main thread ค้าง

เคยสังเกตไหมว่าบางหน้าที่ JavaScript ค้างจนปุ่มกดไม่ติด แต่ scroll ยังลื่นอยู่? นั่นเพราะ scroll (แบบไม่มี handler ขวาง) ทำงานบน **compositor thread** ล้วนๆ: เนื้อหาถูก paint เป็น layer ไว้แล้ว การ scroll คือ GPU เลื่อนตำแหน่ง layer — ไม่ต้องถาม main thread เลย เหมือนแผนกเรียงหน้าโรงพิมพ์ที่เลื่อนแผ่นฟิล์มที่พิมพ์เสร็จแล้วไปมาได้ โดยไม่ต้องปลุกนักเขียน (main thread) ที่หลับอยู่

เหตุผลเดียวกันนี้อธิบายว่าทำไม CSS animation บน `transform`/`opacity` เดินต่อได้แม้ main thread ติด long task — compositor รันเองได้ทั้งวง แต่มีตัวทำลายของฟรีนี้: `addEventListener('touchstart'|'wheel', handler)` แบบไม่ระบุ options — browser ต้อง **รอ** handler ว่าจะเรียก `preventDefault()` (ยกเลิกการ scroll) หรือไม่ scroll เลยต้องกลับไปต่อคิว main thread แก้ด้วย:

```js
// passive: true = สัญญาว่าจะไม่ preventDefault → compositor scroll ต่อได้ไม่ต้องรอ
window.addEventListener('touchstart', onTouch, { passive: true });
```

แนวตอบ senior: "scroll กับ compositor-only animation ลื่นเพราะทำงานบน compositor thread แยกจาก main thread — ดังนั้นกลยุทธ์ผมคือดันงาน animation ให้อยู่ฝั่ง compositor (`transform`/`opacity`) ให้มากที่สุด และระวัง non-passive listener ที่ลาก scroll กลับมาฝั่ง main"

## 4.9 วัดจริงก่อนเชื่อ — อ่าน pipeline จาก DevTools

ทฤษฎีทั้งบทนี้ตรวจสอบได้ด้วยตาใน Chrome DevTools → Performance panel กด record แล้วทำ interaction ที่สงสัย สิ่งที่ต้องอ่านให้ออก:

1. **แถบสีในเลน Main**: เหลือง = JavaScript, ม่วง = style/layout, เขียว = paint/composite — บั๊ก sidebar ของเราจะเห็นม่วงถี่ยิบทุก frame ตอน animate `left` และม่วงหายเกลี้ยงเมื่อเปลี่ยนเป็น `transform`
2. **สามเหลี่ยมแดงมุมขวาของ block** = warning เช่น "Forced reflow" พร้อมชี้บรรทัดโค้ดที่อ่านค่าเรขาคณิตผิดจังหวะ — layout thrashing โผล่ที่นี่
3. **แถบแดงบนเลน timeline** = long task เกิน 50ms คลิกดูได้ว่า function ไหนกิน
4. เปิด **Rendering tab → Paint flashing** เห็นพื้นที่ที่ถูก repaint เป็นสีเขียวสดแบบ real-time — ถ้า animate อะไรอยู่แล้วจอเขียววาบทั้งแผ่น แปลว่ายังไม่ได้อยู่บน compositor

หลักการเดียวกับ "อย่าเดา ให้ profile" ของฝั่ง backend (เล่ม backend บท 12 เรื่อง measure-first) — คำตอบสัมภาษณ์ที่เริ่มด้วย "ผมจะเปิด Performance panel ดูก่อนว่าเวลาไปตกที่แถบสีไหน" ส่งสัญญาณ senior กว่าการท่อง checklist optimization

## 4.10 Trade-off & ใช้ผิดพังยังไง — สรุปทั้งบท

- **ยก layer (will-change/translateZ) พร่ำเพรื่อ** → GPU memory ระเบิดบนมือถือ ยกเฉพาะที่ animate จริง
- **batch ทุกอย่างผ่าน rAF โดยไม่คิด** → ถ้างานใน rAF เองหนักเกิน 16.7ms ก็หลุด frame เท่าเดิม — batch ช่วยเรื่องลำดับ ไม่ได้ลดปริมาณงาน
- **`content-visibility: auto` กับเนื้อหาที่ต้องถูก find-in-page/anchor ทันที** → browser จะ render ให้ตอนต้องใช้ แต่มี cost ตอน scroll ถึง ถ้าไม่ตั้ง `contain-intrinsic-size` scrollbar จะกระโดด
- **มองแค่ frame rate ไม่มองความถูกต้อง** — `transform` ไม่กระทบ layout แปลว่า element อื่น "ไม่รู้" ว่ามันขยับ: hit-testing ตำแหน่งเดิม, เนื้อหารอบข้างไม่ไหลตาม ถ้าต้องการให้ของรอบๆ ขยับตามจริง ก็ต้องยอมจ่าย layout — เลือกให้ถูกงาน

## คำถามสัมภาษณ์ที่ต้องตอบได้

1. **ไล่ขั้นตอนจาก HTML string จนเป็นพิกเซลบนจอ** → parse เป็น DOM/CSSOM (CSS เป็น render-blocking เพราะ cascade ต้อง resolve ครบ) → รวมเป็น render tree เฉพาะที่มองเห็น → layout คำนวณเรขาคณิต → paint วาดลง layer → composite ให้ GPU ซ้อน layer บน compositor thread

2. **reflow กับ repaint ต่างกันยังไง แล้วทำไม animation ควรใช้ transform?** → reflow = คำนวณ layout ใหม่แล้วต้อง paint+composite ต่อ, repaint = วาดใหม่โดย layout เดิม ส่วน `transform`/`opacity` ข้ามทั้งคู่ไป composite อย่างเดียวบน thread แยก — จึงลื่นแม้ main thread ยุ่ง

3. **layout thrashing คืออะไร เจอแล้วแก้ยังไง?** → การอ่านค่าเรขาคณิต (offsetHeight ฯลฯ) สลับกับการเขียน style ใน loop บังคับ forced synchronous layout ซ้ำๆ แก้โดยแยกเฟสอ่านทั้งหมดก่อนแล้วเขียนทั้งหมดทีหลัง หรือรวมการเขียนใน requestAnimationFrame

4. **long task กระทบ INP ยังไง?** → INP วัดจาก interact ถึง paint ถัดไป งานเกิน 50ms ที่ยึด main thread ทำให้ input delay ยืดจน INP เกินเกณฑ์ 200ms — แก้ด้วยการหั่นงาน (scheduler.yield), ย้ายไป Worker, ลด render cost หลัง handler

5. **CLS มาจากไหน กันยังไง?** → ของที่โผล่ทีหลังโดยไม่จองที่: รูปไม่มี dimension (แก้ด้วย aspect-ratio/width+height), font swap (font-display + จูน fallback metric), banner inject (reserve space) — หลักคือทุกอย่างต้องมีที่นั่งจองก่อนมาถึง

6. **defer, async, module ต่างกันตรงไหน เลือกยังไง?** → ทั้งสามโหลดขนานไม่บล็อค parser; defer/module รอ parse จบและรักษาลำดับ — ใช้กับโค้ดแอป; async รันทันทีที่โหลดเสร็จไม่การันตีลำดับ — ใช้กับ script อิสระอย่าง analytics เท่านั้น

## สรุปท้ายบท

- การ render หน้าเว็บไม่ใช่กล่องดำ แต่เป็น pipeline ที่มีต้นทุนเป็นลำดับตั้งแต่ parse, layout, paint จนถึง composite
- ความลื่นหรือกระตุกของ UI มักขึ้นกับว่าเราไปกระตุ้นขั้นไหนใน pipeline บ่อยและหนักแค่ไหน
- คำอธิบายอย่าง "ใช้ `transform` แทน `left`" มีความหมายก็ต่อเมื่อเห็นว่ามันข้ามต้นทุนบางชั้นได้จริง
- การแก้ performance ที่ดีจึงต้องอ่านร่องรอยจาก DevTools ให้ได้ ไม่ใช่จำสูตรสำเร็จไปใช้ทุกกรณี

## ก่อนไปบทถัดไป

เมื่อเห็นแล้วว่า browser วาดอะไรและวาดอย่างไร บทถัดไปจะพาไปดูว่าฝั่ง CSS เองมีกติกาอะไรที่กำหนดว่าของที่ถูกวาดควรหน้าตาแบบไหน และทำไม CSS ที่ไม่มีระบบถึงลามพังได้ทั้งแอป
