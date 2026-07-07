# บทที่ 7 — Database, Transaction, Performance

> หมวดที่ interviewer ชอบที่สุดสำหรับวัด senior — เพราะมันแยก "คนที่ Object-Relational Mapping (ORM) ทำให้ทุกอย่าง" ออกจาก "คนที่รู้ว่าใต้ ORM เกิดอะไร"

## เข็มทิศก่อนอ่าน

บทนี้เป็นชั้นใต้ดินของระบบ backend จำนวนมาก ต่อให้ architecture สวยแค่ไหน ถ้าไม่เข้าใจ index, transaction, lock และ query plan ระบบก็ยังช้า ผิด หรือพังพร้อมกันได้อยู่ดี นี่จึงเป็นบทที่วัดทั้งความลึกเชิงเทคนิคและความสามารถในการไล่สาเหตุของปัญหาจริง

ให้อ่านด้วยมุมว่า database ไม่ใช่แค่ที่เก็บข้อมูล แต่เป็นเครื่องมือที่มีกฎของตัวเอง และกฎเหล่านั้นมักชนะ abstraction ชั้นบนเสมอเมื่อถึงเวลา debug production

## Index ทำงานยังไง

Index ส่วนใหญ่คือ **B+Tree**: โครงสร้างที่ทำให้หา row จาก key ได้ใน O(log n) แทนการ scan ทั้ง table — เหมือนสารบัญหนังสือ แลกกับ: **ทุก write ต้องอัพเดต index ทุกตัว** และกินพื้นที่เพิ่ม

สิ่งที่ต้องตอบได้เกิน "ทำให้ query เร็ว":

- **Composite index ใช้จากซ้ายไปขวา**: index `(customer_id, created_at)` ช่วย `WHERE customer_id=? AND created_at>?` และ `WHERE customer_id=?` แต่ **ไม่ช่วย** `WHERE created_at>?` เดี่ยวๆ — เรียงคอลัมน์ตาม query จริง ไม่ใช่ตามลำดับใน table
- **Index ไม่ถูกใช้เมื่อ**: ครอบ function บนคอลัมน์ (`WHERE LOWER(email)=?` — ต้องใช้ functional index), leading wildcard (`LIKE '%abc'`), type ไม่ตรง, หรือ selectivity ต่ำ (คอลัมน์ `status` ที่มี 3 ค่า — planner อาจเลือก scan ถูกกว่า)
- **Covering index**: ถ้า index มีทุกคอลัมน์ที่ query ต้องใช้ DB ไม่ต้องแตะ table เลย — ท่า optimize อ่านหนักที่คุ้มสุด
- เครื่องมือเดียวที่ต้องใช้เป็น: `EXPLAIN ANALYZE` — "ผมไม่เดา ผมดู plan" คือประโยคที่ interviewer อยากได้ยิน

## N+1 Query

Query 1 ครั้งเอา list มา แล้ว loop ยิงอีก N ครั้งต่อ item — ฆาตกร performance อันดับหนึ่งของ ORM

```java
List<Order> orders = orderRepository.findTop100();     // 1 query
for (Order o : orders) {
    log.info(o.getCustomer().getName());               // lazy load → อีก 100 queries!
}
```

ทำไมหลุดถึง production บ่อย: ตอน dev มีข้อมูล 5 แถว (6 query — ไม่รู้สึก), production มี 10,000 แถว
ทางแก้: eager loading (`joinedload`/`selectinload` ใน SQLAlchemy, `JOIN FETCH` / `@EntityGraph` ใน JPA, preload ใน Go คือเขียน JOIN เองซึ่งทำให้มองเห็นปัญหาตั้งแต่แรก) หรือ batch query
วิธีกันเชิงระบบ: log query count ต่อ request ใน dev แล้ว alert เมื่อเกิน threshold — ไม่ใช่รอ DBA มาบ่น

## Transaction และ ACID

Transaction = กลุ่ม operation ที่ **สำเร็จทั้งหมดหรือไม่เกิดเลย** (ตัดเงิน + เพิ่มเงิน ต้องไปด้วยกัน)

