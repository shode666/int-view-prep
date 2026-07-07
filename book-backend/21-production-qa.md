# ภาคผนวก — Production Q&A: 36 คำถามสนามจริง

> คำถามชุดนี้คือแนวที่บริษัท top-tier ใช้แทนคำถามทฤษฎี — ทุกข้อคือ incident จริงที่แปลงร่างเป็นคำถาม โครงตอบที่ interviewer อยากเห็น: **วินิจฉัยเป็นลำดับ (ไม่เดามั่ว) → สาเหตุยอดฮิต → วิธีแก้ + วิธีกันถาวร** — ข้อไหนโยงเนื้อหาในเล่มจะวงเล็บบทไว้

## เข็มทิศก่อนอ่าน

ภาคผนวกนี้ควรอ่านเหมือนสนามซ้อมไล่เหตุการณ์จริง ไม่ใช่ชุดคำถามท่องจำ จุดสำคัญของ production question ไม่ใช่ตอบชื่อสาเหตุให้ตรง แต่คือการแสดงให้เห็นว่าเราไล่อาการเป็นลำดับได้ ไม่กระโดดสรุป และรู้ว่าต้องเก็บ evidence อะไรก่อนตัดสินใจ

ระหว่างอ่านแต่ละข้อให้พยายามโยงกลับไปที่ principle หรือ pattern ในบทหลัก ถ้าเชื่อมได้ แปลว่าคุณไม่ได้จำ incident เป็นรายข้อ แต่กำลังสร้างวิธีคิดที่ใช้กับข้อใหม่ที่ไม่เคยเห็นได้ด้วย

## วิธีอ่านภาคผนวกนี้ให้ได้ประโยชน์

คำถามในภาคผนวกตั้งใจเขียนให้เปิดเหมือน "มีเหตุการณ์จริงเกิดขึ้นอยู่ตรงหน้า" จึงอาจดูเหมือนกระโดดเข้ากลางเรื่องทันที วิธีอ่านที่ถูกไม่ใช่พยายามจำคำตอบสั้น ๆ แต่ให้อ่านทีละข้อโดยถามสามอย่าง:

1. คำถามนี้กำลังถามเรื่อง **ชั้นไหนของระบบ** — application, database, runtime, network, infra หรือ process
2. ถ้าเป็น incident จริง เราต้องหา **evidence อะไรก่อน** ถึงจะไม่เดามั่ว
3. คำตอบนี้โยงกลับไปยังหลักการหรือ pattern บทไหนในเล่มหลัก

พูดอีกแบบ ภาคผนวกนี้ไม่ใช่บทสอนศัพท์ใหม่เป็นหลัก แต่มันคือสนามซ้อมเปลี่ยนความรู้เดิมให้กลายเป็น **วิธีวินิจฉัย** เมื่อโลกจริงไม่ส่งโจทย์มาเป็นหมวดสวย ๆ ให้เรา

## Production & Architecture

### 1. ทำไม `@Transactional` fail ได้ทั้งที่ไม่มี exception โยนออกมา

**หัวใจ**: `@Transactional` ทำงานผ่าน **proxy ที่ห่อ bean** — อะไรที่ทำให้การเรียกไม่ผ่าน proxy หรือทำให้ proxy ตัดสินใจไม่ rollback = เงียบทั้งคู่

เห็นภาพ proxy ก่อน — Spring ไม่ได้เสก `@Transactional` เข้าไปใน method: มันสร้าง**ตัวห่อ**มาคั่นหน้า bean แล้วให้คนอื่น inject เจอตัวห่อแทน:

```
caller ──▶ [Proxy: เปิด tx → เรียกของจริง → commit/rollback] ──▶ bean จริง
           ▲ เวทมนตร์ทั้งหมดอยู่ตรงนี้ — ใครเรียกไม่ผ่านตรงนี้ = ไม่มีเวทมนตร์
```

สาเหตุยอดฮิตเรียงตามความถี่:

1. **Self-invocation**: เรียก method ในคลาสตัวเอง = ไม่ผ่านตัวห่อ → `@Transactional` เงียบสนิท:

```java
@Service
public class OrderService {
    public void processAll(List<Order> orders) {
        for (var o : orders) this.processOne(o);   // ← เรียกตรง ไม่ผ่าน proxy!
    }
    @Transactional                                  // ← ไม่ทำงานเลย — ไม่มี tx ไม่มี error
    public void processOne(Order o) { ... }
}
```

แก้: ย้าย `processOne` ไปคลาสแยกแล้ว inject เข้ามา (ทางที่สะอาดสุด — และมักฟ้องว่า class นี้ทำสองเรื่องอยู่แล้ว)

2. **Checked exception ไม่ rollback by default**: Spring rollback เฉพาะ `RuntimeException`/`Error` — โยน `Exception` ธรรมดา = **commit ทั้งที่งานพัง** — แก้: `@Transactional(rollbackFor = Exception.class)` (เหตุผลเชิงประวัติศาสตร์: checked exception ถูกมองเป็น "เงื่อนไขธุรกิจที่คาดไว้" ไม่ใช่ความพัง — ความเห็นที่โลกไม่ค่อยเห็นด้วยแล้ว แต่ default แก้ไม่ได้เพราะ backward compat)
3. **กลืน exception เอง**: `try { ... } catch (Exception e) { log.error(e); }` แล้วจบ method ปกติ → proxy ไม่เห็น exception → commit — log มี error แต่ข้อมูล commit = คู่หูปริศนาคลาสสิก
4. Method ไม่ `public` (proxy มองไม่เห็น), propagation ผิด (`REQUIRES_NEW` ตัดขาดจาก tx แม่ — rollback แม่ไม่ดึงลูก), multi-datasource ใช้ transaction manager ผิดตัว (tx เปิดกับ DB หนึ่ง งานเขียนอีก DB), งานโยนไป thread อื่น (`@Async` ข้างใน — tx ไม่ข้าม thread เพราะ tx ผูกกับ thread ผ่าน ThreadLocal!)

**แนวตอบ senior**: *"ผมไล่จาก proxy ก่อนเสมอ — self-invocation กับ checked exception คือ 80% ของเคส แล้วเช็คว่าใครกลืน exception ระหว่างทาง"* (โยงบท 5 — "magic ที่ต้องเข้าใจ")

### 2. เปิด retry แล้วเกิด record ซ้ำ แก้ยังไง

**หัวใจ**: retry คือการยอมรับ at-least-once → operation ที่ถูก retry **ต้อง idempotent ก่อน** ไม่งั้นห้ามเปิด retry (บท 10 ข้อ 4 ของกติกา retry)

แก้เป็นชั้น: (1) **Idempotency key** ต่อเจตนา — client แนบมา server เก็บ key+ผล เจอซ้ำคืนผลเดิม (2) **Unique constraint ใน DB เป็นแนวรับสุดท้าย** — อย่าเช็คด้วย SELECT ก่อน INSERT (race) ให้ DB ตัดสิน (3) ตรวจว่า retry ถูกชั้นเดียว — client×gateway×service ซ้อนกัน = คูณความซ้ำ

**แนวตอบ senior**: *"ต้นเหตุไม่ใช่ retry — คือการ retry สิ่งที่ไม่ idempotent ผมแก้ที่คุณสมบัติก่อนแล้ว retry จะปลอดภัยเอง"* (บท 11)

### 3. API รอด 100 users แต่พังที่ 10,000 concurrent — ไล่จากไหน

**ลำดับวินิจฉัย** (เรียงตามความน่าจะเป็น × ความถูกของการเช็ค):

