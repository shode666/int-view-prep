# คู่มือ Software Design สำหรับ Dev Lead / Senior Developer

> ไม่ใช่หนังสือจำชื่อ pattern — แต่เป็นการฝึกมองว่า **code เริ่มเน่าเพราะอะไร, จะแยกยังไง, จะกัน failure ยังไง** และ Java / Python / Go ใช้หลักเดียวกันด้วย style ที่ต่างกันอย่างไร

## หลักการเขียนของเล่มนี้

ทุก pattern / เทคนิค จะเดินตามโครงเดียวกันเสมอ:

1. **ปัญหาก่อนใช้** — code แบบไหนที่เริ่มเน่า และเน่าเพราะอะไร
2. **Refactor เป็น pattern** — เห็น before/after จริง
3. **Trade-off** — ได้อะไรมา แลกอะไรไป
4. **ใช้ผิดพังแบบไหน** — กลิ่นของการ over-engineer
5. **Java / Python / Go** — หลักเดียวกัน สำเนียงต่างกัน (ตัวอย่างหลักเป็น **Java** ทั้งเล่ม; ส่วนเทียบ 3 ภาษาคงไว้เฉพาะจุดที่สำเนียงต่างจริง — บท 2 DIP, บท 8 per-pattern, บท 13 ทั้งบท)

## ไฟล์ประกอบ

- [STUDY-PLAN.md](STUDY-PLAN.md) — แผนอ่าน 4 วัน + เช็คลิสต์เช้าวันสัมภาษณ์
- [my-answers.md](my-answers.md) — คำตอบฉบับตกผลึกของตัวเอง (SOLID, โมเดลกล่อง-ข้อต่อ, story) — **เปิดทวน 10 นาทีก่อนเข้าห้อง**
- [21-production-qa.md](21-production-qa.md) — ภาคผนวก: Production Q&A 36 ข้อ (scenario สนามจริง + แนวตอบ senior) — ซ้อมตอบปากเปล่าหลังจบบท 12
- [22-jvm-deep-dive.md](22-jvm-deep-dive.md) — บทเสริม: JVM Architecture & Memory Management (class loading/JIT, heap/GC, leak hunting, เครื่องมือ, virtual threads) — อุดช่องว่างข้อ 11/13/15 ของภาคผนวก

## สารบัญ

### Part 1 — Principles (บท 1–5) ✅

| บท | ชื่อ | เนื้อหาหลัก |
|---|---|---|
| 1 | [หลักคิดก่อน Design Pattern](01-principles-before-patterns.md) | ทำไม principle มาก่อน pattern, Fail Fast, Design for Failure, Explicit Dependencies |
| 2 | [Coupling, Cohesion และ Dependency](02-coupling-cohesion.md) | ทิศทางของ dependency, afferent/efferent, วิธีวัดว่า coupling สูงเกิน |
| 3 | [SOLID แบบใช้จริง](03-solid-in-practice.md) | ทีละตัวด้วย before/after จริง ไม่ใช่นิยาม, จุดที่คนใช้ SOLID ผิด |
| 4 | [Layered / Clean Architecture](04-architecture.md) | ทำไมต้องมี layer, dependency rule, เมื่อไหร่ Clean Architecture คือ over-engineering |
| 5 | [Repository, Service, Use Case](05-repository-service-usecase.md) | แยก concern ระหว่าง 3 ตัวนี้, Unit of Work, transaction boundary |

### Part 2 — Backend Foundations (บท 6–7) ✅

| บท | ชื่อ | เนื้อหาหลัก |
|---|---|---|
| 6 | [Core Backend Concepts](06-core-backend.md) | REST, HTTP status, AuthN vs AuthZ, JWT vs Session, Sync vs Async, Queue, Caching, Rate Limit |
| 7 | [Database, Transaction, Performance](07-database-transaction.md) | Index, N+1, ACID, Isolation Level, Optimistic/Pessimistic Locking, Pagination, Connection Pool |

### Part 3 — Patterns (บท 8–9) ✅

| บท | ชื่อ | เนื้อหาหลัก |
|---|---|---|
| 8 | [Strategy, Factory, Adapter, Facade, Builder](08-patterns.md) | pattern ที่ใช้จริงบ่อยสุด + Command, Template Method/Pipeline, Specification |
| 9 | [Event-driven Design](09-event-driven.md) | Observer/Pub-Sub, event vs command, event schema, ack semantics, Event Spaghetti |

### Part 4 — Microservice / Distributed System (บท 10–11) ✅

| บท | ชื่อ | เนื้อหาหลัก |
|---|---|---|
| 10 | [Microservice Failure Handling](10-microservice-failure.md) | Timeout, Retry+Backoff, Circuit Breaker, Bulkhead, Rate Limit, Service Discovery, API Gateway |
| 11 | [Saga, Outbox, Idempotency](11-saga-outbox-idempotency.md) | ไม่มี distributed transaction, Compensation, DLQ, Distributed Tracing + 5 คำถามสัมภาษณ์คลาสสิก |

### Part 5 — Quality (บท 12–14) ✅

| บท | ชื่อ | เนื้อหาหลัก |
|---|---|---|
| 12 | [Testing Architecture](12-testing-architecture.md) | Test Pyramid, Mock/Stub/Fake, Contract Test, TDD, Code Review principle — "test ยาก = design coupling สูง" |
| 13 | [Java / Python / Go Comparison](13-java-python-go.md) | หลักเดียวกัน สำเนียงต่างกัน — interface, DI, error handling, จุดระวังของแต่ละภาษา |
| 14 | [Refactoring Bad Code + Anti-patterns](14-antipatterns-refactoring.md) | God Service, Fat Controller, Anemic Domain, Distributed Monolith, Retry Storm, Strangler Fig ฯลฯ |

### Part 6 — Practice (บท 15–16) ✅

| บท | ชื่อ | เนื้อหาหลัก |
|---|---|---|
| 15 | [Case Study: ระบบ Order](15-case-study-order.md) | Create Order → Reserve Stock → Charge Payment → Invoice → Notify → Ship — ใช้ทุกเรื่องในเล่มจริง |
| 16 | [Checklist ออกแบบระบบจริง](16-design-checklist.md) | คำถามที่ Dev Lead ต้องถามก่อน approve design |

### Part 7 — Interview Playbook (บท 17–20) ✅

| บท | ชื่อ | เนื้อหาหลัก |
|---|---|---|
| 17 | [Leadership & Behavioral](17-leadership-behavioral.md) | STAR, conflict, underperformer, ต่อรอง tech debt, mentoring, 90 วันแรก, red flags |
| 18 | [System Design Interview Framework](18-system-design-interview.md) | สคริปต์ 45 นาที, capacity estimation + ตัวเลขที่ควรจำ, สัญญาณผ่าน/ตก |
| 19 | [Story Bank + Intro Pitch](19-story-bank.md) | template STAR 8 หมวด (เติมเอง), pitch 90 วิ, คำถามย้อนถาม interviewer |
| 20 | [DevOps & Security Essentials](20-devops-security.md) | CI/CD, deploy≠release, K8s ระดับ lead, observability, OWASP Top 10 |

> ✅ ครบทั้ง 20 บทแล้ว — ทุกบทฝัง **"คำถามสัมภาษณ์ที่ต้องตอบได้"** พร้อมแนวตอบระดับ senior
