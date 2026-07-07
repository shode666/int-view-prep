# บทที่ 11 — Saga, Outbox, Idempotency

> บท 7 จบด้วยประโยค "ACID จบที่ขอบ database เดียว" — บทนี้คือคำตอบว่า **แล้วข้าม service ทำยังไง** ซึ่งเป็นหัวใจของ microservice ทั้งหมด: ไม่มี transaction ใหญ่ข้าม service ต้องออกแบบให้อยู่กับความไม่แน่นอน

## เข็มทิศก่อนอ่าน

บทนี้เป็นจุดต่อสำคัญระหว่าง database, event-driven และ distributed failure เพราะทุกครั้งที่งานหนึ่งต้องข้าม service เราจะเสีย transaction แบบโลกเดิมไปทันที Saga, outbox และ idempotency จึงไม่ใช่ pattern คนละก้อน แต่เป็นคำตอบร่วมกันต่อคำถามว่า "จะทำงานให้ครบโดยไม่หลอกตัวเองว่ามี rollback ใหญ่ได้ยังไง"

เวลอ่านให้จับลำดับเหตุผลให้ชัด: ทำไมถึงห้าม external call ใน transaction, ทำไม at-least-once บังคับให้ idempotent, และทำไม compensation ถึงไม่ใช่ rollback ถ้าเห็นลำดับนี้ บทถัด ๆ ไปจะต่อเอง

## ปัญหาต้นเรื่องคืออะไร ก่อนจะลง Saga, Outbox และ Idempotency

ในระบบฐานข้อมูลเดียว เราคุ้นกับความสบายของ transaction แบบ ACID: ถ้าทำหลายขั้นตอนแล้วมีขั้นหนึ่งพัง เราก็ rollback กลับไปเหมือนไม่มีอะไรเกิดขึ้น แต่ความสบายแบบนี้มีขอบเขตของมัน และขอบเขตนั้นมักจบลงทันทีเมื่อขั้นตอนงานเริ่มข้าม service, ข้ามฐานข้อมูล หรือข้ามระบบภายนอก

ลองนึกภาพ flow สั่งซื้ออย่างง่าย:

1. สร้าง order
2. ตัด stock
3. ตัดเงิน
4. ส่งอีเมลยืนยัน

ถ้าทั้งหมดอยู่ใน transaction เดียวของฐานข้อมูลเดียว เราพอหวังได้ว่า fail ที่ข้อ 4 แล้ว rollback ทั้งชุดกลับได้ แต่ในโลกจริง ข้อ 3 อาจเป็น payment gateway ภายนอก และข้อ 4 อาจเป็น email provider ที่อยู่นอกระบบเราโดยสิ้นเชิง ตรงนี้เองที่ความคิดแบบ "เดี๋ยวค่อย rollback ทีเดียว" ใช้ไม่ได้อีกแล้ว

เมื่อไม่มี transaction ใหญ่ครอบทั้งหมด เราจึงต้องตอบคำถามใหม่ให้ได้:

- ถ้าขั้นต้นสำเร็จแล้วขั้นถัดไปพัง ข้อมูลควรอยู่ในสถานะไหน
- ถ้าเราไม่แน่ใจว่าคำสั่งก่อนหน้าสำเร็จหรือไม่ ควร retry อย่างไรไม่ให้ทำงานซ้ำ
- ถ้าต้องเขียน DB และส่ง event พร้อมกัน จะกันไม่ให้สำเร็จแค่ครึ่งเดียวได้อย่างไร

สามคำในชื่อบทนี้จึงเป็นคำตอบคนละด้านของปัญหาเดียวกัน:

- **Idempotency** ช่วยให้การ retry หรือการได้รับ message ซ้ำไม่สร้างผลซ้ำ
- **Outbox** ช่วยแก้ปัญหาเขียนข้อมูลหลักกับส่ง event แล้วสำเร็จไม่พร้อมกัน
- **Saga** ช่วยจัดการงานหลายขั้นที่แต่ละขั้น commit จริงไปแล้วและต้องมีวิธีชดเชยเมื่อขั้นหลังพัง

