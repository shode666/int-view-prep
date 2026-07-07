# บทที่ 16 — Checklist สำหรับออกแบบระบบจริง

> ทั้งเล่มบีบเป็นคำถามที่ Dev Lead ใช้ก่อน approve design / review PR ใหญ่ / นั่งใน design review — ทุกข้อมีเลขบทกำกับไว้กลับไปอ่านลึก

## เข็มทิศก่อนอ่าน

บทนี้ไม่ได้เพิ่มเนื้อหาใหม่ แต่เปลี่ยนทั้งเล่มให้กลายเป็นเครื่องมือใช้งานจริงในชีวิตประจำวัน จุดสำคัญของ checklist ที่ดีคือมันช่วยกันเรื่องที่คนเก่งก็ลืมได้ โดยเฉพาะตอนรีวิวงานใหญ่ภายใต้เวลาและแรงกด

อ่านบทนี้ด้วยมุมว่าแต่ละข้อคือคำถามที่ควรถามก่อนปัญหาจะเกิด ไม่ใช่หลัง incident แล้วค่อยย้อนกลับมารู้ทีหลัง ถ้าใช้บทนี้คล่อง คุณจะเริ่มเห็นว่า design review ที่ดีคือการป้องกันหนี้ ไม่ใช่การจับผิดรายบรรทัด

## A. Boundary & Structure (บท 1–5)

- [ ] อธิบายแต่ละ module ได้ในประโยคเดียวโดยไม่มี "และ" ไหม (cohesion — บท 2)
- [ ] Feature ใหม่หนึ่งเรื่อง แตะกี่ module? เกิน 3 = รอยตัดอาจผิด (shotgun surgery — บท 14)
- [ ] Dependency ชี้เข้าหา domain หมดไหม — domain import framework/DB ตรงไหนบ้าง (บท 4)
- [ ] ทุก dependency มองเห็นจาก constructor/signature ไหม มี global/singleton แอบไหม (บท 1)
- [ ] Business rule อยู่ใน domain หรือกระจายอยู่ใน controller/consumer (anemic — บท 14)
- [ ] Transaction boundary อยู่ที่ use case และ **ไม่มี external call ข้างใน** ใช่ไหม (บท 5)
- [ ] Abstraction ทุกตัวมีใบอนุญาต (consumer ที่สอง / test ที่ต้อง fake) หรือเป็นพิธีกรรม (บท 8, 13)
- [ ] กฎ architecture อยู่ใน CI (ArchUnit / import-linter / depguard) หรืออยู่ในความจำคน (บท 4)

## B. API & Data (บท 6–7)

- [ ] Status code ตรง semantics — 401/403 ถูกฝั่ง, 4xx ห้าม retry, ไม่มี 200-แต่-error (บท 6)
- [ ] AuthZ ระดับ object — query scope ด้วย identity เสมอ กัน Insecure Direct Object Reference (IDOR) (บท 6)
- [ ] ทุก query หน้า hot path มี index รองรับ — ดูจาก EXPLAIN ไม่ใช่เดา (บท 7)
- [ ] มีอะไรกัน N+1 เชิงระบบไหม (query count ต่อ request ใน dev) (บท 7)
- [ ] Concurrent write ตัวเดียวกัน: optimistic version / conditional update / FOR UPDATE — เลือกแล้วหรือยังไม่ได้คิด (บท 7)
- [ ] Pagination เป็น cursor สำหรับของที่โต (บท 7)
- [ ] Pool size × instance count < max_connections ของ DB + มี statement timeout (บท 7)
- [ ] ของแพงที่ขอซ้ำมี cache — พร้อมคำตอบเรื่อง invalidation กับ stampede (บท 6)

## C. Distributed & Failure (บท 9–11) — หมวดที่ห้ามผ่านถ้าตอบไม่ครบ

