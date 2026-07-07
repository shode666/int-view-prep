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

ตารางคือแผนที่ย่อ — แต่แผนที่ไม่ได้บอกว่าแต่ละหมุดต้องลงมือทำอะไรจริง ๆ และ interviewer อยากเห็นอะไรตรงนั้น ไล่ทีละขั้นให้ครบ:

**ขั้น 1 — Clarify (ตีกรอบโจทย์ก่อนวาดอะไรทั้งนั้น):** จุดที่คนพลาดเยอะที่สุดคือโดดไปวาด component ทันทีที่ได้โจทย์ ทั้งที่คำถามชี้เป็นชี้ตายเพียงข้อเดียวอย่าง "ต้องรองรับ SEO ไหม" เปลี่ยนคำตอบทั้งกระดานจาก SPA (Single-Page Application) ไปเป็น SSR (Server-Side Rendering) มีคำถามขั้นต่ำสี่ข้อที่ต้องถามให้ครบก่อน: **ใครใช้** (พนักงานหลังบ้านบน desktop กับลูกค้าบนมือถือเน็ต 3G คือคนละระบบกันคนละดีไซน์), **scale เท่าไหร่** (ข้อมูล 100 รายการ render ตรง ๆ ได้ แต่ 100,000 รายการต้องคิดใหม่ทั้งหมดเรื่อง virtualization/pagination), **SEO หรือ social sharing สำคัญไหม** (ถ้าใช่คือสัญญาณชี้ไป SSR/SSG), และ **ต้อง realtime แค่ไหน** (refresh เอง / polling / push — แต่ละแบบเปลี่ยน transport). พอได้คำตอบแล้วสิ่งที่แยก senior ออกมาคือการ **ตัด scope ออกเสียงดัง ๆ**: "ผมขอโฟกัส flow หลักก่อน ส่วน admin view กับ export ขอ note ไว้ไปคุยท้ายชั่วโมง" — การกล้าตัดคือคะแนน ไม่ใช่การทำงานไม่ครบ เพราะมันแสดงว่าคุณจัดลำดับความสำคัญเป็น (เล่ม backend บท 18 ใช้หลักเดียวกันเป๊ะ)

**ขั้น 2 — User Flow (วาดเส้นทางก่อนวาดกล่อง):** วาด user flow ก่อน component เสมอ เพราะ **flow เป็นตัวเผยว่ามี state อะไรบ้างที่ต้องจัดการ** — ถ้าข้ามไปวาด component ก่อน คุณจะนึก state ไม่ครบแล้วมาแปะทีหลังแบบมั่ว ๆ ให้เดินตาม flow แล้วมองหา: จุดที่ user ต้องรอ = **loading state**, จุดที่ทางแยก (เงื่อนไข if/else บนหน้าจอ) = **condition ที่ต้องเก็บไว้ใน state**, จุดที่ user กดย้อนกลับได้ = **state ที่ต้องไม่หายตอน navigate**. flow ที่ดีทำให้ขั้นถัด ๆ ไปแทบไม่ต้องเดา เพราะทุก state โผล่ออกมาจากเส้นทางเองแล้ว

**ขั้น 3 — Data / State Model (จัดบ้านให้ state ทุกก้อน):** พอรู้ว่ามี state อะไรบ้างจากขั้น 2 ต่อไปคือตอบว่า **state แต่ละก้อนควรอยู่บ้านไหน** (บท 7 เรื่อง state 4 บ้าน) — เพราะวาง state ผิดบ้านคือรากของบั๊กครึ่งหนึ่งในแอปจริง: ข้อมูลที่มาจาก server อยู่ใน **query cache** (บท 12 — ไม่เอาไปยัด Redux เหมือน client state), ฟิลเตอร์กับแท็บที่เปิดอยู่ควรอยู่ใน **URL** (เพื่อให้ share ลิงก์ได้และกดปุ่ม back ได้), ส่วนของชั่วคราวอย่างค่าใน input ที่ยังไม่ submit อยู่ **local component**. การประกาศบ้านให้ state ให้ชัดตั้งแต่ต้นทำให้ทีมไม่ต้องมาเถียงกันทีหลังว่า "อันนี้ควรอยู่ global ไหม"

