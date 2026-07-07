# บทที่ 9 — Event-driven Design

> Event คือเครื่องมือลด coupling ที่แรงที่สุดในเล่มนี้ — และเพราะแรงที่สุด ใช้ผิดแล้วได้ระบบที่ **ไม่มีใครรู้ว่าอะไรทำงานเมื่อไหร่เพราะอะไร**

## เข็มทิศก่อนอ่าน

ถ้าบท 8 เป็น pattern ระดับใน process บทนี้คือจุดที่การแยกความรับผิดชอบเริ่มข้าม process และข้ามเวลา Event-driven design จึงให้พลังเรื่อง decoupling สูงมาก แต่แลกด้วยความซับซ้อนที่มองไม่เห็นใน flow แบบ synchronous

อ่านบทนี้โดยพยายามแยก event ออกจาก command และแยกการลด coupling ออกจากการซ่อนความจริง ถ้าสองเส้นนี้ปนกันเมื่อไร ระบบจะเริ่มตอบยากทันทีว่าใครเป็นเจ้าของงานและใครรับผิดชอบผลลัพธ์

## Event-driven คืออะไร ก่อนจะลง Observer และ Pub/Sub

ในระบบแบบเรียกกันตรง ๆ เรามักคุ้นกับประโยคแนวนี้: A เรียก B แล้ว B เรียก C ทุกอย่างจึงไหลเป็นเส้นตรง ใครอยากรู้ว่า flow ทำงานอย่างไรก็เปิด call stack หรือ trace ตามเส้นนี้ได้เลย แต่พอระบบเริ่มโต เราจะเจออีกความต้องการหนึ่งคือ **A อยากบอกว่า "มีบางอย่างเกิดขึ้นแล้ว" โดยไม่ต้องรู้ล่วงหน้าว่าใครบ้างจะสนใจ**

นี่คือแกนของ event-driven design: แทนที่จะสั่งงานเป็นเส้นตรงตลอด เราเริ่มใช้ "เหตุการณ์ที่เกิดขึ้นแล้ว" เป็นตัวเชื่อมระบบ ตัวอย่างเช่น

- ระบบ order ไม่ต้องเรียก notification ตรง ๆ แต่ประกาศว่า `OrderPlaced`
- ระบบ stock ไม่ต้องรู้จัก analytics แต่ analytics มาฟัง event เองได้
- เมื่อมีผู้ใช้สมัครสมาชิกแล้ว หลายทีมอาจอยากทำงานต่อคนละอย่างจากเหตุการณ์เดียวกัน

ข้อดีคือการลดการผูกกันแบบตรง ๆ ระหว่างผู้ส่งกับผู้รับ แต่ข้อแลกเปลี่ยนคือ flow จะไม่ใช่เส้นเดียวอีกต่อไป เราต้องเริ่มคิดเรื่องใหม่ทันที เช่น:

- ใครเป็นคนรับผิดชอบถ้าไม่มีใครฟัง event นี้
- ถ้า event ถูกส่งซ้ำจะเกิดอะไร
- ถ้าผู้รับล่มระหว่างทาง งานควรหายหรือควรรอ
- ถ้า business flow สำคัญถูกกระจายไปหลาย consumer เราจะอธิบายระบบนี้กับคนใหม่อย่างไร

ดังนั้น event-driven ไม่ได้แปลว่า "ทันสมัยกว่า" หรือ "ต้องใช้เมื่อทำ microservice" เสมอไป แต่มันคือวิธีออกแบบที่ยอมแลกความตรงไปตรงมาของการเรียกกันตรง ๆ เพื่อแลกกับการแยกตัวและการขยายระบบในระยะยาว บทนี้จึงต้องเริ่มจากการเข้าใจแนวคิดนี้ก่อน แล้วค่อยลงเครื่องมืออย่าง Observer, Pub/Sub, event schema และ saga ในบทถัดไป

## จาก Observer สู่ Pub/Sub

