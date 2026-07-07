# Changelog

## [2026-07-05T10:30:00 ICT] prep-pair-prog

### Changed (ยกระดับบท 21–22 จาก feedback "บางส่วนหยาบเกินไป" — เอาผลึกจากบทสนทนา JVM กลับเข้าไฟล์)
- บท 22: หัวข้อใหม่ "JIT ทำงานยังไง" เต็มตัว (บันได tiered C1/C2, สามท่า optimize: inlining/speculation/escape, deoptimization + OSR, warm-up/JMH/deopt storm), หัวข้อใหม่ "Stack กับ Heap ทำงานร่วมกันยังไงจริงๆ" (โกดัง-โต๊ะ + bytecode getfield/imul, primitive อาศัยตามเจ้าของ, pass-by-value สองชนิด, TLAB ≠ stack, escape analysis + เงื่อนไข escape, pointer chasing/int[] vs Integer[]), หัวข้อใหม่ "GC ทำงานเมื่อไหร่" (demand-driven, Eden เต็ม/IHOP 45%, ศพรอกวาด → heap-after-full-GC, safepoint), "G1 กายวิภาค" (region, garbage-first สามจังหวะ, งบ pause, evacuation), หัวข้อใหม่ "Code Cache กับ Direct Buffer" (โค้ดร้อน vs เย็น, CodeCache full ช้าเงียบ, เขตกลาง JVM↔OS, ตัวห่อจิ๋วซ่อน OOM, flow หนึ่ง request ผ่านสี่ห้อง)
- บท 21: ข้อ 1 เพิ่มภาพ proxy + โค้ด self-invocation + เหตุผลประวัติศาสตร์ checked exception, ข้อ 5 ยกเป็นบันได dedupe สี่ขั้น (natural → conditional → unique → inbox) พร้อมโค้ด, ข้อ 11/13/15 เพิ่มความลึก + โยงบท 22, เพิ่มข้อ 36 ใหม่: state transition guard (enum map + conditional update กัน TOCTOU + เกณฑ์ flow table และรั้ว 4 ด้าน)

## [2026-07-04T18:15:00 ICT] prep-pair-prog

### Added
- ไฟล์ใหม่ book/22-jvm-deep-dive.md — JVM Architecture & Memory Management ฉบับ senior: สถาปัตยกรรม (classloader/parent delegation, interpreter+tiered JIT, escape analysis, warm-up), memory layout ครบทุกห้อง (heap young/old + TLAB + tenuring, metaspace, thread stacks, direct — "process memory ≠ heap" + ตาราง OOM ราย message รวม OOMKilled 137), GC deep dive (generational hypothesis, ตาราง Serial/Parallel/G1/ZGC + เกณฑ์เลือก, humongous, สามคำถามอ่าน GC log, heap-after-full-GC = เส้นชีวิต), memory leak hunting (MAT dominator tree, แก๊งผู้ต้องสงสัย, reference 4 สายพันธุ์), เครื่องมือ (jcmd/JFR/NMT/async-profiler), virtual threads + pinning, คำถามสัมภาษณ์ท้ายบท — ลิงก์ใน outline

## [2026-07-04T17:30:00 ICT] prep-pair-prog

### Added
- ไฟล์ใหม่ book/21-production-qa.md — ภาคผนวก Production Q&A 35 ข้อ: 20 ข้อจากชุดที่ผู้ใช้เจอมา (Transactional proxy, retry ซ้ำ, pool exhaustion, exactly-once, health check โกหก, GC latency, OOM off-heap, memory leak, deadlock, tracing, rate limit, async block ฯลฯ) + 15 ข้อคัดจากการสำรวจสนาม (Kafka lag/rebalance/ordering/poison, staging vs prod, replica lag, backfill, cache stampede/invalidation, graceful shutdown, deploy strategies, API versioning, webhook, Redis lock + fencing, distributed ID) — ทุกข้อมีลำดับวินิจฉัย + แนวตอบ senior + โยงบทในเล่ม; ปิดท้ายสามกลุ่มความรู้เสริม (Spring proxy, JVM ops, cache ops); เพิ่มลิงก์ใน outline

## [2026-07-04T16:40:00 ICT] prep-pair-prog