ถ้ามองสามเรื่องนี้เป็นบทเดียวกัน จะเห็นภาพชัดกว่ามากว่ามันไม่ได้เป็นเทคนิคกระจัดกระจาย แต่เป็นชุดความคิดสำหรับโลกที่ "ทำครบทุกอย่างแล้วค่อย commit ทีเดียว" ไม่มีอยู่จริงอีกต่อไป

## ทำไมไม่มี Distributed Transaction

2PC (two-phase commit) มีจริงแต่ไม่ใช้ในทางปฏิบัติ: coordinator คือ single point of failure, lock ค้างข้าม network ระหว่างรอทุกคนตอบ = throughput ต่ำและ availability แย่ลงตามจำนวนผู้ร่วม — ยิ่ง service เยอะยิ่งแย่ ทั้งที่เราแยก service เพื่อให้เป็นอิสระ
ทางที่โลกเลือก: **ยอมรับ eventual consistency แล้วออกแบบการชดเชย (compensation) แทนการ rollback**

## Idempotency — รากฐานของทุกอย่างในบทนี้

Operation ที่ทำซ้ำกี่ครั้งผลเท่าทำครั้งเดียว — จำเป็นเพราะบท 10 บอกให้ retry และบท 9 บอกว่า message ซ้ำแน่นอน

**Idempotency Key**: client สร้าง unique key ต่อ "ความตั้งใจหนึ่งครั้ง" แนบไปกับ request — server เก็บ key + ผลลัพธ์ไว้ ถ้าเจอ key ซ้ำคืนผลเดิมโดยไม่ทำงานซ้ำ

```
POST /payments
Idempotency-Key: order-42-attempt-ce7a...

server:
  1. INSERT INTO idempotency_keys(key, status='processing')  -- unique constraint กันแข่งกันเอง
     ├─ ชนะ → ทำงานจริง → UPDATE เก็บ response → คืน
     ├─ ซ้ำ + เสร็จแล้ว → คืน response เดิม (ไม่แตะ gateway อีก)
     └─ ซ้ำ + ยัง processing → 409/รอ — ห้ามทำงานแข่ง
  2. key ผูกกับ hash ของ body — key เดิม body ใหม่ = 422 (client bug)
```

จุดที่พลาดบ่อย: เช็ค key ด้วย `SELECT` ก่อน `INSERT` (race — สอง request ผ่านพร้อมกัน) ต้องพึ่ง **unique constraint** ให้ DB ตัดสิน · เก็บ key ใน cache ที่หายได้ = idempotency หายตาม · consumer ฝั่ง event ใช้หลักเดียวกันด้วย `event_id` (บท 9)

ออกแบบ key ให้เป็น: **key ชี้ "เจตนา" ไม่ใช่ "ทรัพยากร"** — operation ที่เกิดซ้ำได้โดยชอบธรรม (order เดียวจ่ายสองงวด, retry ด้วยบัตรใบใหม่) ใช้ order id เป็น key จะ dedupe เจตนาใหม่ทิ้ง → ให้ client สร้าง UUID ต่อการตั้งใจหนึ่งครั้ง (กดจ่าย 1 ครั้ง = 1 key, retry อัตโนมัติใช้ key เดิม, กดใหม่โดยตั้งใจ = key ใหม่) · **scope ต่อ operation** — `charge` กับ `refund` ของ order เดียวกันห้ามชนกัน · key มี **Time To Live (TTL)** (Stripe เก็บ ~24 ชม. — พอครอบ retry window)

แยกชั้นให้ถูกตอนเล่า: **idempotency = คุณสมบัติ (เป้าหมาย) / inbox-dedupe = เทคนิค (วิธีไปถึง)** — บางงาน idempotent โดยกำเนิดไม่ต้องมีกลไกเลย: `SET status='PAID'` รันซ้ำผลเท่าเดิม ส่วน `qty = qty - 1` ไม่ใช่ — dedupe คือการ*สร้าง*คุณสมบัตินี้ให้งานที่ไม่มีเอง

## Dual-write Problem → Outbox Pattern

**ปัญหาเรือธงของบทนี้**: use case ต้อง "commit DB **และ** publish event" — สองระบบ, ไม่มี transaction ร่วม:

```
db.commit()          # สำเร็จ
kafka.publish(...)   # ตาย ← order เกิดแล้วแต่ไม่มีใครรู้ — stock ไม่จอง, email ไม่ส่ง
```