**ขั้น 4 — Component Architecture (แตก tree + วาง boundary ที่มีความหมาย):** แตก component tree แบบหยาบพอ — สามถึงห้ากล่องหลักก็พอ ไม่ต้องลงลึกทุก div — แล้วสิ่งที่สำคัญกว่าการแตกคือชี้ **boundary ที่มีความหมาย**: ตรงไหนควรเป็น **error boundary** (พังแล้วล้มเฉพาะส่วนนั้น ไม่ทำให้ทั้งหน้าขาว), ตรงไหน **lazy load / code split** ได้เพื่อลด bundle แรก, ตรงไหนควรมี **Suspense** คั่นระหว่างของที่โหลดเร็วกับโหลดช้า. คนที่ตอบขั้นนี้ดีคือคนที่คิดเรื่อง "เวลามันพัง มันพังยังไง" ไม่ใช่แค่ "เวลามันดี มันหน้าตายังไง"

**ขั้น 5 — API Contract (ออกแบบจากมุมหน้าจอ ไม่ใช่มุม database):** ขั้นนี้คนที่มาจากสาย backend ได้เปรียบสุด — ออกแบบ contract จากคำถาม "**หน้านี้ต้องการข้อมูลอะไรบ้าง**" ไม่ใช่ "database มี table อะไร" ถ้า UI ต้องยิงสาม endpoint มาประกอบเองทุกครั้ง (แล้ว render ช้าเพราะ network waterfall) นี่คือจุดที่เสนอ **BFF (Backend for Frontend — ชั้นบาง ๆ ที่รวม/ตัด data ให้ตรง shape ที่หน้าจอใช้)** พร้อมพูด trade-off ให้ครบว่ามันไม่ฟรี: BFF คือ service เพิ่มอีกตัวที่ต้องมีคนดูแล deploy และ monitor — เสนอเมื่อ pain จากการประกอบฝั่ง client มันคุ้มกับต้นทุนตรงนั้นเท่านั้น

**ขั้น 6 — Performance (ตั้ง budget เป็นตัวเลข ไม่ใช่ความรู้สึก):** ถามว่า **metric ไหนคือตัวที่แพงที่สุดของหน้านี้** แล้วตั้ง budget เป็นตัวเลขจริง ไม่ใช่ "ทำให้เร็ว ๆ" — หน้า landing เจ็บที่ LCP (ภาพ hero ใหญ่), dashboard เจ็บที่ INP (ตอบสนองการคลิก/พิมพ์), หน้า feed เจ็บที่ CLS (เลื่อนกระตุก) ทั้งหมดคือ Core Web Vitals (บท 13) จากนั้นวางแผนแก้ให้ตรงจุด: **code splitting** ตัด JS ที่ยังไม่ใช้, lazy load รูป, ตั้ง performance budget เป็น CI gate เพื่อกัน bundle โตเงียบ ๆ — คำตอบที่ดีคือตัวเลข ("LCP ต้องต่ำกว่า 2.5 วินาทีที่ p75") ไม่ใช่คำคุณศัพท์

**ขั้น 7 — Error / Loading / Empty (ขั้นที่แยก senior ชัดที่สุด — ห้ามข้าม):** junior ออกแบบ happy path, senior ออกแบบ **วันที่ API ตาย** — คำถามคือแต่ละ region ของหน้ามี loading / error / empty state ของตัวเองไหม หรือทั้งหน้าล้มพร้อมกันเมื่อ API เดียวพัง? หน้าที่ดีต้องตอบได้ว่า: ตอนกำลังโหลดโชว์อะไร (skeleton ไม่ใช่ spinner กลางจอ), ตอน error โชว์อะไรและ retry ได้ไหม, ตอนไม่มีข้อมูลเลย (empty) โชว์อะไรที่ช่วย user ไปต่อได้ ไม่ใช่หน้าว่างเปล่า. อย่ารอให้ interviewer จี้ถามทั้งสาม state — ไล่ให้ครบเองเป็นสัญญาณว่าคุณเคยเจอ production จริงที่ API ล่ม