1. **Connection pool + thread model** — pool 10 เส้นรับหมื่น concurrent ไม่ได้; ดู pool pending/timeout ก่อนเลย (บท 7)
2. **N+1** — 100 users ไม่รู้สึก (600 query/วิ) หมื่น users = 60,000 query/วิ (บท 7 — "ทำไมหลุดถึง production")
3. **Missing index / lock contention** — query ที่ scan ตาราง + row lock ที่ทุกคนแย่งแถวเดียว (hot row)
4. ไม่มี cache ให้ read ซ้ำๆ, external call ใน request path ที่ไม่มี timeout → thread ค้างสะสม

เครื่องมือ: APM ดู p99 breakdown ว่าเวลาไปกองที่ไหน (DB? external? GC?), `EXPLAIN ANALYZE` query ที่ช้า, pool metrics — **"ผมไม่เดา ผมดูว่าเวลาหายไปไหน"**

### 4. HikariCP หมด pool ทั้งที่ DB CPU ต่ำกว่า 20%

**หัวใจ**: pool หมดเพราะ connection ถูก**ถือ** ไม่ใช่ถูก**ใช้** — DB ว่างเพราะงานไม่ได้อยู่ที่ DB แต่ connection ไม่ถูกคืน

สาเหตุยอดฮิต: (1) **transaction เปิดค้างระหว่างเรียก external API** — บาปข้อหนึ่งของบท 5: `@Transactional` ครอบ method ที่มี HTTP call ข้างใน = connection ถูกจองตลอด 8 วิที่รอปลายทาง (2) query ช้าไม่มี **statement timeout** (3) connection leak — โค้ดที่หยิบ connection เองแล้วไม่คืนใน finally (4) `@Transactional` บน controller — tx เปิดยันตอน serialize JSON (บท 4)

วินิจฉัย: Hikari metrics `active/idle/pending` + เปิด `leakDetectionThreshold=60000` ให้มัน log stack trace ของคนที่ถือนานผิดปกติ — ได้ตัวการเป็นบรรทัดโค้ดเลย

**แนวตอบ senior**: *"DB CPU ต่ำคือ clue สำคัญ — มันบอกว่าปัญหาไม่ใช่ query หนัก แต่คือ connection ถูกจองไว้เฉยๆ ผมหา 'ใครถือนาน' ด้วย leak detection แล้วมักเจอ external call ใน transaction"*

### 5. ทำให้ Kafka consumer ประมวลผล exactly-once ได้ยังไง

**หัวใจ (ประโยคแรกต้องพูด)**: **exactly-once delivery ไม่มีจริง** ข้ามระบบทั่วไป — สิ่งที่ทำได้คือ **effectively-once processing**: ยอมรับว่า message มาซ้ำ (at-least-once) แล้วทำให้ผลลัพธ์เกิดครั้งเดียว + **ack หลัง commit เท่านั้น**

และ dedupe ไม่ได้แปลว่าต้องมี table เสมอ — **บันไดสี่ขั้น ไล่จากถูกไปแพง:**

```java
// ขั้น 1 — งาน idempotent โดยกำเนิด: ไม่ต้องมีกลไกอะไรเลย
UPDATE orders SET status = 'PAID' WHERE id = 42;          -- ซ้ำสิบรอบผลเท่าเดิม

// ขั้น 2 — state transition: ให้เงื่อนไข WHERE เป็นตัว dedupe
UPDATE orders SET status = 'PAID'
WHERE id = 42 AND status = 'PENDING';                     -- replay → affected 0 → ข้าม
-- ตัว state เองคือความจำว่าทำแล้ว — ไม่ต้องมี table เพิ่ม

// ขั้น 3 — insert ที่มี business key: ให้ unique constraint ปฏิเสธแทน
INSERT INTO shipments (order_id, ...) VALUES (42, ...);   -- ซ้ำ → duplicate key → ack เฉยๆ

// ขั้น 4 — งานหลาย side effect / ไม่เข้าเคสไหน: inbox + event_id
tx { reserveStock(...); processedEvents.add(eventId); }   -- จดใน tx เดียวกับงาน
-- (เก็บใน Redis แยก = dual-write — crash ตรงช่องว่างแล้วตัดซ้ำ)
```

หมายเหตุ: `event_id` ติดมากับ envelope อยู่แล้ว (producer สร้างตอน outbox) — consumer ไม่ต้องสร้าง key เอง / ส่วน "idempotency key" ฉบับ client-สร้าง-UUID เป็นท่าของฝั่ง sync API (HTTP ไม่มี event_id ติดตัวมา)

แต้มโบนัส: Kafka มี "exactly-once semantics" (transactions + idempotent producer) จริง แต่ครอบเฉพาะ **Kafka→Kafka** (stream processing) — ทันทีที่ side effect ออกนอก Kafka (เขียน DB, ยิง API) กลับมาที่บันไดสี่ขั้นเสมอ

**แนวตอบ senior**: *"ผมไล่จาก natural idempotence → conditional update → unique constraint ก่อน แล้วค่อย inbox event_id เป็นท่าสุดท้าย — ยิ่งกลไกน้อย ยิ่งไม่มีอะไรให้พังเพิ่ม"*

### 6. Health check ผ่านหมด แต่ user เจอ 503 — เกิดอะไรได้บ้าง

**หัวใจ**: 503 ต้องถามก่อนว่า**ใครเป็นคนตอบ** — ไล่จากนอกเข้าใน:

1. **Load Balancer (LB)/gateway ตอบเอง** — upstream timeout (งานจริงช้ากว่า proxy timeout ทั้งที่ health endpoint เร็ว), ไม่มี instance พร้อม (readiness fail ทั้งฝูงชั่วขณะระหว่าง deploy)
2. **Health check เช็คตื้นเกิน** — liveness = "process หายใจ" ผ่านตลอดแม้ DB ล่ม: ต้องแยก **liveness vs readiness** (บท 10) — readiness ต้องเช็ค dependency สำคัญ ไม่งั้น instance ที่ป่วยครึ่งตัวยังรับ traffic
3. **Pool/thread หมด** — health endpoint เบา (ไม่แตะ DB) เลยตอบได้ แต่ request จริงรอ pool → timeout — health โกหกเพราะมันไม่ได้เดินเส้นเดียวกับงานจริง
4. Cascade บางเส้นทาง — เฉพาะ endpoint ที่พึ่ง downstream ที่ล่ม (แต่ health ไม่ได้เช็คตัวนั้น)

**แนวตอบ senior**: *"ผมดู header/log ว่า 503 ออกจากชั้นไหนก่อน — แล้วถามว่า health check เดินเส้นทางเดียวกับ request จริงหรือเปล่า ส่วนใหญ่มันเช็คคนละเส้น"*

### 7. Scale แล้ว scheduled job รันซ้ำหลาย pod — กันยังไง

สามท่าเรียงตามความนิยม (เพิ่งคุยกันในบริบท saga sweeper):

1. **Lock ใน DB** — ShedLock (annotation เดียว lock ผ่าน table กลาง) หรือทำเอง: `SELECT ... FOR UPDATE SKIP LOCKED` — job กลายเป็นคิวงาน ใครคว้าได้คนนั้นทำ (บท 7)
2. **Leader election** — instance เดียวเป็นคนรัน (K8s lease, Zookeeper) — คุ้มเมื่อ job เยอะ
3. **ย้ายออกจาก app** — K8s CronJob ตัวเดียวยิง endpoint/รัน task — job ไม่ผูกกับจำนวน replica ของ service

- Defense in depth: ต่อให้ lock พลาด งานควร **idempotent** อยู่ดี — รันซ้ำแล้วไม่เจ็บ

### 8. ทำไม optimistic locking ยัง "fail" ในระบบ concurrency สูง

**หัวใจ (พลิกคำถาม)**: มันไม่ได้ fail — มัน**ทำงานตามออกแบบ**: ตรวจพบคนตัดหน้าแล้วปฏิเสธการเขียน คำถามจริงคือ "ทำไมถึงเอา optimistic ไปวางในที่ที่ชนกันถี่"

