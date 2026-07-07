# บทที่ 20 — DevOps & Security Essentials สำหรับ Dev Lead

> Lead ไม่ต้องเป็น Site Reliability Engineer (SRE) หรือ security engineer — แต่ต้องตอบได้ว่า **ของขึ้น production ยังไง, รู้ได้ไงว่าพัง, และช่องโหว่พื้นฐานสิบตัวกันครบหรือยัง** เพราะคำถามพวกนี้มาแน่ในสัมภาษณ์ระดับ lead

## เข็มทิศก่อนอ่าน

บทนี้ขยายภาพของ Dev Lead ออกจาก codebase ไปสู่ระบบที่ต้องมีคน deploy, monitor และปกป้องจริง ความรู้ระดับนี้ไม่ได้ต้องทำแทนทุกบทบาท แต่ต้องพอเห็นภาพรวมและถามคำถามถูกเมื่อของกำลังจะขึ้น production หรือเมื่อมี incident เกิดขึ้น

ให้อ่านบทนี้แบบเชื่อม DevOps กับ security เข้ากับเรื่อง reliability และ ownership ไม่ใช่มองเป็นหมวดย่อยปลายทาง เพราะในโลกจริงของที่ deploy ไม่ได้ ป้องกันไม่พอ หรือสังเกตอาการไม่ได้ ก็คือของที่ยังออกแบบไม่จบ

## CI/CD

**CI (Continuous Integration)** — ทุก merge ต้องผ่านประตูอัตโนมัติ: build → lint/format → unit → integration → (contract — บท 12) → architecture rule (บท 4) — เร็วพอที่คนไม่หนี (เป้า < 10 นาที; ช้ากว่านั้นคนจะเริ่ม skip)
**CD (Continuous Delivery/Deployment)** — deploy เป็นเรื่องน่าเบื่อที่กดได้ทุกวัน ไม่ใช่พิธีกรรมคืนวันศุกร์

สิ่งที่ senior ต้องแยกได้: **deploy ≠ release** — deploy คือเอา code ขึ้นเครื่อง, release คือเปิดให้ user เห็น (คุมด้วย feature flag) การแยกสองอย่างนี้คือเครื่องมือลดความเสี่ยงที่แรงสุด:

- **Rolling** — ทยอยเปลี่ยนทีละ instance (default ของ Kubernetes (K8s))
- **Blue-green** — สลับทั้งชุด rollback = สลับกลับ (จ่ายค่าเครื่อง 2 เท่าช่วงสลับ)
- **Canary** — ปล่อย 1–5% ดู error rate/latency ก่อนค่อยขยาย — ท่ามาตรฐานของระบบที่มี traffic จริง
- ทุกแบบต้องตอบได้ว่า **rollback ยังไงภายในกี่นาที** และ DB migration ต้อง backward compatible (expand → migrate → contract: เพิ่ม column ใหม่ก่อน, deploy code ที่ใช้ได้ทั้งสอง, ค่อยลบของเก่า — ห้าม rename ทีเดียว)

## Container & Kubernetes — ระดับที่ lead ต้องตอบได้

**Container** = แพ็ค app + dependency เป็นก้อนเดียว รันเหมือนกันทุกที่ — จบปัญหา "เครื่องผมรันได้"
สิ่งที่ควรพูดได้ใน Dockerfile: multi-stage build (image เล็ก, ไม่มี compiler ใน production), non-root user, pin version, `.dockerignore`

**Kubernetes** = ระบบที่ทำให้ **desired state เป็นจริงเอง**: ประกาศว่าอยากได้ 3 replica → pod ตายมันสร้างใหม่เอง ศัพท์ที่ต้องใช้เป็น: Pod (หน่วยรัน) · Deployment (คุม replica + rolling update) · Service (จุดเข้าถึงที่ IP นิ่ง — service discovery ของบท 10) · Ingress (ประตู HTTP) · Horizontal Pod Autoscaler (HPA) (scale ตาม load)

จุดที่โยงกลับเข้าเล่ม (และทำให้คำตอบดูเป็น lead ไม่ใช่ ops):