### Fixed (Full editor review ทั้ง 20 บท — ตัวย่อก่อนนิยาม)
- บท 5: หัวข้อ Unit of Work เพิ่ม (UoW) เป็นจุดผูกตัวย่อ
- บท 7: ขยาย WAL = Write-Ahead Log ที่จุดแรกที่ใช้ (Durability)
- บท 18: ขยาย RED metrics = Rate, Errors, Duration + ชี้บท 20
- บท 20: ขยาย MFA, SSRF (Server-Side Request Forgery)
- ตรวจแล้วผ่าน: cross-references ทุกบท, code หลักเป็น Java ครบ (ยกเว้นส่วนเทียบ 3 ภาษาที่ตั้งใจ), ตาราง/heading สม่ำเสมอ, IDOR นิยามครบที่บท 6

## [2026-07-04T15:10:00 ICT] prep-pair-prog

### Fixed (จาก feedback ผู้อ่าน: ตัวย่อโผล่ก่อนชื่อเต็ม)
- บท 9: นิยาม DLQ (Dead Letter Queue) ก่อน consumer code ที่ใช้คำนี้ครั้งแรก
- บท 11: หัวข้อ DLQ ใช้ชื่อเต็ม, ขยาย CDC = Change Data Capture
- บท 12: ขยาย SUT = System Under Test ที่จุดแรกที่ใช้

## [2026-07-04T14:30:00 ICT] prep-pair-prog

### Added (ตกผลึกจาก Q&A บท 13)
- บท 13: หัวข้อใหม่ "สามระบบ type — ตรวจเมื่อไหร่ พลาดเจอตอนไหน" (นิยาม duck typing, ตาราง nominal/structural/duck, ไทม์ไลน์ compile vs import, "พังตอนเคสที่ test ไม่ครอบ", เครื่องมือสี่ชิ้น hints/Pyright/mypy/Protocol + Pydantic ที่ขอบ, Go = duck typing ที่มียามเฝ้า)
- บท 13: หัวข้อใหม่ "Kotlin — ญาติร่วม JVM" (ลด boilerplate ภาษาไม่ใช่ JDK, null safety, Builder ระเหยเพราะ named args, record ไล่ทัน, interop/platform types, strangler migration ระดับไฟล์, data class+@Entity ต้องห้าม, entity "ใคร" vs value object "เท่าไหร่")
- บท 13: คำถามสัมภาษณ์เพิ่ม — Java vs Kotlin, DIP vs DI (หลักการ vs เทคนิค)

## [2026-07-04T12:05:00 ICT] prep-pair-prog

### Changed
- บท 12: ยกหัวข้อ Mock/Stub/Fake เป็น "Test Double" — เพิ่มคำแม่ + นิยาม "แทน dependency ไม่ใช่ test data" (ไขความหมาย "domain test ไม่มี double"), เพิ่ม Dummy และ Spy ครบ 5 สายพันธุ์, สูตรจำ arrange/assert, สองบทของ Mockito (when=stub / verify=mock)

### Added (ตกผลึกจาก Q&A บท 12)
- บท 12: หัวข้อใหม่ "Coverage — เลขที่เป็นผลพลอยได้" (นับบรรทัดที่รันไม่ใช่ behavior ที่ตรวจ, ความเข้มต่างตามชั้น, แนวตอบสัมภาษณ์), "Test ไม่มีวันครบ — แล้วทำยังไงต่อ" (Dijkstra + สามชั้น: ลดพื้นที่คาดเดา/จำกัดความเสียหาย/regression — failure handling คือเหรียญเดียวกับ test), "จากบั๊กจริงสู่ regression test" (reproduce ต้องแดงก่อน fix, บั๊กอยู่เป็นฝูง, 8 คำหาญาติ), "Testability คือเกณฑ์ design" (ตัวอย่าง GlobalConfig/Instant.now — ใช้ได้ปกติแต่เทสไม่ได้), Mock = กล้องวงจรปิด + verify never() ตรวจความว่างเปล่า, Fake = สลับโลกทั้งใบโดยโครงสร้าง (DIP), Code Review เพิ่มกฎ scope สองชั้น (PR/backlog), วินิจฉัย PR ใหญ่สองโรค, draft PR + feature flag, "แตกงานยาก = architecture ฟ้องตัวเอง"

## [2026-07-04T11:25:00 ICT] prep-pair-prog