- [ ] **ทุก external call มี timeout** — ข้อที่ถูกที่สุดในเล่ม เช็คก่อนข้ออื่น (บท 10)
- [ ] Retry: เฉพาะ transient + idempotent + backoff/jitter + ชั้นเดียว + มีงบ (บท 10)
- [ ] ทุก downstream สำคัญมี circuit breaker และ **fallback ที่ product เซ็นชื่อรับ** (บท 10)
- [ ] Operation ที่เงินเกี่ยว: idempotency key + unique constraint ฝั่ง DB (บท 11)
- [ ] เขียน DB + publish event ที่ไหน → ตรงนั้นเป็น outbox หรือ dual-write (บท 11)
- [ ] ทุก consumer รับ message ซ้ำได้ (dedupe ใน transaction, ack หลัง commit) (บท 9)
- [ ] Flow ข้าม service มี saga state ชัด + compensation ครบ + ทางลง MANUAL_REVIEW (บท 11, 15)
- [ ] มี Dead Letter Queue (DLQ) พร้อม alert + เจ้าของ + runbook replay (บท 11)
- [ ] Trace id วิ่งครบทุก hop รวม queue และอยู่ใน log ทุกบรรทัด (บท 11)
- [ ] Event เป็นอดีตจริง ไม่ใช่ command ปลอมตัว + schema มี version + topic มีเจ้าของ (บท 9)

## D. Testing & Quality (บท 12)

- [ ] Pyramid ไม่กลับหัว — logic หลัก test ได้ระดับ unit โดยไม่มี mock พะรุงพะรัง
- [ ] Fake ผ่าน contract suite เดียวกับ implementation จริง
- [ ] Failure case มี test: timeout, 5xx, message ซ้ำ, concurrent write — ไม่ใช่ happy path ล้วน
- [ ] Contract test ระหว่าง service ที่เปลี่ยนไม่พร้อมกัน
- [ ] Test ใหม่ **fail ได้จริง** (เคยเห็นมันแดงไหม)

## E. คำถามปราบเซียนไว้ถามตัวเองก่อนเซ็น approve

1. "ชี้จุดที่ระบบนี้จะพังตอนตีสามให้ดูหน่อย" — ถ้าตอบไม่ได้ แปลว่ายังวิเคราะห์ failure mode ไม่พอ (ทุก design มีจุดนั้นเสมอ)
   - คำตอบที่ดี: ชี้ SPOF ได้เป็นชื่อ (DB ตัวเดียว, external gateway ที่ไม่มี fallback, queue ที่ consumer ตายแล้วไม่มี DLQ) + บอกว่า *รู้ได้ยังไงว่ามันพัง* (metric/alert ตัวไหน) + บอกว่าตอนพังระบบ degrade แบบไหน
   - ธงแดง: "น่าจะไม่พังหรอก" หรือชี้ได้แต่ไม่มี alert รองรับ (พังแล้วรู้จาก user โทรมา)
2. "requirement แบบไหนจะทำให้ design นี้ต้องรื้อ" — รู้ขอบเขตของ design ตัวเอง = เข้าใจ trade-off ที่เลือกไป
   - คำตอบที่ดี: ระบุ assumption ที่ถ้าเปลี่ยนแล้วพังทั้งกระดาน — เช่น "ผมสมมติว่า write ต่ำ ถ้าโตเป็น 100x ต้องเปลี่ยนจาก single Postgres เป็น partition/CQRS" หรือ "ผมเลือก eventual consistency ตรงนี้ ถ้าธุรกิจต้องการ strong ต้องรื้อ saga เป็น distributed transaction"
   - ธงแดง: "รองรับได้หมดครับ" — ทุก design มีขอบเขต ตอบแบบนี้แปลว่าไม่รู้ว่าตัวเองแลกอะไรไป
3. "ถ้าทีมครึ่งหนึ่งลาออกพรุ่งนี้ คนใหม่อ่านระบบนี้รู้เรื่องใน 2 สัปดาห์ไหม" — complexity budget ใช้ไปกับอะไร
   - คำตอบที่ดี: ความซับซ้อนที่มีอยู่ *มีเหตุผลต่อ requirement จริง* + มีเอกสารตรงจุดยาก (ADR, README ต่อ service, diagram ที่ update) + naming/boundary ตรงกับภาษาธุรกิจจนอ่านโค้ดเดาได้
   - ธงแดง: complexity ที่อธิบายไม่ได้ว่าแก้ปัญหาอะไร (abstraction เผื่อ, generic framework ที่มี consumer เดียว) — นั่นคือหนี้ที่คนใหม่ต้องจ่าย
