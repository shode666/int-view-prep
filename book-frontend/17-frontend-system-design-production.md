# บท 17 — Frontend System Design & Production: ห้องสัมภาษณ์กับตอนตีสองใช้กล้ามเนื้อเดียวกัน

> บท 1–16 คือการสะสมอาวุธทีละชิ้น — บทนี้คือสนามรบจริงสองสนาม: **ห้องสัมภาษณ์ system design** (ออกแบบ feature ทั้งตัวใน 45 นาที) และ **production ตอนตีสอง** (หน้าขาว, memory รั่ว, conversion ร่วง) สองสนามนี้ใช้กล้ามเนื้อเดียวกัน — คนที่เดินโจทย์ system design ได้ดีคือคนที่เคยไล่ปัญหา production มาแล้ว และ interviewer ระดับ senior แยกสองกลุ่มนี้ออกจากกันได้ในห้านาทีแรก

## เข็มทิศก่อนอ่าน

บทนี้เป็นบทสังเคราะห์ของทั้งเล่มจริง ๆ ไม่ใช่บทใหม่โดด ๆ ถ้าบท 1-16 คือการเรียนรู้ชิ้นส่วน เช่น runtime, rendering, state, data, performance, a11y และ testing บทนี้คือการเอาชิ้นส่วนเหล่านั้นมาจัดลำดับความคิดให้ใช้ตอบโจทย์ระดับระบบโดยไม่หลงป่า

อ่านบทนี้เหมือนกำลังซ้อมคิดออกเสียงต่อหน้า interviewer หรือเพื่อนร่วมทีม ทุก framework, trade-off และ production concern ที่พูดถึงควรโยงกลับไปยังบทก่อนหน้าได้ชัดเจน ยิ่งโยงได้มาก บทสุดท้ายเรื่อง interview execution จะยิ่งใช้ได้จริง

## ศัพท์แกนก่อนเข้าโจทย์

บทนี้ใช้คำย่อและคำเทคนิคหลายตัวตั้งแต่ต้น ถ้าไม่ปูพื้นก่อน คนอ่านจะรู้สึกเหมือนถูกโยนเข้ากลางบทสนทนาที่ทุกคนรู้ศัพท์กันอยู่แล้ว เลยขอสรุปความหมายแบบเร็วแต่พอจับภาพได้ก่อน:

- **CSR (Client-Side Rendering)** = browser โหลด JavaScript มาก้อนหนึ่งแล้วค่อยประกอบ UI เองเป็นหลัก
- **SSR (Server-Side Rendering)** = server สร้าง HTML มาให้ก่อน เพื่อให้หน้าแรกขึ้นเร็วและ crawler เห็นเนื้อหาได้
- **SSG (Static Site Generation)** = สร้าง HTML ล่วงหน้าตอน build แล้วเสิร์ฟไฟล์สำเร็จรูปผ่าน CDN
- **ISR (Incremental Static Regeneration)** = หน้า static ที่ยอมให้ regenerate ใหม่เป็นช่วง ๆ ไม่ต้องสดทุก request
- **RSC (React Server Components)** = component ที่รันฝั่ง server แล้วส่งผลลัพธ์มาผสมกับ client component เพื่อลดงานใน browser
- **BFF (Backend for Frontend)** = service ชั้นบาง ๆ ที่รวม/ตัด shape ของข้อมูลให้เหมาะกับหน้าจอ แทนให้ frontend ไปประกอบหลาย API เอง
- **CWV (Core Web Vitals)** = ชุด metric หลักของประสบการณ์ใช้งานบนเว็บ เช่น LCP, INP, CLS (อธิบายเต็มในบท 13)
- **RUM (Real User Monitoring)** = การเก็บ metric จากเครื่องผู้ใช้จริง ไม่ใช่จาก lab จำลอง

ถ้าจะสรุปบทนี้ในประโยคเดียว: เรากำลังคุยเรื่อง **การออกแบบ frontend ทั้งระบบ** ตั้งแต่เลือกวิธี render, จัดบ้าน state, ออกแบบรอยต่อกับ API, ไปจนถึงการปล่อยของจริงและไล่ปัญหาใน production

## Framework 10 ขั้น — โครงที่ทำให้ไม่หลงป่า

Frontend system design ต่างจากฝั่ง backend (เล่ม backend บท 18) ตรงที่ไม่มี capacity estimation หนักๆ แต่มีสิ่งที่ backend ไม่มี: **user ยืนอยู่หน้าจอจริงๆ** — ทุก state ที่มองข้าม (loading, error, empty, offline) คือหน้าจอที่ user เห็นจริง framework นี้เหมือน checklist นักบินก่อนบิน: ไม่ได้มีไว้โชว์ว่าท่องได้ แต่มีไว้กันลืมเรื่องที่ถ้าลืมแล้วตก

| ขั้น | ถามอะไร | ตอบอะไร (สัญญาณ senior) |
|---|---|---|
| 1. Clarify | ใครใช้ device/network แบบไหน scale เท่าไหร่ SEO สำคัญไหม | ตีกรอบ scope เอง + เลือก rendering strategy (SSR/CSR) จากคำตอบ |
| 2. User flow | happy path คืออะไร ทางแยกอยู่ตรงไหน | วาด flow ก่อนวาด component — flow กำหนดทุกอย่างที่เหลือ |
| 3. Data/state model | entity อะไรบ้าง state แต่ละก้อนอยู่บ้านไหน | แยก server state / client state (บท 12) + state 4 บ้าน (บท 7) |
| 4. Component architecture | แตก tree ยังไง boundary อยู่ตรงไหน | container/presentational, จุดวาง error boundary + Suspense |
| 5. API contract | ต้องการ data shape แบบไหน ใครเป็นคนตัด | ออกแบบ contract จากมุม UI, เสนอ BFF (Backend for Frontend) ถ้า shape ไม่ตรง |
| 6. Performance | อะไรคือ metric ที่แพงสุดของหน้านี้ | budget เป็นตัวเลข (Core Web Vitals — บท 13), แผน code splitting |
| 7. Error/loading/empty | แต่ละ state หน้าตาเป็นยังไง | ไล่ครบทุก state ไม่ต้องให้ interviewer จี้ |
| 8. Accessibility | ใช้คีย์บอร์ดอย่างเดียวรอดไหม | keyboard flow + focus management (บท 14) |
| 9. Testing | อะไรพังแล้วเจ็บสุด เทสระดับไหน | pyramid + เทสพฤติกรรมไม่ใช่ implementation (บท 15) |
| 10. Monitoring/rollout | ปล่อยยังไง รู้ได้ยังไงว่าพัง ถอยยังไง | RUM (Real User Monitoring) + error tracking + feature flag + rollback plan |

