# บทที่ 6 — Core Backend Concepts

> คำถามพื้นฐานที่ interviewer ใช้เปิดเกม — ตอบแบบ junior คือท่องนิยาม ตอบแบบ senior คือบอก **ปัญหาที่มันแก้ + trade-off + จุดพัง**

## เข็มทิศก่อนอ่าน

หลังจากปูเรื่อง design และ architecture มาแล้ว บทนี้เปลี่ยนเกียร์มาที่ศัพท์พื้นฐานฝั่ง backend ที่ถูกถามบ่อยที่สุด แต่ยังใช้มาตรฐานเดียวกันคือไม่ตอบแบบพจนานุกรม สิ่งที่สำคัญไม่ใช่จำความหมายของ REST, JWT หรือ queue ได้ แต่คือเห็นว่ามันถูกสร้างมาแก้แรงกดดันอะไรและพังตรงไหนถ้าใช้ผิด

มองบทนี้เป็นคลัง mental model พื้นฐานของสาย backend ถ้าฐานชุดนี้แน่น เวลาขึ้นบท database, distributed system, testing หรือ system design คำตอบจะมีรากรองรับ ไม่ใช่เป็นก้อนความรู้แยกกัน

## REST API

REST (Representational State Transfer) = ออกแบบ API รอบ **resource** (คำนาม) แล้วใช้ HTTP method เป็นกริยา โดยอาศัย semantics ที่ HTTP ให้มาฟรี

| Method | ความหมาย | Idempotent? | ตัวอย่าง |
|---|---|---|---|
| GET | อ่าน ไม่มี side effect | ✅ | `GET /orders/42` |
| POST | สร้าง / action ที่ไม่ idempotent | ❌ | `POST /orders` |
| PUT | แทนที่ทั้งก้อน | ✅ | `PUT /orders/42` |
| PATCH | แก้บางส่วน | ❌ (โดย spec) | `PATCH /orders/42` |
| DELETE | ลบ | ✅ | `DELETE /orders/42` |

จุดที่ senior ต้องพูดถึง: idempotency ของ method มีผลจริงกับ **retry** — GET/PUT/DELETE ยิงซ้ำได้ปลอดภัย, POST ยิงซ้ำได้ order สองใบ (โยงบท 11: Idempotency Key)
และ REST ไม่ใช่ศาสนา — action ที่ไม่ map เป็น resource ตรงๆ (`POST /orders/42/cancel`) ใช้ได้ ดีกว่าฝืนบิดเป็น `PATCH status`

## HTTP Status Codes

ใช้ให้ถูก **หมวด** สำคัญกว่าจำครบทุกเบอร์:

- **2xx สำเร็จ**: 200 ทั่วไป · 201 สร้างแล้ว (คู่กับ `Location` header) · 204 สำเร็จไม่มี body (DELETE)
- **4xx client ผิด — แก้โดย client, retry ไปก็เท่านั้น**: 400 body/format ผิด · 401 ยังไม่รู้ว่าเป็นใคร (Authentication — AuthN) · 403 รู้ว่าเป็นใครแต่ไม่มีสิทธิ์ (Authorization — AuthZ) · 404 ไม่มี resource · 409 ขัดแย้งกับ state ปัจจุบัน (duplicate, version ชน) · 422 format ถูกแต่ค่าไม่ผ่าน business rule · 429 ยิงถี่เกิน (rate limit)
- **5xx server ผิด — retry อาจช่วย**: 500 บั๊กเรา · 502/504 ตัวข้างหลัง gateway พัง/ช้า · 503 ยังไม่พร้อม (คู่กับ `Retry-After`)

ประเด็นที่วัด senior ได้:

- 401 vs 403 (AuthN vs AuthZ) — ตอบสลับคือเสียคะแนนทันที
- **4xx ห้าม retry, 5xx/timeout ค่อย retry** — status code คือ contract ของ retry policy ทั้งระบบ (บท 10)
- อย่าคืน 200 พร้อม `{"success": false}` — มันหลอก monitoring, cache, และ retry logic พร้อมกันสามตัว

## Authentication vs Authorization

- **Authentication (AuthN)** — คุณเป็นใคร (login, token, mutual TLS — mTLS) → ตอบไม่ได้ = 401
- **Authorization (AuthZ)** — คุณทำสิ่งนี้ได้ไหม (role, permission, ownership) → ไม่ได้ = 403