- ชนบ่อย → conflict ถี่ → **retry storm**: งานทิ้ง+เริ่มใหม่วนไป throughput ดิ่ง (ยิ่ง retry ยิ่งชน) — เกณฑ์จากบท 7: **ชนบ่อย = pessimistic** (รอ lock ถูกกว่า retry ที่ fail ซ้ำ)
- หรือดีกว่านั้น — **redesign ให้ไม่ต้องชน**: atomic UPDATE บรรทัดเดียว (`SET qty = qty - 1 WHERE qty >= 1`), แตก hot row (sharded counter), หรือ serialize ผ่าน queue (FOR UPDATE SKIP LOCKED job)

**แนวตอบ senior**: *"optimistic lock ที่ conflict ถี่คือเครื่องมือถูกวางผิดที่ — ผมดูความถี่การชนแล้วเลือกใหม่: pessimistic, atomic UPDATE, หรือออกแบบไม่ให้มี hot row ตั้งแต่แรก"*

## Performance, Observability & Resilience

### 9. Cache hit ratio ดิ่งจาก 95% เหลือ 30% — เช็คอะไร

ไล่ตาม timeline ก่อน: **มันดิ่งตอนไหน — ตรงกับ deploy ไหม?**

1. **Deploy เปลี่ยน key format/serializer** — cache ทั้งก้อนกลายเป็นขยะทันที (key เดิมหาไม่เจอ) — สาเหตุอันดับหนึ่งและอายสุด
2. **Eviction เพราะ memory เต็ม** — ดู `evicted_keys`/`used_memory` (Redis INFO) — ของถูกไล่ออกก่อนหมดอายุ
3. **TTL หมดพร้อมกัน + stampede** — cache warm ตอนเดียวกัน (หลัง deploy/restart) หมดอายุพร้อมกัน → คลื่น miss กระแทก DB → เติม jitter ใส่ TTL (แนวคิดเดียวกับ retry jitter บท 10!)
4. **Traffic pattern เปลี่ยน** — bot/scraper ยิง key ที่ไม่ซ้ำ (unique query string) = miss ล้วนโดย hit เดิมไม่หาย — ดู top keys / cardinality ของ key ใหม่
5. Cache node restart/failover — memory เริ่มจากศูนย์

### 10. Downstream ตัวหนึ่งตอบ 8 วินาที — กันไม่ให้ลามทั้งระบบยังไง

ชุดคำตอบบท 10 ตรงตัว เรียงเป็นชั้น: (1) **Timeout** สั้นกว่านั้นมาก — งบเวลาตาม p99 ปกติของมัน ไม่ใช่รอ 8 วิ (2) **Bulkhead** — แยก pool ให้เส้นนี้ ช้าก็จมแค่ช่องตัวเอง ไม่ลาก checkout ตาย (3) **Circuit breaker** — ช้าต่อเนื่องเกิน threshold = เปิดวงจร fail fast (4) **Fallback** — cache/default/degrade ตามที่ธุรกิจยอม (5) ถ้า user ไม่ได้รอผลจริงๆ → ตัดเป็น async/queue ไปเลย (เลน "user รอไหม")

ห้ามทำ: เพิ่ม retry ใส่ของที่ช้า (ซ้ำเติมคนป่วย — โหลดคูณสาม)

### 11. ทำไม GC ทำ latency พุ่งได้ทั้งที่ CPU ไม่สูง

**หัวใจ**: GC แบบ stop-the-world **หยุดทุก application thread** ชั่วขณะ — pause 200ms = ทุก request ที่กำลังวิ่งค้าง 200ms พร้อมกัน → p99 พุ่งเป็นหนามแหลม แต่ CPU เฉลี่ยแทบไม่ขยับ (pause คือการ*หยุด* ไม่ใช่การ*ทำงาน*)

วินิจฉัย: เปิด GC log (`-Xlog:gc*`) ดู **pause time** ไม่ใช่ CPU — เทียบ timestamp ของ pause กับ latency spike ตรงกันไหม / อาการเฉพาะตัวของมัน: **p50 นิ่งแต่ p99 กระโดดเป็นหนามแหลม** — คนที่ช้าคือคนที่ request ค้างคา pause พอดี ไม่ใช่ทุกคน (ถ้าช้าทั้งระบบ = สาเหตุอื่น) / สาเหตุ pause ยาว: heap ใหญ่เกินกับ collector ที่ไม่เหมาะ, allocation rate สูง (object ขยะรัวใน hot path), premature promotion (ของหลุดไป old เร็ว → full GC ถี่) — และอย่าลืม safepoint: pause จริง = เวลารอ thread สุดท้ายถึงจุดรวมพล + เวลากวาด (บท 22)

แก้: เลือก collector ตามเป้า — **G1** (default, สมดุล) → **ZGC/Shenandoah** (pause ระดับ ms เมื่อ latency สำคัญจริง), ลด allocation ใน hot path, ปรับ heap ให้เหมาะ (ใหญ่เกิน = pause ยาว, เล็กเกิน = GC ถี่) — กลไกเต็ม: บท 22

### 12. Deploy breaking schema change โดยไม่มี downtime ยังไง

**Expand–Contract** (ตัวเดียวกับที่แก้ Distributed Monolith — บท 14): ห้าม rename/drop ตรงๆ เด็ดขาด เพราะช่วง rolling deploy มีโค้ดสองเวอร์ชันวิ่งพร้อมกันเสมอ

```
ตัวอย่าง: rename คอลัมน์ full_name → display_name
1. Expand:   ADD COLUMN display_name (nullable) — deploy ได้ทันที ไม่มีใครพัง
2. Dual-write: โค้ดเขียนทั้งสองคอลัมน์ + backfill ของเก่าเบื้องหลัง (batch เล็กๆ กัน lock)
3. Migrate read: โค้ดอ่านจาก display_name — ยังเขียนคู่กันอยู่
4. Contract:  หยุดเขียนตัวเก่า → รอบ release ถัดไปค่อย DROP COLUMN
```

ระวังเพิ่ม: ALTER บางชนิด lock ทั้ง table (เช็ค DB ที่ใช้ — Postgres ADD COLUMN nullable เร็ว แต่ ADD NOT NULL + default บางเวอร์ชัน rewrite) — ตารางใหญ่ใช้เครื่องมือ online DDL (gh-ost, pg_repack) / ทุกขั้นต้อง **ถอยได้**: migration กับ code แยก deploy กันเสมอ

### 13. Memory leak ที่โผล่หลังรันไปหลายวัน — investigate ยังไง

**ขั้น 1 — ยืนยันว่า leak จริง**: ดู trend ของ **heap หลัง full GC** (ไม่ใช่ heap ปกติที่ขึ้นๆ ลงๆ เป็นฟันปลา) — ถ้า floor ยกสูงขึ้นเรื่อยๆ ข้ามวัน = leak จริง / ถ้า floor คงที่ = แค่ heap ใหญ่ ไม่ใช่ leak

**ขั้น 2 — จับตัว**: heap dump สองจุดเวลา (ตอนเพิ่ง start กับตอนอาการขึ้น — `jmap` หรือ actuator/heapdump) → เปิดด้วย **Eclipse MAT** ดู dominator tree + เทียบสอง dump ว่า object ตระกูลไหน**โตข้างเดียว**

ผู้ต้องสงสัยประจำ: `static Map`/cache ที่ไม่มี eviction (ใส่อย่างเดียวไม่เคยลบ), `ThreadLocal` ที่ไม่ `remove()` ใน thread pool (thread ไม่ตาย ของเลยไม่ถูกเก็บ), listener/callback ลงทะเบียนแล้วไม่ถอน, unbounded queue ที่ producer เร็วกว่า consumer