**Observer** (ใน process เดียว): subject ถือ list ของ observer แล้ว notify เมื่อ state เปลี่ยน — ใช้ใน UI, domain event ภายใน

**Pub/Sub** (ข้าม process): เพิ่ม broker (Kafka, RabbitMQ, SNS/SQS) คั่นกลาง — publisher ไม่รู้จัก subscriber เลย ได้ **message coupling** (ระดับดีสุดจากบท 2) + ความทนทาน (broker เก็บ message ไว้ถ้า consumer ตาย)

ราคาที่เพิ่มมาทันทีที่ข้าม process: network, at-least-once (ซ้ำได้), ordering ไม่การันตีข้าม partition, eventual consistency — ทั้งหมดคือเนื้อหาบท 10–11

**Observer เกิดมา sync / Pub-Sub เกิดมา async**: Observer default คือ subject วน list เรียก method ใน **thread เดียวกัน = transaction เดียวกัน** — listener โยน exception ทั้ง use case rollback, listener ช้า caller ค้างรอ (Spring `ApplicationEventPublisher` เป็นแบบนี้ by default!) อยาก async ต้องสั่งเอง: `@Async` + `@TransactionalEventListener(phase = AFTER_COMMIT)` / Pub-Sub มี broker คั่น — รอคำตอบไม่ได้โดยธรรมชาติ

แต่ async observer อยู่ใน **memory** — node ตายหลัง commit ก่อน listener ทำงาน = งานหายเงียบตลอดกาล ไม่มี broker เก็บ ไม่มี retry เกณฑ์เลือกจึงเป็นคำถามเดียว: **งานนี้หายได้ไหม?**

- หายได้ (ลบ cache, ยิง metric, log best-effort) → in-process event พอ — เบา ไม่มี infra เพิ่ม
- ห้ามหาย (email, ตัด stock) → ต้อง durable = **Outbox** (บท 11 — ใช้ได้แม้ service เดียวไม่มี broker: relay อ่านจาก table แล้วทำเอง)
- ต้องข้าม service / ข้าม instance → pub/sub

## Event vs Command — เส้นแบ่งที่ห้ามเบลอ

| | Command | Event |
|---|---|---|
| ความหมาย | "จงทำสิ่งนี้" — สั่ง **อนาคต** | "สิ่งนี้เกิดแล้ว" — บันทึก **อดีต** |
| ชื่อ | กริยาคำสั่ง: `ChargePayment` | กริยาช่อง 3: `OrderPlaced`, `PaymentFailed` |
| ผู้รับ | ตัวเดียว รับผิดชอบทำ | กี่ตัวก็ได้ ใครสนใจก็ฟัง |
| ใครรู้จักใคร | ผู้ส่งรู้ว่าใครควรทำ | ผู้ส่งไม่รู้และไม่ควรรู้ว่าใครฟัง |
| ปฏิเสธได้ไหม | ได้ (validate แล้ว reject) | ไม่ได้ — มันเกิดไปแล้ว |

กลิ่นเน่าที่พบบ่อยสุด: **event ที่จริงๆ คือ command ปลอมตัว** — `OrderService` publish `SendEmailRequested` แล้วรู้อยู่แก่ใจว่า NotificationService ต้องรับ = coupling เท่าเรียกตรงแต่ debug ยากกว่า เพราะ dependency หายไปจาก call graph ไปซ่อนใน topic

เกณฑ์: ถ้าลบ consumer ทิ้งแล้ว publisher "ผิดสัญญา" = มันคือ command จงเรียกตรงๆ (sync หรือ command queue) / ถ้า publisher ไม่เดือดร้อน = event แท้

เช็คอีกมุม: event มีคนฟังได้ **0 ถึง N** (ศูนย์ก็ไม่ผิด) / command ต้องมีผู้รับผิดชอบ**หนึ่งเดียวเป๊ะ** — ถามตัวเอง: "ถ้ามีคนฟัง*เพิ่ม*อีกตัว พังไหม?" `SendEmailRequested` สองคนฟัง = เมลสองฉบับ = command ปลอมตัว / `OrderPlaced` ฟังกี่คนก็ไม่พัง = event แท้