ตารางคือแผนที่ — แต่การใช้จริงต้องรู้ว่าแต่ละขั้น interviewer อยากเห็นอะไร:

**ขั้น 1 (Clarify)** — จุดที่คนตกเยอะสุด: โดดไปวาด component ทันที ทั้งที่คำถามเดียวอย่าง "ต้องรองรับ SEO ไหม" เปลี่ยนคำตอบทั้งกระดานจาก SPA (Single-Page Application) เป็น SSR (Server-Side Rendering) คำถามขั้นต่ำสี่ข้อ: ใครใช้ (พนักงานหลังบ้านบน desktop กับลูกค้าบนมือถือ 3G คือคนละระบบ), scale เท่าไหร่ (100 รายการ render ตรงๆ ได้ — 100,000 ต้องคิดใหม่หมด), SEO/social sharing สำคัญไหม (ตัวชี้ SSR), และ realtime แค่ไหน (refresh เอง / polling / push) — แล้ว**ตัด scope ออกเสียง**: "ผมโฟกัส flow หลักก่อน ส่วน admin view ขอ note ไว้ท้ายชั่วโมง" การกล้าตัดคือคะแนน ไม่ใช่การเสียของ (เล่ม backend บท 18 — หลักเดียวกัน)

**ขั้น 2–3 (Flow → Data/State)** — วาด user flow ก่อน component เสมอ เพราะ flow เผย state ที่ต้องมี: จุดที่ user รอ = loading state, จุดที่แยกทาง = condition ที่ต้องเก็บ, จุดที่ย้อนกลับ = state ที่ต้องไม่หาย จากนั้นถึงตอบว่า state แต่ละก้อนอยู่บ้านไหน (บท 7): ของจาก server อยู่ใน query cache (บท 12), ฟิลเตอร์/แท็บอยู่ใน URL (share ได้ กด back ได้), ของชั่วคราวอยู่ local — การประกาศบ้านให้ state ตั้งแต่ต้นทำให้ขั้นถัดๆ ไปไม่ต้องเถียงกันเอง

**ขั้น 4–5 (Component → Contract)** — แตก tree แบบหยาบพอ (สาม-ห้ากล่องหลัก) แล้วชี้ **boundary ที่มีความหมาย**: ตรงไหนคือ error boundary (พังแล้วล้มแค่ส่วน ไม่ล้มทั้งหน้า), ตรงไหน lazy load ได้ ส่วน API contract คือขั้นที่คน backend ได้เปรียบสุด — ออกแบบจากมุม "หน้านี้ต้องการอะไร" ไม่ใช่ "database มีอะไร": ถ้า UI ต้องยิงสาม endpoint มาประกอบเองทุกครั้ง เสนอ BFF (Backend for Frontend — ชั้นบางๆ ที่ตัด/รวม data ให้ตรง shape ที่หน้าจอใช้) พร้อม trade-off ว่ามันคือ service ที่ต้องมีคนดูแลเพิ่ม

**ขั้น 6–10** — เลือกเจาะตามโจทย์ ไม่ต้องเท่ากันทุกขั้น: dashboard เจาะ performance + realtime, form หนักๆ เจาะ error state + a11y แต่**ห้ามข้ามขั้น 7** — มันคือขั้นที่แยก senior ชัดสุด: junior ออกแบบ happy path, senior ออกแบบ**วันที่ API ตาย** (แต่ละ region ของหน้ามี loading/error/empty ของตัวเอง หรือทั้งหน้าล้มพร้อมกัน?) และปิดท้ายด้วยขั้น 10 สั้นๆ เสมอ: "ปล่อยหลัง feature flag, ดู error rate + CWV (Core Web Vitals) ของกลุ่ม canary, rollback คือปิด flag" — ประโยคเดียวนี้บอกว่าคุณเคย ship ของจริง

ต่อไปเดินเคสเต็มสามเคส — สามโจทย์นี้ครอบ pattern ที่โจทย์จริง 80% เป็น variation ของมัน

## Rendering Strategy Playbook — CSR, SSR, SSG, ISR, RSC เลือกจากแรงกดดัน ไม่ใช่จากแฟชั่น

gap ที่คนสัมภาษณ์ชอบมากในปีหลัง ๆ คือผู้สมัครตอบ React ได้ลึก แต่พอถามว่า "หน้านี้ควร render แบบไหน" กลับตอบเป็นชื่อ framework แทนคำตอบเชิงสถาปัตยกรรม แกนจริงมีคำถามไม่กี่ข้อ:

- หน้าแรกต้องขึ้นไวแค่ไหน
- ต้องติด SEO/social sharing ไหม
- ข้อมูลเปลี่ยนถี่แค่ไหน
- personalized ต่อ user ไหม
- server รับภาระเพิ่มได้ไหม

ตารางคิดเร็ว:

| กลยุทธ์ | เหมาะเมื่อ | ข้อดี | ราคา |
|---|---|---|---|
| **CSR** | dashboard หลังบ้าน, app login แล้ว, SEO ไม่สำคัญ | infra ง่าย, UI interactive ชัด, deploy FE แยกง่าย | first paint ช้า, SEO แย่, network waterfall ง่าย |
| **SSR** | SEO สำคัญ, first paint สำคัญ, data ต้องสดทุก request | HTML มาเร็ว, crawler เห็นเนื้อหา | server แพงขึ้น, ต้องคิด cache, TTFB ผูกกับ backend |
| **SSG** | หน้าเนื้อหาคงที่ เช่น docs, marketing, blog | เร็วมาก, CDN cache ง่าย, server เบา | ข้อมูลไม่สดตาม request, build อาจยาว |
| **ISR / revalidate** | content เปลี่ยนเป็นช่วง ๆ แต่ไม่ต้องสดทุกวินาที | ได้ความเร็วของ static + สดขึ้นเป็นระยะ | ต้องยอมรับ stale window และเข้าใจ cache invalidation |
| **RSC + client islands** | หน้า data-heavy ที่อยากลด JS ฝั่ง client | ส่ง data+markup จาก server ตรง, bundle client เล็กลง | mental model ซับซ้อนขึ้น, boundary server/client ต้องชัด |

### ตัวอย่าง 1 — หน้า marketing ของสินค้า

โจทย์: product landing page ต้องติด SEO, แชร์ลิงก์ในแชตแล้ว preview สวย, เนื้อหาแก้วันละไม่กี่ครั้ง

คำตอบที่คุ้มสุดมักเป็น **SSG หรือ ISR** ไม่ใช่ SSR ทุก request เพราะข้อมูลไม่ได้สดขนาดนั้น การจ่าย server cost ทุกครั้งไม่คุ้ม

ตัวอย่างใน Next.js App Router:

```tsx
export const revalidate = 60;

export default async function ProductPage() {
  const product = await fetch("https://api.example.com/product/42").then((res) => res.json());
  return <ProductDetails product={product} />;
}
```

ใจความสำคัญไม่ใช่ syntax แต่คือการบอก interviewer ว่า "ผมยอมให้ stale ได้ 60 วินาทีเพื่อซื้อ TTFB ต่ำและ CDN hit rate สูง"

### ตัวอย่าง 2 — dashboard หลังบ้าน

โจทย์: agent login เข้ามาดู order queue ที่เปลี่ยนตลอด, ไม่ต้องติด SEO, มี filter/interaction หนาแน่น

ตรงนี้ **CSR + query cache + streaming/realtime** มักตรงโจทย์กว่า SSR เพราะคุณค่าของหน้าไม่ได้อยู่ที่ bot ต้องอ่าน แต่คือผู้ใช้ที่ interactive หนักและต้อง stateful มาก

ถ้า SSR ทั้งหน้าแล้ว hydrate data-grid ขนาดใหญ่ทุก request อาจได้ต้นทุนสองฝั่งพร้อมกันโดยไม่ได้ประโยชน์อะไรเพิ่ม

### ตัวอย่าง 3 — หน้า product detail ที่มีของคงที่กับของ personalized ปนกัน

นี่คือเคสที่ดีสุดในการโชว์ความเป็น senior: **ผสม strategy ในหน้าเดียวได้**

- ชื่อสินค้า/รายละเอียดหลัก → static หรือ cached shared
- ราคา → request-time หรือ short revalidate
- recommendation เฉพาะ user → client fetch หรือ private server fetch

ประเด็นคืออย่าคิดเป็น "หน้าเลือกได้แค่ strategy เดียว" แต่คิดเป็น **region แต่ละส่วนมี freshness requirement ต่างกัน**

### SSR ไม่ได้แปลว่าต้องสดทุก request

ความเข้าใจผิดที่เจอบ่อย:

- SSG = static เก่า
- SSR = dynamic สด

ของจริงกลางกว่านั้นมาก โดยเฉพาะใน framework สมัยใหม่ที่ cache กับ rendering ถูกผสมกันเป็นชั้น ๆ หนึ่ง route อาจมีส่วนที่ prerender, ส่วนที่ revalidate ทุก 5 นาที, และส่วนที่ personalized ต่อ request อยู่พร้อมกันได้

คำตอบที่ดีจึงไม่ใช่ "เราใช้ Next.js เลย SSR" แต่คือ "ส่วนไหนของ route นี้ควรถูก cache แบบไหน และเพราะอะไร"

### BFF กับ rendering strategy มักมาคู่กัน

ถ้า SSR/RSC ต้องยิงสาม service เพื่อประกอบหน้า server จะกลายเป็นจุดรวม latency ทันที นี่คือจุดที่ **BFF** มีเหตุผลขึ้นมาก เพราะมันย้ายงานประกอบ shape จาก frontend runtime ไปไว้ใน service ที่คุม contract ได้ดีกว่า

ตัวอย่าง:

- client เรียก `/product/42`
- SSR server ต้องใช้ product + inventory + recommendation
- ถ้ายิงแยกสาม service ทุก request TTFB จะผูกกับ call chain ยาว
- ถ้ามี BFF `/product-page/42` ที่รวม shape มาให้ตรงหน้าจอ TTFB, caching และ error handling จะออกแบบง่ายขึ้น

นี่จึงเป็น seam ที่ frontend กับ backend ต้องคุยกันตั้งแต่ design ไม่ใช่ค่อยแก้เมื่อหน้าเริ่มช้า

## เคส 1 — Real-time Order Dashboard

**โจทย์**: dashboard ให้ทีม operation ดู order เข้าแบบ real-time มีเป็นพันแถว อัปเดตสถานะตลอดเวลา

**ขั้น clarify**: order เข้าถี่แค่ไหน (10/นาที กับ 100/วินาที คือคนละ design), ยอมเห็นข้อมูลช้าได้กี่วินาที, user ต้อง**ส่งคำสั่งกลับ** (เปลี่ยนสถานะ order) ผ่าน connection เดียวกันไหม — คำถามสุดท้ายนี้ชี้ทางเลือก transport ทันที

**Initial fetch + realtime**: pattern มาตรฐานคือ **snapshot + delta** — โหลดหน้าแรกด้วย REST ธรรมดา (ได้ pagination, cache, retry ฟรี) แล้วเปิด stream รับเฉพาะการเปลี่ยนแปลง อย่าใช้ stream ส่งข้อมูลตั้งต้น เพราะจะต้อง reinvent ทุกอย่างที่ HTTP มีให้แล้ว ส่วน transport เลือกระหว่าง WebSocket (WS — เปิดท่อสองทางถาวร) กับ SSE (Server-Sent Events — ท่อทางเดียว server→client บน HTTP ปกติ):

| | SSE | WebSocket |
|---|---|---|
| ทิศทาง | server → client เท่านั้น | สองทาง |
| Protocol | HTTP ปกติ — ผ่าน proxy/LB ง่าย | protocol แยก (upgrade) — infra ต้องรองรับ |
| Reconnect | **built-in** + `Last-Event-ID` อัตโนมัติ | เขียนเอง |
| เหมาะกับ | feed, notification, dashboard | chat, เกม, collaborative editing |

Dashboard นี้ข้อมูลไหลทางเดียว (คำสั่งเปลี่ยนสถานะยิง REST แยกได้) → **SSE เพียงพอและถูกกว่า** — แนวตอบที่ได้คะแนนคือการไม่หยิบ WebSocket โดย reflex แล้วอธิบายว่าทำไม

**Reconnect + missed events** — หัวใจจริงของเคสนี้ เพราะ connection **จะ**หลุดแน่นอน (wifi, sleep, deploy ฝั่ง server):

1. Reconnect ด้วย **exponential backoff + jitter** — หลักเดียวกับ retry ฝั่ง backend เป๊ะ (เล่ม backend บท 10): ถ้า server ล้มแล้ว client ทุกตัว reconnect พร้อมกันวินาทีเดียว = ช่วยกันกระทืบ server ที่เพิ่งฟื้น
2. ระหว่างหลุด มี event ที่พลาดไป — client ส่ง id/timestamp ของ event ล่าสุดที่ได้รับกลับไปตอน reconnect (SSE ทำให้ฟรีผ่าน `Last-Event-ID`) แล้ว server ส่งส่วนที่ขาด ถ้า server เก็บ backlog ไม่ไหว fallback คือ **refetch snapshot ใหม่ทั้งก้อน** — ยอมแพงครั้งเดียวดีกว่าข้อมูลผิดเงียบๆ
3. Event อาจมา**ซ้ำ** — reconcile ด้วย id + เวอร์ชัน ให้ replay ซ้ำแล้วผลเท่าเดิม หลักเดียวกับ consumer dedupe ฝั่ง backend (เล่ม backend บท 9)