กันถาวร: metric + alert บน "heap after full GC" — จับ leak ได้ตั้งแต่วันที่สอง ไม่ใช่รอ OOM วันที่เจ็ด (ทำไมต้องเป็นค่านี้: heap ปกติ = ของเป็น+ศพรอกวาดปนกัน — หลัง full GC คือวินาทีเดียวที่เหลือแต่ของเป็นจริง — บท 22)

### 14. User บ่นว่า fail เป็นพักๆ แต่ log ไม่มี exception เลย — ทำไง

**หัวใจ**: log ว่าง = ความล้มเหลวเกิด**ชั้นที่เราไม่ได้ log** — request ตายก่อนถึงโค้ดเรา หรือหลังออกจากโค้ดเราไปแล้ว

ไล่เป็นชั้น: (1) **เทียบ access log ทุกชั้น** — LB → gateway → app: request id ที่โผล่ชั้นนอกแต่หายชั้นใน = ตายระหว่างทาง (proxy timeout, conn reset, TLS) (2) **client-side timeout** — client ตัดสายก่อน server ตอบเสร็จ: ฝั่ง server "สำเร็จ" ฝั่ง user "fail" — log จะไม่มี error เลยเพราะไม่มีอะไรผิดในมุมเรา (3) **retry ที่กลืน error** — ชั้นไหนสักชั้น retry สำเร็จรอบสอง user เห็นช้า/บาง request หลุด แต่ error รอบแรกไม่ถูก log (4) DNS/connection pool ฝั่ง client, keep-alive หมดอายุชนกับ LB idle timeout (คลาสสิกมาก — connection ถูกปิดข้างเดียว)

เครื่องมือ: **correlation id ต้องวิ่งครบทุกชั้นรวม LB** (บท 11), synthetic probe ยิงสม่ำเสมอจับ pattern เวลา, ดู metric 4xx/5xx/timeout ราย layer แทนรอ exception

**แนวตอบ senior**: *"exception log คือมุมมองของ server เท่านั้น — ผมไล่จาก access log ทุกชั้นหา request ที่หายกลางทาง แล้วส่วนใหญ่เจอ timeout mismatch ระหว่างชั้น"*

## Advanced

### 15. OOM เป็นพักๆ เฉพาะชั่วโมง peak ทั้งที่ heap ดูปกติ — เกิดอะไร

**หัวใจ**: memory ของ JVM process ≠ heap อย่างเดียว — OOM ที่ heap ปกติ = ตัวการอยู่**นอก heap**:

- **Thread stacks** — peak = thread เยอะ (pool โต, request ค้าง) × ~1MB/thread — พันธ์ thread = 1GB ที่ไม่อยู่ใน heap
- **Direct buffer / native memory** — Netty, NIO, บาง serialization ใช้ off-heap — โตตาม traffic
- **Metaspace** (class metadata), JIT code cache
- **Container OOMKilled** — เคสที่เจอบ่อยสุดในโลก K8s: memory limit ตั้งไว้เท่า heap พอดี พอ off-heap โผล่มาตอน peak → kernel ฆ่า process ทิ้ง (exit 137) — ใน log แอปไม่มีอะไรเลยเพราะไม่ใช่ Java OOM!

วินิจฉัย: แยกก่อนว่า **Java OOM หรือ OOMKilled** (dmesg / `kubectl describe pod` ดู reason) → ถ้า native: เปิด `-XX:NativeMemoryTracking=summary` ดูว่าหมวดไหนโต — direct buffer มีกลไกซ่อนตัวพิเศษ: ตัวห่อบน heap จิ๋วมาก GC เลยไม่ตื่นมาเก็บ ทั้งที่ก้อน native ข้างหลังกองเป็น GB (บท 22)

แก้: จำกัด thread pool (bulkhead ช่วยทางอ้อม!), ตั้ง `MaxDirectMemorySize`, container limit ≈ heap × 1.5 — แผนที่ห้อง memory ทุกห้อง: บท 22 เผื่อ off-heap

### 16. Spring Data JPA เกิด deadlock ใน DB — หา root cause และแก้ยังไง

**ขั้นหา**: DB บันทึกคู่กรณีให้เสมอ — Postgres: log "deadlock detected" บอกสอง query + สอง lock ที่รอสลับกัน / MySQL: `SHOW ENGINE INNODB STATUS` — ได้ SQL สองฝั่งมาเลย แล้วค่อย map กลับว่า JPA method ไหน generate (เปิด SQL log ช่วย)

สาเหตุยอดฮิตฝั่ง JPA: (1) **สอง flow update ชุดเดียวกันคนละลำดับ** — flow A แตะ order→stock, flow B แตะ stock→order → รอสลับกัน (2) batch update ที่ไม่ sort (Hibernate flush ตามลำดับที่ persist ไม่ใช่ตาม id) (3) unique index + insert แข่งกัน (gap lock ใน MySQL) (4) FK ทำให้ insert ลูก lock แถวแม่

**ขั้นแก้**: กติกาทองจากบท 7 — **lock ตามลำดับเดียวกันเสมอ** (sort by id ก่อน loop update), ลด scope transaction ให้สั้น, ทำ tx ให้แตะของน้อยลำดับตายตัว + ยอมรับความจริง: deadlock เป็น transient — **retry อัตโนมัติหนึ่งชั้น**สำหรับ deadlock exception เป็นเรื่องถูกต้อง (DB ฆ่าให้ตัวหนึ่งแล้ว อีกตัวไปต่อได้)

### 17. วาง distributed tracing ให้ debug latency ข้าม microservices ได้จริงยังไง

โครงจากบท 11 + ของที่คนพลาด: (1) **OpenTelemetry auto-instrumentation** เป็นฐาน (Java agent — ได้ HTTP/JDBC/Kafka ฟรี) (2) **propagate ข้าม async boundary** — จุดที่ trace ขาดบ่อยสุดคือผ่าน queue: ต้องแนบ `traceparent` ใน message envelope แล้วให้ consumer เปิด span ต่อ (ไม่ใช่แค่ HTTP header) (3) **สองระดับ id**: trace ต่อ hop + correlation id ต่อ business flow — saga ยาวๆ มีหลาย trace ร้อยด้วย correlation (4) sampling มีหัวคิด — 100% แพงเกิน: head sampling อัตราต่ำ + **tail sampling เก็บทุก trace ที่ช้า/error** (ของที่อยาก debug คือตัวที่ผิดปกติ ไม่ใช่ตัวเฉลี่ย) (5) ใช้งานจริง: ดู span breakdown ของ p99 — หา hop ที่อ้วน แล้วเจาะต่อว่าเวลาอยู่ใน DB/external/GC

**ประโยคปิด**: *"tracing ไม่ใช่ของแถม — ระบบที่ไม่มีคือระบบที่ debug ข้าม service ไม่ได้"*

### 18. Feature ใหม่ทำ DB write พุ่ง — optimize โดยไม่แตะ business logic ยังไง

วัดก่อน: write พุ่งจาก**อะไร** — จำนวน statement? แถวต่อ statement? หรือ index ที่ต้องอัพเดตตาม?

คลังท่าเรียงจากถูกไปแพง: (1) **Batch** — รวม INSERT/UPDATE เป็นก้อน (`rewriteBatchedStatements`, JDBC batch — ระวัง JPA ต้องตั้ง `batch_size` + flush เป็นจังหวะ) (2) **ตัด write ที่ไม่เปลี่ยนค่า** — update ที่ set ค่าเดิม DB ก็จ่ายเต็ม (3) **ลด index ที่ไม่ถูกใช้** — ทุก write จ่ายภาษีทุก index (บท 7) — feature ใหม่อาจชนกับ index เก่าที่ไม่มีใครใช้แล้ว (4) **Append แล้วค่อย aggregate** — เปลี่ยน update hot row รัวๆ เป็น insert log แล้ว batch สรุปทีหลัง (หนี lock contention ด้วย) (5) **Buffer ผ่าน queue** — ยอม eventual เขียนเป็นจังหวะ (เลน "user รอไหม") (6) hot counter จริงๆ → Redis + flush ลง DB เป็นรอบ

