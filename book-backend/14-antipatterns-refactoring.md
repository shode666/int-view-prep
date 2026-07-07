# บทที่ 14 — Refactoring Bad Code + Anti-patterns

> รู้ pattern ไม่พอ — Dev Lead ต้องได้กลิ่นตั้งแต่ระบบ **เริ่ม** เน่า และรู้ลำดับการผ่าตัดโดยไม่ต้องหยุดโลก แต่ละตัวด้านล่าง: อาการ → ทำไมถึงเกิด → ทางออก

## เข็มทิศก่อนอ่าน

ถ้าบทก่อน ๆ สอนให้สร้างระบบดี บทนี้สอนให้มองระบบที่กำลังเน่าออกก่อนว่ากลิ่นแบบไหนกำลังลอยอยู่ Anti-pattern มีค่าตรงที่มันช่วยตั้งชื่ออาการซ้ำ ๆ ได้เร็ว พอเรียกชื่อถูก เราจึงเริ่มเลือกวิธีรักษาที่เหมาะแทนการ rewrite ทั้งระบบแบบใช้อารมณ์

ให้อ่านบทนี้ด้วยสายตาของคนรับช่วงระบบจริง คือดูทั้งอาการ, ต้นเหตุ และลำดับการผ่าตัด เพราะ refactor ที่ดีไม่ใช่การออกแบบใหม่บนกระดาษ แต่คือการย้ายของทีละส่วนโดยไม่ทำธุรกิจล้มระหว่างทาง

## Anti-patterns ระดับ Code / Class

**God Service** — `OrderService` 1,800 บรรทัด 32 dependency ทุก feature ใหม่มาลงที่นี่
เกิดเพราะ: "มันมี service อยู่แล้ว ยัดต่ออีกนิดละกัน" สะสมสามปี · ทางออก: แตกตาม use case (บท 5) — เริ่มจาก method ที่แก้บ่อยสุดก่อน (ดูจาก git log ไม่ใช่จากความรู้สึก)

**Fat Controller** — business rule, query, การส่งเมล อยู่ใน HTTP handler
เกิดเพราะ: เขียนตรงนั้นเร็วสุดตอน deadline · อาการวัดได้: test ต้องยก HTTP server เพื่อ test สูตรคำนวณ, มี logic ที่ก๊อปไป controller อื่น · ทางออก: บีบ controller เหลือ แปลง request → เรียก use case → แปลง response (บท 4) — ย้ายเป็นชั้นๆ มี test คุมก่อนย้ายเสมอ

**Anemic Domain Model** — entity มีแต่ getter/setter, logic ทั้งหมดอยู่ใน service
ทำไมมันแย่ (ต้องตอบได้ ไม่ใช่แค่ท่องชื่อ): invariant ไม่มีเจ้าของ — กติกา "order ที่ confirm แล้วห้ามแก้ item" ต้องไล่เช็คเองในทุก service ที่แตะ order พลาดที่เดียว = data โกหก · ทางออก: ย้ายกติกาเข้า entity (`order.addItem()` โยน error เองเมื่อ state ไม่อนุญาต), constructor/factory การันตี invariant ตั้งแต่เกิด (บท 1 fail fast)
ข้อแม้แฟร์ๆ: ระบบ CRUD ที่ **ไม่มีกติกาจริง** anemic model คือความเรียบง่ายที่ถูกต้อง ไม่ใช่ความผิด

**Overuse Interface / Over-engineering** — interface ทุก class, factory ทุก object, 4 layer สำหรับ CRUD
อาการ: Ctrl+B แล้วเจอ interface ที่มี impl เดียวซ้ำๆ, ไฟล์ config DI ยาวกว่า business logic · ทางออก: ลบ indirection ที่ไม่มีผู้รับประโยชน์ — abstraction ต้องมี **consumer ที่สองหรือ test ที่ต้อง fake** เป็นใบอนุญาต (บท 8, 13)

**Shotgun Surgery** — เปลี่ยน requirement เล็กหนึ่งข้อ ต้องแก้ 8 ไฟล์กระจายทุกชั้น
สาเหตุ: concern เดียวถูกหั่นกระจาย (ค่า VAT อยู่ใน controller, service, report, email template) · ทางออก: รวม concern ที่เปลี่ยนพร้อมกันไว้ที่เดียว (บท 2 — cohesion) แล้วให้ที่อื่นเรียกใช้

