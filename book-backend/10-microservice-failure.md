# บทที่ 10 — Microservice Failure Handling

> แกนของบทนี้ประโยคเดียว: **ระบบ distributed ไม่มีคำว่า "เรียกแล้วได้คำตอบแน่นอน" มีแค่ สำเร็จ / ล้มเหลว / ไม่รู้** — ทุก pattern ในบทนี้คือการอยู่กับ "ไม่รู้" ให้เป็น

## เข็มทิศก่อนอ่าน

บทนี้คือจุดที่ระบบเริ่มหลุดออกจาก comfort zone ของ in-process call แล้วเข้าโลกที่ network กลายเป็นส่วนหนึ่งของ business logic โดยปริยาย timeout, retry, circuit breaker หรือ bulkhead ไม่ใช่เทคนิคเสริม แต่เป็นภาษาพื้นฐานของระบบที่ต้องคุยกับของภายนอก

ให้อ่านบทนี้โดยถือว่าความล้มเหลวไม่ใช่ข้อยกเว้น แต่เป็น input รูปแบบหนึ่ง ถ้ามองแบบนี้ trade-off ของแต่ละ pattern จะชัดขึ้นมากว่ามันกำลังป้องกันความเสียหายแบบไหนและย้ายความเสี่ยงไปไว้ตรงไหนแทน

## ความล้มเหลวในระบบกระจายคืออะไร ก่อนจะคุยเรื่อง Timeout และ Retry

ถ้าโค้ดทั้งก้อนรันอยู่ใน process เดียว ภาษาที่เราใช้คิดมักง่ายพอสมควร: เรียกฟังก์ชันแล้วได้ผล, หรือไม่ก็โยน error กลับมา แต่เมื่อระบบหนึ่งต้องคุยกับอีกระบบผ่าน network ความจริงจะเปลี่ยนทันที เพราะระหว่าง "เราส่งคำขอ" กับ "อีกฝั่งทำงานและตอบกลับ" มีชิ้นส่วนอีกหลายชั้นเข้ามาเกี่ยว เช่น DNS, load balancer, socket, thread pool, queue, database และตัว service ปลายทางเอง

ผลคือคำตอบของการเรียกหนึ่งครั้งไม่ได้มีแค่สำเร็จหรือล้มเหลว แต่มีอย่างน้อยสามสถานะ:

- **สำเร็จ**: ปลายทางทำงานและเรารับคำตอบกลับมาครบ
- **ล้มเหลวชัดเจน**: ปลายทางตอบ error หรือเชื่อมต่อไม่ได้
- **ไม่รู้**: timeout ไปแล้ว แต่เราไม่รู้ว่าปลายทางทำไปถึงไหน เช่น เขาอาจทำสำเร็จแล้วแต่ response หายระหว่างทาง

สถานะที่สามนี่เองคือจุดที่ระบบ distributed ยากกว่าระบบใน process เดียวมาก เพราะมันบังคับให้เราออกแบบเผื่อ "ความไม่แน่ใจ" ไม่ใช่แค่เผื่อ error message ตัวอย่างคลาสสิกคือการจ่ายเงิน: ถ้า client timeout หลังยิง charge request เราตอบไม่ได้ทันทีว่าเงินถูกตัดหรือยัง ถ้าสุ่ม retry โดยไม่คิดเรื่อง idempotency ก็อาจกลายเป็นการตัดเงินซ้ำ

เพราะเหตุนี้บทนี้จึงไม่ได้สอนให้ "กันระบบล่ม" แบบโรแมนติก แต่สอนให้ยอมรับว่าระบบล่ม ช้า ค้าง และตอบไม่ครบเป็นเรื่องปกติ แล้วใช้ timeout, retry, circuit breaker, bulkhead และ rate limit เป็นเครื่องมือจำกัดความเสียหายไม่ให้ลาม

## Timeout — พื้นฐานที่พังบ่อยสุด

ทุก external call ต้องมี timeout — **missing timeout คือสาเหตุ cascade failure อันดับหนึ่ง**: B ช้า → thread/connection ของ A ถูกยึดค้าง → pool ของ A เต็ม → A ตายทั้งที่ B แค่ช้า → ไล่ขึ้นไปถึง user ทุกคน

- Default ของหลาย client คือ **ไม่มี timeout** (`http.Client{}` ของ Go = รอชั่วนิรันดร์, `requests.get()` ของ Python เช่นกัน) — ต้องตั้งเองเสมอ
- ตั้งเท่าไหร่: จาก p99 latency จริงของ downstream + งบเวลา (latency budget) ของทั้งเส้น — ไม่ใช่เลขกลมๆ จากอากาศ; timeout ชั้นนอกต้องมากกว่าชั้นในรวมกัน ไม่งั้น retry ชั้นนอกจะยิงใส่งานที่ยังวิ่งอยู่
- Go: `context.WithTimeout` ส่งผ่านทั้งเส้น (deadline propagation — เหลือเวลาเท่าไหร่บอกต่อ) · Java: timeout สามชั้น connect/read/call (Resilience4j TimeLimiter) · Python: `httpx.Timeout` + อย่าลืม timeout ฝั่ง DB (statement timeout — บท 7)