สังเกต: ทั้งหมดแก้ที่ *วิธีเขียน* ไม่แตะ *สิ่งที่เขียน* — ตรงเงื่อนไขโจทย์

### 19. ออกแบบ rate limiting ที่รับ burst ได้ ทั้ง client ภายในและภายนอก

**Token bucket** คือคำตอบของโจทย์ burst โดยตรง (บท 6): bucket size = burst ที่ยอมให้, refill rate = อัตรายั่งยืน — ต่างจาก fixed window ที่โดน burst ชนขอบหน้าต่าง

แยกนโยบายสองกลุ่ม: **ภายนอก** — เข้มกว่า, key ต่อ API key/user, ตอบ 429 + `Retry-After` ชัดเจน (เป็นสัญญา API) / **ภายใน** — เน้น protect ตัวเอง: load shedding ตาม priority (งาน batch หลบให้ checkout), และฝั่งขาออกเคารพ limit ของคนอื่นด้วย client-side limiter (บท 10)

Distributed: (1) กลาง — Redis + Lua script (เช็ค+หัก token atomic กัน race) — แม่นแต่เพิ่ม latency/จุดตาย (2) local bucket ต่อ instance หาร quota — เร็ว, ยอม approximate (รวมทั้งฝูงอาจเกินนิดตอน scale) — เลือกตามว่า limit นั้นคือ **สัญญาธุรกิจ (ต้องแม่น → กลาง)** หรือ **การป้องกันตัว (ประมาณได้ → local)**

### 20. ใช้ async method แล้ว request ยัง block อยู่ — ทำไม

ญาติของข้อ 1 — ไล่จาก proxy ก่อนเสมอ:

1. **Self-invocation** — `this.asyncMethod()` ไม่ผ่าน proxy → รัน sync เงียบๆ ในคลาสเดียวกัน (สาเหตุอันดับหนึ่ง)
2. **Thread pool ของ @Async เต็ม/ตั้งผิด** — ไม่กำหนด executor: ค่า default บางแบบสร้าง thread ไม่จำกัด (อันตรายอีกทาง) หรือ pool เล็ก + คิวยาว → งานต่อคิว = ดูเหมือน block
3. **เรียกแล้วรอทันที** — `asyncMethod().get()` บรรทัดถัดไป = sync ที่แต่งตัวเป็น async (จ่ายค่า overhead ฟรีด้วย)
4. **Controller ไม่ได้ return แบบ async** — คืน `CompletableFuture`/`DeferredResult` ให้ servlet ปล่อย thread — ถ้า block รอผลใน controller, thread หลักก็ถูกถือเหมือนเดิม
5. ข้างใน async ไปเรียก blocking I/O ที่ช้า — ย้ายที่ block ไม่ได้ทำให้มันหาย แค่ย้ายไป pool อื่น (ซึ่งก็เต็มได้ — bulkhead ต้องตาม)

**แนวตอบ senior**: *"ผมเช็คสามอย่าง: เรียกผ่าน proxy ไหม, executor ไหนรับงานแล้ว pool สภาพเป็นไง, แล้วมีใคร .get() ทันทีหรือเปล่า — เก้าในสิบเจอในสามข้อนี้"*

## ภาคเสริม: 16 ข้อจากการสำรวจสนามจริง (21–36)

> คัดจากคำถามที่วนซ้ำในหลายแหล่ง (Javarevisited, InterviewBit, Hello Interview, บทสัมภาษณ์บริษัท product) — เอาเฉพาะ scenario แท้ที่ไม่ซ้ำ 20 ข้อแรก

### 21. Kafka consumer lag โตทุกคืน หายเองตอนสาย — วินิจฉัยยังไง

**หัวใจ**: lag = produce rate > consume rate — คำถามคือฝั่งไหนเปลี่ยนตอนกลางคืน

ไล่: (1) **producer ฝั่งกลางคืน** — batch job/ETL ตื่นมาดันข้อมูลพร้อมกัน → produce พุ่งเกินกำลัง drain ปกติ (2) **consumer ช้าลงเอง** — DB ทำ maintenance กลางคืน (vacuum, backup) → ทุก record ใช้เวลานานขึ้น: CPU/memory ปกติหมดแต่ **thread รอ ไม่ใช่ทำงาน** (3) ดู **per-partition lag**: lag เกาะ partition เดิมหลัง rebalance = ปัญหาที่ข้อมูล (hot key) / lag ตาม instance = ปัญหาที่เครื่องนั้น (4) เทียบ records-consumed-rate vs records-processed-rate — ช่องว่างคือเวลาที่หายไปหลัง `poll()`

แก้ตามเหตุ: เกลี่ย batch producer (jitter ระดับ job!), เพิ่ม partition+consumer ถ้ากำลังไม่พอจริง, แยกเวลางาน DB maintenance — **"lag หายเองตอนสาย" ไม่ใช่ระบบหาย มันคือหนี้ที่ใช้คืนเสร็จ** — วันที่ volume โตหนี้จะใช้ไม่หมดก่อนคืนถัดไป

### 22. Consumer group เกิด rebalance รัวๆ (rebalance storm) — เพราะอะไร

**หัวใจ**: broker เตะ consumer ออกเพราะคิดว่ามันตาย ทั้งที่มันแค่**ทำงานช้า**

ตัวการอันดับหนึ่ง: process record ชุดหนึ่งนานกว่า `max.poll.interval.ms` (default 5 นาที) → broker ถือว่า consumer ค้าง → เตะออก → rebalance → consumer กลับมา join → ได้งานเดิม → ช้าอีก → เตะอีก — **วนเป็น storm ที่ไม่มีใครได้ process อะไรเลย** / เหตุอื่น: GC pause ยาวเกิน session timeout, rolling deploy ที่ instance เข้าๆ ออกๆ, poll แล้วหอบ record มากเกิน (`max.poll.records` สูง × เวลาต่อ record)

แก้: ลด `max.poll.records` ให้รอบ poll จบไว, งานหนักโยนเข้า worker แยกแล้ว commit ตามหลัง, ปรับ interval ให้ตรงความจริงของงาน, ใช้ cooperative rebalancing (incremental) ลดการหยุดทั้งฝูง — สังเกต: นี่คือ liveness ปลอมอีกร่าง — "ช้า" ถูกอ่านเป็น "ตาย" (ญาติข้อ 6)

### 23. ต้อง process event ของ order เดียวกันตามลำดับ แต่อยาก scale consumer — ทำยังไง

**หัวใจ**: Kafka การันตีลำดับ**ภายใน partition เท่านั้น** → ตั้ง **partition key = order id** — ทุก event ของ order เดียวกันลง partition เดียว → consumer ตัวเดียว process ตามลำดับเสมอ ส่วน order ต่างกันกระจายขนานกันเต็มที่

จุดที่ต้องพูดต่อ: (1) scale ได้สูงสุด = จำนวน partition — วางแผนเผื่อแต่แรกเพราะเพิ่ม partition ทีหลัง**ทำลายการ mapping key เดิม** (order เดิมย้าย partition — ลำดับขาดช่วงชั่วคราว) (2) hot key: ลูกค้า/order ที่ event ถี่ผิดปกติทำ partition เอียง (3) consumer ฝั่งรับยังต้องทน out-of-order ข้าม key อยู่ดี + dedupe เพราะ redelivery ไม่เลือกจังหวะ