จุดที่ระบบจริงพลาดบ่อย: เช็ค AuthN แล้วลืม AuthZ ระดับ **object** — user login แล้วเรียก `GET /orders/999` ของคนอื่นได้ (Insecure Direct Object Reference หรือ IDOR — ช่องโหว่อันดับต้นๆ ของ Open Web Application Security Project (OWASP)) กติกาคือ: ทุก query ต้อง scope ด้วย identity เสมอ (`WHERE user_id = :current_user`) ไม่ใช่เช็คแค่ว่ามี token

## JWT vs Session

สองท่ามาตรฐานของการจำว่า "ใคร login อยู่" — Session (เก็บ state ฝั่ง server) กับ JSON Web Token (JWT) ที่แบก state ไว้ใน token เอง:

| | Session | JWT |
|---|---|---|
| State อยู่ไหน | server (memory/Redis) — client ถือแค่ session id | ใน token เอง (stateless) — server แค่ verify ลายเซ็น |
| Revoke ทันที | ✅ ลบ session ทิ้ง จบ | ❌ ทำไม่ได้โดยธรรมชาติ ต้องรอ expiry หรือทำ blocklist (= กลับมามี state) |
| Scale หลาย instance | ต้องมี shared store (Redis) | ฟรี — instance ไหน verify ก็ได้ |
| เหมาะกับ | web app เดี่ยว, ต้องการ logout ทันที | microservice ภายใน, service-to-service, API ที่ scale แนวนอน |

แนวตอบ senior: ไม่ใช่ "JWT ดีกว่าเพราะใหม่กว่า" แต่คือ **trade-off ระหว่าง revocability กับ statelessness** — แพทเทิร์นที่ใช้จริงคือ access token (JWT อายุสั้น 5–15 นาที) + refresh token (เก็บฝั่ง server, revoke ได้) เพื่อเอาข้อดีทั้งสองฝั่ง
จุดพังคลาสสิก: เก็บ JWT ใน localStorage (โดน Cross-Site Scripting (XSS) ขโมยได้) — httpOnly cookie ปลอดภัยกว่าสำหรับ web, อย่ายัด permission ทั้งชุดใส่ token (token บวม + ข้อมูล stale จนกว่าจะหมดอายุ)

## Sync vs Async

**Sync** — caller รอคำตอบ: ง่าย, debug ง่าย, แต่ latency บวกสะสมเป็นลูกโซ่ และ availability คูณกัน (A ต้องรอ B ต้องรอ C: 99.9% × 99.9% × 99.9% ≈ 99.7%)

**Async** — caller ฝากงานแล้วไปต่อ: ตัด coupling เชิงเวลา (B ล่มอยู่ 5 นาที งานไม่หาย แค่ delay) แลกกับความซับซ้อน: eventual consistency, ordering, duplicate, การ debug ที่ต้องมี tracing (บท 11)

เกณฑ์เลือกที่ใช้ได้จริง: **ถ้า user ต้องเห็นผลลัพธ์ก่อนไปต่อ → sync** (เช็ค stock ก่อนจ่ายเงิน) / **ถ้าแค่ "ต้องเกิดขึ้นแน่ๆ ในที่สุด" → async** (ส่ง email, อัพเดต analytics, sync ไประบบบัญชี)

## Queue ใช้เมื่อไหร่

Queue แก้ 3 ปัญหา:

1. **Decouple availability** — producer ไม่ต้องแคร์ว่า consumer ตายอยู่ (โยงบท 10)
2. **ดูดซับ spike** — traffic พีค 10 เท่าช่วง flash sale, consumer ประมวลผลตามกำลังตัวเอง แทนที่จะตายพร้อมกัน
3. **กระจายงานหนัก** — job ที่ใช้เวลา 30 วินาที ไม่ควรอยู่ใน HTTP request

ราคาที่จ่าย (ต้องพูดเองโดยไม่ต้องถูกถาม): **at-least-once delivery = จะมี message ซ้ำแน่นอน** → consumer ต้อง idempotent (บท 11), ordering ไม่การันตีข้าม partition, ต้องมี Dead Letter Queue (DLQ) สำหรับ message ที่ process ไม่ได้ ไม่งั้น message พิษตัวเดียวจะ block ทั้ง queue

## Caching

Cache แก้ปัญหาเดียว: **ของแพงที่ถูกขอซ้ำบ่อย** (query หนัก, external API, การ render)

สิ่งที่ต้องตอบได้เกินคำว่า "เร็วขึ้น":