โครงโค้ดของทั้งสามข้อ (สาระอยู่ที่ comment — ตอนสัมภาษณ์เขียน pseudo แบบนี้พอ ไม่ต้อง production-grade):

```typescript
function connectOrderStream(onEvent: (e: OrderEvent) => void, onStatus: (s: ConnStatus) => void) {
  let attempt = 0;
  let lastEventId: string | null = null;   // จุดต่อ "ขาดตรงไหน" ตอนกลับมา

  function open() {
    const url = lastEventId
      ? `/api/orders/stream?lastEventId=${lastEventId}`   // ขอเฉพาะที่พลาด
      : `/api/orders/stream`;
    const es = new EventSource(url);

    es.onopen = () => { attempt = 0; onStatus('live'); };  // ต่อติด → reset backoff

    es.onmessage = (msg) => {
      lastEventId = msg.lastEventId;                       // จำตำแหน่งล่าสุดทุก event
      onEvent(JSON.parse(msg.data));                       // applyEvent เช็คเวอร์ชันกันซ้ำอีกชั้น
    };

    es.onerror = () => {
      es.close();
      onStatus('reconnecting');
      // exponential backoff + jitter: 1s, 2s, 4s ... เพดาน 30s + สุ่มกัน thundering herd
      const base = Math.min(1000 * 2 ** attempt, 30_000);
      const delay = base + Math.random() * 1000;
      attempt++;
      if (attempt > 5) onStatus('stale');                  // นานเกิน → ป้าย stale + ปุ่ม refetch snapshot
      setTimeout(open, delay);
    };
  }
  open();
}
```

สังเกตว่า `EventSource` มี auto-reconnect ในตัวอยู่แล้ว — ที่เขียน backoff เองเพราะของ built-in ใช้ interval คงที่ (server กำหนดผ่าน `retry:` ได้แต่ไม่มี exponential/jitter) ประเด็นนี้เอ่ยในห้องได้คะแนน: รู้ว่าของฟรีมีอะไร และทำไมยังต้องเขียนเพิ่ม

**State model**: normalize เก็บเป็น map (บท 12) — เหมือนทะเบียนราษฎร์ที่ค้นด้วยเลขบัตร ไม่ใช่กระดาษเรียงกองที่ต้องไล่หาทีละแผ่น:

```typescript
type OrdersState = {
  byId: Record<string, Order>;   // อัปเดต order เดียว → แตะ object เดียว
  ids: string[];                 // ลำดับการแสดงผล แยกจากตัวข้อมูล
  connection: 'live' | 'reconnecting' | 'stale';
};

function applyEvent(state: OrdersState, e: OrderEvent): OrdersState {
  const current = state.byId[e.orderId];
  if (current && current.version >= e.version) return state; // ซ้ำ/เก่า — ทิ้ง
  return { ...state, byId: { ...state.byId, [e.orderId]: { ...current, ...e.patch, version: e.version } } };
}
```

ถ้าเก็บเป็น array แล้ว `map()` หาตัวที่จะแก้ ทุก event จะสร้าง array ใหม่ → ทุกแถว re-render — บนพันแถว × สิบ event/วินาที คือ frame หลุด (บท 4) การ normalize + memo ต่อแถว ทำให้ event หนึ่งลูกแตะ DOM แค่แถวเดียว และพันแถวต้อง **virtualize** (render เฉพาะที่อยู่ใน viewport — บท 13) ตั้งแต่แรก ไม่ใช่รอช้าแล้วค่อยแก้

**Stale indicator**: ตอน `reconnecting/stale` ห้ามซ่อนข้อมูลและห้ามแกล้งสด — แสดงข้อมูลเก่าพร้อมป้าย "ข้อมูลเมื่อ 14:02 — กำลังเชื่อมต่อใหม่" ทีม operation ตัดสินใจจากตัวเลขบนจอ ข้อมูลเก่าที่**รู้ว่าเก่า**ปลอดภัยกว่าข้อมูลเก่าที่ดูเหมือนสด

**แนวตอบ senior**: "ผมใช้ snapshot ผ่าน REST + delta ผ่าน SSE เพราะข้อมูลไหลทางเดียว — reconnect เป็น backoff + jitter, ตอนหลุดใช้ Last-Event-ID ขอ event ที่ขาด ถ้า backlog ไม่พอก็ refetch snapshot, state normalize by id ให้ event หนึ่งลูก re-render แถวเดียว, virtualize ตั้งแต่แรก และมี stale indicator เพราะ connection หลุดคือเรื่องปกติไม่ใช่ edge case"

## เคส 2 — Search Autocomplete

โจทย์ที่ดูเล็กแต่เป็นจุดนัดพบของความรู้ครึ่งเล่ม — interviewer ชอบมันเพราะมันวัดได้หลายชั้นในโจทย์เดียว:

1. **Debounce** (บท 2) — พิมพ์ "iphone" 6 ตัวอักษรไม่ควรยิง 6 request รอ user หยุดพิมพ์ ~300ms ก่อน
2. **Race condition + cancel** (บท 1, 12) — request "iph" อาจกลับมา**หลัง** "iphone" แล้วทับผลลัพธ์ใหม่ด้วยของเก่า นี่คือบั๊กคลาสสิกที่กรรมการรอดูว่าเห็นเองไหม — แก้ด้วย `AbortController` ยกเลิก request เก่าทุกครั้งที่ยิงใหม่ (และ**ต้อง**ยกเลิก ไม่ใช่แค่ทิ้งผลลัพธ์ — ประหยัดทั้ง network และงานฝั่ง server)
3. **Cache** (บท 12) — user พิมพ์แล้วลบกลับมาคำเดิมบ่อยมาก cache ต่อ query สั้นๆ (TTL ไม่กี่นาที) ตัด request ได้เยอะ และตอบทันทีไม่กะพริบ
4. **Keyboard a11y** (บท 14) — ลูกศรเลื่อน, Enter เลือก, Esc ปิด, focus อยู่ที่ input ตลอดแล้วใช้ `aria-activedescendant` ชี้ตัวที่ active ตาม combobox pattern — จุดที่แยกคนเคยอ่าน ARIA (Accessible Rich Internet Applications) spec ออกจากคนเดา
5. **Highlight คำค้น** (บท 16) — ห้ามเอา query ไปประกอบ HTML string แล้ว `innerHTML` เด็ดขาด (XSS ทันที) — split ข้อความแล้ว render เป็น element