**แนวตอบ senior**: *"ordering เป็นของแพง — ผมจำกัดขอบเขตมันให้แคบสุด: ต่อ aggregate เดียว (key) ไม่ใช่ทั้ง topic แล้วออกแบบ consumer ให้ทนลำดับเพี้ยนข้าม aggregate"*

### 24. Poison message ทำ consumer ตาย-เกิด-ตายวนลูป — หยุดยังไง

อาการ: message พังตัวเดียว → consumer โยน exception → ไม่ ack → broker ส่งตัวเดิมกลับมา → พังอีก → **ทั้ง partition ถูกอุดด้วย message ตัวเดียว** และ consumer restart วนจน alert ดังทั้งคืน

แก้เป็นชั้น (บท 11): (1) แยกชนิด error — parse/schema พัง = **เข้า Dead Letter Queue (DLQ) ทันที ไม่ retry** (2) transient = retry จำกัดครั้ง + backoff (retry topic 5m/30m) (3) เพดานสุดท้าย: นับ attempt ต่อ message (header) เกิน N → DLQ เสมอไม่ว่า error อะไร — กัน "error ชนิดใหม่ที่เราแยกผิด" (4) **catch ให้ครอบใน handler** — exception ที่หลุดจาก handler ไปฆ่า consumer ทั้งตัว = แปลง bug หนึ่ง message เป็น outage ทั้ง partition

### 25. Query เร็วใน staging แต่ช้าใน production — เพราะอะไร

**หัวใจ**: staging ไม่ใช่ production ย่อส่วน — มันคือคนละโลกที่หน้าตาเหมือนกัน

ไล่: (1) **data volume** — 10K แถว vs 50M แถว: plan ที่ seq scan ถูกกว่า index ใน staging กลายเป็นหายนะใน prod (2) **statistics เก่า** — planner ตัดสินจาก stats: ตารางที่เพิ่งโตเร็ว stats ตามไม่ทัน → plan โง่ (`ANALYZE` ช่วย) (3) **parameter sniffing / plan cache** — plan ที่ดีสำหรับค่า parameter หนึ่งอาจแย่กับอีกค่า (customer ที่มี 3 orders vs 300K orders) (4) **concurrency** — staging ไม่มีใครแย่ง lock/buffer pool/IO (5) cold vs warm cache

**แนวตอบ senior**: *"ผมขอ `EXPLAIN ANALYZE` จาก prod จริง (ไม่ใช่ staging — plan คนละตัวกัน) เทียบกัน แล้วส่วนใหญ่จบที่ volume ทำให้ planner เลือกคนละทาง"* — และวิธีกัน: staging ต้องมีข้อมูลระดับใกล้จริง อย่างน้อยในตารางหลัก

### 26. User กดบันทึกแล้ว refresh — ข้อมูลตัวเองหาย (แต่สักพักกลับมา) — เกิดอะไร

**หัวใจ**: เขียนลง primary แต่**อ่านจาก read replica ที่ lag** — คลาสสิกของ replication: replica ตามหลัง primary เป็น ms ถึงวินาที user เลยอ่านอดีตของตัวเอง

นี่คือปัญหา **read-your-writes consistency** — ทางแก้เรียงตามต้นทุน: (1) **sticky หลังเขียน**: session ที่เพิ่งเขียน อ่านจาก primary ต่ออีก N วินาที (flag ใน session/cookie + timestamp) (2) route ตาม endpoint: หน้า "ของฉัน" อ่าน primary, หน้า feed/report อ่าน replica (3) เช็ค replication lag ก่อน route — lag เกิน threshold ส่งเข้า primary (4) ฝั่ง UI ช่วยได้: optimistic update (แสดงของที่เพิ่งบันทึกจาก memory ไม่ต้องอ่านกลับ)

**แนวตอบ senior**: *"replica คือการยอมแลก consistency กับ read scale — ผมแลกเฉพาะจุดที่ stale ได้ (feed, report) และกันจุดที่แลกไม่ได้ (read-your-writes) ด้วย sticky-after-write"*

### 27. ต้อง backfill/แปลงข้อมูลตารางใหญ่ที่ production ใช้งานอยู่ — ทำยังไงไม่ให้ล้ม

กติกา: **ห้าม UPDATE ทั้งตารางใน statement เดียว** — lock มหาศาล + WAL บวม + replica lag พุ่ง + vacuum ตามเช็ดไม่ทัน

ท่ามาตรฐาน: (1) **batch เล็ก** — `UPDATE ... WHERE id BETWEEN ? AND ?` ครั้งละ 1–10K แถว (2) **หายใจระหว่าง batch** — sleep เล็กน้อย + ดู replication lag เป็น feedback (lag ขึ้น = ชะลอ) (3) เดินด้วย **job ที่ resume ได้** — จดตำแหน่งล่าสุดลง table (คุ้นไหมครับ — มันคือ relay/sweeper อีกร่าง: กวาดทีละก้อน จดความคืบหน้า ตายแล้วเดินต่อได้) (4) ทำนอก peak + มี kill switch (5) ตรวจผลด้วย count/checksum ก่อนสลับไปใช้

โยงข้อ 12: backfill คือขั้นตอนกลางของ expand–contract เสมอ — สองข้อนี้ตอบคู่กันได้

### 28. Hot key ใน cache หมดอายุ แล้ว DB โดนถล่มทันที (cache stampede) — กันยังไง

อาการ: key ยอดฮิต (หน้าแรก, config กลาง) หมด TTL วินาทีเดียว → request 5,000 ตัวที่ miss พร้อมกัน**ทุกตัววิ่งไปคำนวณ/query เอง** → DB รับ 5,000 query ของสิ่งเดียวกัน

สามท่ากัน: (1) **Single-flight / lock**: คนแรกที่ miss ได้สิทธิ์ไปเติม คนอื่นรอผลตัวเดียวกัน (mutex ต่อ key — ใน process ใช้ Caffeine ทำให้ฟรี, ข้าม instance ใช้ Redis `SET NX`) (2) **Stale-while-revalidate**: เสิร์ฟของเก่าไปก่อนระหว่าง refresh เบื้องหลัง — user ได้ของ stale 2 วิ ดีกว่า DB ตาย (3) **TTL + jitter**: กันหมดอายุพร้อมกันเป็นฝูง (ญาติ jitter ของ retry — บท 10)

**แนวตอบ senior**: *"cache ที่ดีไม่ใช่แค่ hit สูง แต่ต้องออกแบบว่า 'ตอน miss พร้อมกัน' เกิดอะไร — ผมใช้ single-flight เป็น default กับ key ที่คำนวณแพง"*

### 29. Update ข้อมูลแล้ว cache ยังเสิร์ฟของเก่า — วาง invalidation ยังไงให้ถูก

ตัวเลือกเรียงจากง่ายไปแม่น: (1) **TTL สั้น** — ยอม stale ตามอายุ: ง่ายสุด พลาดยากสุด เหมาะข้อมูลที่ tolerate ได้ (2) **Delete-on-write**: เขียน DB สำเร็จ → ลบ key (ลบ ไม่ใช่ set — ให้คนอ่านถัดไปเติมจากของจริง กัน race ที่ set ค่าเก่าทับ) (3) event-driven: ฟัง event แล้วลบ — ข้าม service ได้

กับดักที่ต้องเล่า: **"ลบ cache + เขียน DB" คือ dual-write ย่อมๆ** — ลบก่อนเขียน: ช่องว่างให้คนอ่านเติมของเก่ากลับ / เขียนก่อนลบ: crash ระหว่างกลาง cache ค้างของเก่าจน TTL — เพราะงั้น **TTL ต้องมีเสมอเป็นตาข่ายล่าง** ต่อให้มี invalidation แม่นแค่ไหน (ของเน่าต้องมีวันหมดอายุ ไม่ใช่อมตะ) + อย่าลืมประโยคคลาสสิก: *"There are only two hard things in CS: cache invalidation and naming things"* — interviewer ยิ้มแน่นอน