### Added (ตกผลึกจาก Q&A ระหว่างเรียน ลงบท 5, 7, 8, 9, 10, 11)
- บท 5: สูตรจำ use case "1 action = โหลด→ตัดสิน→save ใน tx เดียว" + ขอบเขตวัดจาก user intent ไม่ใช่จำนวน table
- บท 7: นิยาม lost update (เขียนทับเงียบๆ), atomic UPDATE เป็น "ท่าที่ศูนย์", FOR UPDATE ต้องอยู่ใน transaction, version เช็คด้วย `=` เท่านั้น (ลายนิ้วมือ snapshot), จุดคุ้มครองคนละปลาย read/write, อายุ lock (pessimistic เท่า tx / optimistic ข้าม request), ข้อเสียระบาดคนละทิศ
- บท 8: Factory คืนอะไรก็ได้ไม่ใช่แค่ adapter (Order.place, JDBC), Adapter ห้ามตัดสินใจธุรกิจ, Adapter vs Strategy แยกด้วย "อีกฝั่งเป็นของนอกไหม — มีล่ามต้องมีคนต่างชาติ", analogy ร้านขายของ (ซื้อของ=facade, จ่ายเงิน=port, เงินสด/โอน/บัตร=adapter, คนเลือก=factory), Adapter=ล่าม/Facade=ประตูเดียว
- บท 9: Observer sync by default (thread/tx เดียวกัน — Spring @Async/AFTER_COMMIT), เกณฑ์ "งานนี้หายได้ไหม" (in-process/outbox/pubsub), event 0..N vs command หนึ่งเดียว + เทส "เพิ่มคนฟังแล้วพังไหม", walkthrough Redis dedupe = dual-write ฝั่ง consumer, หัวข้อใหม่ "ใครรู้จักใคร + push vs pull" (RabbitMQ ไปรษณีย์ / Kafka ห้องสมุด), คำถามสัมภาษณ์ RabbitMQ vs Kafka
- บท 10: breaker = library ฝั่ง caller + คู่ sync=breaker/async=broker, หัวข้อใหม่ "เลนที่แบ่งทุกอย่าง: user รอคำตอบอยู่ไหม" (ป่วยกลายเป็น delay ไม่ใช่ downtime, report 202+polling)
- บท 11: ออกแบบ idempotency key (ชี้เจตนา/scope ต่อ operation/TTL), idempotency=เป้าหมาย vs dedupe=เทคนิค, เส้นแบ่งงานใน DB vs นอก DB, กลไก relay (broker ack, fail=ไม่ทำอะไร, แถวพิษ+attempts), วิ่งผลัด "ผู้ส่งไม่ปล่อยมือ", ท่าเลียนแบบ fail-then-enqueue ≠ outbox, inbox pattern, compensation เป็นการตัดสินใจธุรกิจ + soft reservation TTL, กายวิภาค orchestrator (saga table = call stack persisted, sweeper, สองชั้นกันซ้ำ, command แท้, God Orchestrator), หัวข้อใหม่ "แผนที่ไล่ปัญหา + สามคู่สมมาตร" (pub ดู outbox / sub ดู broker), เครื่องมือชุดนี้ใช้กับ sync ได้

## [2026-07-02T14:45:00 ICT] prep-pair-prog

### Changed
- บท 3: ขยายตัวอย่าง OCP/Strategy ให้เห็นครบวงจร — กติกาจริง 3 ตัว, CombinePolicy ที่เป็นรูปธรรม (BestSingleDiscount), การประกอบใช้ที่ startup, ตาราง "requirement ใหม่กระทบตรงไหน"

## [2026-07-02T14:20:00 ICT] prep-pair-prog

### Changed
- บท 2: เขียนหัวข้อ "สามภาษา สามสำเนียง" ใหม่ — อธิบาย nominal / duck typing / implicit interface แบบปูพื้นก่อนใช้ศัพท์ (จาก feedback ว่าอ่านเหมือนแปลไม่ตั้งใจ), เพิ่มปูพื้น "ลูกศร dependency = บรรทัด import, แก้ของที่ถูกชี้คนชี้พังตาม" ต้นหัวข้อทิศทาง dependency

## [2026-07-02T13:55:00 ICT] prep-pair-prog

### Added
- บท 1: หัวข้อย่อย "YAGNI ใช้ยากสุดในสามตัว" — เกณฑ์ราคาการเพิ่มทีหลัง, ตาราง "อย่าอ้าง YAGNI" (เงิน/API contract/timeout/audit), one-way vs two-way door

## [2026-07-02T13:45:00 ICT] prep-pair-prog

### Added
- บท 1: หัวข้อใหม่ "ตระกูลความประหยัด: DRY / KISS / YAGNI" — แนะนำก่อนถูกใช้ในหัวข้อ principle ชนกัน พร้อมชี้ชัดว่าไม่ใช่สมาชิก SOLID (จากคำถามผู้ใช้)

## [2026-07-02T13:30:00 ICT] prep-pair-prog