**Circular Dependency** — A import B, B import A; ใน microservice: order เรียก customer, customer เรียก order
ทางออก: หา concept ที่สามที่ทั้งคู่ควรพึ่ง (แตก shared kernel ออกมา — โมดูลกลางที่เก็บของที่ทั้งสองใช้ร่วม เช่น A กับ B ต่างพึ่ง `Money`/`CustomerId` ก็ย้ายไปไว้ module C แล้วทั้งคู่พึ่ง C แทนพึ่งกันเอง วงจึงขาด), กลับทิศด้วย interface (DIP — ให้ฝั่งที่ถูกเรียกประกาศ interface แล้วอีกฝั่ง implement วงลูกศรจึงชี้ทางเดียว), หรือยอมรับว่าจริงๆ มันคือ module เดียวที่ถูกผ่าผิดเส้น — Go ห้ามที่ compile time ซึ่งบังคับให้คิดเรื่องนี้ตั้งแต่วันแรก (บท 2)

## Anti-patterns ระดับ Distributed System

**Distributed Monolith** — แยก 30 service แต่ deploy ต้องปล่อยพร้อมกันเป็นขบวน, service A เปลี่ยน schema แล้ว B–F พัง
สาเหตุ: ผ่า service ตาม table/ทีม ไม่ใช่ตาม business capability + แชร์ database + sync call ถักกันแน่น · ผลคือได้ **ข้อเสียของทั้งสองโลก**: ความช้าซับซ้อนของ network + coupling ของ monolith · ทางออกตรงไปตรงมา: ถ้าถักแน่นขนาดนั้น **รวมกลับ** เป็น modular monolith แล้วค่อยผ่าใหม่ตามรอยต่อจริง (รอยต่อที่ดี = ข้อมูลข้ามน้อย, เปลี่ยนไม่พร้อมกัน — บท 2)

**Retry Storm** — downstream สะดุดหนึ่งวินาที ทุก layer retry 3 ครั้ง ทวีคูณกันจน traffic คูณ 27 ถล่มซ้ำจนฟื้นไม่ได้ (บท 10) · กัน: retry ชั้นเดียว + backoff/jitter + retry budget + circuit breaker

**Missing Timeout** — อธิบายแล้วในบท 10 แต่ต้องอยู่ในลิสต์นี้เพราะมันคือ anti-pattern ที่ **พบบ่อยสุดและแก้ถูกสุด** — audit ทุก client ในระบบวันนี้ ใช้เวลาชั่วโมงเดียว ROI สูงกว่าทุกอย่างในบทนี้

**Non-idempotent Consumer** — consumer ที่ `INSERT` ทุกครั้งที่ได้ message โดยเชื่อว่า message มาครั้งเดียว → at-least-once ทำให้มี invoice ซ้ำ, เงินตัดสองรอบ (บท 9, 11) · กัน: dedupe ด้วย event_id ใน transaction เดียวกับ side effect — และ **test ด้วยการยิงซ้ำจริง** (บท 12)

**Event Spaghetti** — บท 9 ว่าเต็มแล้ว: event เป็น RPC แอบแฝง, ไม่มี owner, มี loop — สรุปวิธีกัน: topic มีเจ้าของ, schema registry, orchestrator สำหรับ flow ยาว

**Shared Database ระหว่าง service** — สอง service เขียน table เดียวกัน = schema เปลี่ยนไม่ได้ตลอดกาล, transaction พันกัน, ownership ไม่มี · ทางออก: หนึ่ง service หนึ่ง schema — คนอื่นเข้าผ่าน API/event เท่านั้น (ยอมรับ data ซ้ำซ้อนแบบ eventual — บท 11)

## Refactoring อย่างเป็นระบบ (ไม่ใช่ rewrite)

หลักที่ต้องท่องให้ทีมฟัง: **rewrite ทั้งระบบคือการเดิมพันบริษัท, refactor คือดอกเบี้ยที่จ่ายเป็นงวด** — และห้าม refactor โดยไม่มี test คุม

ลำดับที่ใช้จริง (สำหรับ legacy ที่ไม่มี test):

