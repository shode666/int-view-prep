# บทที่ 15 — Case Study: ระบบ Order ทั้งเส้น

> เอาทุกบทมาใช้พร้อมกันกับ flow เดียว: **Create Order → Reserve Stock → Charge Payment → Generate Invoice → Send Notification → Ship Order** — อ่านบทนี้แล้วควรวาดระบบนี้บน whiteboard ได้ใน 15 นาที ซึ่งคือโจทย์ system design interview ยอดนิยมพอดี

## เข็มทิศก่อนอ่าน

นี่คือบทสังเคราะห์ของเล่มฝั่งเทคนิคทั้งหมด ก่อนหน้านี้เราเห็น principle, pattern, transaction, event, retry และ outbox แยกกันทีละชิ้น บทนี้จะเอามาวางใน flow เดียวเพื่อให้เห็นว่าของแต่ละชิ้นไม่ได้อยู่ลอย ๆ แต่มันต่อกันเป็นเหตุเป็นผล

ให้อ่านบทนี้เหมือนกำลังเดิน whiteboard จริง ถ้าระหว่างอ่านคุณชี้ได้ว่าการตัดสินใจแต่ละจุดโยงกลับไปบทไหนและแก้แรงกดดันอะไร แปลว่าภาพรวมของเล่มเริ่มติดแล้ว

## 1. ตัดเส้น service ก่อน (บท 2, 14)

ตามรอยต่อที่ **เปลี่ยนไม่พร้อมกัน + ข้อมูลข้ามน้อย**: `Order` (ใจกลาง), `Stock`, `Payment` (ห่อ gateway ภายนอก), `Invoice`, `Notification`, `Shipping` — หนึ่ง service หนึ่ง schema ห้ามแตะ DB ข้ามบ้าน (anti-pattern: shared database)
สิ่งที่ **ไม่ทำ**: แยก `OrderValidationService` / `OrderCalculationService` — นั่นคือการผ่า cohesion ของ order เอง ได้ distributed monolith เป็นรางวัล

## 2. ข้างใน Order Service (บท 4, 5)

```
HTTP handler (บาง — แปลง + validate รูปแบบ)
   → PlaceOrderUseCase (@Transactional = unit of work)
        → Order.place(...)         ← กติกาธุรกิจอยู่ที่ domain (ไม่ anemic)
        → orderRepo.save(order)
        → outbox.add(OrderPlaced)  ← ใน transaction เดียวกัน!
```

- สังเกต: **ไม่มี external call ใน transaction** — stock, payment, email ทั้งหมดไปทาง event (บท 5 กฎเหล็ก → บท 11 outbox)
- Discount ใช้ **Strategy** (`DiscountRule[]` + combine policy — บท 8), Payment gateway อยู่หลัง **Adapter port** (`PaymentGateway` — เปลี่ยน Stripe → Omise แก้ adapter ตัวเดียว)

## 3. Flow ปกติ — Saga แบบ orchestration (บท 9, 11)

Flow นี้ยาว 6 ขั้นมีเงื่อนไข → เลือก **orchestrator** (state machine ใน Order service หรือ Temporal) ไม่ใช่ choreography (เกิน 3 ขั้นจะกลายเป็น Event Spaghetti):

```
OrderPlaced ──▶ [Orchestrator]
   1. ReserveStock   → Stock svc    — สำเร็จ → 2
   2. ChargePayment  → Payment svc  — สำเร็จ → 3   (idempotency key = order id + attempt)
   3. GenerateInvoice→ Invoice svc  — สำเร็จ → 4
   4. SendNotification (fire-and-forget — พังไม่ block flow, มี retry ของตัวเอง)
   5. Ship           → Shipping svc → order = COMPLETED
```

- Order มี state ชัดทุกจังหวะ: `PENDING → STOCK_RESERVED → PAID → INVOICED → SHIPPED` — UI แสดงได้, ops query ได้, timeout ตรวจได้ ("PENDING นานเกิน 15 นาที" = saga ค้าง → alert)
- ลำดับขั้นออกแบบตามหลัก **ของที่ถอยยากอยู่ท้าย**: reserve stock (ถอยง่าย) ก่อน charge เงิน (ถอยเจ็บ) ก่อน ship (ถอยไม่ได้)

## 4. เมื่อพัง — Compensation (บท 11)

Payment fail หลัง reserve stock:

```
ChargePayment ✗ (declined — 4xx ธุรกิจ ไม่ retry)
   → ReleaseStock (compensation — event `StockReleaseRequested`)
   → Order = PAYMENT_FAILED → แจ้ง user ให้เปลี่ยนบัตร
```

Payment **timeout** (ไม่รู้ผล — สถานะที่สามจากบท 10):

```
→ query สถานะจาก gateway ด้วย idempotency key เดิม
   ├─ เคยตัดแล้ว → เดินหน้าต่อ (ห้าม charge ซ้ำ)
   ├─ ไม่เคยเห็น → retry ด้วย key เดิม (ปลอดภัยเพราะ idempotent)
   └─ ยังไม่รู้อีก → order = MANUAL_REVIEW + alert — ยอมให้คนตัดสิน ดีกว่าเดาแล้วเงินหาย
```