สลับลำดับก็พังอีกแบบ (publish แล้ว commit fail = โลกรู้เรื่อง order ที่ไม่มีจริง)

**Outbox**: เขียน event ลง **table ในฐานข้อมูลเดียวกัน** ใน transaction เดียวกับข้อมูลหลัก — ได้ atomicity ฟรีจาก ACID ที่มีอยู่แล้ว:

```sql
BEGIN;
INSERT INTO orders (...);
INSERT INTO outbox (event_id, type, payload, created_at)
       VALUES (uuid, 'OrderPlaced', {...}, now());
COMMIT;   -- ทั้งสองอย่างเกิดหรือไม่เกิดพร้อมกัน
```

เส้นแบ่งว่าอะไรลง outbox: **งานที่จบใน DB เดียวกัน** (ตัด stock, สร้าง receipt) ทำตรงๆ ใน tx — ACID คุ้มครองอยู่แล้ว / **งานที่ต้องออกนอก DB** (email, publish event, เรียก service อื่น) ห้ามทำใน tx → จด*ความตั้งใจ*ลง outbox — และ outbox อยู่**บ้านผู้ส่งเสมอ** เพราะต้องร่วม tx กับงานหลัก (เอาไปวางที่อื่น = dual-write ย้อนกลับมา)

จากนั้น **relay** แยกต่างหากอ่าน outbox → publish → mark sent (polling หรือ **CDC — Change Data Capture** เช่น Debezium: อ่านความเปลี่ยนแปลงจาก WAL ของ DB ตรงๆ ไม่ต้อง query รบกวน) กลไกที่ควรเล่าได้:

```
SELECT ... FROM outbox WHERE processed_at IS NULL
FOR UPDATE SKIP LOCKED          -- หลาย relay instance ไม่ตักงานซ้ำกัน (บท 7)
→ publish → broker ตอบ ack ("รับแล้ว เขียน disk/replica แล้ว") → mark processed_at
```

- **broker ack คือ response ที่ relay ต้องการ** — สัญญาของ outbox คือ "ของออกจากบ้านแน่ อย่างน้อยหนึ่งครั้ง" ไม่ใช่ "ปลายทางทำเสร็จ" (แต่ละข้อต่อของท่อยืนยันช่วงตัวเอง — ไม่มีใครรอเส้นชัย)
- publish fail → **ไม่ต้องทำอะไรเลย** — แถวยัง NULL, relay รอบหน้าตักใหม่เอง: ตัว loop คือ retry ในตัว · ack หาย (timeout ก้ำกึ่ง — ส่งถึงแล้วแต่คำตอบตกน้ำ?) → รอบหน้าส่งซ้ำ = at-least-once ตามสัญญา: **สงสัยเมื่อไหร่ เลือกส่งซ้ำ ไม่เลือกเสี่ยงหาย**
- แถวพิษ (payload พัง ส่งกี่รอบก็ fail) → คอลัมน์ `attempts` เกิน threshold → ยกออก + alert = Dead Letter Queue (DLQ) ฉบับ outbox — อย่าปล่อยสิงใน loop ตลอดกาล

มองทั้งท่อคือ**การวิ่งผลัดที่ของไม่เคยลอยกลางอากาศ**: DB ถือ (ยัง NULL) → broker ถือ (เขียน disk+replica ก่อน ack) → consumer ถือ (ยังไม่ ack) — *ผู้ส่งไม่ปล่อยมือจนกว่าผู้รับยืนยันว่าถือแทนแล้ว* — และทุกการส่งซ้ำจากความสงสัย มี dedupe ปลายทางรองรับ

ระวังท่าเลียนแบบ: **"ยิงตรงก่อน fail ค่อย enqueue" ไม่ใช่ outbox** — ความตั้งใจถูกจด*หลัง*พยายาม → crash ระหว่าง fail กับ enqueue = งานหายไร้ร่องรอย (dual-write ในเสื้อคลุมใหม่) / outbox จด*ก่อน*ลงมือเสมอ ใน tx เดียวกับงานหลัก — ท่าเลียนแบบใช้ได้เฉพาะงานที่ยอมให้หายได้