**ขั้น 8 — Accessibility (ใช้คีย์บอร์ดอย่างเดียวรอดไหม):** ถามคำถามเดียวที่ครอบเกือบหมด: "**ถ้าใช้คีย์บอร์ดอย่างเดียว ไม่แตะเมาส์ ทำงานจนจบ flow ได้ไหม**" เพราะ keyboard flow ที่ครบมักลากคุณภาพส่วนอื่น (semantic HTML, focus order, ARIA) ตามมาด้วย ต้องคิดเรื่อง focus management เป็นพิเศษตอนเปิด/ปิด modal, หลัง submit form, ตอน route เปลี่ยน (บท 14). a11y ไม่ใช่งานปิดท้ายที่ทำถ้ามีเวลา — มันเป็น proxy ของคุณภาพโค้ดทั้งระบบ พูดถึงมันตั้งแต่ต้นแสดงว่าคุณคิดครบ

**ขั้น 9 — Testing (เทสอะไรที่พังแล้วเจ็บสุด):** ไม่ใช่ไล่เทสให้ครบ 100% แต่ถามว่า **อะไรพังแล้วเจ็บที่สุด** แล้วเทสตรงนั้นให้แน่น — flow จ่ายเงิน, การคำนวณราคา, auth. วาง test pyramid ให้ถูกสัดส่วน (unit เยอะ, integration กลาง, E2E น้อยแต่คุมเส้นเงิน) และหลักที่ต้องพูดคือ **เทสพฤติกรรมไม่ใช่ implementation** (บท 15) — เทสว่า "กดปุ่มแล้วเห็นข้อความสำเร็จ" ไม่ใช่ "ฟังก์ชันภายในถูกเรียก" เพราะแบบแรก refactor แล้วไม่พัง แบบหลังพังทุกครั้งที่แก้โค้ดข้างใน

**ขั้น 10 — Monitoring / Rollout (ปล่อยยังไง รู้ได้ยังไงว่าพัง ถอยยังไง):** ปิดท้ายด้วยเรื่องที่บอกว่าคุณเคย ship ของจริง — ไม่ใช่แค่เขียนโค้ดเสร็จแล้วจบ: ปล่อย feature ใหญ่ **หลัง feature flag** แบบ canary (เปิดให้ 5% ก่อน), ดู **error rate + Core Web Vitals + business metric** ของกลุ่ม canary เทียบ control, ถ้าพัง **rollback คือปิด flag (มีผลในไม่กี่วินาที)** ไม่ใช่ re-deploy ที่กินเวลาครึ่งชั่วโมง. ต้องมี RUM (Real User Monitoring — เก็บ metric จากเครื่อง user จริง) + error tracking ที่ tag ด้วย release version เพื่อตอบคำถามสำคัญที่สุดใน production: "error นี้เริ่มที่ release ไหน". ประโยคเดียวที่มี flag + canary + rollback plan ครบ บอก interviewer ทันทีว่าคุณผ่านสนามจริงมาแล้ว

**หมายเหตุการใช้จริง:** ไม่ต้องลงลึกเท่ากันทุกขั้น — เลือกเจาะตามโจทย์ dashboard เจาะขั้น 6-7 (performance + error/realtime), form หนัก ๆ เจาะขั้น 7-8 (error state + a11y), design system เจาะขั้น 4-5 (component API + contract) แต่**ขั้น 1 กับ 7 ห้ามข้ามไม่ว่าโจทย์อะไร** — ขั้น 1 เพราะถ้าตีกรอบผิดคือทำผิดทั้งกระดาน, ขั้น 7 เพราะมันคือขั้นที่ interviewer ใช้แยก senior ออกจาก junior ชัดที่สุด

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

## BFF กับ Auth — เก็บ Token จริงออกจาก Client

BFF ในหัวข้อ rendering ข้างบนคือการ**รวม shape ข้อมูล** — แต่ BFF มีอีกบทบาทที่ interviewer สาย full-stack ชอบขุด: **token handler** ที่เก็บ credential จริงไว้ฝั่ง server ไม่ให้ลงมาที่ browser/แอปเลย ต่อยอดจากบท 16 (mobile token storage + proof-of-possession) มาที่ระดับสถาปัตยกรรม

