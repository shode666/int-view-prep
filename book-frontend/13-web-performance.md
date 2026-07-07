# บท 13 — Web Performance: ทำไมโปรย memo ทั่วแอปแล้วเว็บไม่เร็วขึ้นสักมิลลิวินาที

> บั๊กเปิดเรื่อง: ทีมหนึ่งใช้เวลาสอง sprint ใส่ `React.memo` ทั่วแอป + ย้ายทุกอย่างเป็น `useCallback` — เว็บไม่เร็วขึ้นเลยสักมิลลิวินาที เพราะปัญหาจริงคือรูป hero 1.8MB ที่ไม่ได้ preload กับ bundle 900KB ที่แบก moment.js พร้อม locale ทั้งโลก การ optimize โดยไม่วัดคือการผ่าตัดโดยไม่เอกซเรย์ — ขยันแค่ไหนก็ผ่าถูกที่ด้วยดวงล้วนๆ

## เข็มทิศก่อนอ่าน

บทนี้ดึงของจากหลายบทก่อนหน้ามารวมกัน: event loop จากบท 1, rendering pipeline จากบท 4, React render model จากบท 6 และ data fetching จากบท 12 ล้วนกลายเป็น performance problem ได้ทั้งนั้น ถ้ามอง performance แค่มุม component re-render หรือแค่มุม Lighthouse คะแนนอย่างเดียว จะเห็นภาพไม่ครบ

ระหว่างอ่านให้แยกคำถามสองชุดออกจากกันเสมอ: อะไรช้าที่โหลดครั้งแรก และอะไรช้าที่โต้ตอบระหว่างใช้งาน การแยกสองชั้นนี้ชัดจะช่วยให้ข้อเสนอแก้ไม่ปนกัน และทำให้บท system design ต่อจากนี้มีน้ำหนักขึ้นมาก

## กติกาข้อแรก: Measure ก่อน Optimize

เครื่องมือวัดมีสองตระกูลที่ตอบคนละคำถาม:

**Lab data** — Lighthouse, WebPageTest: รันในสภาพแวดล้อมจำลอง (เครื่องเดิม, network throttle คงที่) — reproducible, ใช้ debug และกันถอยหลังใน CI ได้ดี แต่มันคือ "ผลตรวจในแล็บ" ไม่ใช่ชีวิตจริง

**Field data / RUM (Real User Monitoring)** — เก็บจาก browser ของ user จริง ผ่าน CrUX (Chrome User Experience Report — dataset ที่ Chrome เก็บจากผู้ใช้จริง rolling 28 วัน) หรือ RUM ของเราเอง — สะท้อนมือถือกลางๆ บน 4G ที่แกว่ง ไม่ใช่ MacBook ของ dev บน WiFi office ตั้ง RUM เองก็ถูกมาก:

```ts
// web-vitals — library ทางการของทีม Chrome: วัดจาก user จริงแล้วยิงเข้า analytics ของเรา
import { onLCP, onINP, onCLS } from 'web-vitals';

function report(metric: { name: string; value: number; rating: string }) {
  // sendBeacon: ส่งได้แม้ user กำลังปิดหน้า — fetch ธรรมดาโดน cancel
  navigator.sendBeacon('/analytics', JSON.stringify({
    ...metric,
    // แนบมิติที่ใช้หั่นข้อมูลทีหลัง — ไม่งั้นได้แค่ตัวเลขรวมที่บอกอะไรไม่ได้
    page: location.pathname,
    connection: (navigator as any).connection?.effectiveType,
  }));
}
onLCP(report); onINP(report); onCLS(report);
```

**ทำไม field สำคัญกว่า**: Google ใช้เฉพาะ field data (CrUX) เป็น ranking signal — ไม่ใช่คะแนน Lighthouse และเกณฑ์ตัดสินคือ **p75** (percentile ที่ 75): เว็บ "ผ่าน" เมื่อ user อย่างน้อย 75% ได้ประสบการณ์ระดับ good — ตรรกะเดียวกับที่ backend ไม่วัด latency ด้วยค่าเฉลี่ยแต่ดู p99 (เล่ม backend บท 21): ค่าเฉลี่ยโกหกเก่ง คนที่ทรมานคือหางของ distribution และ Lighthouse ก็คือ "เครื่องเดียวรันหนึ่งรอบ" — เป็นแค่จุดเดียวใน distribution นั้น