MANUAL_REVIEW คือ state ที่ทีมเด็กไม่ยอมออกแบบแล้วไปเจอกลางไฟ — ระบบจริงต้องมีทางลง

## 5. ความทนทานรายจุด (บท 10)

- ทุก call ระหว่าง service: timeout จาก latency budget (user เห็นผลใน 2s → แบ่งงบต่อ hop), retry + backoff + jitter เฉพาะ 5xx/timeout, circuit breaker ต่อ downstream
- Fallback ตัดสินใจกับ product ล่วงหน้า: Stock ล่ม → รับ order แบบ "confirm ภายใน 30 นาที" หรือปิดรับ? Notification ล่ม → ไม่ block อะไรเลย (แค่ Dead Letter Queue (DLQ) ไว้ replay)
- Consumer ทุกตัว idempotent (dedupe ด้วย event_id ใน transaction — บท 9) เพราะ outbox relay การันตีแค่ at-least-once
- Poison message → DLQ + alert + runbook การ replay (บท 11)

## 6. ข้อมูลฝั่งอ่าน + การเงิน (บท 7)

- ตัด stock ตัวสุดท้าย: conditional update `UPDATE stock SET qty=qty-1 WHERE sku=? AND qty>=1` (atomic ใน DB — ไม่ต้อง lock ยาว), จองแบบมี Time To Live (TTL) (reserve 15 นาที หมดแล้วปล่อย)
- Invoice เลขต้องเรียง ไม่ซ้ำ ตามกฎหมาย → sequence ใน DB + unique constraint — และ consumer สร้าง invoice ต้อง idempotent สุดๆ (invoice ซ้ำ = ปัญหาบัญชี ไม่ใช่ปัญหาเทคนิค)
- หน้า order history อ่านหนัก → read model แยก / cursor pagination (บท 7), cache หน้า product ด้วย TTL + jitter (บท 6)

## 7. Observability (บท 11)

- `trace_id` เกิดที่ gateway วิ่งครบทุก hop รวม queue · `correlation_id` = order id ผูกทั้ง saga — ค้นใน log ได้ทั้งชีวิตของ order เดียวในคำสั่งเดียว
- Dashboard ต่อ service: rate/error/duration + ความลึกของ DLQ + อายุของ saga ที่ค้างในแต่ละ state — ตัวสุดท้ายคือ metric ที่บอกปัญหาธุรกิจจริง

## 8. Test ทั้งระบบ (บท 12)

- Domain: `Order.place` กติกาครบ — unit ไม่มี mock
- Use case: fake repo + fake outbox — assert state + event ที่บันทึก
- Saga orchestrator: state machine test — ทุก transition + ทุก compensation (fail แต่ละขั้นแล้วดูว่าถอยถูก)
- Contract: Pact ระหว่าง orchestrator ↔ ทุก service + schema registry ของ event
- Integration: repo กับ Postgres จริง, consumer กับ broker จริง — รวม **ยิง event ซ้ำ** ให้เห็น idempotency จริง
- E2E เส้นเดียว: happy path place→ship บน staging — smoke ไม่ใช่ regression

## สิ่งที่บทนี้อยากให้เห็นจริงๆ

ไม่มีอะไรในระบบนี้เป็น pattern เดี่ยวๆ — Outbox มีเพราะกฎ "ห้าม external call ใน transaction" ซึ่งมีเพราะ unit of work ซึ่งมีเพราะ layer แยก ซึ่งมีเพราะ coupling/cohesion — **ทุกการตัดสินใจไล่กลับไปหา principle ในบท 1–2 ได้เสมอ** และนั่นคือสิ่งที่ interviewer ระดับ system design อยากเห็น: ไม่ใช่ว่าจำ Saga ได้ แต่อธิบายได้ว่า **ทำไมถึงจำเป็นตรงนี้ และไม่จำเป็นตรงไหน**

บทสุดท้าย: บีบทั้งเล่มเป็น checklist ที่ใช้ก่อน approve design จริง

## สรุปท้ายบท

- case study นี้ทำให้เห็นว่าหลักคิด, transaction, event, retry และ pattern ต่าง ๆ ไม่ได้อยู่ลอย ๆ แต่มาต่อกันเป็นเหตุเป็นผลใน flow เดียว
- การออกแบบที่ดีไม่ใช่การโปรยเครื่องมือครบ แต่คือการเลือกให้ตรงกับแรงกดดันของแต่ละช่วงในระบบ
- สิ่งที่ interviewer อยากเห็นจึงไม่ใช่ชื่อเทคนิคเยอะที่สุด แต่คือความสามารถในการโยงการตัดสินใจกลับไปยังเหตุผลพื้นฐานได้
- ถ้าอธิบายระบบ order บทนี้ได้เป็นลำดับ คุณจะเริ่มมีโครงตอบสำหรับ system design จำนวนมากโดยอัตโนมัติ

## ก่อนไปบทถัดไป

หลังจากเห็นของทั้งหมดในเคสจริงแล้ว บทถัดไปจะบีบมันกลับลงมาเป็น checklist ที่ใช้ถามตัวเองก่อน approve design, review PR ใหญ่ หรือปล่อยของขึ้น production