- **Liveness vs readiness probe** — บท 10 เป๊ะๆ: liveness ผิด = restart วน, readiness ผิด = traffic เข้า instance ที่ยังไม่พร้อม
- **Resource requests/limits** = bulkhead ระดับ infra (บท 10) — ไม่ตั้ง = pod เดียวกิน node ทั้งตัว
- App ต้อง **stateless + graceful shutdown** (รับ SIGTERM → หยุดรับงานใหม่ → ทำงานค้างให้จบ → ตาย) ไม่งั้น rolling deploy = ทำ request user หายทุกรอบ
- คำตอบที่ดีเวลาโดนถามว่า "ต้องใช้ K8s ไหม": ไม่เสมอ — ทีมเล็ก service เดียว ใช้ managed platform (Cloud Run, Elastic Container Service (ECS), App Service) จ่ายค่า complexity ต่ำกว่าเยอะ (YAGNI — บท 1 ใช้กับ infra ด้วย)

## Observability สามขา (ต่อจากบท 11)

- **Logs** — structured (JSON) + trace_id ทุกบรรทัด (บท 11) + ห้ามมี Personally Identifiable Information (PII)/secret ใน log
- **Metrics** — RED ต่อ service: Rate, Errors, Duration (p50/p95/p99 — ไม่ใช่ average เพราะ average โกหก) + USE ต่อเครื่อง (Utilization, Saturation, Errors)
- **Traces** — เส้นทาง request ข้าม service (OpenTelemetry — บท 11)

หลัก alert ที่ใช้ตอบสัมภาษณ์: **alert เมื่อ user เจ็บ** (error rate, latency Service Level Objective (SLO)) ไม่ใช่เมื่อ CPU สูง — CPU 90% ที่ user ไม่รู้สึกคือ efficiency, alert noise ที่ปลุกคนตีสามบ่อยๆ จะถูก mute แล้ววันที่พังจริงไม่มีใครดู

## Observability Playbook — จาก request หนึ่งเส้นไปถึง root cause

สามขาที่พูดข้างบนเป็นภาพรวม แต่เวลาของพังจริง interviewer มักไม่ได้ถามว่า "logs/metrics/traces มีอะไรบ้าง" เขาถามว่า **"ระบบช้าแล้วคุณเริ่มจากไหน"** หรือ **"user บอกจ่ายเงินไม่ได้ แต่ dashboard เขียวหมด คุณไล่ยังไง"**

วิธีตอบที่ดูเป็นคนเคย operate จริงต้องเดินเป็นลำดับ:

1. เริ่มจาก **symptom ที่ user เห็น** ก่อน ไม่ใช่เริ่มจาก dashboard ที่เราชอบ
2. ใช้ **metrics** หา blast radius ว่ากระทบกว้างแค่ไหน
3. ใช้ **trace** หา hop ที่ช้าที่สุดหรือพังที่สุด
4. ใช้ **structured logs** ขุด context ราย request
5. ปิดท้ายด้วย **สิ่งที่จะเพิ่มเพื่อให้ครั้งหน้าหาเร็วขึ้น**

### ตัวอย่างการไล่ incident

สถานการณ์: ทีม support แจ้งว่า "บาง order ค้างที่สถานะ `PENDING_PAYMENT` นานผิดปกติ"

ลำดับไล่ที่ดี:

- เปิด metric ของ `POST /orders/{id}/pay` ดู error rate, p95, p99, volume ต่อ minute
- ถ้า error rate ไม่สูงแต่ p99 พุ่ง แปลว่าอาจไม่ใช่ bug ล้วน อาจเป็น downstream ช้าหรือ thread/pool ตัน
- เปิด trace ของ request ช้าที่สุด 1 เส้น ดูว่าเวลาไปกองที่ service ไหน เช่น `payment-gateway` ใช้ 8 วินาที
- ใช้ trace id เดียวกันกระโดดไปดู log ของ service นั้นต่อ หา timeout, retry storm, circuit breaker open หรือ DB lock
- ถ้าหาเจอว่า gateway ช้าเพราะ retry ซ้อนสองชั้น บทเรียนไม่ใช่แค่ "แก้ timeout" แต่ต้องลบ retry ชั้นที่เกินและใส่ alert ที่ชี้ปัญหานี้เร็วกว่านี้

นี่คือเหตุผลที่ observability ที่ดีไม่ใช่ "เก็บทุกอย่าง" แต่คือเก็บพอให้ **ข้ามจาก metrics → trace → logs** ได้โดยไม่หลงทาง

### Trace ที่ดีต้องมี span ที่มีความหมาย

trace ที่ไม่มี structure ช่วยอะไรไม่มากไปกว่าลายเส้นบนจอ หลักง่าย ๆ:

- 1 request หลัก = 1 root span
- ทุก external call สำคัญควรมี child span
- ใส่ business attribute เท่าที่ช่วย debug จริง เช่น `order.id`, `payment.provider`, `retry.attempt`
- อย่าใส่ข้อมูลลับหรือข้อมูลที่ cardinality ระเบิด เช่น email, raw SQL ทั้งก้อน, full payload

ตัวอย่าง Java ด้วย OpenTelemetry API ที่ใช้ได้จริงกับรอยต่อสำคัญ:

```java
Span span = tracer.spanBuilder("payment.charge").startSpan();
try (Scope scope = span.makeCurrent()) {
    span.setAttribute("order.id", orderId);
    span.setAttribute("payment.provider", "stripe");

    PaymentResult result = gateway.charge(command);

    span.setAttribute("payment.status", result.status());
    return result;
} catch (Exception ex) {
    span.recordException(ex);
    span.setAttribute("error", true);
    throw ex;
} finally {
    span.end();
}
```

แนวคิดสำคัญจากเอกสาร OpenTelemetry คือ span ต้อง **record exception** และต้อง `end()` เสมอ ไม่อย่างนั้น trace จะขาดหรือหลอกคนอ่านทีหลัง

### Correlation ID และ Trace Context ต้องวิ่งทั้งเส้น

ข้อผิดพลาดคลาสสิกคือ FE มี request id ของ FE, API gateway มีอีก id, service ข้างในมีอีก id แล้วไม่มีใคร map กันได้ เวลาหา incident จริงทุกคนต้องเดาจาก timestamp แทน

แนวที่ดีคือใช้มาตรฐานเดียว เช่น `traceparent` หรืออย่างน้อย correlation id เดียวไหลตลอดเส้น:

```java
String traceId = request.getHeader("X-Correlation-Id");
if (traceId == null || traceId.isBlank()) {
    traceId = UUID.randomUUID().toString();
}
MDC.put("traceId", traceId);
response.setHeader("X-Correlation-Id", traceId);
```

แล้ว log ทุกบรรทัดต้องออก `traceId` นี้มาด้วย เพื่อให้กระโดดจาก alert → trace → logs ได้เส้นเดียวกัน

### Metric ที่ควรมีตั้งแต่วันแรก

สำหรับ service HTTP ทั่วไป metric ขั้นต่ำที่ควรมีคือ:

- request rate ต่อ endpoint
- error rate แยก 4xx/5xx
- latency อย่างน้อย p50/p95/p99
- in-flight requests
- DB pool saturation / thread pool queue length
- downstream call latency แยก provider

สิ่งที่ทีมพลาดบ่อยคือเก็บ average อย่างเดียว แล้วบอกว่า "ระบบยังเร็วอยู่" ทั้งที่ p99 ยาว 12 วินาที คนที่เจ็บจริงคือหาง distribution ไม่ใช่ค่าเฉลี่ย

### Alert ที่ดีต้องผูกกับ action

alert ที่ดีต้องตอบสองคำถามได้:

1. ถ้าปลุกคนขึ้นมาดูตอนนี้ เขาควรทำอะไรต่อ
2. ถ้าไม่ทำอะไรใน 15 นาที user จะเสียหายแค่ไหน

ตัวอย่าง alert ที่ดี:

- `checkout.error_rate > 3% for 10m`
- `payment.p99 > 5s for 15m`
- `queue_dlq_messages > 0` สำหรับงานที่ห้ามตกแม้ข้อความเดียว

ตัวอย่าง alert ที่แย่:

- CPU > 80%
- memory > 70%
- log volume สูง

ไม่ใช่ว่า metric พวกนี้ไม่มีค่า แต่ยังไม่พอจะบอกว่า user กำลังเจ็บหรือไม่

## OWASP (Open Worldwide Application Security Project) Top 10 — ฉบับที่ต้องเล่าได้พร้อมวิธีกัน

เรียงตามที่เจอจริงบ่อยใน code review:

1. **Broken Access Control** (อันดับ 1 หลายปีซ้อน) — Insecure Direct Object Reference (IDOR): `GET /orders/999` ของคนอื่น → ทุก query scope ด้วย identity (บท 6), deny by default
2. **Injection** — SQL/command injection → parameterized query เท่านั้น (Object-Relational Mapping (ORM) ช่วยแต่ raw query ที่ concat string ยังโผล่ใน codebase จริงเสมอ), validate input ที่ขอบ
3. **Broken Authentication** — session fixation, brute force → ใช้ framework มาตรฐาน อย่าเขียน auth เอง, rate limit ที่ login (บท 6), MFA (multi-factor authentication)
4. **Cryptographic Failures** — password ต้อง bcrypt/argon2 (ไม่ใช่ MD5/SHA256 เปล่าๆ), Transport Layer Security (TLS) ทุกเส้นรวมภายใน, secret ไม่อยู่ใน code/env file ที่ commit (ใช้ secret manager + rotate ได้)
5. **Security Misconfiguration** — debug mode เปิดใน prod, default credential, S3 เปิด public, stack trace โชว์ user → hardening checklist + scan ใน CI
6. **Vulnerable Dependencies** — supply chain: `npm audit`/Dependabot/Trivy ใน CI + มี process อัพเดตจริง (alert ที่ไม่มีใครแก้ = ไม่มี)
7. **SSRF (Server-Side Request Forgery)** — server ถูกหลอกให้ยิง URL ภายใน (`http://169.254.169.254/` เอา cloud credential) → allowlist ปลายทาง, แยก network egress

ที่เหลือ (insecure design, logging failure, integrity) พูดรวมได้ว่า: security เป็น**คุณสมบัติของ design ไม่ใช่ feature ที่เติมทีหลัง** — threat modeling ตอน design review, security test ใน CI, least privilege ทุกชั้น (DB user ของ service อ่านได้เฉพาะ schema ตัวเอง — ล้อกับ boundary บท 4, 15)

## คำถามสัมภาษณ์ที่ต้องตอบได้

- **"deploy ยังไงให้ไม่ downtime"** → rolling/canary + deploy≠release (feature flag) + DB migration แบบ expand-contract + rollback plan — ตอบครบชุดนี้คือจบ
- **"รู้ได้ไงว่าระบบมีปัญหา ก่อน user โทรมา"** → RED metrics + alert บน SLO ไม่ใช่บน CPU + tracing ไล่หา root cause — และ p99 ไม่ใช่ average
- **"K8s จำเป็นไหม"** → ตอบแบบ trade-off ไม่ใช่แบบแฟนคลับ: ได้ self-healing + declarative แลก operational complexity — ทีมเล็กใช้ managed ก่อน
- **"review PR แล้วดู security ตรงไหนบ้าง"** → access control ระดับ object, input ที่ไป query/command, secret ใน code, dependency ใหม่ — สี่อย่างนี้จับได้ 80% ของช่องโหว่จริง
- **"เก็บ password ยังไง"** → bcrypt/argon2 + salt (อยู่ในตัว), ห้าม reversible encryption — ถ้าตอบ encrypt = ตกทันที

---

จบเล่ม — โครงทั้งหมด: **หลักคิด (1–5) → ความรู้ backend (6–7) → patterns (8–9) → distributed (10–11) → คุณภาพ (12–14) → สนามจริง (15–16) → สนามสัมภาษณ์ (17–20)** — โชคดีกับการสัมภาษณ์ครับ 🚀

## สรุปท้ายบท

- DevOps และ security สำหรับ Dev Lead คือความสามารถในการเห็นภาพรวมของการ deploy, สังเกตอาการ และป้องกันความเสี่ยงพื้นฐานได้ ไม่ใช่การทำแทน specialist ทุกเรื่อง
- ความรู้หมวดนี้เชื่อม reliability, observability และ security เข้ากับ architecture โดยตรง เพราะของที่ออกแบบดีแต่ deploy ไม่ปลอดภัยหรือ monitor ไม่ได้ก็ยังถือว่าไม่จบ
- คนที่ตอบหมวดนี้ได้ดีจะพูดเป็นระบบ เห็น trade-off และผูกคำตอบกับ operational reality มากกว่ากับ tool ยอดนิยม
- บทนี้จึงทำหน้าที่ปิดเล่มหลัก ด้วยการพาภาพของ Dev Lead ออกจาก code ไปจนถึงการดูแลระบบที่มีคนใช้จริง

## ก่อนไปภาคผนวก

เล่มหลักจบแล้ว แต่ถ้าอยากซ้อมมุม production ที่เจอในสนามสัมภาษณ์จริงต่อ ภาคผนวกถัดไปจะรวมคำถาม incident-style ที่ใช้วัดวิธีวินิจฉัยและความเข้าใจเชิงปฏิบัติของคุณโดยตรง