**แนวตอบ senior**: "ผมเริ่มจาก field data ว่า user จริงเจ็บที่ metric ไหน device/network กลุ่มไหน แล้วใช้ lab tool reproduce เพื่อหา root cause — Lighthouse 100 แต่ CrUX แดง แปลว่าเรา optimize ให้เครื่อง dev ไม่ใช่ให้ user"

## Core Web Vitals ปัจจุบัน

สามตัวชี้วัด ตัดสินที่ p75 ของ field data — จำเกณฑ์ good ให้ขึ้นใจ:

| Metric | วัดอะไร | Good | Poor |
|---|---|---|---|
| LCP (Largest Contentful Paint) | ความเร็วโหลด — element ใหญ่สุดใน viewport วาดเสร็จเมื่อไหร่ | ≤ 2.5s | > 4s |
| INP (Interaction to Next Paint) | ความไวตอบสนอง — คลิก/พิมพ์แล้วจอขยับเร็วแค่ไหน | ≤ 200ms | > 500ms |
| CLS (Cumulative Layout Shift) | ความนิ่งของ layout — ของบนจอกระโดดแค่ไหน | ≤ 0.1 | > 0.25 |

### LCP — โหลด "ของชิ้นใหญ่" เร็วแค่ไหน

LCP คือเวลาที่ element ที่ใหญ่ที่สุดใน viewport (มักเป็นรูป hero หรือ heading ก้อนหลัก) วาดเสร็จ — proxy ของความรู้สึก "หน้ามาแล้ว" เส้นทางของมันคือโซ่: TTFB (Time to First Byte — server ตอบ byte แรกเมื่อไหร่) → browser เจอว่าต้องโหลดรูป → โหลด → decode → paint ช้าที่ข้อไหนโซ่ก็ยืดทั้งเส้น วิธีแก้จึงไล่ตามโซ่:

```html
<!-- 1) ให้ browser รู้จักรูป hero เร็วที่สุด — อย่ารอให้ parser ไปเจอเองลึกๆ ใน DOM
     ยิ่งแย่ถ้าเป็น CSS background หรือรูปที่ JS framework ค่อย render — เจอช้าไปมาก -->
<link rel="preload" as="image" href="/hero.avif" fetchpriority="high" />

<!-- 2) fetchpriority บอก scheduler ว่ารูปนี้สำคัญกว่ารูปอื่น (ทุก browser หลักรองรับ
     ตั้งแต่ปลายปี 2023 — ใช้ได้จริงแล้ว) และ LCP image ห้าม loading="lazy" เด็ดขาด -->
<img src="/hero.avif" fetchpriority="high" width="1200" height="600" alt="..." />
```

ข้อ (3) คือฝั่ง server: TTFB ช้า = ทุกอย่างช้าตาม — CDN (Content Delivery Network), cache, streaming HTML — งานฝั่งเล่ม backend ล้วนๆ วิธี debug ที่เป็นระบบ: หั่น LCP เป็นสี่เฟสแล้วดูว่าเวลาหายไปเฟสไหน (ตรรกะเดียวกับไล่ p99 breakdown ฝั่ง backend — "ไม่เดา ดูว่าเวลาหายไปไหน"):

| เฟสของ LCP | เวลาหายที่นี่เพราะ | ยา |
|---|---|---|
| TTFB | server/DB ช้า, ไม่มี CDN, redirect chain | cache, CDN, ตัด redirect |
| Resource load delay | browser เจอรูปช้า (อยู่ใน CSS/JS, ลึกใน DOM) | preload + ใส่ใน HTML ตรงๆ |
| Resource load time | ไฟล์ใหญ่/format เก่า/server รูปช้า | AVIF/WebP, ขนาดพอดี, CDN |
| Render delay | โหลดเสร็จแต่ main thread ติดงาน / รอ JS วาด | ตัด render-blocking, ลด JS ก่อน paint |

กับดักยอดฮิต: เว็บใส่ lazy loading ทุกรูปรวมทั้ง hero เพราะ "best practice บอกให้ lazy" — LCP พัง เพราะ browser จงใจเลื่อนโหลดรูปที่สำคัญที่สุด · อีกกับดัก: hero เป็น CSS `background-image` — browser ต้องโหลดและ parse CSS เสร็จก่อนถึงจะ*รู้ว่ามีรูปนี้* เสีย resource load delay ฟรีๆ