**หลักคิด:** ถ้า token อยู่ที่ client ยังไงก็มีทางหลุด (XSS ฝั่งเว็บ, เครื่อง root ฝั่ง mobile — บท 16) วิธีตัดปัญหาที่รากคือ **ทำให้ client ไม่เคยถือ token จริง** — BFF เป็น **confidential client** (ถือ `client_secret`) คุยกับ IdP (Identity Provider) แทน แล้ว browser/แอปถือแค่ **session handle** ที่ชี้ไป session ฝั่ง server

**Flow เต็มตั้งแต่ login:**

```
เฟส 0 — device key (ครั้งแรก, สำหรับ mobile/PoP)
  app สร้าง key pair ใน Secure Enclave/Keystore (บท 16)

เฟส 1 — Login
  1. user กรอก credential → app
  2. app → BFF   { credential, devicePublicKey }         (ผ่าน TLS + cert pinning)
  3. BFF → IdP   แลก credential เป็น token (BFF แนบ client_secret เอง)
  4. IdP → BFF   { access_token, refresh_token }
  5. BFF เก็บ { access, refresh } server-side (Redis) ผูกกับ sessionId
       + ผูก sessionId ↔ devicePublicKey
  6. BFF → app   คืนแค่ sessionId (opaque)  ← ไม่ส่ง token ลงมาเลย

เฟส 2 — เรียก API
  7. app เซ็น request ด้วย private key (DPoP) → BFF
  8. BFF verify signature กับ public key → แนบ access_token → proxy ไป resource

เฟส 3 — Access token หมดอายุ (โปร่งใส)
  9. BFF ใช้ refresh_token (เก็บไว้เอง) ขอ access ใหม่จาก IdP — app ไม่รู้ ไม่เห็น

เฟส 4 — Logout / เพิกถอน
  10. BFF ลบ session ที่ Redis + revoke refresh ที่ IdP → ตายทันที
```

**property ที่ได้:** refresh token / client_secret ไม่เคยลงเครื่อง · sessionId ผูก device key → ขโมยไปเปล่า ๆ เซ็นไม่ได้ = ใช้ไม่ได้ (บท 16) · เพิกถอนทันทีที่ BFF ไม่ต้องรอ JWT หมดอายุ

**หมายเหตุ OAuth:** การส่ง username/password ตรงไป BFF (Resource Owner Password) ใช้ได้กับ first-party app แต่แบบปลอดภัยกว่าคือ **Authorization Code + PKCE (Proof Key for Code Exchange)**: app เปิด system browser ไปหน้า login ของ IdP โดยตรง (แอปไม่เคยเห็น password), IdP คืน authorization code, BFF เอา code ไปแลก token — ตัว PKCE คือกลไกกัน "code ถูกดักกลางทางแล้วเอาไปแลก token" โดยไม่ต้องพึ่ง client secret: ตอนเริ่ม flow app สุ่มค่า `code_verifier` เก็บไว้กับตัว แล้วส่งแค่ hash ของมัน (`code_challenge`) ไปกับ authorization request → ตอนแลก code ต้องแนบ `code_verifier` ตัวจริงมาด้วย server ถึงยอมแลก คนที่ดัก code ได้แต่ไม่มี verifier จึงแลกไม่ได้ — โครง BFF เหมือนเดิม เปลี่ยนแค่แอปไม่แตะ password + ได้ SSO/MFA ฟรี

**session lifecycle — sessionId ต้องไม่ใช่ pointer นิ่ง:** เพราะเป็น server-side state จึงใส่วงจรชีวิตได้เต็ม — **idle timeout + absolute timeout + rotation** ถ้า sessionId หลุด: (1) **เพิกถอนทันที** ที่ Redis (ข้อได้เปรียบเหนือ stateless JWT), (2) **rotation + reuse detection** — เจอ sessionId เก่าที่หมุนไปแล้วถูกใช้ = มีสองมือถือใบเดียว → kill ทั้งสาย, (3) **binding ด้วย DPoP/mTLS** (บท 16) ให้ possession ไม่พอ ต้องเซ็นได้ด้วย

### BFF อยู่บน critical path — เป็นคอขวด/SPOF ไหม

ทุก request วิ่งผ่าน BFF จริง แต่ "อยู่บน critical path" ≠ "เป็น SPOF" ถ้าออกแบบถูก — มันก็แค่ service อีกตัวที่ต้องทำ HA เหมือน API gateway/LB ที่ทุกระบบมี on the path อยู่แล้ว (เล่ม backend บท 10, 20)