1. **Characterization test** — เขียน test จับพฤติกรรม **ปัจจุบัน** (รวมทั้ง bug) ไว้ก่อน ยังไม่แก้อะไร — ตาข่ายมาก่อน
2. **หา seam** — จุดที่ฉีด test double ได้โดยแก้ code น้อยสุด (extract dependency ให้ inject ได้ — บท 1)
3. **Strangler Fig** สำหรับของใหญ่: สร้างเส้นทางใหม่ข้างๆ ของเก่า ค่อยๆ โอน traffic (feature flag / router) จนของเก่าไม่มีคนเรียกแล้วจึงลบ — ใช้ได้ทั้งระดับ class และระดับระบบ (monolith → service)
4. **Branch by abstraction** เมื่อเปลี่ยน dependency ใหญ่ใต้ระบบที่วิ่งอยู่: แทรก interface → impl เก่าอยู่หลัง interface → เขียน impl ใหม่ → สลับ → ลบเก่า — ทั้งหมดบน main branch ไม่มี long-lived branch
5. ทำเป็น **งวดเล็กที่ ship ได้เสมอ** — refactor 6 เดือนที่ merge ไม่ได้ = rewrite ปลอมตัวมา

## กลิ่นที่ Dev Lead ต้อง sniff ในการ review (สรุปพก)

- เพิ่ม dependency ใหม่ให้ class เดิม → ตัวที่ 6 แล้ว? God Service กำลังฟัก
- if/elif ตาม type/status ที่โผล่ที่ที่สาม → Strategy หรือ polymorphism ได้เวลา (บท 8)
- External call ใหม่ → timeout? retry? idempotent? (บท 10–11 — ถามสามคำนี้ทุก PR)
- Table ใหม่ถูกอ่านโดย service อื่นตรงๆ → shared DB กำลังเกิด
- Test ใหม่ mock 5 ตัว → design ฟ้อง (บท 12)
- "เดี๋ยว refactor ทีหลัง" ใน PR description → ทีหลังไม่มีจริง — ขอ ticket ที่มี sprint กำกับ

## คำถามสัมภาษณ์ที่ต้องตอบได้

- **"เจอ legacy ไม่มี test จะทำยังไง"** → characterization test → seam → refactor เป็นงวด → strangler สำหรับก้อนใหญ่ — ห้ามตอบ "rewrite"
- **"Distributed monolith คืออะไร รู้ได้ไง"** → deploy ต้องพร้อมกัน + schema เปลี่ยนแล้วเพื่อนพัง + ยอมพูดว่าคำตอบที่ถูกอาจคือรวมกลับ
- **"Anemic domain model ผิดตรงไหน"** → invariant ไม่มีเจ้าของ + ข้อแม้ว่า CRUD ล้วนไม่นับ — คำตอบที่มีข้อแม้คือคำตอบระดับ senior

บทต่อไป (Part 6): เอาทุกบทมาประกอบเป็นระบบ Order จริงทั้งเส้น

## สรุปท้ายบท

- anti-pattern มีประโยชน์เพราะมันช่วยตั้งชื่ออาการที่เจอซ้ำ และทำให้การคุยเรื่อง refactor ตรงจุดขึ้น
- การรักษาระบบที่เน่าแล้วต้องอาศัยทั้งการวินิจฉัยที่ถูกและลำดับการผ่าตัดที่ไม่ทำธุรกิจล้มระหว่างทาง
- rewrite มักไม่ใช่คำตอบแรกของคนที่เข้าใจรากปัญหา เพราะปัญหาส่วนใหญ่แตกออกเป็นก้อนย่อยให้จัดการได้
- บทนี้จึงเป็นสะพานจากหลักการเชิงอุดมคติไปสู่โลกของ codebase ที่มีประวัติและหนี้จริง

## ก่อนไปบทถัดไป

เมื่อเห็นทั้งหลักที่ควรเป็นและกลิ่นที่ควรหลีกแล้ว บทถัดไปจะเอาทุกอย่างมาประกอบเข้าด้วยกันในเคสระบบ order ทั้งเส้น ซึ่งเป็นโจทย์ยอดนิยมของทั้งงานจริงและสัมภาษณ์