## Retry + Backoff — ยาแรงที่กลายเป็นพิษง่ายที่สุด

Retry แก้ **transient failure** (network สะดุด, 503 ชั่วคราว) แต่:

- **Retry storm**: downstream ล้มเพราะ overload → ทุก client retry พร้อมกัน → โหลดคูณ 3–4 เท่า → ล้มลึกกว่าเดิม ฟื้นไม่ได้
- กติกา retry ที่ถูก: (1) retry เฉพาะของที่ retry แล้วมีหวัง — 5xx/timeout ใช่, 4xx ไม่ใช่ (บท 6) (2) **exponential backoff + jitter** (สุ่มเวลา กันทุกคน retry จังหวะเดียวกัน) (3) จำกัดครั้ง + จำกัดงบรวม (retry budget — ถ้า >10% ของ traffic คือ retry แปลว่ากำลังตีคนป่วย หยุด) (4) retry เฉพาะ operation ที่ **idempotent** — POST ที่ไม่มี idempotency key ห้าม retry (บท 11)
- Retry ซ้อนชั้น (client retry 3 × gateway retry 3 × service retry 3 = 27 ครั้ง) — เลือก retry ชั้นเดียว ที่เหลือ fail fast

## Circuit Breaker — หยุดตีคนป่วย

เมื่อ downstream พังต่อเนื่อง การพยายามต่อ = ทรมานทั้งสองฝ่าย (เผา thread เรา + ถล่มเขา) — circuit breaker ตัดวงจรอัตโนมัติ:

- **Closed** (ปกติ) → error rate เกิน threshold → **Open**: fail ทันทีไม่ยิงจริง ให้ downstream ได้หายใจ → ครบเวลา → **Half-open**: ปล่อย request ทดลองไม่กี่ตัว → สำเร็จกลับ Closed, พังกลับ Open
- จุดสำคัญกว่าตัว state machine: **ตอน Open จะทำอะไรแทน (fallback)** — คืน cached/stale data, คืน default (แนะนำสินค้าแบบ generic แทน personalized), degrade feature (ซ่อน review section) หรือ fail ชัดๆ พร้อมข้อความดี — นี่คือการตัดสินใจ **เชิงธุรกิจ** ไม่ใช่เชิงเทคนิค ต้องคุยกับ product ล่วงหน้า
- แยก breaker ต่อ downstream (payment พังอย่าตัด search) · เครื่องมือ: Resilience4j (Java), pybreaker/tenacity (Python), sony/gobreaker (Go), หรือปล่อยเป็นหน้าที่ service mesh (Istio/Envoy)
- Breaker คือ **library ใน process ฝั่งผู้เรียก** — สถานะ OPEN/CLOSED อยู่ใน memory ของเราเอง ไม่มี broker เกี่ยว · คู่แฝดฝั่ง async: ปลายทางป่วย consumer แค่**หยุดกิน** (pause, ไม่ ack) — message นอนรอใน broker อย่างปลอดภัย = "ห้องรอ" ในตัว; และประกอบกันได้: breaker ที่ขาออกของ consumer เปิด → pause การกิน → งานสะสมในคิวแทนที่จะ fail — จำ: **sync = breaker (fail fast) / async = broker (buffer ให้รอ)** — คนละกลไก แก้โรคเดียวกัน: อย่าตีคนป่วย และอย่าตายตามเขา

## Bulkhead — จำกัดรัศมีระเบิด

แบ่ง resource เป็นช่องแยกเหมือนผนังกั้นน้ำในเรือ: payment call ใช้ pool ตัวเอง 20 connection, report ใช้อีก pool — report ช้าจึงจมแค่ช่องตัวเอง ไม่ลาก checkout ตาย
รูปธรรม: แยก thread pool / connection pool / semaphore ต่อ downstream, แยก worker queue ต่องานหนัก-เบา, kubernetes resource limit ต่อ pod คือ bulkhead ระดับ infra — โยงบท 6: rate limit คือ bulkhead ฝั่งขาเข้า

## Rate Limit ฝั่ง service (ขาเข้า + ขาออก)

- ขาเข้า: กันตัวเองจาก client บ้าคลั่ง (บท 6 ว่าไว้แล้ว — token bucket, 429, Retry-After)
- ขาออกที่คนลืม: **เราต้องเคารพ rate limit ของคนอื่น** — ยิง third-party เกินโควตาแล้วโดนแบน = self-inflicted outage; ใช้ client-side limiter (`golang.org/x/time/rate`, `aiolimiter`) + อ่าน `Retry-After` ที่เขาตอบมา

## Service Discovery & API Gateway (โผล่ในสัมภาษณ์บ่อย)