### 30. Pod ถูก kill ระหว่าง deploy แล้วงานหาย/request ขาด — graceful shutdown ทำยังไง

ไทม์ไลน์ที่ถูก: SIGTERM → **หยุดรับงานใหม่** (readiness = false ให้ LB หยุดส่ง, consumer หยุด poll) → **ปล่อยงานเก่าวิ่งจนจบ** (in-flight requests, message ที่กำลัง process) → commit/ack ให้เรียบร้อย → ค่อยดับ — ถ้าเกิน grace period (K8s default 30 วิ) โดน SIGKILL ทุกกรณี

จุดพลาดบ่อย: (1) app จับ SIGTERM แต่ LB ยังส่ง request มาต่อ (readiness ต้องดับ**ก่อน** + `preStop` sleep สั้นๆ รอ LB รับรู้) (2) grace period สั้นกว่างานที่ยาวสุด → งานถูกฆ่ากลางคัน — ตั้ง `terminationGracePeriodSeconds` ตามงานจริง (3) Kafka consumer ไม่ปิดสวย → ไม่ commit offset → งาน replay ซ้ำทั้งชุด (idempotency ช่วยรับ แต่ไม่ควรพึ่งเป็นทางหลัก)

โยงของเดิม: งานที่ห้ามหายจริงๆ ไม่ควรพึ่ง graceful shutdown เลย — มันอยู่ใน **DB/queue ที่ทนตาย** (outbox, job table) ตั้งแต่แรก: shutdown สวยคือ optimization, ความทนตายคือ guarantee — คู่เดิมอีกแล้ว

### 31. Blue-green vs Rolling vs Canary — เลือกยังไง

| | Rolling | Blue-Green | Canary |
|---|---|---|---|
| วิธี | ทยอยแทนทีละ instance | ยกสภาพแวดล้อมใหม่ทั้งชุด สลับ traffic ทีเดียว | ปล่อยเวอร์ชันใหม่รับ traffic น้อยๆ (1–5%) แล้วค่อยขยาย |
| Rollback | ช้า (ทยอยกลับ) | **เร็วสุด — สลับกลับทันที** | เร็ว (ตัด % ทิ้ง) |
| ต้นทุน | ถูกสุด (K8s default ฟรี) | แพงสุด (x2 ทรัพยากรชั่วคราว) | กลาง + ต้องมี metric เปรียบเทียบ |
| เหมาะกับ | service ทั่วไป เปลี่ยนแปลงเสี่ยงต่ำ | release ใหญ่ที่อยาก rollback ทั้งก้อนได้ | การเปลี่ยนแปลงเสี่ยงสูง อยากเห็นพฤติกรรมจริงก่อน |

สองประเด็นที่ต้องพูดถึงจะครบ: (1) **ทุกแบบมีช่วงสองเวอร์ชันวิ่งพร้อมกัน** (แม้ blue-green — ตอนสลับมี request ค้างฝั่งเก่า) → DB schema ต้อง compatible เสมอ = expand–contract ไม่ใช่ทางเลือกแต่เป็นข้อบังคับ (2) canary ต้องมี **เกณฑ์อัตโนมัติ** (error rate/p99 ของกลุ่ม canary เทียบ baseline) ไม่ใช่ "ดูๆ ไปก่อน" — ไม่มีเกณฑ์ = ไม่มี canary มีแค่ deploy ช้า

### 32. ต้องแก้ API แบบ breaking แต่ mobile client เก่าบังคับ update ไม่ได้ — ทำยังไง

หลัก: **API ที่ปล่อยแล้วคือสัญญาตลอดชีพของ client เก่าตัวสุดท้าย** — mobile คือเคสที่โหดสุดเพราะ user บาง% ไม่ update เป็นปี

ท่า: (1) **Versioning** — `/v2/orders` วิ่งคู่ `/v1` — v1 กลายเป็น facade บางๆ ที่แปลงเข้าตรรกะใหม่ (อย่า fork logic สองชุด — แปลงที่ขอบ) (2) **Additive-only ก่อนเสมอ**: เพิ่ม field ใหม่ / endpoint ใหม่ ไม่แตะของเดิม — เลื่อน breaking ออกไปได้บ่อยกว่าที่คิด (3) วางแผน sunset จริงจัง: metric การใช้ v1 รายเวอร์ชัน client, force-update policy ในแอป (ขั้นต่ำที่รองรับ), `Sunset`/`Deprecation` header แจ้งล่วงหน้า (4) ฝั่งเรา: **tolerant reader + contract test** กันตัวเองทำ v1 พังโดยไม่รู้ตัว

**แนวตอบ senior**: *"ผม treat API version เป็น product ที่มีวันเกิดวันตาย — เพิ่มแบบ additive จนกว่าจะเลี่ยงไม่ได้, v ใหม่เป็นชั้นแปลงไม่ใช่ fork, และ sunset ด้วยข้อมูลการใช้จริงไม่ใช่ความรำคาญ"*

### 33. ต้องส่ง webhook ให้ partner ภายนอก — ออกแบบให้เชื่อถือได้ยังไง

นี่คือ outbox pattern เต็มร่างในโจทย์ใหม่: (1) **จดก่อนส่ง** — event ลง outbox ใน tx เดียวกับงาน → worker ส่ง → partner ตอบ 2xx ค่อย mark (2) **Retry + backoff + เพดาน** — partner ล่มเป็นวันได้ → retry ห่างขึ้นเรื่อยๆ สูงสุดหลายชั่วโมง เกินแล้วพัก + alert + dashboard ให้ partner ดูเอง (3) **ฝั่งรับต้อง dedupe ได้** — แนบ `event_id` + เอกสารบอกชัดว่า "เราส่งซ้ำได้ จง idempotent" (at-least-once เป็นสัญญา ไม่ใช่บั๊ก) (4) **ลายเซ็น HMAC (Hash-based Message Authentication Code)** — partner ตรวจว่ามาจากเราจริง + timestamp กัน replay (5) ลำดับไม่การันตี — ใส่ sequence/occurred_at ให้เขาเรียงเอง

ครบวงจรที่คุ้นเคย: outbox + retry + DLQ + idempotency + HMAC — ไม่มีของใหม่สักชิ้น แค่ย้ายเวทีไปข้ามองค์กร (ซึ่งทำให้ทุกข้อ*จำเป็นขึ้น* เพราะคุยกับระบบที่เราคุมไม่ได้เลย)

### 34. Distributed lock ด้วย Redis — ใช้ได้ไหม มีกับดักอะไร

ท่าพื้น: `SET lock:job1 <token> NX EX 30` — atomic ได้ lock พร้อมวันหมดอายุ (กันคนถือ lock ตายแล้ว lock ค้างชั่วนิรันดร์)

กับดักที่แยกระดับผู้สมัคร: (1) **ปล่อย lock ของคนอื่น** — งานเสร็จช้ากว่า TTL → lock หลุดไปมือคนอื่นแล้ว → คุณกลับมา DEL ทิ้ง = ปล่อย lock ของเขา → ต้องเก็บ token สุ่มแล้วลบแบบ "ลบเฉพาะถ้ายังเป็นของฉัน" (Lua script atomic) (2) **หมดอายุกลางงาน** — GC pause/งานช้าเกิน TTL → สองคนทำงานพร้อมกันโดยต่างคนต่างมั่นใจว่าถือ lock — ทางแก้จริงคือ **fencing token**: เลขที่เพิ่มขึ้นเรื่อยๆ แนบไปกับงาน ให้ปลายทาง (DB/storage) ปฏิเสธ token เก่า — สังเกต: นี่คือ optimistic version check นั่นเอง! (3) Redis failover — lock อาจหายตอนสลับ master (Redlock เป็นที่ถกเถียง — Kleppmann vs antirez เอ่ยชื่อได้คือแต้ม)