- **A — Atomicity**: ทั้งก้อนหรือไม่เลย (rollback เมื่อ fail)
- **C — Consistency**: จบ transaction แล้ว constraint/invariant ยังจริง
- **I — Isolation**: transaction พร้อมกันไม่เห็นข้อมูลครึ่งๆ กลางๆ ของกัน — *มีระดับ ดูหัวข้อถัดไป*
- **D — Durability**: commit แล้วไฟดับก็ไม่หาย (WAL — Write-Ahead Log: จดการเปลี่ยนแปลงลง log บน disk ก่อนค่อยแก้ data จริง + fsync)

โยงบท 5: transaction boundary = use case, ห้ามมี external call ข้างใน — และโยงบท 11: **ACID จบที่ขอบ database เดียว** ข้าม service ไม่มี ACID ให้ใช้ ต้องเป็น Saga

## Isolation Levels — แต่ละระดับปล่อยปัญหาอะไรผ่าน

| ระดับ | Dirty Read | Non-repeatable Read | Phantom Read |
|---|---|---|---|
| Read Uncommitted | ❌ เกิดได้ | ❌ | ❌ |
| Read Committed (default: Postgres, Oracle) | ✅ กัน | ❌ | ❌ |
| Repeatable Read (default: MySQL/InnoDB) | ✅ | ✅ | ❌ (InnoDB กันได้เกือบหมดด้วย gap lock) |
| Serializable | ✅ | ✅ | ✅ (แลกกับ throughput + ต้อง retry) |

แปลเป็นภาษาคน: dirty read = เห็นของที่ยังไม่ commit · non-repeatable = อ่านซ้ำในทรานแซกชันเดียวได้ค่าไม่เหมือนเดิม · phantom = นับแถวซ้ำได้จำนวนไม่เท่าเดิม

แนวตอบ senior: บอกได้ว่า **default ของ DB ที่ใช้อยู่คืออะไร** และบั๊กแบบไหนที่ default นั้นไม่กัน — คลาสสิกสุดคือ **lost update ที่ Read Committed ไม่ป้องกัน**: สอง request อ่าน stock=1 พร้อมกัน ต่างคนต่างเช็คผ่าน ต่างคนต่าง UPDATE → ขายเกิน stock ซึ่งนำไปสู่หัวข้อถัดไป

## Optimistic vs Pessimistic Locking

นิยาม lost update ให้เป๊ะก่อน: ไม่ใช่ "ข้อมูลหาย" แบบ disk พัง — คือ **read-modify-write สองสายเขียนทับกันเงียบๆ**: ทั้งคู่ commit สำเร็จ ไม่มี error แต่ผลของคนแรกระเหย — ความเงียบนี่แหละที่อันตราย

**ท่าที่ศูนย์ — ก่อนถึง lock ทั้งสองแบบ**: ถ้า logic ง่ายพอ ให้ DB คิดเองใน statement เดียว:

```sql
UPDATE stock SET qty = qty - 1 WHERE sku='A1' AND qty >= 1;
-- affected rows = 0 → ของหมด — ไม่มีช่วงอ่าน-คิด-เขียนให้ใครแทรกตั้งแต่แรก
```

ไม่ต้อง lock ไม่ต้อง version — คำตอบที่ senior กว่าเพราะแก้ที่การออกแบบ ไม่ใช่เพิ่มกลไก; ใช้ไม่ได้เมื่อ logic ต้องคิดใน app → ค่อยเลือกสองท่าถัดไป

**Pessimistic** — lock ก่อนทำ: `SELECT ... FOR UPDATE` แถวนั้นถูกจองจนกว่าจะ commit

```sql
BEGIN;
SELECT qty FROM stock WHERE sku='A1' FOR UPDATE;  -- คนอื่นที่จะ lock แถวนี้ต้องรอ
UPDATE stock SET qty = qty - 1 WHERE sku='A1';
COMMIT;
```

กติกาเหล็ก: `FOR UPDATE` **ต้องอยู่ใน transaction** — lock ปลดตอน COMMIT/ROLLBACK; ยิงใน autocommit = SELECT จบปุ๊บ lock ปลดทันที คุ้มครองเป็นศูนย์ (JPA ถึงกับโยน `TransactionRequiredException` ถ้าไม่มี tx เปิดอยู่)

**Optimistic** — ไม่ lock แต่ตรวจตอนเขียนว่ามีใครแก้ตัดหน้าไหม (version column):