กุญแจคือ **ทำ BFF ให้ stateless + ยก state ไป shared store**:

```
                 ┌── BFF #1 ──┐
 client ── LB ───┼── BFF #2 ──┼──── Redis (session store, HA) ──── IdP/Resource
                 └── BFF #3 ──┘
  BFF stateless, scale แนวนอน       ตัวนี้แหละที่ "ห้าม down" จริง
```

- BFF ไม่เก็บ session ใน memory ตัวเอง → รัน N replica หลัง LB, instance ไหนก็ตอบ request ไหนก็ได้ (ไม่ต้อง sticky), autoscale, rolling deploy, instance ตายไม่เสีย session
- **SPOF ย้ายที่ ไม่ได้หาย** → ตัวที่ critical จริงคือ **session store (Redis) ต้อง HA** (replication + failover / managed multi-AZ) ไม่ใช่ BFF instance เดี่ยว
- **คอขวดไหม?** งาน BFF ต่อ request เบา — lookup Redis (~sub-ms) + verify signature (ECDSA ~µs) + แนบ token + proxy = I/O-bound scale ได้ ต้นทุนคือ 1 hop + Redis lookup (single-digit ms)

**ถ้า traffic สูงจนไม่อยากให้ทุก request ผ่าน BFF → hybrid:** BFF ออก **access token อายุสั้น + ผูก DPoP** ให้ client แล้ว **client ยิง resource server ตรง** ไม่ผ่าน BFF — BFF โผล่แค่ตอน login/refresh:

| แบบ | data request ผ่าน BFF | ข้อดี | ข้อเสีย |
|---|---|---|---|
| **Full-proxy** | ✅ ทุก request | คุมเข้ม, token ไม่ลงเครื่อง, revoke ทันที | BFF บน critical path ทุก call |
| **Token handler (hybrid)** | ❌ client → resource ตรง | BFF อยู่แค่ auth path, load น้อยลงมาก | access token ลงเครื่อง (แต่สั้น + DPoP-bound) |

### BFF กับ DPoP — คนละชั้น อย่าสับสน

จุดที่คนงงบ่อยสุด (และเป็นกับดักสัมภาษณ์): มอง BFF กับ DPoP เป็น "ทางเลือกแทนกัน" — **ผิด มันคนละชั้น ตอบคนละคำถาม**:

- **BFF** = *"เก็บ token จริงไว้ที่ไหน"* → ที่ server ไม่ให้ลงเครื่อง (**สถาปัตยกรรม**)
- **DPoP** = *"พิสูจน์ว่าถือ key ยังไง"* → เซ็น proof ทุก request (**auth mechanism**)

ทั้งคู่แก้ปัญหา "token ถูกขโมย" แต่คนละมุม: **BFF ทำให้ token ขโมยยาก** (ย้ายออกจากเครื่อง) · **DPoP ทำให้ขโมยไปก็ใช้ไม่ได้** (ต้องมี key เซ็น) — เพราะแก้คนละมุมจึง **เสริมกันได้ ไม่ได้แข่งกัน**

คิดเป็น **2 โมเดลหลัก เลือก 1 เป็นฐาน** (อย่าเอามาปนในหัว):

| | **โมเดล A — BFF** | **โมเดล B — DPoP ตรง** |
|---|---|---|
| app ถือ | sessionId | access token + private key |
| token จริงอยู่ | ที่ BFF | ในเครื่อง app (แต่ bound กับ key) |
| app ยิงหา | BFF เท่านั้น → BFF คุย resource ต่อ | resource ตรง |
| ปลอดภัยเพราะ | token ไม่เคยลงเครื่อง | ขโมย token ไปเซ็นไม่ได้ = ใช้ไม่ได้ |
| revoke | ลบ session ที่ Redis ทันที | ต้องรอ token หมดอายุ / denylist |
| ราคา | ทุก request ผ่าน BFF (ต้อง scale/HA) | token อยู่บนเครื่อง |
| DPoP จำเป็นไหม | ไม่ (token อยู่ BFF แล้ว) | **จำเป็น** (token อยู่เครื่อง ต้องกันขโมย) |