สรุปสั้นสุดของหัวข้อ: **ท่อเดียวกัน ต่างที่สัญญา — ฝ่ายส่งต้องไม่ใช่คนออกคำสั่ง** ("ส่งเมลให้หน่อย" = สั่งอนาคต / "สร้าง order เสร็จแล้ว" = ประกาศอดีต)

## ออกแบบ Event Schema

- **ตั้งชื่อจากมุม domain ไม่ใช่มุม technical**: `OrderPlaced` ไม่ใช่ `OrderTableInserted` — event คือ API สาธารณะ ผูกกับ business ไม่ใช่ schema DB
- **Fat event vs thin event**: thin (id อย่างเดียว แล้ว consumer มา query กลับ) ลด payload แต่สร้าง sync coupling กลับมา + read amplification (event หนึ่งตัวมี consumer 10 ตัว = query ยิงกลับหา service ต้นทาง 10 ครั้งต่อ 1 event — โหลดอ่านทวีคูณตามจำนวน consumer และผู้ต้นทางกลายเป็นคอขวด) / fat (ใส่ข้อมูลที่ consumer ต้องใช้) ตัด round-trip แต่ต้องระวังกลายเป็น dump ทั้ง entity — เกณฑ์: ใส่ **ข้อเท็จจริง ณ เวลาที่เกิด** ที่ consumer ส่วนใหญ่ต้องใช้ (order id, รายการ, ยอด, customer id) ไม่ใส่ของที่แปรผัน (สถานะปัจจุบัน — เดี๋ยวก็ stale)
- **Versioning ต้องคิดวันแรก**: event ที่ publish แล้วคือ contract — เพิ่ม field ได้ (backward compatible), ห้ามลบ/เปลี่ยน type; ใส่ `version` ใน envelope; ถ้าต้องแตกจริงใช้ topic ใหม่แล้ว migrate consumer
- **Envelope มาตรฐาน**: `event_id` (UUID — ใช้ dedupe), `occurred_at`, `correlation_id` (ไล่ flow ข้าม service — บท 11), `causation_id` (event ไหนทำให้เกิด)

## โครงสร้าง consumer ที่ถูกต้อง

(ศัพท์ใหม่ที่จะเจอในโค้ด: **DLQ = Dead Letter Queue** — คิวพักของ message ที่ทำไม่สำเร็จถาวร แยกออกมาไม่ให้วนอุดหัวคิวหลัก — รายละเอียดเต็มบท 11)

```java
void handleOrderPlaced(Message msg) {
    var event = parseAndValidate(msg);          // 1. schema ผิด → DLQ ทันที ไม่ retry (retry ไปก็ผิดเหมือนเดิม)

    if (alreadyProcessed(event.eventId())) {    // 2. idempotent — at-least-once = ซ้ำแน่นอน (บท 11)
        msg.ack();
        return;
    }

    transactionTemplate.executeWithoutResult(tx -> {  // 3. ทำงาน + บันทึกว่าทำแล้ว ใน transaction เดียว
        reserveStock(event.orderId(), event.items());
        processedEvents.add(event.eventId());          // เก็บ event_id ใน DB เดียวกัน = atomic กับงาน
    });

    msg.ack();                                  // 4. ack หลัง commit เท่านั้น
    // ack ก่อนทำงาน = at-most-once (งานหายได้) / ack หลัง = at-least-once (งานซ้ำได้ → ข้อ 2 จึงบังคับ)
}
```

ลำดับ ack กับตำแหน่ง dedupe คือจุดที่ interviewer ชอบขุด — ตอบได้ = เข้าใจ delivery semantics จริง (และ ack คุยกับ **broker** เท่านั้น — publisher วางของแล้วเดินจากไป ไม่มีวันรู้ว่าใครอ่าน)