ผลที่ตามมาซึ่งต้องพูดเอง: relay ตายหลัง publish ก่อน mark = **event ซ้ำ** → at-least-once → consumer ต้อง idempotent — วงกลมกลับมาที่หัวข้อแรกพอดี นี่คือเหตุผลที่สองเรื่องนี้อยู่บทเดียวกัน · ฝั่งรับก็มีสมุดของตัวเอง (`processed_events` — บางตำราเรียก **inbox pattern**): outbox การันตี "ออกแน่" / inbox การันตี "ทำจริงครั้งเดียว" — สองสมุด สองบ้าน หลักเดียวกัน

## Saga — Business Transaction ข้าม Service

ลำดับ local transaction ที่แต่ละก้าว commit จริงทันที + ทุกก้าวมี **compensating action** สำหรับถอยหลัง:

```
PlaceOrder → ReserveStock → ChargePayment → CreateInvoice → Ship
                 ↑                ✗ fail
   ReleaseStock ←┘         CancelOrder
```

- **Compensation ≠ rollback**: มันคือ business action ใหม่ (คืน stock, refund, ส่ง email ขอโทษ) — บาง action ชดเชยไม่ได้จริง (email ส่งแล้ว) จึงเรียงขั้นให้ **ของที่ถอยยากอยู่ท้ายสุด** (charge เงินหลัง reserve stock ไม่ใช่ก่อน)
- Compensation คือ**การตัดสินใจธุรกิจ** ไม่ใช่แค่ technical undo: เคส "เงินผ่านแต่ของหมด" ไม่จำเป็นต้อง refund เสมอ — backorder + ส่วนลด, ส่งบางส่วน, เสนอสินค้าแทน ก็เป็นคำตอบ (architecture ต้องเปิดช่องให้ธุรกิจเลือก) — และตัวคำสั่ง refund เองห้ามหาย (ผ่าน outbox) + ต้อง idempotent (คืนเงินซ้ำสองรอบ = หายนะอีกแบบ)
- ลดโอกาสต้องชดเชยด้วย **soft reservation + TTL**: จองก่อน-จ่ายทีหลัง-ยืนยันปิดท้าย; จองแล้วไม่จ่ายใน 10 นาที ระบบคืนของอัตโนมัติ — คือการเรียง "ยกเลิกถูก" ไว้หน้า "ยกเลิกแพง" ในทางปฏิบัติ
- ระหว่าง saga วิ่ง ระบบอยู่ในสถานะกลาง (order = PENDING_PAYMENT) — ต้องออกแบบ state เหล่านี้เป็น first-class ไม่ใช่ afterthought และ UI ต้องแสดงมันได้

**Choreography vs Orchestration**:

| | Choreography (ฟัง event ต่อกัน) | Orchestration (ตัวกลางสั่ง) |
|---|---|---|
| เหมาะกับ | 2–3 ขั้น flow ตรง | flow ยาว มีเงื่อนไข/branch |
| Coupling | ต่ำสุด — ไม่มีใครรู้จักใคร | services รู้จัก orchestrator |
| มองเห็น flow | ยาก (Event Spaghetti — บท 9) | ชัด — state machine อยู่ที่เดียว |
| จุดตาย | ไม่มี แต่ debug กระจาย | orchestrator ต้อง High Availability (HA) + persist state |

เครื่องมือ orchestration ที่ควรเอ่ยชื่อได้: Temporal, AWS Step Functions — หรือ state machine ใน DB ตัวเอง (หลาย บ. เริ่มแบบนี้แล้วดีพอ)

กายวิภาค orchestrator (เขียนเองมีแค่นี้): table `saga_instances(saga_id, current_step, status, completed_steps, updated_at)` — มันคือ **call stack ที่ persist ลง DB**: use case ปกติรู้ว่า "ทำถึงไหน" จากตำแหน่งบรรทัดที่กำลังรัน แต่ flow ข้าม service ข้ามเวลา stack ตายพร้อม process จึงต้องจดเอง — เทียบเป็นคู่: **stack→table, rollback→compensation, return→state transition** (ของฟรีจากภาษาหายหมด ต้องสร้างเองทุกตัว — นี่คือเหตุผลที่ distributed system ยาก)