**เลือกจาก threat model + platform:**

| สถานการณ์ | เลือก |
|---|---|
| เว็บทั่วไป (มี httpOnly cookie + SameSite เป็น safety net) | **BFF** อย่างเดียวพอ — DPoP over-engineer |
| SPA ที่จำเป็นต้องถือ access token เอง | **DPoP** (RFC 9449) กัน replay |
| mobile (เครื่อง root ได้ + มี hardware key) | **BFF + DPoP** — คุ้มที่จะซ้อน |
| แอปการเงิน high-value | **BFF + DPoP** |

**เมื่อใช้ร่วมกัน (โมเดล A + DPoP)** DPoP ไม่ได้ผูกกับ access token (app ไม่มี) แต่ **ย้ายไปผูกกับ sessionId** ที่ app ถือแทน — เพราะ DPoP ปกป้อง "credential ที่ app ถืออยู่" ไม่ว่ามันจะเป็น token หรือ sessionId

หลักที่ยึด: **อย่าถามว่า "BFF หรือ DPoP" — ถามว่า "token ควรอยู่ที่ไหน (BFF?) และ credential ที่ client ถือควร bound กับ key ไหม (DPoP?)"** สองคำถามแยกกัน ตอบทีละอันแล้วไม่สับสน

## Control Plane vs Data Plane — อย่าขนของใหญ่ผ่าน BFF

จุดที่ BFF ล่มได้จริงคือเวลาเอา **payload ใหญ่วิ่งผ่านมันตลอด** — download report, upload dump file — เพราะสร้างแรงกดดัน: **memory** (buffer ทั้งไฟล์ = OOM ตอนหลายคนพร้อมกัน), **connection hogging** (transfer ยาวกิน worker ค้าง → request เร็ว ๆ ไม่มีคนตอบ), **bandwidth คูณสอง** (client→BFF→storage และกลับ)

หลักแก้: **แยก control plane กับ data plane** — BFF อยู่แค่ control plane (auth + JSON เล็ก + ออกใบอนุญาต), bytes ก้อนใหญ่ไม่แตะ BFF

**Pattern หลัก — Pre-signed URL:**

```
Upload:                                    Download:
1. app → BFF "ขอ upload ไฟล์ X"            1. app → BFF "ขอ report Z"
2. BFF authorize → ขอ pre-signed PUT URL   2. BFF authorize → ออก pre-signed GET URL (TTL สั้น)
   จาก object storage (TTL/ขนาด/type)      3. app → CDN/Storage โดยตรง (โหลด)
3. BFF → app คืน URL (JSON เล็ก)
4. app → Storage โดยตรง (bytes ไม่ผ่าน BFF)
```

BFF ทำแค่ **ตรวจสิทธิ์ + เซ็น URL (งานเบา ms)** ไฟล์ GB วิ่ง client ↔ storage/CDN ตรง — คอขวดหาย

**capability-based — ปลายทางตรวจ "ใบอนุญาต" ไม่ใช่ JWT:** storage ไม่รู้จัก user ด้วยซ้ำ มันแค่ verify **ลายเซ็นบน pre-signed URL + TTL + scope** ว่าถูกไหม การตัดสินสิทธิ์ "user นี้เข้าถึงไฟล์นี้ได้ไหม" **เกิดที่ BFF ครั้งเดียวตอนออก URL** แล้วฝังผลลงในลายเซ็น — นี่คือ capability (ถือตั๋วที่ถูกต้อง = เข้าได้) ไม่ใช่ identity (ต้องรู้ว่าเป็นใคร) จึงทำให้ **data plane verify แบบ stateless crypto ล้วน ไม่ต้อง call กลับมาถาม BFF/DB** → scale แยกจาก auth สนิท

แยกหน้าที่ 2 service ชัด:

| | BFF (ออกใบอนุญาต) | Storage/CDN (รับ up/download) |
|---|---|---|
| ตรวจอะไร | user เป็นใคร + มีสิทธิ์ไหม (DB/authz) | ลายเซ็นถูก + ยังไม่หมดอายุ |
| รู้จัก user | ✅ | ❌ ไม่รู้เลย |
| scale ตาม | auth load | bandwidth ล้วน |