ทำไม dedupe ต้องอยู่ **DB เดียว tx เดียวกับงาน** — ลองเก็บ event_id ใน Redis แยกดู:

```
1. reserveStock() → commit DB ✓        stock: 10 → 9
2. 💥 crash ก่อนเขียน Redis
3. broker ส่งซ้ำ → เช็ค Redis → ว่าง → "ยังไม่เคยทำนี่" → ทำอีกรอบ → stock: 9 → 8 ตัดซ้ำ!
```

"ความจริงอยู่ใน DB แต่ความจำอยู่ใน Redis" = dual-write ฝั่ง consumer (โรคเดียวกับที่ outbox แก้ฝั่ง publisher — บท 11) — ย้ายเข้า tx เดียวกันแล้วเหลือสองโลกเท่านั้น: commit ครบคู่ (ส่งซ้ำมาก็เจอ id ข้ามไป) หรือ rollback ทั้งคู่ (ทำใหม่ได้ปลอดภัย) — หลักที่คุมทั้ง Part นี้: **อะไรที่ต้องจริงพร้อมกัน ต้องอยู่ transaction เดียวกัน**

## ใครรู้จักใคร — และ push vs pull

คนที่ไม่รู้ว่าใครฟังคือ **publisher** — ส่วน broker รู้ครบทุกคน เพราะ consumer ต้อง**ลงทะเบียน** (subscribe) ก่อนเสมอ: decoupling ไม่ได้หายไปไหน มันย้ายจาก "coupling ในโค้ด publisher" ไปเป็น "ทะเบียนใน broker" ซึ่งเพิ่ม-ถอนได้โดยไม่แตะโค้ดใคร — จำ: *publisher ตาบอดโดยเจตนา / broker คือสมุดทะเบียน / consumer ต้องเซ็นชื่อก่อนได้ของ* — ack จึงตอบได้เสมอว่าใครค้าง: broker ติดตามราย **consumer group** แยกอิสระ (mail-service ack แล้ว ไม่กระทบ analytics ที่ยังอ่านไม่ถึง)

สองสำนักการส่งของ:

| | RabbitMQ — push | Kafka — pull |
|---|---|---|
| กลไก | broker ยัดใส่มือ consumer ทันที (คุม backpressure — กันผู้ส่งอัดของเร็วกว่าผู้รับกินทัน — ด้วย prefetch limit: จำกัดจำนวน message ที่ยังไม่ ack ที่ยอมค้างในมือ consumer ตัวเดียว) | consumer `poll()` เอง + **long polling** (ไม่ใช่ถามรัว — fetch request แขวนรอที่ broker จนมีของ) |
| ปรัชญา | **smart broker** — จำสถานะราย message, ack แล้วลบ | **dumb broker** — เป็น append-only log, consumer ถือ offset เอง |
| ผลตามมา | latency ต่ำ, เหมาะ task queue / routing ซับซ้อน | replay ได้ (ถอย offset), หลาย group อ่านอิสระแทบฟรี — เหมาะ event stream |

ภาพจำ: RabbitMQ = **ไปรษณีย์** (จดหมายถึงมือแล้วจบ อยากให้สองคนได้ต้อง copy สองซอง) / Kafka = **ห้องสมุด** (หนังสืออยู่บนชั้นจนครบ retention — ใครจะเปิดหน้าไหนอ่าน เรื่องของคนนั้น)

## Event Spaghetti — ด้านมืดของ event-driven

อาการ: feature เดียวไล่ผ่าน 7 topic, ไม่มีใครวาด flow ทั้งเส้นได้, แก้ event หนึ่ง consumer ที่ไม่รู้จักพังสองตัว, เกิด **loop** (A publish → B consume แล้ว publish → C consume แล้ว publish สิ่งที่ A consume)