- **Invalidation คือส่วนที่ยาก** — เลือก strategy ให้ตรง: Time To Live — TTL (ยอม stale ได้ x วินาที — ง่ายสุด ใช้ได้ 80% ของเคส), write-through (เขียนทับ cache ตอนเขียน DB), event-based (invalidate เมื่อมี event — แม่นสุด ซับซ้อนสุด)
- **Cache stampede**: key ยอดนิยมหมดอายุพร้อมกัน → ทุก request ทะลุไป DB พร้อมกัน → DB ตาย ทางกัน: jitter บน TTL, lock ให้ตัวเดียวไป rebuild, serve stale ระหว่าง rebuild
- **Cache แบบไหนอยู่ไหน**: in-process (เร็วสุด แต่ inconsistent ข้าม instance) vs Redis (แชร์ได้ แต่มี network hop) — และอย่า cache ของที่ผูก user โดยลืมใส่ user id ใน key (data leak คลาสสิก)

## Rate Limiting

จำกัดจำนวน request ต่อช่วงเวลา — ป้องกัน 3 อย่าง: abuse/scraping, ลูกค้าตัวเดียวกิน capacity ของทุกคน (noisy neighbor), และป้องกัน**ตัวเราเอง**จาก retry storm ของ client (บท 10 — Rate limit คือ Bulkhead ฝั่งขาเข้า)

Algorithm ที่ควรรู้: fixed window (ง่าย แต่ burst ที่ขอบ window ได้ 2 เท่า) → sliding window (แก้ปัญหานั้น) → **token bucket** (มาตรฐานจริง: อนุญาต burst สั้นๆ ได้ในกรอบ rate เฉลี่ย)
ฝั่ง response: คืน 429 + `Retry-After` + header บอกโควตา (`X-RateLimit-Remaining`) — client ที่ดีจะได้ backoff ถูก

## คำถามสัมภาษณ์ที่ต้องตอบได้ (แนวตอบสั้น)

- **"REST คืออะไร"** → resource + HTTP semantics + ชี้เรื่อง idempotent method กับผลต่อ retry — อย่าท่อง 6 constraints ของ Fielding
- **"401 กับ 403 ต่างกันยังไง"** → ยังไม่รู้เป็นใคร vs รู้แต่ไม่มีสิทธิ์ + ยกตัวอย่าง IDOR
- **"JWT หรือ Session ดีกว่า"** → ไม่มีคำตอบเดียว — trade-off revoke vs stateless + ท่า access/refresh token
- **"เมื่อไหร่ใช้ queue"** → decouple availability / absorb spike / งานหนัก + ราคา: duplicate, ordering, DLQ
- **"ทำไมต้อง cache แล้วมันยากตรงไหน"** → ของแพงที่ขอซ้ำ + invalidation, stampede, stale
- **"rate limit ทำไม"** → กัน abuse + noisy neighbor + retry storm, token bucket, 429 + Retry-After

ทุกข้อ โครงคำตอบเดียวกัน: **ปัญหาที่มันแก้ → ถ้าไม่มีจะเกิดอะไร → ราคาที่จ่าย → จุดพังที่เคยเห็น**

บทต่อไป: ลงชั้นข้อมูล — Index, Transaction, Isolation, Locking — หมวดที่ technical interview ใช้แยก senior ชัดที่สุด

## สรุปท้ายบท

- ศัพท์พื้นฐานสาย backend จะตอบได้ลึกก็ต่อเมื่อผูกเข้ากับปัญหาจริง ไม่ใช่ตอบเป็นนิยามลอย ๆ
- REST, auth, cache, queue หรือ rate limit ล้วนเป็นคำตอบต่อแรงกดดันคนละแบบ และทุกคำตอบมีราคาตามมาเสมอ
- คนที่ตอบระดับ senior คือคนที่เปิด trade-off และ failure mode ได้เองตั้งแต่คำตอบแรก
- บทนี้จึงทำหน้าที่เป็น vocabulary ที่จะถูกเรียกใช้ซ้ำในบท database, distributed system และ system design ทั้งหมด

## ก่อนไปบทถัดไป

เมื่อฐานคำศัพท์ backend เริ่มนิ่งแล้ว บทถัดไปจะลงลึกไปที่ชั้นข้อมูล ซึ่งเป็นจุดที่ abstraction ชั้นบนมักถูกความจริงของ database เปิดโปงเร็วที่สุด