เคสนี้แหละคือคำตอบของคำถาม "อ่านทั้งเล่มไปทำไม": ความรู้บท 1, 2, 12, 14, 16 ไม่ได้อยู่แยกลิ้นชัก — โจทย์จริงหนึ่งข้อดึงมันออกมาพร้อมกันหมด โค้ดเต็มพร้อมเหตุผลทุกการตัดสินใจอยู่บท 18 (เฉลยข้อ 1)

**แนวตอบ senior**: "สามชั้นที่ต้องมีคือ debounce ลดจำนวนยิง, AbortController กัน stale response ทับของใหม่, และ combobox keyboard pattern — ถ้ามีเวลาต่อ ผมเพิ่ม cache ต่อ query และ highlight แบบ split element ไม่ใช่ innerHTML"

## เคส 3 — Design System Component Library

**โจทย์**: สร้าง component library ให้ 8 ทีมใช้ร่วมกัน — โจทย์นี้ไม่ได้วัดว่าเขียน Button เป็น แต่วัดว่าเข้าใจไหมว่า**ของที่คนอื่นพึ่งพาคือ API สาธารณะ** และ API สาธารณะแก้ยากที่สุดในโลก

**ชั้น token** (บท 5): design token คือชั้นแปลระหว่างภาษา design (`color-primary`, `space-3`) กับค่าจริง (`#0055ff`, `12px`) — component อ้าง token ไม่อ้างค่าตรง ทำให้เปลี่ยน theme/rebrand ได้โดยไม่แตะ component สักตัว

**Component API — ยืดหยุ่นแค่ไหนดี**: คำถามออกแบบที่แท้จริงของเคสนี้ สองขั้วคือ:

| | Configuration (props เยอะ) | Composition (ประกอบ children) |
|---|---|---|
| หน้าตา | `<Modal title footer showClose>` | `<Modal><Modal.Header/><Modal.Body/></Modal>` |
| ทีมใช้ | ง่าย เดาได้ consistent | ต้องเข้าใจโครง แต่ทำเคสแปลกได้ |
| ราคา | ทุกเคสใหม่ = prop ใหม่ → prop ระเบิด | ผู้ใช้ประกอบผิดได้ ถ้าไม่มี guard |

Senior ตอบว่า**ใช้ทั้งคู่เป็นชั้น**: composition เป็นฐาน (ยืดหยุ่นสุด) แล้วห่อ configuration shorthand สำหรับ 80% case — และ**อย่า**เปิด `className`/`style` รับทุกอย่างพร่ำเพรื่อ เพราะทุกช่องที่เปิดคือสัญญาที่ถอนไม่ได้: วันที่เปลี่ยน DOM ภายใน ทุกทีมที่ยัด CSS เจาะเข้ามาจะพังพร้อมกัน

**Versioning + breaking change ข้าม 8 ทีม** — เจ็บสุดของเคสนี้ การเปลี่ยน props ของ component ที่ 8 ทีมใช้ เหมือนเปลี่ยนมาตรฐานปลั๊กไฟทั้งประเทศ: สั่งให้ทุกบ้านเปลี่ยนคืนเดียวไม่ได้ ต้องมีช่วงที่ปลั๊กสองแบบใช้ได้พร้อมกัน — นี่คือ **expand–contract** ตัวเดียวกับ DB migration ฝั่ง backend เป๊ะ (เล่ม backend บท 14, 20):

1. **Expand**: เพิ่ม API ใหม่ (`variant="danger"`) โดย API เก่า (`isDestructive`) ยังทำงาน — ภายในแปลงเก่า→ใหม่ + `console.warn` deprecation ชี้ทางแก้
2. **Migrate**: ปล่อย **codemod** (script แปลงโค้ดอัตโนมัติ) ให้ทีมรันแทนการไล่แก้มือ + ตั้งเส้นตายเป็น minor releases ไม่ใช่วันที่
3. **Contract**: ลบ API เก่าใน **major version** ตาม semver (Semantic Versioning) — breaking change นอก major คือการทำลายความเชื่อใจของทั้ง 8 ทีมในครั้งเดียว

**Visual regression**: เทสปกติจับ logic แต่จับ "เงาหายไป 1px ทุกปุ่มทั้งบริษัท" ไม่ได้ — ใช้ screenshot เทียบ pixel ต่อ commit (Chromatic บน Storybook หรือ Playwright screenshot testing) ให้การเปลี่ยนแปลงทางสายตาทุกจุดต้องมีคน approve เหมือน code review ของ pixel

**แนวตอบ senior**: "ผมออกแบบเป็นสามชั้น token → primitive → composition พร้อม configuration shorthand — ส่วน breaking change ใช้ expand–contract: เพิ่มของใหม่ + deprecate warning + codemod แล้วค่อยลบใน major เพราะ library ที่หลายทีมใช้คือ API สาธารณะ ต้อง migrate แบบเดียวกับ DB schema"

## Micro Frontend — ใช้เมื่อไหร่จริงๆ