- **Service discovery**: instance เกิด-ตาย-ย้าย IP ตลอด ใครบอก caller ว่าตัวไหนยังอยู่ — DNS ธรรมดา (K8s Service ทำให้ฟรี), registry (Consul/Eureka) เมื่ออยาก client-side load balancing; ประเด็น senior: health check ต้องแยก **liveness** (ยังหายใจ) กับ **readiness** (พร้อมรับงาน — dependency ครบ) ไม่งั้น instance ที่กำลัง warm-up จะโดนยัด traffic
- **API Gateway**: ประตูเดียวฝั่งขอบระบบ — auth, rate limit, routing, TLS termination รวมที่เดียวแทนให้ทุก service ทำเอง; กับดัก: gateway ที่เริ่มมี business logic = God Service หน้าประตู (orchestration ควรอยู่ใน service/Backend for Frontend (BFF) ไม่ใช่ gateway)

## เลนที่แบ่งทุกอย่าง: user รอคำตอบอยู่ไหม

เจอ downstream ป่วย ให้ถามคำถามนี้ก่อนเลือกเครื่องมือ:

- **รอ** (เช็ค stock ก่อนจ่าย, จ่ายเงินที่ต้องรู้ผลทันที) → เลน sync: timeout + retry สั้นๆ + breaker + **fallback** — ให้คำตอบเดี๋ยวนี้ แม้เป็นคำตอบสำรอง
- **ไม่รอ** (email, report, แจ้งเตือน, sync ข้อมูลข้ามระบบ) → เลน queue: outbox → relay → retry/backoff → Dead Letter Queue (DLQ) (บท 11) — **ความป่วยของปลายทางกลายเป็นแค่ delay ไม่ใช่ downtime**: SendGrid ล่มครึ่งชั่วโมง order ยังไหล ลูกค้าแค่ได้เมลช้า พอฟื้นเมลค้างไหลออกหมด — เทียบกับส่งเมล sync ใน request: SendGrid ล่ม = สั่งซื้อไม่ได้ทั้งเว็บ ทั้งที่เมลไม่ใช่หัวใจการซื้อ

Report ใหญ่คือเลนไม่รอโดยกำเนิด (ต่อให้ไม่มีใครป่วย — ประมวลผล 5 นาทีให้ user ถือ connection รอไม่ได้): `POST /reports → 202 Accepted + id` → ทำเบื้องหลัง → client polling `GET /reports/{id}` หรือส่งลิงก์ให้ทางเมล

## ประกอบร่าง: ลำดับป้องกันหนึ่ง request

```
[client] → rate limit → auth → | bulkhead (จอง slot) → circuit breaker (วงจรเปิดอยู่ไหม)
        → timeout (งบเวลา) → เรียกจริง → พลาด? → retry (ถ้าคุ้มและ idempotent) | → fallback
```

ทุกชั้นตอบคำถามเดียว: **พังแล้วยังไงต่อ** — ไม่มีชั้นไหนทำให้ "ไม่พัง" มีแต่ทำให้พังแบบควบคุมได้

## คำถามสัมภาษณ์ที่ต้องตอบได้

- **"ถ้า service ช้าทำให้ระบบล่มต่อกัน ป้องกันยังไง"** → ไล่เป็นชุด: timeout (ตัดการรอ) → bulkhead (จำกัดรัศมี) → circuit breaker (หยุดตี) → fallback (ธุรกิจยอมรับอะไรได้) — และชี้ว่าต้นตอ 90% คือ missing timeout
- **"Retry ยังไงให้ปลอดภัย"** → เฉพาะ transient + idempotent, exponential backoff + jitter, จำกัดงบ, ชั้นเดียว
- **"Circuit breaker ทำงานยังไง"** → สาม state สั้นๆ แล้วรีบไปที่ของจริง: threshold ตั้งจากอะไร + fallback คืออะไรในเคสธุรกิจนั้น
- **"ทำไม A→B→C แล้วทั้งเส้นช้า"** → latency บวกสะสม + availability คูณกัน (บท 6) + pool exhaustion จากการรอ — คำตอบเชิงออกแบบ: ตัดเส้นให้สั้น (ข้อมูลซ้ำซ้อนได้/cache) หรือเปลี่ยนเป็น async (บท 9)

บทต่อไป: ปัญหาที่ยากที่สุดของ distributed system — ความถูกต้องของข้อมูลข้าม service: Saga, Outbox, Idempotency

## สรุปท้ายบท

- โลก distributed บังคับให้เรายอมรับความไม่แน่นอนเป็นส่วนหนึ่งของการออกแบบ ไม่ใช่ข้อยกเว้น
- timeout, retry, backoff, circuit breaker และ bulkhead เป็นกลไกจัดการความเสียหาย ไม่ใช่กลไกทำให้ระบบปลอดความล้มเหลว
- ทุก pattern ในบทนี้มี trade-off ของมันเอง และใช้ผิดแล้วมักขยาย incident แทนที่จะจำกัดวง
- บทนี้จึงเป็นภาษาพื้นฐานของการออกแบบ service ที่ต้องพึ่งของภายนอกใน production จริง

## ก่อนไปบทถัดไป

เมื่อยอมรับแล้วว่า transaction ใหญ่ข้าม service ไม่มีจริง บทถัดไปจะพาไปยังคำตอบเชิงสถาปัตยกรรมของงานหลายขั้นตอน นั่นคือ saga, outbox และ idempotency