```sql
UPDATE stock SET qty = qty - 1, version = version + 1
WHERE sku='A1' AND version = :version_ที่อ่านมา;
-- affected rows = 0 → มีคนตัดหน้า → โยน conflict ให้ caller ตัดสินใจ (retry / แจ้ง user)
```

รายละเอียดที่วัดความแม่น:

- Version เช็คด้วย `=` เท่านั้น — มันคือ**ลายนิ้วมือของ snapshot ที่ใช้ตัดสินใจ**: "แถวยังเป็นสภาพที่ฉันเห็นตอนอ่านไหม" ไม่ตรง = ห้ามเขียน ทุกกรณี (`<=` คือเปิดประตูให้เขียนทับสภาพที่ไม่เคยเห็น)
- **จุดคุ้มครองอยู่คนละปลาย** ของ read-modify-write: pessimistic ปิดประตูตั้งแต่ read — ทั้งช่วงปลอดภัย แลกกับคนอื่นรอ / optimistic ตรวจจุดเดียวตอน write — ฟรีจนกว่าจะชน แลกกับงานทิ้ง+retry
- **อายุต่างกัน**: pessimistic อายุเท่า transaction — ถือข้าม "user เปิดฟอร์มแล้วไปชงกาแฟ 5 นาที" ไม่ได้ (= ถือ connection ค้าง 5 นาที) / optimistic ข้าม request ได้: อ่าน version มา ปิด connection, user คิดนานแค่ไหนก็ได้ ค่อยเช็คตอน submit — ฟอร์มแก้ไขข้อมูลจึงเหลือ optimistic ทางเดียวโดยปริยาย
- **ข้อเสียระบาดคนละทิศ**: pessimistic เจ็บที่*คนอื่น* (คิวรอ, pool exhaustion — บาปหนักสุด: ถือ lock แล้วเรียก external API) / optimistic เจ็บที่*ตัวเอง* (งานที่คิดมาทิ้งฟรี, retry storm ถ้าชนบ่อย) — และ affected rows = 0 ไม่ใช่ข้อเสีย มันคือฟีเจอร์ที่จับคนตัดหน้าได้ ข้อเสียจริงคือ logic รับมือ conflict ที่ต้องเขียนเอง (ลืมเช็ค = lost update กลับมาเงียบๆ)

เกณฑ์เลือก: **ชนบ่อยแค่ไหน + ราคาของการ retry**

- ชนบ่อย (flash sale, ตัด stock ตัวเดียวกันรัวๆ) → pessimistic: retry รัวๆ แพงกว่ารอ lock
- ชนนานๆ ครั้ง (user แก้โปรไฟล์ตัวเอง, งาน back-office) → optimistic: ไม่มีต้นทุน lock, scale ดีกว่า
- Pessimistic มีของแถมต้องระวัง: **deadlock** — สอง transaction lock คนละแถวแล้วรอสลับกัน วิธีกัน: lock ตามลำดับเดียวกันเสมอ (เช่น sort by id ก่อน lock)
- JPA: `@Version` = optimistic สำเร็จรูป · SQLAlchemy: `version_id_col` · Go: เขียน `WHERE version=?` เองตรงๆ

## Pagination: Offset vs Cursor

**Offset** (`LIMIT 20 OFFSET 10000`):

- อ่านง่าย กระโดดไปหน้า 47 ได้
- แต่ DB ต้อง **อ่านแล้วทิ้ง 10,000 แถว** — ยิ่งหน้าลึกยิ่งช้าแบบ linear และถ้ามีแถว insert/delete ระหว่างเปลี่ยนหน้า จะเห็นซ้ำ/ข้ามแถว

**Cursor / Keyset** (`WHERE (created_at, id) < (:last_seen_at, :last_seen_id) ORDER BY created_at DESC, id DESC LIMIT 20`):

- เร็วคงที่ทุกหน้า (วิ่งตาม index), ผลลัพธ์นิ่งต่อ concurrent write → เหมาะกับ infinite scroll, API, ตารางใหญ่
- แลกกับ: กระโดดข้ามหน้าไม่ได้, ต้องมี sort key ที่ unique (เลยต้องพ่วง id กันค่าซ้ำ), cursor ต้อง opaque (encode เป็น token — อย่าให้ client ประกอบเอง)