### Changed
- บท 1: ขยาย DRY vs SoC ด้วยคำถามต่อยอดของผู้ใช้ — "แยกทั้งก้อนหรือแยกรายส่วน?" เพิ่มตาราง รวม/แยก ต่อกติกาย่อย (VAT รวม, ปัดเศษรวม, ส่วนลดแยก) + code composition ที่โยงไป Strategy บท 8

## [2026-07-02T13:00:00 ICT] prep-pair-prog

### Changed
- เขียนบท 2 (Coupling/Cohesion) ใหม่ทั้งบท — ยาวขึ้น ~2 เท่า: ตัวอย่าง code ครบทั้ง 6 ระดับ coupling, สามคำถามทดสอบ cohesion พร้อมตัวอย่าง, DIP อธิบาย step-by-step (ขั้น 0→2 พร้อมเหตุผลว่าทำไม interface ต้องอยู่บ้านผู้ใช้)
- บท 1: ขยายหัวข้อ "Principle ชนกันเอง" ด้วยตัวอย่าง DRY vs SoC แบบเป็นรูปธรรม
- บท 8: เพิ่ม before/after code ให้ Facade

### Fixed
- เลขอ้างอิงข้ามบทที่ค้างจาก outline เดิม 14 บท ในบท 1, 3, 4, 5 (9 จุด): บท 6→8 (Strategy), บท 9→11 (Outbox), บท 10→12 (Testing), บท 12→14 (Anemic), บท 8–9→10–11 (Design for Failure) และประโยคปิดบท 5 ที่ชี้ Part ผิด

## [2026-07-02T12:10:00 ICT] prep-pair-prog

### Added
- Part 7 — Interview Playbook (บท 17–20): Leadership/Behavioral (STAR + คำถาม lead), System Design Interview framework 45 นาที + capacity estimation, Story Bank template + intro pitch + คำถามย้อนถาม, DevOps & Security essentials (CI/CD, K8s, observability, OWASP)

## [2026-07-02T11:30:00 ICT] prep-pair-prog

### Added
- หนังสือครบทั้ง 16 บท: บท 8–9 (Patterns, Event-driven), บท 10–11 (Microservice Failure, Saga/Outbox/Idempotency + 5 คำถามคลาสสิก), บท 12–14 (Testing Architecture, Java/Python/Go, Anti-patterns/Refactoring), บท 15–16 (Case Study ระบบ Order, Design Checklist)

### Changed
- `book/00-outline.md` — ทุก Part ติ๊ก ✅ พร้อมลิงก์ครบ 16 บท

## [2026-07-02T10:40:00 ICT] prep-pair-prog

### Added
- Part 2 ของหนังสือ: บท 6 Core Backend Concepts + บท 7 Database/Transaction/Performance (`book/06`, `book/07`) — ฝัง "คำถามสัมภาษณ์ที่ต้องตอบได้" พร้อมแนวตอบ senior ทุกบท

### Changed
- ขยาย outline จาก 14 → 16 บท รวม checklist สัมภาษณ์ 5 หมวดของผู้ใช้เข้าโครงหนังสือ (`book/00-outline.md`)

## [2026-07-02T10:05:00 ICT] prep-pair-prog

### Added
- หนังสือ "คู่มือ Software Design สำหรับ Dev Lead / Senior Developer" Part 1 (`book/`): outline 14 บท + บท 1–5 (หลักคิดก่อน pattern, Coupling/Cohesion, SOLID ใช้จริง, Layered/Clean Architecture, Repository/Service/Use Case/Unit of Work) — ไทยผสมศัพท์อังกฤษ, code Java/Python/Go

## [2026-07-02T09:33:00 ICT] prep-pair-prog

### Added
- Project scaffold: pnpm + TypeScript (strict) + Vitest, `@src` alias so the same tests run against `src/` (your stubs) or `solutions/` (reference implementations)
- Katas with test suites: fizzbuzz, twoSum, balancedBrackets, groupAnagrams, LruCache (`src/katas/`, `tests/katas/`)
- Todos REST API exercise: Express 5 skeleton with injected `TodoRepository`, working in-memory repo, 14 supertest specs (`src/api/`, `tests/api/`)
- Async drills: withTimeout, retry, mapLimit + Transform stream and countLines (`src/async/`, `tests/async/`)
- Reference solutions mirroring `src/` (`solutions/`), verified green: 69/69 tests via `pnpm test:solutions`
- `README.md` (usage + interview tips), `NOTES.md` (Node theory cheat-sheet), `pnpm-lock.yaml`