คำถามล่อเป้าที่ interviewer ใช้วัด maturity — คำตอบที่สอบตกคือ "มันคือเทรนด์ ทำให้ scale ได้" คำตอบที่ผ่านต้องเริ่มจากประโยคนี้: **micro frontend คือ organizational solution ไม่ใช่ technical solution** — มันแก้ปัญหา "50 คนใน repo เดียว release คอกันตาย" ไม่ได้แก้ปัญหา technical ใดๆ ที่ monolith แก้ไม่ได้ (Conway's Law ภาคปฏิบัติ — เล่ม backend บท 15 ตรรกะเดียวกับ "microservice เพื่อทีม ไม่ใช่เพื่อ tech")

ราคาที่ต้องจ่าย: dependency ซ้ำซ้อนข้าม bundle, design consistency ต้องบังคับด้วย design system ที่แข็งแรงมาก (เคส 3 คือ prerequisite), shared state ข้าม boundary ยากและน่าเกลียด, debugging ข้ามทีมข้าม deploy, และ infra ที่ซับซ้อนขึ้นหนึ่งระดับ สถานะปี 2026: เครื่องมือโตเต็มแล้ว — Module Federation (รุ่น 2.x ขึ้นไป ย้ายบ้านมาอยู่ module-federation.io ใช้ได้ทั้ง webpack/Rspack) และ Native Federation ฝั่ง ESM (ECMAScript Modules) ที่ Angular นิยม ส่วน Next.js มี Multi-Zones แก้โจทย์ "แยกทีมแยก deploy" ที่ชั้น routing โดยยอม hard navigation ข้ามโซน — เครื่องมือไม่ใช่ข้ออ้างอีกต่อไป แต่ consensus ยังเหมือนเดิม: ทีมหลักสิบคนขึ้นไปหลายทีมที่ release ชนกันจริงๆ ถึงคุ้ม ถ้าต่ำกว่านั้น **monorepo + lazy loading ต่อ route** ให้ 80% ของประโยชน์ที่ 20% ของราคา

**แนวตอบ senior**: "ผมจะยังไม่ใช้จนกว่าปัญหาจะเป็น organizational จริง — หลายทีม release block กัน ถ้าแค่อยากแยกโค้ด monorepo + code splitting พอ และก่อนแยกต้องมี design system กับ integration contract (เวอร์ชัน framework ที่ share, token, ownership ของ error boundary) ไม่งั้นได้ mini-monolith หลายก้อนที่พังแบบกระจาย"

## Production Scenarios — ไล่ปัญหาเป็นเรื่อง

ห้าเรื่องต่อไปนี้คือคำถามสัมภาษณ์ยอดนิยมรูปแบบ "เจอแบบนี้ทำยังไง" — สิ่งที่เขาวัดไม่ใช่คำตอบสุดท้าย แต่คือ**ลำดับการไล่** ว่าเป็นระบบหรือเดาสุ่ม

### เรื่องที่ 1: White screen after deploy

Deploy บ่ายสาม สี่โมง support แจ้ง "ลูกค้าบางคนเปิดมาหน้าขาว" — บางคน คือคีย์เวิร์ด เปิด **console ก่อนเสมอ**: เจอ `ChunkLoadError: Loading chunk 42 failed` เปิดแท็บ network ต่อ: ไฟล์ `checkout.a1b2c3.js` ตอบ **404** ทีนี้ภาพชัด — bundler ใส่ hash ของเนื้อหาไว้ในชื่อไฟล์ (บท 13) deploy ใหม่ = ชื่อ chunk ชุดใหม่ทั้งหมด และตัว deploy **ลบไฟล์เก่าทิ้ง**: user ที่เปิดแท็บค้างไว้ (หรือได้ HTML เก่าจาก cache) ถือ "แผนที่ตึกฉบับเก่า" ที่ชี้ไปห้องซึ่งถูกรื้อไปแล้ว — พอ lazy load route ก็ 404 → หน้าขาว ถ้า network ปกติแต่ path เพี้ยน (`/assets/...` หายไป prefix) ผู้ต้องสงสัยคือ base path/env config ระหว่าง staging กับ prod และถ้า HTML เก่าเสิร์ฟจาก CDN (Content Delivery Network) ทั้งที่ deploy แล้ว คือ cache header ผิดชั้น

ทางแก้ครบชุด: (1) **HTML ต้อง `no-cache`** (ตรวจกับ server ทุกครั้ง), asset ที่มี hash ตั้ง `immutable` cache ยาวได้เพราะเนื้อหาเปลี่ยนชื่อก็เปลี่ยน (2) เก็บ asset เวอร์ชันเก่าไว้ N release แทนการลบทันที (3) ดัก dynamic import fail → reload หน้าหนึ่งครั้ง (ได้ HTML ใหม่ + chunk ชุดใหม่) (4) error boundary กันขาวทั้งจอเหลือขาวแค่ส่วน — และทั้งหมดนี้ต้องรู้จาก error tracking ไม่ใช่จาก support

```typescript
// ข้อ (3) ฉบับสั้น: chunk 404 หลัง deploy → reload หนึ่งครั้ง (กัน loop ด้วย sessionStorage)
const lazyWithReload = (load: () => Promise<any>) =>
  load().catch((err) => {
    if (!sessionStorage.getItem('chunk-reloaded')) {
      sessionStorage.setItem('chunk-reloaded', '1');
      window.location.reload();          // HTML ใหม่ → ชี้ chunk ชุดใหม่
      return new Promise(() => {});      // ค้างไว้ระหว่างรอ reload
    }
    throw err;                           // reload แล้วยังพัง → error จริง ส่งเข้า error tracking
  });
```

### เรื่องที่ 2: Memory leak เปิดเว็บ 2 ชั่วโมง

Ops แจ้งว่า dashboard (เคส 1 นั่นแหละ — จอที่เปิดค้างทั้งวัน) ช้าลงเรื่อยๆ จนค้าง วิธีไล่ล้อกับการไล่ heap ฝั่ง JVM (เล่ม backend บท 22) เป๊ะ — เปลี่ยนแค่เครื่องมือ: DevTools → Memory → **heap snapshot สามจังหวะ**: (1) หลังโหลดเสร็จ (2) ใช้งานหนักๆ — เปิดปิด modal สลับหน้า 20 รอบ (3) กด GC (Garbage Collection) แล้ว snapshot อีกครั้ง ถ้า (3) ไม่กลับมาใกล้ (1) = ของค้างจริง เทียบ snapshot ดู "Objects allocated between 1 and 3" เรียงตาม retained size เหมือนชั่งน้ำหนักก่อน-หลังแล้วดูว่าอะไรกินเข้าไปไม่ยอมออก

ผู้ต้องสงสัยประจำสี่ราย: **event listener** ที่ add ตอน mount แต่ไม่ remove ตอน unmount (โดยเฉพาะบน `window`/`document` ที่อยู่ยงกว่า component), **timer** (`setInterval` ที่ไม่ clear), **detached DOM** — DOM ที่หลุดจาก tree แล้วแต่มี JS ถือ reference อยู่เลย GC ไม่ได้ (ค้นคำว่า "Detached" ใน snapshot ได้เลย), และ **subscription** ที่ไม่ unsubscribe — RxJS คือแชมป์หมวดนี้ (บท 10: `takeUntilDestroyed`) ฝั่ง React คือ effect ที่ไม่มี cleanup function ยารักษาคือวินัยเดียว: **ทุกการ subscribe/listen/setInterval ต้องมีคู่ cleanup ในที่เดียวกัน** — เขียนตอนเดียวกับที่เปิด ไม่ใช่ไว้ค่อยตามเก็บ

### เรื่องที่ 3: Duplicate submit

ลูกค้ากดปุ่มจ่ายเงิน เน็ตอืด ไม่มีอะไรเกิดขึ้น กดอีกสามที — ได้ order สี่ใบ การ์ดโดนตัดสี่ครั้ง แก้เป็นสามชั้นและ**ชั้นเดียวไม่พอ**: (1) UI — กดแล้ว disable ปุ่ม + spinner ทันที (กันคนใจร้อน แต่กันไม่ได้ถ้า user refresh หรือ JS พลาด) (2) client logic — flag `isSubmitting` กันโค้ดยิงซ้ำเอง (double-click เร็วกว่า re-render ที่ disable ปุ่ม) (3) **idempotency key** (เล่ม backend บท 11) — FE สร้าง unique key ต่อ "ความตั้งใจซื้อหนึ่งครั้ง" (ตอน mount หน้า checkout ไม่ใช่ตอนกดปุ่ม!) แนบทุก request server เจอ key ซ้ำก็คืนผลเดิมไม่ทำงานซ้ำ ชั้นที่สามคือชั้นเดียวที่กันได้จริงเพราะสองชั้นแรกอยู่ในเครื่องที่เชื่อถือไม่ได้ (บท 16: FE ไม่ใช่ security boundary) — นี่คือคำตอบที่คนมาจาก backend ตอบได้สวยกว่า frontend dev ทั่วไป: คุณรู้ว่าฝั่ง server ต้องทำอะไรด้วย

### เรื่องที่ 4: Bundle โต 40% หลัง release

CI (Continuous Integration) ไม่มีใครดูขนาด bundle จน LCP (Largest Contentful Paint) พุ่งใน RUM — เปิด bundle analyzer เทียบ before/after ผู้ต้องสงสัยขาประจำ: import ทั้ง library เพื่อใช้ฟังก์ชันเดียว (`import _ from 'lodash'`), library วันที่/chart ลาก locale หรือ module ทั้งโลกมาด้วย, dependency ซ้ำสองเวอร์ชันเพราะ transitive dependency ไม่ dedupe, และ dynamic import ที่เผลอเปลี่ยนเป็น static ทำ chunk ที่เคยแยกโดนดูดกลับเข้า main แก้ที่ต้นเหตุแล้ว**กันเกิดซ้ำ**: ตั้ง **performance budget เป็น CI gate** (size-limit/bundlesize) — PR ไหนทำ chunk หลักเกิน budget = fail ให้เห็นราคาตั้งแต่ตอน review ไม่ใช่ตอน user จ่าย ตรรกะเดียวกับ test: ของที่ไม่มี gate จะเสื่อมเสมอ

### เรื่องที่ 5: Conversion drop หน้า checkout

Product แจ้ง conversion ตก 15% สัปดาห์นี้ — ไม่มี error ใน log ฝั่ง server เลย นี่คือโจทย์ที่ตอบด้วยความรู้สึกไม่ได้ ต้องมีเครื่องมือสามชิ้นต่อกัน: (1) **RUM** (Real User Monitoring — เก็บ performance/พฤติกรรมจากเครื่อง user จริง) ดู funnel ว่า user หลุดขั้นไหน — สมมติหลุดตรง "กรอกบัตร → กดจ่าย" ผิดปกติ (2) **error tracking** filter เฉพาะหน้านั้น — อาจเจอ JS error เฉพาะ Safari iOS ที่ server ไม่มีวันเห็นเพราะ request ไม่เคยถูกส่ง (3) **correlate กับ release/flag timeline** — จุดตกตรงกับ deploy ไหน flag ตัวไหนเปิด และอย่าลืมผู้ร้ายเงียบ: ไม่มี error ก็พังได้ — INP (Interaction to Next Paint) แย่ลงจน user คิดว่าปุ่มไม่ทำงาน, third-party script (analytics/ads ตัวใหม่ที่ marketing ใส่) block main thread บทเรียนคือ: **conversion คือ metric ทาง technical ด้วย** — senior FE ต้องเชื่อมสองโลกนี้ให้เป็น

## Feature Flag, Canary, Rollback ฝั่ง FE

Deploy ≠ release (เล่ม backend บท 20) ใช้ได้ทั้งสองฝั่ง แต่ flag ฝั่ง FE มีความต่างที่ต้องตอบให้ได้: **โค้ดสองเวอร์ชันอยู่ใน bundle เดียวกัน** — ฝั่ง backend เลือก code path บน server จบ แต่ฝั่ง FE โค้ดทั้ง flag on และ off ถูก ship ไปเครื่อง user ทุกคน แปลว่า (1) จ่ายค่า bundle size ของ feature ที่ยังปิดอยู่ (2) โค้ดหลัง flag ถูกแกะอ่านได้ — ห้ามซ่อนความลับ/สิทธิ์ไว้หลัง flag (บท 16) (3) flag ที่จบงานแล้วต้องลบ ไม่งั้น dead code สะสมใน bundle — flag คือ inventory ที่มี carrying cost, feature ยังไม่เสร็จจนกว่า flag ของมันจะถูกลบ

จุดตัดสินใจอีกอัน: **evaluate flag ที่ไหน** — client-side evaluation เสี่ยง flicker (จอกะพริบจาก default ไปค่าจริงตอน flag โหลดเสร็จ) แนวโน้มปี 2026 คือดัน evaluation ไป server/edge ให้ HTML แรกถูกตั้งแต่ต้น ส่วน tooling: มาตรฐานกลางคือ **OpenFeature** — API กลางที่ swap provider ได้ (LaunchDarkly, Unleash, Flagsmith, PostHog, Statsig, GrowthBook) โค้ดเราผูกกับ interface ไม่ผูกกับ vendor — Dependency Inversion ภาค infra (เล่ม backend บท 3):

```typescript
import { OpenFeature } from '@openfeature/web-sdk';

await OpenFeature.setProviderAndWait(new SomeVendorProvider({ apiKey }));  // เปลี่ยน vendor = เปลี่ยนบรรทัดนี้บรรทัดเดียว
const client = OpenFeature.getClient();

// ทุกจุดใช้งานผูกกับ API กลาง + มี default ที่ปลอดภัยเสมอ (flag service ล่ม ≠ เว็บล่ม)
if (client.getBooleanValue('new-checkout', false)) renderNewCheckout();
else renderOldCheckout();
```

สังเกต default `false` — กติกาเหล็กของ flag ฝั่ง FE: **ค่า default ต้องเป็นเส้นทางที่ปลอดภัยที่สุด** เพราะวันที่ flag service ตอบช้าหรือตาย ทุก user จะได้ default นั้น

**Canary + rollback ฝั่ง FE**: ปล่อย 5% → ดู error rate + CWV (Core Web Vitals) + business metric ของกลุ่ม canary เทียบ control → ค่อยขยาย ถ้า metric แย่ **rollback = ปิด flag ไม่ใช่ re-deploy** — มีผลในไม่กี่วินาทีสำหรับทุก session ที่โหลดค่าใหม่ นี่คือเหตุผลที่ feature ใหญ่ทุกตัวควรมี **kill switch**: สวิตช์ไฟที่กดปิดได้จากนอกบ้าน ต่างจาก re-deploy ที่เหมือนต้องรื้อสายไฟใหม่ทั้งหลัง (build + CDN invalidation + รอ user โหลดรอบใหม่ — ครึ่งชั่วโมงในวันที่ทุกนาทีคือเงิน)

## Error Tracking + RUM — ตาของ FE ใน Production

Backend มี log กลางเพราะโค้ดรันบนเครื่องเรา — FE รันบน**เครื่องของ user เป็นล้านเครื่อง** ไม่มีใครส่ง log มาให้ ต้องวางระบบเก็บเอง สองขา:

**Error tracking** (Sentry เป็น de facto — ทางเลือกสาย self-host เช่น GlitchTip หรือสาย OpenTelemetry-native ก็ใช้หลักเดียวกัน): SDK ดักจับ unhandled error + stack trace + context (browser, release, user id) ปัญหาแรกที่ทุกทีมเจอ: stack trace เป็นโค้ด minified อ่านไม่ออก — ต้อง**อัปโหลด source map** (แผนที่ย้อน minified → source) ให้ระบบตอน build โดย**ไม่ ship ขึ้น public** และ tag ทุก error ด้วย **release version** เพื่อตอบคำถามสำคัญที่สุดใน production: "error นี้เริ่มที่ release ไหน" — ซึ่งคือ 80% ของการหา root cause

**Correlation id โยง FE→BE** (เล่ม backend บท 11, 21): FE สร้าง/รับ id แนบ header (`traceparent` ตามมาตรฐาน W3C Trace Context) ไปกับทุก request → error ฝั่ง FE ชี้ไปยัง trace ฝั่ง backend ได้ตรงตัว ไม่ต้องเดาจาก timestamp ว่า "จอ error ตอน 14:02 คู่กับ log server บรรทัดไหน" — จุดที่คน full-stack ได้เปรียบสุด เพราะเห็นทั้งสองปลายของเชือกเส้นเดียวกัน:

```typescript
// fetch wrapper กลางของแอป — id เดียววิ่งครบเส้น: FE error ↔ BE trace ↔ log
async function apiFetch(input: string, init: RequestInit = {}) {
  const traceId = crypto.randomUUID();
  const res = await fetch(input, {
    ...init,
    headers: { ...init.headers, 'X-Correlation-Id': traceId },  // หรือ traceparent เต็มรูปแบบผ่าน OTel SDK
  });
  if (!res.ok) {
    errorTracker.captureMessage(`API ${res.status}: ${input}`, { tags: { traceId } }); // ฝั่ง FE tag ด้วย id เดียวกัน
  }
  return res;
}
```

**RUM**: เก็บ CWV + custom metric จาก user จริง (field data) — ตัวเลขที่ lab อย่าง Lighthouse ไม่มีวันเห็น เพราะ lab ไม่มีมือถือเก่าๆ บนเน็ต 3 ขีดของ user จริง (บท 13: measure-first) แดชบอร์ดขั้นต่ำที่ทีม FE ควรมี: error rate ต่อ release, CWV p75 ต่อหน้า, funnel ของ flow ที่เป็นเงิน — สามจอนี้คือเครื่องมือไล่เรื่องที่ 1–5 ทั้งหมดข้างบน

## คำถามสัมภาษณ์ที่ต้องตอบได้

1. **"ออกแบบ real-time dashboard — WebSocket หรือ SSE?"** → เริ่มจากทิศทางข้อมูล: ทางเดียว → SSE (HTTP ปกติ, reconnect + Last-Event-ID ฟรี), สองทาง → WS แล้วปิดด้วย reconnect story: backoff + jitter + resync missed events — คนที่พูดเรื่อง "ตอนหลุดแล้วยังไงต่อ" คือคนที่เคยทำจริง
2. **"Deploy แล้ว user บางคนเจอหน้าขาว ไล่ยังไง?"** → console → ChunkLoadError → network 404 → เล่ากลไก hashed filename + HTML เก่าชี้ chunk ที่ถูกลบ → แก้: HTML no-cache, asset immutable, เก็บ chunk เก่า N release, ดัก import fail → reload
3. **"เว็บช้าลงเรื่อยๆ เมื่อเปิดนาน สงสัยอะไร?"** → heap snapshot สามจังหวะ (โหลด/ใช้หนัก/หลัง GC) เทียบ retained size → ผู้ต้องสงสัย: listener บน window, setInterval, detached DOM, subscription ไม่ unsubscribe — และวินัยกัน: cleanup เขียนคู่กับที่ subscribe เสมอ
4. **"กันกดจ่ายเงินซ้ำยังไง?"** → สามชั้น: disable ปุ่ม (UX) + isSubmitting flag (client) + idempotency key ที่สร้างตอน mount (server — ชั้นเดียวที่เชื่อถือได้) เพราะ FE ไม่ใช่ security boundary
5. **"Micro frontend ดีไหม ควรใช้เมื่อไหร่?"** → organizational solution: คุ้มเมื่อหลายทีม release block กันจริง — ต่ำกว่านั้น monorepo + code splitting ให้ประโยชน์เกือบเท่าที่ราคาถูกกว่ามาก และ prerequisite คือ design system + integration contract ที่แข็งแรง
6. **"Rollback ฝั่ง FE ต่างจาก BE ยังไง?"** → re-deploy ฝั่ง FE ช้า (build + CDN + รอ user โหลดใหม่) → feature ใหญ่ต้องอยู่หลัง flag ให้ rollback = ปิด flag ในวินาที และ flag ฝั่ง FE มีราคาเฉพาะตัว: โค้ดสองเวอร์ชันใน bundle + อ่านได้จาก client + ต้องลบเมื่อจบงาน

## สรุปท้ายบท

- system design ฝั่ง frontend ไม่ได้เป็นเรื่องวาด component tree อย่างเดียว แต่เป็นการจัดลำดับความคิดจาก user flow ไปถึง rollout และ monitoring
- production issue ส่วนใหญ่จะไล่ได้ดีเมื่อเราเชื่อมมันกลับไปยังรากเรื่อง state, rendering, network, performance และ security ที่เรียนมาก่อนหน้า
- senior ไม่ได้ต่างเพราะจำ pattern เยอะกว่า แต่ต่างเพราะรู้ว่าควรถามอะไร ตัด scope ตรงไหน และ trade-off แบบใดควรถูกพูดออกมาทันที
- บทนี้จึงเป็นสะพานจากความรู้รายบทไปสู่ความสามารถในการออกแบบและตัดสินใจจริง

## ก่อนไปบทถัดไป

เมื่อภาพใหญ่ของระบบเริ่มครบแล้ว บทสุดท้ายจะเปลี่ยนความรู้นี้ให้กลายเป็นการสื่อสารและการลงมือภายใต้แรงกดในห้องสัมภาษณ์ เพื่อให้สิ่งที่คิดอยู่ในหัวถูกมองเห็นจากภายนอก