สาเหตุราก: ใช้ event เป็น **กลไก RPC (Remote Procedure Call) ราคาถูก** แทนที่จะเป็นการประกาศข้อเท็จจริง + ไม่มี ownership ของ topic

ทางกัน:

- ทุก topic มี **เจ้าของทีมเดียว** และ schema อยู่ใน registry (ไม่ใช่ "ไปแกะจาก consumer เอา")
- วาด event flow เป็น diagram ที่ update ได้ (จาก tracing จริง ไม่ใช่จากความจำ)
- choreography (ต่างคนต่างฟัง) เหมาะกับ flow สั้น 2–3 ขั้น / flow ยาวมีเงื่อนไข ใช้ **orchestration** (ตัวกลางคุมลำดับ — Saga orchestrator บท 11) — อย่าปล่อยให้ business process สำคัญ "emerge" จาก consumer 9 ตัวที่บังเอิญร้อยกันถูก

## เมื่อไหร่ไม่ควร event-driven

- Flow ที่ user รอคำตอบ (เช็ค stock ก่อนจ่าย) — sync ตรงไปตรงมากว่า
- ระบบเล็ก ทีมเดียว, module ใน monolith เรียก function กันตรงๆ ได้ — เพิ่ม broker คือเพิ่ม operational cost ก้อนใหญ่ (monitoring, DLQ, schema registry) แลกกับ decoupling ที่ยังไม่มีใครต้องการ
- ต้องการ strong consistency ข้ามขั้นตอนจริงๆ — event = eventual consistency โดยธรรมชาติ

## คำถามสัมภาษณ์ที่ต้องตอบได้

- **"Event กับ Command ต่างกันยังไง"** → อดีต vs คำสั่ง, ใครรู้จักใคร + กลิ่น "command ปลอมเป็น event"
- **"ack ก่อนหรือหลัง process"** → หลัง commit → at-least-once → consumer ต้อง idempotent — ตอบเป็นชุดเดียวกัน
- **"ถ้า consumer สอง instance ได้ message เดียวกัน"** → dedupe ด้วย event_id ใน transaction เดียวกับงาน (ไม่ใช่ cache แยกที่ commit คนละจังหวะ)
- **"event-driven ดีกว่า REST ไหม"** → คนละเครื่องมือ — ถามกลับว่า flow ไหน ใครรอคำตอบ ทนความ stale ได้แค่ไหน
- **"RabbitMQ กับ Kafka เลือกยังไง"** → push + smart broker เหมาะ task queue/routing ซับซ้อน vs pull + log เหมาะ event stream/replay/หลาย consumer group — ตอบด้วยลักษณะงาน ไม่ใช่ความชอบ

บทต่อไป (Part 4): เมื่อ network เข้ามาอยู่กลางระบบ — Timeout, Retry, Circuit Breaker และเพื่อนๆ

## สรุปท้ายบท

- event-driven design เป็นเครื่องมือ decoupling ที่ทรงพลังมาก แต่ไม่ได้ฟรี เพราะมันแลกความชัดของ flow แบบ synchronous กับความยืดหยุ่นข้ามเวลาและข้าม service
- การแยก event ออกจาก command และการเข้าใจ semantics ของ delivery เป็นหัวใจของการใช้ event อย่างปลอดภัย
- ปัญหาเรื่อง duplicate, ordering และ eventual consistency ไม่ใช่ edge case แต่มาพร้อมโมเดลนี้โดยธรรมชาติ
- ถ้าใช้ถูก event จะลด coupling ระดับระบบได้มาก ถ้าใช้ผิดมันจะย้าย coupling ไปซ่อนในที่ที่สังเกตยากกว่าเดิม

## ก่อนไปบทถัดไป

เมื่อ event และ network เข้ามาอยู่กลางระบบแล้ว บทถัดไปจะพาไปดู failure handling ที่ต้องมีในโลก distributed ซึ่งไม่มีคำว่าสำเร็จแน่นอนอีกต่อไป