- orchestrator ตายกลางทาง → **sweeper** กวาด `status='RUNNING' AND updated_at < now()-interval '5 min'` → อ่าน current_step → ทำต่อจากตรงนั้น ไม่เริ่มใหม่ (ท่าเดียวกับ relay กวาด outbox)
- participant เงียบ → **timeout ต่อ step** → retry command เดิมพร้อม `saga_id+step` เป็น idempotency key — **สองชั้นกันซ้ำที่ต้องมีครบคู่**: saga state กันซ้ำ*ข้าม step* (resume ถูกที่) / idempotency ฝั่ง participant กันซ้ำ*ใน step ก้ำกึ่ง* (ทำแล้วแต่คำตอบหาย — state table แยกไม่ออกระหว่าง "ยังไม่ทำ" กับ "ทำแล้วคำตอบตกน้ำ") — ขาดตัวไหนรั่วตัวนั้น
- orchestrator ส่ง **command แท้** (`ChargePayment` — กริยาคำสั่ง ระบุผู้รับ เปิดเผย รับผิดชอบ flow ทั้งเส้น) — นี่คือที่ที่ command ถูกกติกา ต่างจาก command ปลอมเป็น event (บท 9) ตรงความรับผิดชอบไม่ได้ซ่อน
- ตัว orchestrator เองก็เจอ dual-write ("อัพเดต saga state + ส่ง command") → **มันก็ใช้ outbox ของตัวเอง** — วงกลมครบรอบ
- กับดัก: **God Orchestrator** — เผลอยัด business logic ใส่ → กติกาเดิม: orchestrator ประสาน ไม่ตัดสิน (ราคา/สิทธิ์อยู่ใน domain ของ participant)

## Dead Letter Queue (DLQ) + Event-driven Retry

Consumer ประมวลผล fail: retry ทันทีสองสามครั้ง (transient) → ยัง fail → **อย่า block queue** — ย้ายไป retry topic ที่มี delay (5m, 30m, 2h) → หมดโควตา → **Dead Letter Queue**

กติกา DLQ ที่แยกทีมโตจากทีมเด็ก: DLQ ต้องมี **alert + dashboard + เจ้าของ + runbook** (แก้ต้นเหตุแล้ว replay ยังไง) — DLQ ที่ไม่มีใครดู = หลุมฝังข้อมูลลูกค้า · แยก error ให้ถูก: poison message (schema ผิด — เข้า DLQ ทันที ไม่ retry) vs transient (retry มีหวัง)

## แผนที่ไล่ปัญหา + สามคู่สมมาตร

Incident "ลูกค้าไม่ได้เมล" ไล่ตามหลัก **pub ดูที่ outbox / sub ดูที่ broker** (สถานะของฝั่งไหนอาศัยอยู่ที่ไหน วินิจฉัยที่นั่น):

```
1. outbox: processed_at ยัง NULL?  → relay ตาย / แถวพิษ
2. broker: consumer lag? DLQ มีของ? → ฝั่งรับป่วย
3. consumer log: ack แล้วแต่งานผิด?  → bug ใน handler
```

สามคำถาม สามข้อต่อ — ไม่ต้องเดา · และสังเกตว่าทั้งบทคือ**กฎสามบรรทัดใช้ซ้ำทุกข้อต่อ**: *ชั่วคราว → รอแล้วซ้ำ / ถาวร → แยกออก+เรียกคน / สงสัย → ส่งซ้ำแล้วให้ dedupe รับ* — ปรากฏเป็นสามคู่สมมาตร pub↔sub: **outbox↔inbox** (จดใน tx เดียวกับงาน), **relay retry↔consumer redelivery** (fail ชั่วคราว), **แถวพิษ↔DLQ** (fail ถาวร)

หมายเหตุที่มักเข้าใจผิด: เครื่องมือชุดนี้**ไม่ผูกกับ async** — ศัตรูคือ network ไม่ใช่รูปแบบการเรียก: idempotency key คือของฝั่ง sync API โดยกำเนิด, saga orchestrate ด้วย HTTP sync ก็ยังเป็น saga, outbox ใช้ได้กับทุกงานที่เลื่อนได้ (ข้อเดียวที่ไม่ได้: งานที่ user รอผลใน request นั้น — ต้อง sync call + breaker + fallback แทน)

## Distributed Tracing — สายตาของทั้ง Part นี้

Flow ข้าม 6 service จะ debug ได้ต้องมี:

- **Trace ID** สร้างที่ขอบระบบ (gateway) ส่งผ่านทุก hop — HTTP header (W3C `traceparent`), message envelope (บท 9), **และลง log ทุกบรรทัด** (structured logging)
- **Correlation ID** ผูก "ความตั้งใจทางธุรกิจหนึ่งครั้ง" ข้าม saga ทั้งเส้น (trace หนึ่ง request, correlation หนึ่ง business flow — saga เดียวมีหลาย trace ได้)
- เครื่องมือ: OpenTelemetry (มาตรฐานกลาง) → Jaeger/Tempo/Datadog; สิ่งที่ senior ต้องพูด: tracing ไม่ใช่ของแถม — **ถ้าไม่มี มันคือระบบที่ debug ไม่ได้** และต้อง propagate ผ่าน async boundary (queue) ด้วย ไม่ใช่แค่ HTTP

## ห้าคำถามคลาสสิก — แนวตอบ senior

1. **"A → B → C แล้ว C ล่ม ทำไง"** → แยกสองแกน: C จำเป็นต่อคำตอบไหม (ไม่ → degrade/fallback, ตัดเป็น async) / ถ้าจำเป็น → timeout + circuit breaker กัน cascade, ถ้าเขียนข้อมูลไปแล้วบางส่วน → saga compensation ถอย B กับ A
2. **"Retry แล้ว payment ซ้ำ กันยังไง"** → Idempotency key ต่อ payment intent, unique constraint ฝั่ง DB, gateway เจ้าใหญ่รองรับ key นี้อยู่แล้ว (Stripe/Omise) — ตอบให้ครบทั้งฝั่งเราและฝั่ง provider
3. **"Save DB สำเร็จแต่ publish event fail ทำไง"** → นี่คือ dual-write → Outbox pattern เต็มรูป + ราคาที่ตาม (event ซ้ำ → consumer idempotent)
4. **"Queue ส่ง event ซ้ำ consumer ทำไง"** → dedupe ด้วย event_id ใน **transaction เดียวกับ side effect** + ack หลัง commit (บท 9) — และชี้ว่า exactly-once delivery ไม่มีจริง มีแต่ effectively-once ที่ปลายทาง
5. **"Service ช้าลากระบบล่มต่อกัน"** → ชุดคำตอบบท 10: timeout → bulkhead → breaker → fallback + load shedding (**โยนงานล้นทิ้งตั้งแต่ขาเข้าเมื่อระบบเต็ม** — ตอบ 429/503 ทันทีให้ request ที่รับไม่ไหว แทนที่จะรับทุกตัวไว้แล้วช้าตายทั้งกอง; เลือกทิ้งตาม priority ได้ เช่น งาน batch หลบให้ checkout — บท 21)

สังเกต: ทั้งห้าข้อคือเรื่องเดียวกันหมด — **โลกไม่แน่นอน, ทำซ้ำได้อย่างปลอดภัย, atomic เฉพาะใน DB เดียว, ชดเชยแทน rollback**

บทต่อไป (Part 5): เอาทั้งหมดนี้มา test ยังไง — Testing Architecture

## สรุปท้ายบท

- saga, outbox และ idempotency เป็นชุดคำตอบเดียวกันต่อปัญหาว่าเราจะทำงานข้าม service ให้ครบโดยไม่หลอกตัวเองเรื่อง transaction ได้อย่างไร
- compensation ไม่ใช่ rollback, at-least-once บังคับให้คิดเรื่อง idempotent, และ outbox คือสะพานเชื่อม transaction กับ event ที่ปลอดภัยกว่าการหวังดวง
- บทนี้เชื่อมตรงจาก database, event-driven และ failure handling จึงเป็นหัวใจของ microservice ที่ทำงานจริงได้
- ถ้า logic ชุดนี้ยังพิสูจน์ไม่ได้ใน test หรือยังอธิบายไม่ได้เป็นลำดับ แปลว่าภาพของ distributed consistency ยังไม่แน่นพอ

## ก่อนไปบทถัดไป

เมื่อระบบเริ่มซับซ้อนและอยู่กับความไม่แน่นอนมากขึ้น บทถัดไปจะตอบว่าทั้งหมดนี้ควรถูกพิสูจน์อย่างไรด้วย architecture ของการ test ที่สอดคล้องกับ design