4. "อะไรในนี้ที่เราทำเผื่ออนาคตที่ยังไม่มา" — ตัดออกได้ไหม (YAGNI — บท 1)
   - คำตอบที่ดี: ชี้ได้ตรง ๆ ว่าอันไหนคือ speculative (plugin system ที่ยังไม่มี plugin, config ที่ไม่มีใครเปลี่ยน, layer ที่มี implementation เดียว) แล้วบอกว่าตัดได้/ตั้งใจเก็บเพราะอะไร
   - ธงแดง: ยืนยันว่า "จำเป็นหมด" ทั้งที่ครึ่งหนึ่งยังไม่มี consumer จริง — over-engineering ที่ไม่ยอมรับ
5. "ถ้า traffic คูณ 10 พังที่ไหนก่อน" — และเรารู้ได้ยังไง (metric ไหนจะบอกเราก่อน user)
   - คำตอบที่ดี: ชี้ bottleneck แรกได้ (มัก connection pool, hot row lock, หรือ downstream ที่ไม่ scale) + บอก metric ที่จะเตือนก่อน (pool pending, p99, DLQ depth) + ลำดับการแก้ไล่ตามต้นทุน (cache/replica ก่อน shard)
   - ธงแดง: "ก็ scale เพิ่มเครื่อง" ลอย ๆ โดยไม่รู้ว่าคอขวดจริงอยู่ที่ไหน (บ่อยครั้งคอขวดคือ DB ที่เพิ่มเครื่อง app ไม่ช่วย)

## ส่งท้าย

เล่มนี้เริ่มที่ principle และจบที่ checklist โดยตั้งใจ — pattern ระหว่างทางทั้งหมดเป็นแค่ **ชื่อเรียกของการใช้ principle ซ้ำๆ กับปัญหาที่โผล่ซ้ำๆ**

สิ่งที่แยก senior จริงออกจากคนท่องศัพท์ มีสามอย่าง:

1. ตอบ "ทำไม" ได้ทุกชั้น — ทำไมใช้ / ทำไมไม่ใช้ / ทำไมตรงนี้แต่ไม่ใช่ตรงนั้น
2. พูด trade-off เองโดยไม่ต้องถูกถาม — ทุกการตัดสินใจแลกอะไรมา
3. เล่าจากแผลจริง — ระบบที่เคยพัง, กลิ่นที่เคยพลาด, สิ่งที่จะทำต่างไปถ้าย้อนเวลาได้

ขอให้สนุกกับการสัมภาษณ์ — และกับการสร้างระบบที่คนรุ่นถัดไปอยากรับช่วงต่อ 🎯

## สรุปท้ายบท

- checklist ที่ดีช่วยกันข้อผิดพลาดซ้ำ ๆ และทำให้มาตรฐานของทีมไม่ต้องพึ่งความจำของคนเก่งไม่กี่คน
- บทนี้ทำหน้าที่เป็นเวอร์ชันพกพาของทั้งเล่ม ใช้ได้ทั้งก่อนออกแบบ, ระหว่าง review และตอนย้อนดูหลัง incident
- คุณค่าของมันอยู่ที่การทำให้ principle ถูกหยิบมาใช้ต่อเนื่อง ไม่ใช่แค่อ่านแล้วเห็นด้วย
- ถ้าใช้บทนี้จริงบ่อยพอ คำถามหลายข้อจะค่อย ๆ กลายเป็นนิสัยการคิดของทีมเอง

## ก่อนไปบทถัดไป

จากฝั่ง technical ล้วน ๆ บทถัดไปจะเปลี่ยนไปยังสนาม behavioral และ leadership ซึ่งเป็นอีกครึ่งหนึ่งของการถูกมองว่าเป็น Dev Lead ที่ทีมอยากทำงานด้วย