แนวตอบ: offset สำหรับ admin UI ตารางเล็ก / cursor สำหรับทุกอย่างที่โตได้ — และบอกได้ว่า **ทำไม** offset ช้า (อ่านทิ้ง) ไม่ใช่แค่ "cursor เร็วกว่า"

## Connection Pool

การเปิด DB connection แพง (Transmission Control Protocol (TCP) handshake + auth + memory ฝั่ง DB — Postgres ใช้ process ต่อ connection) → pool คือการเปิดค้างไว้แล้วหมุนเวียนใช้

จุดที่วัด senior:

- **Pool มีสองฝั่ง**: ฝั่งแอป (HikariCP, SQLAlchemy pool, `database/sql` มี pool ในตัว) และฝั่งหน้า DB (PgBouncer) — เพราะ `จำนวน instance × pool size` ต้องไม่เกิน `max_connections` ของ DB; แอป scale จาก 4 → 40 pod แล้ว DB ตายเพราะ connection เต็ม คือ incident คลาสสิก
- **Pool exhaustion**: query ช้าตัวเดียว (หรือ transaction ที่เปิดค้างระหว่างเรียก external API — บท 5!) ทำ connection ถูกยึดหมด → request อื่นต่อคิว → timeout ทั้งระบบ ทั้งที่ DB ไม่ได้ล่ม
- ค่าที่ต้องตั้งเสมอ: pool size (ใหญ่ไม่ใช่ดี — Hikari แนะนำ `cores × 2` ฝั่ง DB), connection timeout (รอ pool ว่าง), idle timeout, **statement timeout** (กัน query ช้ายึด connection)

## คำถามสัมภาษณ์ที่ต้องตอบได้ (แนวตอบสั้น)

- **"Index ทำให้ทุกอย่างเร็วขึ้นไหม"** → ไม่ — write ช้าลงทุก index ที่เพิ่ม, ใช้ไม่ได้กับ function/wildcard/selectivity ต่ำ, ตรวจด้วย EXPLAIN
- **"N+1 คืออะไร แก้ยังไง"** → lazy loading ใน loop, eager load/batch, และวิธีกันเชิงระบบ (query count ต่อ request)
- **"ACID ย่อจากอะไร"** → ตอบครบสี่ แล้วรีบเสริมว่า Isolation มีระดับและ default ไม่ใช่ Serializable — นี่คือจุดที่พาไปคุยต่อได้
- **"สอง request ตัด stock พร้อมกัน กันยังไง"** → lost update → optimistic (version) vs pessimistic (FOR UPDATE) + เกณฑ์เลือกตามความถี่การชน
- **"ทำไม offset pagination ช้า"** → อ่านแล้วทิ้ง + แถวเลื่อนระหว่างหน้า → keyset
- **"Connection pool ตั้งเท่าไหร่"** → ไม่มีเลขวิเศษ — คิดจาก max_connections ของ DB หารด้วยจำนวน instance, และเล่าเรื่อง pool exhaustion จาก transaction เปิดค้าง

บทต่อไป (Part 3): เข้าสู่ pattern รายตัว — Strategy, Factory, Adapter, Facade, Builder ด้วยโครง ปัญหา → refactor → trade-off → ใช้ผิด → 3 ภาษา

## สรุปท้ายบท

- database เป็นระบบที่มีต้นทุนและกติกาของตัวเอง ซึ่งไม่มี ORM ตัวไหนลบความจริงนี้ได้
- index, query plan, transaction, isolation และ locking คือภาษาพื้นฐานของการวิเคราะห์อาการช้าและอาการผิดพร้อมกัน
- ปัญหา production จำนวนมากไม่ใช่ bug เชิง syntax แต่เป็นผลลัพธ์ตรง ๆ ของการไม่เข้าใจ behavior ของ database ใต้ abstraction
- การตอบคำถามบทนี้ได้ดีจึงเป็นสัญญาณว่าเราไม่ได้พึ่ง framework อย่างเดียว แต่เห็นของจริงที่ framework กำลังครอบอยู่

## ก่อนไปบทถัดไป

หลังจากลงชั้นล่างสุดของระบบแล้ว เล่มจะกลับขึ้นมาที่ระดับ pattern อีกครั้ง แต่คราวนี้จะอ่าน pattern ได้ชัดขึ้นเพราะเราเห็นแล้วว่ามันต้องอยู่ร่วมกับข้อจำกัดของของจริงอย่างไร