**แนวตอบ senior**: "LCP ผมไล่เป็นสี่เฟส — TTFB, load delay, load time, render delay — ส่วนใหญ่ตัวการคือ load delay: browser รู้จักรูป hero ช้าเกินไป ยาคือ preload + fetchpriority=high และห้าม lazy รูป LCP เด็ดขาด"

### INP — แทน FID เพราะ FID วัดไม่ตรงความเจ็บ

FID (First Input Delay) วัดเฉพาะ *delay ก่อนเริ่มประมวลผล* ของ *interaction แรก* — เว็บส่วนใหญ่ผ่านสบายทั้งที่ user รู้สึกหน่วงทั้งเซสชัน Google จึงปลด FID แล้วใช้ **INP แทนอย่างเป็นทางการเมื่อ 12 มีนาคม 2024** — INP วัด**ทุก interaction ตลอดอายุหน้า** (ตั้งแต่กดจนเฟรมถัดไปวาด: input delay + processing + presentation) แล้วรายงานตัวที่แย่เกือบสุด — เกณฑ์ good ≤ 200ms

ต้นเหตุอันดับหนึ่งของ INP แย่: **long task** — main thread เป็นถนนเลนเดียว (บท 1): JS ที่รันยาวเกิน 50ms บล็อกทุกอย่างรวมทั้งการตอบ click งานชิ้นเดียว 800ms = user คลิกช่วงนั้นค้าง 800ms วิธีแก้คือ**แตกงานใหญ่เป็นชิ้นเล็กแล้วคืนคิวให้ browser แทรกงานเร่งด่วน** — เหมือนแคชเชียร์คนเดียว: ลูกค้ารถเข็นของ 300 ชิ้นควรถูกหั่นให้คนซื้อน้ำขวดเดียวแทรกจ่ายได้ ไม่ใช่ให้ทั้งแถวรอจนครบ 300:

```ts
// เดิม: process(items) ทั้งหมดใน handler เดียว — long task บล็อกทุก interaction
async function processAll(items: Item[]) {
  for (const chunk of chunked(items, 200)) {
    processChunk(chunk);
    // yield to main thread — คืนคิวให้ browser จัดการ input/paint ที่ค้างอยู่ก่อน
    if ('scheduler' in window) await scheduler.yield(); // API ตรงสาย
    else await new Promise(r => setTimeout(r, 0));      // fallback ท่าคลาสสิก
  }
}
```

อีกท่าที่ใช้บ่อยกับ handler ที่ต้อง "ตอบก่อน ทำทีหลัง": แยก feedback ด่วนออกจากงานหนัก —

```ts
button.addEventListener('click', () => {
  openModalShell();            // งานถูก: ให้ user เห็นผลใน frame นี้เลย — INP วัดถึงแค่ paint ถัดไป
  requestAnimationFrame(() =>  // เฟรมวาดเสร็จก่อน
    setTimeout(() => buildHeavyModalContent(), 0)); // แล้วค่อยทำงานหนักหลังจอขยับแล้ว
});
```

ยาที่เหลือ: ลดปริมาณ JS ที่ต้องรันตั้งแต่แรก (หัวข้อ bundle), debounce งานแพงจาก input, งาน CPU หนักจริงย้ายไป Web Worker (คนละ thread — ไม่แตะ DOM แต่คำนวณแทนได้), และอย่าให้ handler เดียว setState จนลาก re-render ทั้งต้นไม้ (บท 6)

**แนวตอบ senior**: "INP แย่ = มี interaction ที่กว่าจอจะขยับก็เกิน 200ms ผมเปิด Performance panel หา long task ที่ผูกกับ interaction นั้น แล้วเลือกยาตามอาการ: แตกงาน + yield, ย้ายไป worker, หรือให้ feedback เร็วก่อนแล้วค่อยทำงานหนักหลัง paint"

### CLS — จออย่ากระโดด

CLS สะสมคะแนน "ของที่เห็นอยู่ขยับโดย user ไม่ได้สั่ง" — คลาสสิกสุด: กำลังจะกดปุ่ม แล้วโฆษณาโหลดเสร็จดันทุกอย่างลง นิ้วจิ้มผิดปุ่ม สาเหตุ/ยาครบชุดอยู่บท 4 (layout กับ reflow) — สรุปปฏิบัติการ: **จองที่ก่อนของมา** ทุกครั้ง:

```css
/* รูป: บอกสัดส่วนไว้ browser จะกันที่ให้ก่อนโหลดเสร็จ — ไม่มีการดันเนื้อหาตอนรูปมา */
img { width: 100%; height: auto; aspect-ratio: 16 / 9; }
/* พื้นที่ ads/embed/แบนเนอร์: ขนาดขั้นต่ำล่วงหน้า — โหลดไม่มาก็เป็นช่องว่าง ไม่ใช่การกระตุก */
.ad-slot { min-height: 250px; }
```

ที่เหลือ: เนื้อหาจาก API ใช้ skeleton ขนาดเท่าของจริง (บท 12), font สลับแล้วอย่าเปลี่ยน metric มาก (หัวข้อ font), animation ใช้ `transform` ไม่ใช่ top/left (transform ไม่นับเป็น layout shift และไม่ trigger reflow — บท 4) — และห้าม insert เนื้อหาเหนือ viewport ที่ user กำลังอ่าน ข้อยกเว้นเดียวที่ไม่นับคะแนน: shift ที่เกิดภายใน 500ms หลัง user interaction (เช่นกด expand แล้ว panel ดันของลง — user เป็นคนสั่งเอง)

## Bundle Diet — ครบวงจร

JS ทุก KB จ่ายสองต่อ: เวลา download และ**เวลา parse+execute บน main thread** (มือถือกลางๆ แพงกว่า desktop หลายเท่า) — bundle อ้วนจึงทำร้ายทั้ง LCP และ INP กติกาเดิม: วัดก่อน — bundle analyzer (`rollup-plugin-visualizer`, `webpack-bundle-analyzer`, `source-map-explorer`) วาด treemap ให้เห็นว่าใครกินที่ — เกือบทุกครั้งตัวการคือ dependency ที่เราไม่รู้ว่าลากอะไรเข้ามา ไม่ใช่โค้ดเราเอง

### Tree Shaking ทำงานยังไงจริง

Bundler ตัด export ที่ไม่ถูกใช้ทิ้งได้เพราะ **ESM (ECMAScript Modules) เป็น static**: `import { debounce } from './utils'` ต้องอยู่ top-level ระบุชื่อตายตัว — วิเคราะห์กราฟได้โดยไม่ต้องรันโค้ด (ต่างจาก CommonJS — CJS — ที่ `require(someVar)` เป็น dynamic: shake ไม่ได้ นี่คือเหตุผลที่ lodash เวอร์ชัน CJS ลากมาทั้งก้อน)

แต่ static analysis มีจุดบอด: **side effect** — module ที่แค่ import แล้วมีผล (polyfill, CSS import, แก้ global) ถ้า bundler ตัดทิ้งเพราะ "ไม่มีใครใช้ export" โปรแกรมพัง มันจึงต้อง**อนุรักษ์นิยม**: ไม่แน่ใจ = เก็บไว้ package จึงประกาศใน package.json ได้:

```json
{ "sideEffects": false }
```

แปลว่า "ทุก module ในแพ็กเกจนี้ import แล้วไม่มีผลข้างเคียง — ตัดได้เต็มมือ" (หรือระบุเป็น array เช่น `["*.css"]` ยกเว้นไฟล์ที่มี effect จริง) — ประกาศ `false` ทั้งที่มี side effect จริง = บั๊กหายแบบสุ่มใน production ที่ debug สนุกมาก

### Code Splitting — หั่นตามเส้นทางที่ user เดิน

หลัก: อย่าส่งโค้ดหน้า settings ให้คนที่มาแค่หน้า login ลำดับการหั่น: **route-based ก่อนเสมอ** — ขอบเขตธรรมชาติ ได้ผลคุ้มแรงสุด แล้วค่อย component-based เฉพาะก้อนหนักที่ไม่ได้เห็นทันที (chart library, rich editor, modal ที่นานๆ เปิด)

```tsx
// route-based: dynamic import คือจุดที่ bundler ตัด chunk — คนไม่เข้า /reports ไม่ต้องจ่าย
const ReportsPage = lazy(() => import('./pages/ReportsPage')); // React + <Suspense>
// Angular ท่าเดียวกัน: loadComponent: () => import('./reports.component') (บท 11)

// prefetch ตอน "เดาได้ว่ากำลังจะใช้": hover เมนูก็เริ่มโหลดทิ้งไว้ —
// import() คืน promise ที่ถูก cache — ตอนคลิกจริง chunk มารออยู่แล้ว
<Link to="/reports" onMouseEnter={() => import('./pages/ReportsPage')}>Reports</Link>
```