ข้อควรระวัง (เพราะปลายทางไม่ตรวจ user แล้ว): **BFF ต้อง authorize ให้ครบตอนออก URL** (พลาด = หลุด ไม่มีด่านสอง) · **TTL สั้น** (capability เพิกถอนกลางทางไม่ได้ — storage ไม่รู้ว่า user โดนแบน) · **อย่า log URL เต็ม** (มันคือกุญแจ)

**งานที่ "สร้าง" report แพง (ไม่ใช่แค่โอนไฟล์) → async:** อย่าถือ connection ค้างผ่าน BFF รอ gen เสร็จ — client ขอ → BFF enqueue job → คืน `202 + jobId` (ปล่อย connection) → worker สร้างเก็บลง storage → client poll/รับ push แล้วโหลดผ่าน pre-signed URL (เล่ม backend บท 9, 11)

**ถ้าจำเป็นต้อง proxy จริง** (ต้อง transform stream กลางทาง): **stream/pipe อย่า buffer** ทั้งไฟล์เข้า memory + **แยก pool/instance** สำหรับ transfer ออกจาก traffic ปกติ (bulkhead — เล่ม backend บท 10) + ตั้ง **limit** ขนาด/timeout/concurrent

**แนวตอบ senior:** *"เก็บ token จริงไว้ที่ BFF ให้ client ถือแค่ session handle ที่ผูก device key และ revoke ได้ทันที — BFF ทำ stateless + Redis HA เลย scale แนวนอนได้ ไม่เป็น SPOF ส่วนไฟล์ใหญ่ไม่ยอมให้ผ่าน BFF: แยก control plane (BFF ออก pre-signed URL) กับ data plane (client อัป/โหลดตรงกับ storage) — BFF ตัดสินใจ ไม่ขนของ"*

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

7. **"ออกแบบ auth ให้ token ไม่หลุดที่ client ยังไง"** → BFF เป็น confidential client ถือ refresh token + client_secret ฝั่ง server, client ถือแค่ session handle ที่ผูก device key (DPoP — บท 16) → refresh โปร่งใส, revoke ทันทีที่ Redis; ทำ BFF stateless + session store HA เลย scale แนวนอนได้ ไม่เป็น SPOF ถ้า traffic สูงใช้ hybrid: BFF ออก access token สั้น ๆ ให้ client ยิง resource ตรง

8. **"ระบบมี download report / upload dump ก้อนใหญ่ ให้ผ่าน BFF ไหม"** → ไม่ — ไฟล์ใหญ่ผ่าน BFF กิน memory/connection/bandwidth จนล่ม แยก control plane (BFF authorize + ออก pre-signed URL) กับ data plane (client อัป/โหลดตรงกับ object storage/CDN); storage verify แค่ลายเซ็น capability ไม่ใช่ JWT (BFF ตัดสินสิทธิ์ครั้งเดียวตอนออก URL) และงาน gen ที่แพงทำ async ผ่าน queue

## สรุปท้ายบท

- system design ฝั่ง frontend ไม่ได้เป็นเรื่องวาด component tree อย่างเดียว แต่เป็นการจัดลำดับความคิดจาก user flow ไปถึง rollout และ monitoring
- production issue ส่วนใหญ่จะไล่ได้ดีเมื่อเราเชื่อมมันกลับไปยังรากเรื่อง state, rendering, network, performance และ security ที่เรียนมาก่อนหน้า
- senior ไม่ได้ต่างเพราะจำ pattern เยอะกว่า แต่ต่างเพราะรู้ว่าควรถามอะไร ตัด scope ตรงไหน และ trade-off แบบใดควรถูกพูดออกมาทันที
- บทนี้จึงเป็นสะพานจากความรู้รายบทไปสู่ความสามารถในการออกแบบและตัดสินใจจริง

## ก่อนไปบทถัดไป

เมื่อภาพใหญ่ของระบบเริ่มครบแล้ว บทสุดท้ายจะเปลี่ยนความรู้นี้ให้กลายเป็นการสื่อสารและการลงมือภายใต้แรงกดในห้องสัมภาษณ์ เพื่อให้สิ่งที่คิดอยู่ในหัวถูกมองเห็นจากภายนอก