**แนวตอบ senior**: *"ถ้ามี DB อยู่แล้ว ผมใช้ lock ใน DB ก่อน (`FOR UPDATE SKIP LOCKED`, ShedLock) — ไม่เพิ่มระบบ ไม่มี dual-source-of-truth / Redis lock เมื่อถี่มากจน DB ไม่ควรรับ และงานปลายทางต้องรองรับ fencing เสมอ เพราะ lock ที่พึ่ง TTL ล้วนหมดอายุกลางงานได้"*

### 35. สร้าง unique ID ข้ามหลาย service/instance ยังไง — ทำไมไม่ใช้ auto-increment

ทำไม auto-increment ไม่พอ: ผูกกับ DB เดียว (insert ต้องถึง DB ก่อนถึงรู้ id — สร้าง offline/ก่อน commit ไม่ได้, แตก shard แล้วชนกัน) + เดาได้ (security: ไล่ URL ดูของคนอื่น — Insecure Direct Object Reference (IDOR) ง่ายขึ้น) + โชว์ volume ธุรกิจให้คู่แข่ง

ตัวเลือก: (1) **UUIDv4** — ง่าย ไม่ต้องประสานใคร / ข้อเสียคลาสสิก: random ล้วน → เป็น PK แล้ว index B+Tree แตกกระจาย (insert ไม่เรียงลำดับ = page split รัว) (2) **UUIDv7 / ULID** — ขึ้นต้นด้วย timestamp: **เรียงตามเวลาได้ + index friendly** — default ที่ดีสุดยุคนี้ (3) **Snowflake-style** — timestamp + machine id + sequence: สั้นกว่า (64 bit), throughput สูง / จ่ายด้วยการต้องแจก machine id + ไวต่อ clock ผิด (4) DB sequence แบบจองเป็นช่วง (block allocation) — กลางๆ เหมาะ monolith ที่กำลังแตกตัว

**แนวตอบ senior**: *"default ผมคือ UUIDv7 — ได้ความอิสระของ UUID โดยไม่จ่ายค่า index กระจาย / Snowflake เมื่อ id สั้นและ throughput สำคัญจริง / และไม่เอา id เดาได้ไปโชว์ใน URL ไม่ว่าเลือกแบบไหน"*

### 36. กันสถานะย้อนกลับผิดกติกา (CANCELLED กลับไป DRAFT) — ต้องมี status flow table ใน DB ไหม

**หัวใจ**: transition คือ**กติกาธุรกิจ** — บ้าน default ของมันคือ domain code ไม่ใช่ table — สามชั้น:

```java
// ชั้น 1 — state machine ใน enum: กติกาทั้งหมดในที่เดียว, pure, เทสได้ไม่ต้อง mock
private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED = Map.of(
    DRAFT,     Set.of(CONFIRMED, CANCELLED),
    PAID,      Set.of(SHIPPED, REFUNDED),
    CANCELLED, Set.of());              // terminal = Set ว่าง — จบในบรรทัดเดียว
// entity มีประตูเดียว: order.cancel() → transitionTo() เช็คแล้วโยน InvalidStateTransition
// ห้ามมี setStatus public (rich domain — บท 14)
```

```sql
-- ชั้น 2 — conditional update กัน race: เช็คในโค้ดอย่างเดียวมี TOCTOU (Time-Of-Check to Time-Of-Use)
-- (สอง request อ่านสถานะเดิมพร้อมกัน เช็คผ่านทั้งคู่ แล้วเขียนทับกัน)
UPDATE orders SET status='CANCELLED' WHERE id=? AND status IN ('DRAFT','CONFIRMED');
-- affected rows = 0 → conflict — โค้ดเป็นเจ้าของกติกา / DB เป็นผู้บังคับใช้วินาทีสุดท้าย
```

**ชั้น 3 — flow table ใน DB: เฉพาะเมื่อ transition เป็น configuration จริง** — flow เปลี่ยนถี่ตาม stakeholder / หลาย tenant มี flow ต่างกัน / business ต้องแก้เองโดยไม่ deploy — เป็นการแลกที่ชอบธรรม (จ่าย type-safety ซื้อ agility) **แต่ต้องสร้างรั้วทดแทนของที่เสียไป**: admin UI ที่ validate graph ก่อน save + audit log, config มี version + จังหวะมีผลชัดเจน, และเส้นศักดิ์สิทธิ์: **table ตอบแค่ "ไปได้ไหม" — side effect ของ transition (คืน stock, refund) ยังอยู่ในโค้ดเสมอ** (วันที่ table มีคอลัมน์ action_script = กำลังสร้าง programming language ใน database) — โตกว่านั้น (branching, approval, SLA ต่อ step) → workflow engine สำเร็จรูปก่อนต่อเติมเอง

สังเกตด้วยว่า "ไม่อยาก deploy บ่อย" อาจเป็นอาการของ pipeline ที่แพง — บางที flow table คือยารักษาอาการขององค์กร ไม่ใช่ของระบบ — มุมนี้พูดใน interview ได้คะแนนพิเศษ

## สามกลุ่มความรู้ที่ควรเก็บเพิ่ม (นอกเนื้อหาหลักของเล่ม)

1. **Spring proxy mechanics** (ข้อ 1, 20) — `@Transactional`/`@Async`/`@Cacheable` ล้วนเป็น proxy: self-invocation คือกับดักร่วม — เข้าใจครั้งเดียวตอบได้สามคำถาม
2. **JVM operations** (ข้อ 11, 13, 15) — GC pause vs CPU, heap dump + MAT, native memory + container limit — คือช่องว่างระหว่าง "เขียน Java ได้" กับ "ดูแล Java ใน production ได้"
3. **Cache operations** (ข้อ 9) — key versioning ตอน deploy, TTL jitter, stampede protection — cache คือ distributed system ย่อมๆ ที่คนชอบลืมว่าต้อง operate

สังเกตสุดท้าย: 14 จาก 20 ข้อตอบได้จากเนื้อหาบท 5–11 ของเล่มนี้ — คำถาม production "ลึก" ส่วนใหญ่คือหลักการเดิม (pool, lock, idempotency, timeout, tx boundary) สวมชุด incident — จับหลักได้ ข้อที่ไม่เคยเห็นก็ไล่จากหลักเดียวกัน

## สรุปท้ายบท

- production question ที่ดีไม่ได้ต้องการคนตอบเร็วที่สุด แต่มองหาคนที่ไล่ปัญหาเป็นลำดับและไม่เดาสุ่ม
- incident ส่วนใหญ่ในภาคผนวกนี้ย้อนกลับไปหาหลักการเดิมในเล่มหลักได้ แปลว่าความรู้ production ที่ดูซับซ้อนมักมีรากฐานไม่กี่ชุด
- การซ้อมคำถามลักษณะนี้จึงควรซ้อมวิธีวิเคราะห์ ไม่ใช่ซ้อมจำเฉลยเป็นรายข้อ
- ถ้าใช้ภาคผนวกนี้ถูก คุณจะเริ่มเปลี่ยนจากคนที่ "เคยเห็นปัญหา" ไปเป็นคนที่ "มีโครงคิดกับปัญหาใหม่"

## ก่อนไปบทเสริม

บางคำถามในภาคผนวก โดยเฉพาะสาย Java จะพาไปชนกำแพงของ runtime โดยตรง บทเสริมถัดไปจึงลงไปที่ JVM เพื่อปิดช่องว่างระหว่างการเขียน Java ได้กับการดูแล Java ใน production ได้