กับดัก: **waterfall จาก lazy ซ้อน lazy** — route ถูก lazy → โหลดเสร็จ render → ข้างในมี component lazy อีกชั้น → เพิ่งรู้ว่าต้องโหลดต่อ → รออีกรอบ กลายเป็นบันไดต่อคิวแทนที่จะขนานกัน:

```
lazy เดี่ยว:   [route chunk ▓▓▓▓] → render เสร็จ
lazy ซ้อน:     [route chunk ▓▓▓▓] → render → อ้าว มี lazy ข้างใน → [chart chunk ▓▓▓▓] → เสร็จ
                                    ↑ network สองรอบต่อคิวกัน — ทั้งที่รู้ล่วงหน้าได้ว่าต้องใช้คู่กัน
```

ยา: prefetch chunk ที่เดาได้, ก้อนที่ใช้ด้วยกันเสมอให้อยู่ chunk เดียวกัน, และอย่า lazy ก้อนเล็กจนค่า overhead ต่อ request แพงกว่าเนื้อ

**แนวตอบ senior**: "ผมหั่นตาม route ก่อนเสมอเพราะเป็นขอบเขตธรรมชาติ แล้วใช้ analyzer หา chunk แรกที่ยังอ้วน ค่อยแยก component หนักแบบมี prefetch — และระวัง lazy ซ้อน lazy ที่เปลี่ยน parallel load เป็น waterfall"

### Dependency ที่อ้วน

| ตัวอ้วน | ปัญหา | ทางออก |
|---|---|---|
| moment.js | หยุดพัฒนาแล้ว + mutable + ลาก locale มหาศาล, shake ยาก | date-fns (ฟังก์ชันเดี่ยว shake ง่าย) / dayjs (API คล้าย moment, ~2KB) / Temporal API ที่กำลังมาในตัว browser |
| lodash (CJS) | require ทั้งก้อน | `lodash-es` + named import ให้ tree shaking ทำงาน — หรือถามก่อนว่าที่ใช้ 3 ฟังก์ชันนั้น JS สมัยนี้มีเองแล้วหรือยัง |
| chart/editor ยักษ์ | โหลดตั้งแต่แรกทั้งที่อยู่ใต้ fold | dynamic import ตอนใกล้ถูกใช้ |

วิธีตรวจ: bundle analyzer ดู treemap, `npx bundlephobia <pkg>` เช็คน้ำหนักก่อนติดตั้ง, และตั้ง **performance budget** ใน CI (เกิน size ที่ตกลง = build แดง) — กันอ้วนคืนแบบไม่มีใครสังเกต

## Image & Font — ตัวถ่วงที่ไม่ใช่ JS

**Image** มักเป็น byte ก้อนใหญ่สุดของหน้า — สี่เครื่องมือทำงานร่วมกัน:

```html
<img
  src="/product-800.webp"
  srcset="/product-400.avif 400w, /product-800.avif 800w, /product-1600.avif 1600w"
  sizes="(max-width: 600px) 100vw, 50vw"  <!-- บอกว่ารูปกินจอกี่ % — browser เลือกไฟล์เล็กสุดที่พอ -->
  width="800" height="600"                <!-- จองที่ — กัน CLS -->
  loading="lazy"                          <!-- ใต้ fold เท่านั้น — รูป LCP ห้ามใส่! -->
  alt="..." />
```

(1) format สมัยใหม่ — AVIF เล็กสุด, WebP รองรับกว้าง, ใช้ `<picture>` เมื่อต้องมี fallback เป็นขั้น (2) `srcset`/`sizes` — เสิร์ฟขนาดตาม viewport จริง อย่าส่งไฟล์ 2400px ให้จอมือถือ 400px แล้วให้ browser ย่อทิ้ง (3) lazy เฉพาะใต้ fold (4) dimension เสมอ

**Font**: ปัญหาคือช่วงรอ font โหลด — FOIT (Flash of Invisible Text: ตัวหนังสือล่องหน) หรือ FOUT (Flash of Unstyled Text: โชว์ font สำรองก่อนแล้วสลับ) สูตรมาตรฐาน:

```css
@font-face {
  font-family: 'Sarabun';
  src: url('/fonts/sarabun-thai-latin.woff2') format('woff2'); /* subset: ไทย+ละติน พอ — อย่าแบกทุก script */
  font-display: swap; /* โชว์ font สำรองทันที ค่อยสลับ — ยอม FOUT ดีกว่าจอใบ้ (FOIT) */
}
/* จูน fallback ให้ metric ใกล้ font จริง — ตอน swap บรรทัดไม่ขยับ ไม่เข้า CLS */
@font-face {
  font-family: 'Sarabun-fallback';
  src: local('Tahoma');
  size-adjust: 97%; ascent-override: 105%;
}
```

บวก `<link rel="preload" as="font" type="font/woff2" crossorigin>` เฉพาะ font หลักที่ใช้เหนือ fold (font ถูกโหลดช้าโดยธรรมชาติเพราะ browser ต้องเจอ CSS ที่*ใช้*มันก่อน — preload ลัดคิวให้)

## Virtualization — ตาราง 10,000 แถว

Render ตรงๆ = DOM node หลักแสนตัว: initial render กินวินาที, memory บวม, ทุก interaction ลาก layout ยักษ์ (บท 4) ทั้งที่จอเห็นจริง ~20 แถว **Virtualization = โกหก browser อย่างมีระบบ**: render เฉพาะแถวใน viewport + buffer เล็กน้อย — เหมือนป้ายตารางเที่ยวบินสนามบิน: เที่ยวบินมีเป็นหมื่นแต่ป้ายมีช่องแค่ 20 ช่อง หมุนเนื้อหาเปลี่ยนไปตามเวลา ไม่มีใครสร้างป้ายหมื่นช่อง

กลไก (แนวคิดแบบ TanStack Virtual):

```tsx
const virtualizer = useVirtualizer({
  count: rows.length,                        // 10,000 — แค่ตัวเลข ไม่ใช่ DOM
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 40,                    // ความสูงต่อแถว — ใช้คำนวณ offset และความสูงรวม
  overscan: 5,                               // buffer เผื่อบน-ล่าง กันจอขาววาบตอน scroll เร็ว
});

return (
  <div ref={scrollRef} style={{ height: 600, overflow: 'auto' }}>
    {/* กล่องในสูงเท่าข้อมูลจริง (400,000px) — scrollbar เลยถูกสัดส่วนทั้งที่ render ~20 แถว */}
    <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
      {virtualizer.getVirtualItems().map((v) => (   // เฉพาะแถวใน viewport + overscan
        <Row key={v.key} data={rows[v.index]}
             style={{ position: 'absolute', top: 0, width: '100%',
                      transform: `translateY(${v.start}px)` }} />  // วาง ณ ตำแหน่งจริงด้วย transform
      ))}
    </div>
  </div>
);
```

เลื่อนลงแถวบนถูกถอด แถวใหม่ถูกเสียบ — DOM คงที่ ~30 node ตลอดไม่ว่าข้อมูลกี่หมื่นแถว

Trade-off: ค่าคำนวณต่อ scroll frame, แถวสูงไม่คงที่ต้องวัด/ประมาณ (ประมาณพลาด = scrollbar กระตุก), Ctrl+F ของ browser หาแถวที่ไม่ได้ render ไม่เจอ, screen reader ต้องใส่ `aria-rowcount` ช่วย (บท 14) — ตารางร้อยแถวอย่าเพิ่งเสียความซับซ้อนนี้ และมันจับคู่กับ `useInfiniteQuery` ได้ตรงตัว (บท 12): ฝั่งหนึ่งคุมว่า*มี*ข้อมูลเท่าไหร่ อีกฝั่งคุมว่า*วาด*เท่าไหร่

## Memoization แบบมีเหตุผล

ทำไมโปรย `memo`/`useMemo`/`useCallback` ทั่วแอปแล้วไม่เร็วขึ้น: (1) memo ไม่ฟรี — เก็บ props เก่า + shallow compare ทุกรอบ ถ้า component ถูกๆ ก็จ่ายค่า compare เพิ่มเปล่าๆ (2) พังเงียบง่าย:

```tsx
const Heavy = memo(HeavyList);

function Parent() {
  // ทุก render สร้าง object/function ใหม่ → reference ใหม่ → shallow compare ไม่เท่าตลอด
  // = จ่ายค่า memo ทุกครั้งแต่ไม่เคยได้ cache hit เลย — memo กลายเป็นภาระสุทธิ
  return <Heavy options={{ pageSize: 50 }} onPick={(id) => select(id)} />;
}
// ยา: ยก options ออกนอก component (ค่าคงที่) / useMemo-useCallback ให้ reference นิ่ง
// — memo จะได้ผลก็ต่อเมื่อดูแล props ให้ stable "ทั้งเส้น" (กติกา reference — บท 6)
```

(3) ปัญหาจริงมักอยู่ที่อื่น: state วางสูงเกินลาก tree ใหญ่ re-render (บท 7), long task, รูป, bundle

ลำดับที่ถูก: **React DevTools Profiler ก่อน** — หา component ที่ re-render *บ่อยและแพง*จริง แล้วจึง memo จุดนั้นพร้อมดูแลให้ props stable ทั้งเส้น — memo คือมีดผ่าตัด ไม่ใช่วิตามินโรยทั้งแอป (ฝั่ง Angular เจ็บน้อยกว่าด้วย OnPush/signals ที่ตีวงการเช็คให้ตั้งแต่ design — บท 9)

**แนวตอบ senior**: "ผม profile ก่อนเสมอ — memoization มี cost ของตัวเอง และพังเงียบถ้า reference ไม่ stable ผมเลือกใช้กับ subtree ที่วัดแล้วว่าแพงจริง ไม่ใช้เป็น default ทุก component"

## Caching Strategy ฝั่ง FE

สูตรทองของ static asset ยุค build tool ใส่ hash ในชื่อไฟล์:

```
# ไฟล์ชื่อมี content hash — เนื้อหาเปลี่ยนชื่อเปลี่ยน → cache ตลอดกาลได้ปลอดภัย
/assets/app.3f9c2a.js   → Cache-Control: public, max-age=31536000, immutable
# HTML คือ "สารบัญ" ชี้ไปยังชื่อไฟล์ล่าสุด — ห้าม cache ยาว ต้องทวนกับ server เสมอ
/index.html             → Cache-Control: no-cache   (เก็บได้แต่ต้อง revalidate ก่อนใช้)
```

`immutable` บอก browser ว่าไม่ต้องแม้แต่ถาม (ไม่มี conditional request) — deploy ใหม่คือ HTML ชี้ไปไฟล์ hash ใหม่ ไม่ใช่การ bust cache ไฟล์เก่า ชั้นถัดออกไปคือ CDN — cache ที่ edge ใกล้ user ลด TTFB ทั้ง asset และ (บางเคส) HTML — นโยบาย Cache-Control/ETag/invalidation เป็นศาสตร์เดียวกับ server-side caching ในเล่ม backend ยกชุด: FE เป็นแค่ hop สุดท้ายของ cache hierarchy เดียวกัน กับดักคลาสสิก: cache HTML ยาวเท่า asset → user ถือสารบัญเก่าชี้ไฟล์ hash ที่ถูกลบไปแล้ว → จอขาว

## อ่าน DevTools Performance Panel เบื้องต้น

เปิด record → ทำ interaction ที่ช้า → stop แล้วไล่จากบนลงล่าง: แถบ **CPU/Network** ภาพรวม → เลน **Main** คือ main thread — flame chart หัวกลับ: แท่งบนเรียกแท่งล่าง ความกว้าง = เวลา มองหา**แท่งกว้างที่มุมขวาบนแต้มสามเหลี่ยมแดง = long task** (เกิน 50ms) คลิกดู call tree ว่าเวลาไปกองที่ฟังก์ชันไหน — สีเหลือง scripting, ม่วง layout, เขียว paint · เห็นม่วงถี่ๆ สลับเหลืองเป็นฟันปลา = สงสัย **layout thrashing** (อ่าน layout สลับเขียน DOM ในลูป — บท 4) · แถว **Interactions** จับคู่ input กับงานที่มันจุด — ตัวชี้เป้า INP ตรงๆ · จำไว้ว่านี่คือ lab บนเครื่องเรา: เปิด CPU throttling 4x–6x ให้ใกล้มือถือ user จริงก่อนตัดสิน

## คำถามสัมภาษณ์ที่ต้องตอบได้

1. **Lighthouse ให้ 95 แต่ user บ่นว่าช้า — อธิบายยังไง เริ่มตรงไหน?** → Lighthouse เป็น lab: เครื่องจำลองหนึ่งรอบ ไม่แทน distribution ของ user จริง — ไปดู field data (CrUX/RUM) ที่ p75 ว่า metric ไหนแดง กลุ่ม device/network ไหนเจ็บ แล้วใช้ lab reproduce หา root cause — หลักเดียวกับที่ backend ดู p99 ไม่ใช่ average

2. **Core Web Vitals สามตัววัดอะไร เกณฑ์เท่าไหร่?** → LCP วัดความเร็วโหลด element ใหญ่สุด — good ≤ 2.5s / INP วัดการตอบสนองทุก interaction ตลอดหน้า — ≤ 200ms / CLS วัด layout กระโดด — ≤ 0.1 ทั้งหมดตัดสินที่ p75 ของ field data

3. **ทำไม INP แทน FID?** → FID วัดแค่ delay ก่อนเริ่มประมวลผลของ interaction แรก — เว็บผ่านง่ายทั้งที่ user รู้สึกหน่วงทั้งเซสชัน INP วัดครบวงจร (delay+processing+paint) ของทุก interaction แล้วรายงานตัวเกือบแย่สุด บังคับใช้แทน FID ตั้งแต่มีนาคม 2024 — วิธีแก้หลักคือแตก long task, yield to main thread, ลด JS

4. **Tree shaking ทำงานยังไง ทำไมบาง library shake ไม่ได้?** → อาศัยความ static ของ ESM — import/export วิเคราะห์ได้โดยไม่รันโค้ด จึงตัด export ที่ไม่ถูกใช้ได้ แต่ module ที่มี side effect ตอน import ตัดไม่ได้เพราะเสี่ยงพัง bundler จึงอนุรักษ์นิยม — แพ็กเกจต้องประกาศ `sideEffects` ให้ตัดได้เต็มมือ ส่วน CommonJS เป็น dynamic เกินกว่าจะวิเคราะห์ — ได้ทั้งก้อน

5. **ตารางหมื่นแถวช้า — แก้ยังไง?** → Virtualization: container สูงเท่าขนาดจริงให้ scrollbar ถูก แต่ render เฉพาะแถวใน viewport + buffer แล้ววางด้วย transform — DOM คงที่หลักสิบ node แลกกับความซับซ้อนเรื่องแถวสูงไม่คงที่, Ctrl+F, และ a11y — และถ้าข้อมูลมาจาก server ก็ประกบ infinite query: ฝั่งหนึ่งคุมว่ามีข้อมูลเท่าไหร่ อีกฝั่งคุมว่าวาดเท่าไหร่

6. **ใส่ React.memo ทั้งแอปแล้วทำไมไม่เร็วขึ้น?** → memo มี cost (เก็บ+compare props ทุก render) และพังเงียบเมื่อ props เป็น reference ใหม่ตลอด — จ่ายค่า compare แต่ไม่เคย hit อีกทั้งคอขวดจริงมักเป็น bundle/รูป/long task/state ที่วางสูงเกิน — ต้อง profile หา subtree ที่แพงจริงก่อน แล้ว memo เฉพาะจุดพร้อมทำ props ให้ stable

## สรุปท้ายบท

- performance ที่ดีเริ่มจากการวัด ไม่ใช่จากความรู้สึกหรือจาก checklist ที่จำมา
- ต้นทุนของเว็บกระจายอยู่หลายชั้น ทั้งโหลดครั้งแรก, การ render, JavaScript execution, data fetching และ interaction ระหว่างใช้งาน
- เทคนิคแต่ละอย่างมีค่าเมื่อผูกกับ bottleneck ที่วัดได้จริง ไม่ใช่เมื่อใช้ตามแฟชั่น
- คนที่ตอบ performance ได้ลึกคือคนที่เชื่อม metric, tooling และ execution path ของ browser เข้าหากันได้

## ก่อนไปบทถัดไป

หลังจากคุยเรื่องความเร็วของแอปแล้ว บทถัดไปจะคุยเรื่องคุณภาพอีกมุมที่สำคัญไม่แพ้กันคือ accessibility ซึ่งมักเป็นตัวสะท้อนว่าระบบ DOM, state และ interaction ของเราออกแบบมาดีจริงหรือไม่
