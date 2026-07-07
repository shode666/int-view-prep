# บทที่ 12 — Testing Architecture

> ประโยคแกนของบท (และของทั้งเล่ม): **ถ้า business logic test ยาก แปลว่า design มีปัญหา — coupling สูงหรือ dependency ไม่ชัด** — test ไม่ใช่แค่ตาข่ายกันพลาด มันคือ feedback loop ที่ฟ้องคุณภาพ design เร็วที่สุด

## เข็มทิศก่อนอ่าน

บทนี้ควรอ่านเหมือนบทตรวจสุขภาพของทุกบทก่อนหน้า เพราะ design ที่ดีต้องทดสอบได้ ไม่ใช่แค่ดูสวยบน whiteboard เมื่อ unit test ยาก, integration test เปราะ หรือ E2E ต้องแบกทุกอย่างไว้คนเดียว มักแปลว่าปัญหาจริงอยู่ที่รอยต่อและความรับผิดชอบของโค้ด ไม่ใช่ที่เครื่องมือ test

ให้อ่านโดยมอง test เป็นกลไก feedback ต่อ architecture ไม่ใช่เป็นงานปลายทาง ถ้าคิดแบบนี้ คุณจะเริ่มใช้ test เพื่อชี้ว่าการออกแบบส่วนไหนกำลังฝืนธรรมชาติของระบบ

## Test Pyramid

```
        ▲  E2E          น้อย (5–10%) — ช้า แพง เปราะ แต่เชื่อได้สุด
       ▲▲  Integration  กลาง (~20–30%) — ต่อของจริงเฉพาะรอยต่อ
    ▲▲▲▲▲  Unit         ฐาน (~70%) — เร็วระดับ ms, รันทุก save
```

เหตุผลของสัดส่วน: ต้นทุน feedback — unit บอกผลใน 2 วินาที, E2E (End-to-End) บอกใน 20 นาที และบอกแค่ "พังที่ไหนสักที่"
Anti-pattern ที่ต้องเรียกชื่อได้: **Ice cream cone** (E2E เยอะ unit น้อย — CI 40 นาที, flaky, ไม่มีใครกล้า refactor) และ **Hourglass** (unit กับ E2E เยอะ แต่ไม่มี integration — mock ทุกอย่างจน test ผ่านแต่ระบบจริงต่อกันไม่ติด)

## Unit / Integration / Contract / E2E — ใครทำหน้าที่อะไร

- **Unit**: logic ล้วนใน memory — โยงบท 5: domain (`Order.place`) ต้อง test ได้ **โดยไม่มี mock เลย** ถ้าต้องมี = domain แอบพึ่ง I/O
- **Integration**: รอยต่อกับของจริง — repository กับ Postgres จริง (testcontainers — อย่า test SQL กับ SQLite แล้วภาวนาว่า Postgres จะเหมือน), consumer กับ broker จริง
- **Contract test**: กันปัญหา "mock โกหก" ข้าม service — consumer ประกาศ expectation (Pact), provider รัน expectation นั้นใน CI ตัวเอง → provider เปลี่ยน API แล้ว build แดง **ก่อน deploy** ไม่ใช่หลัง production พัง; ครอบคลุม event schema ด้วย (schema registry + compatibility check คือ contract test ของบท 9)
- **E2E**: flow ธุรกิจสำคัญไม่กี่เส้น (place order → paid → shipped) บน environment จริง — smoke ไม่ใช่ regression suite

## Test Double — Mock / Stub / Fake ใช้ให้ถูกตัว

**Test Double** คือคำแม่ (ล้อกับ stunt double — ตัวแสดงแทนในหนัง): ของปลอมทุกชนิดที่ยืนแทน **dependency** ของหน่วยที่กำลังเทส (**SUT — System Under Test**) — ย้ำ: แทน*สิ่งที่ SUT เรียกใช้* ไม่ใช่*ข้อมูลที่ SUT รับเข้า* (parameter/object ที่สร้างใส่ = test data ธรรมดา ไม่นับ) — ประโยค "domain test ต้องไม่มี double เลย" จึงแปลว่า domain ไม่มี dependency ให้ต้องแทน (pure: data เข้า → data ออก) ไม่ใช่ห้ามใส่ข้อมูล

ห้าสายพันธุ์ เรียงจากโง่สุด → ฉลาดสุด:

- **Dummy**: เติมช่องให้ครบ signature ไม่เคยถูกใช้ — dummy เยอะผิดปกติ = class รับของเกินจำเป็น (ISP ฟ้อง)
- **Stub**: บทพูดตายตัว — จัดฉากขาเข้า ("stock เหลือ 0", `thenThrow(TimeoutException)`, `Clock.fixed()`, `failNext(2)` สำหรับเทส retry) — failure case ทั้งบท 10 เทสได้เพราะตัวนี้
- **Spy**: เครื่องบันทึกที่เราแกะดูเอง (`spy.sent` เป็น List แล้ว assert ด้วยมือ) — ระวัง `Mockito.spy()` คืออีกความหมาย: ห่อของจริงแล้วดักบาง method
- **Mock**: บันทึกการถูกเรียกไว้ `verify` — ใช้เมื่อ **การเรียกคือผลลัพธ์**: งานที่ไม่มี return ไม่มี state ให้ดู เพราะผลของมันคือการกระทำต่อโลกภายนอก (ส่งเมล, publish event) — ภาพจำ: **กล้องวงจรปิดที่แต่งตัวเป็นพนักงาน** ถอดพนักงานจริงออก เอากล้องไปยืนแทน จบเทสมาดูเทปว่า SUT เดินมาสั่งงานถูกไหม (ถูกเรียกไหม / กี่ครั้ง / ด้วยอะไร) — และตรวจ "ความว่างเปล่า" ได้ด้วย: `verify(mailer, never()).send(any())` — การไม่ส่งคือการไม่มีอยู่ของการเรียก ซึ่ง state ที่ไหนก็บอกไม่ได้
- **Fake**: implementation จริงอย่างง่าย (in-memory repository ที่ save แล้ว find เจอจริง) — **ไม่มีสคริปต์ มีพฤติกรรมจริง** — ตัวที่มีค่าที่สุดและถูกใช้น้อยที่สุด: test ผ่าน fake **ไม่เปราะต่อ refactor** เพราะ assert ที่ผลลัพธ์ ไม่ใช่ที่ลำดับการเรียก · การ inject fake คือ**การสลับโลกทั้งใบ ไม่ใช่การดักของหลุด** — use case รู้จักแค่ port (DIP บท 2) จึงไม่มีทางแตะ DB จริงโดยโครงสร้าง ไม่ต้องเฝ้าระวังอะไรเลย

สูตรจำ: **dummy เติมช่อง / stub ป้อนขาเข้า (arrange) / spy+mock ตรวจขาออก (assert) / fake คือโลกจำลอง**

Mockito ทำให้คนเรียกทุกอย่างว่า "mock" เพราะ object เดียวเล่นได้สองบท: `when(...).thenReturn(...)` = บท stub (จัดฉาก) / `verify(...)` = บท mock (ตรวจการเรียก) — แยกด้วยจังหวะที่ใช้ ไม่ใช่ชื่อ method

กติกาที่แยกทีมที่ test ดี: **fake ต้องผ่าน contract test ชุดเดียวกับของจริง** (บท 3 — LSP) ไม่งั้น fake คือคำโกหกที่รันเร็ว

กลิ่นเน่าจาก mock:

- Mock 5+ ตัวใน test เดียว → SUT พึ่งเยอะเกิน (บท 2 ฟ้อง coupling)
- `verify(repo).save(); verify(mapper).map(); ...` ไล่ทุกบรรทัดของ implementation → test ผูกกับ "ทำยังไง" ไม่ใช่ "ได้อะไร" → refactor ทีแดงทั้งกระดานทั้งที่ behavior ไม่เปลี่ยน
- Mock ของที่ไม่ใช่ของเรา (mock `stripe.Client` ทั้ง SDK) → ควร mock ที่ **port ของเรา** (`PaymentGateway` — บท 8 Adapter) แล้ว test adapter แยกด้วย integration/recorded test

## Testing แต่ละชั้น (โยงบท 5)

| ชั้น | Test ด้วย | Assert ที่ |
|---|---|---|
| Domain | unit ล้วน ไม่มี double | ผลลัพธ์ + invariant |
| Use case | fake repo/gateway ใน memory | state ปลายทาง + event ที่ publish |
| Repository | Postgres จริง (testcontainers) + contract suite เดียวกับ fake | query ถูก, mapping ครบ, constraint ทำงาน |
| HTTP layer | app จริง + fake ชั้นใน (supertest/TestClient/httptest) | status, body shape, validation |
| Event flow | broker จริงใน integration / fake bus ใน unit | consumer idempotent, ack semantics |

## Coverage — เลขที่เป็นผลพลอยได้ ไม่ใช่เป้าหมาย

Coverage นับ "บรรทัดที่ถูก**รัน**" ไม่ใช่ "พฤติกรรมที่ถูก**ตรวจ**" — test ที่เรียก method แต่ assert อ่อนๆ ได้ coverage เต็มโดยไม่จับบั๊กอะไรเลย และการตั้ง 100% เป็น KPI จะได้ test กับ getter/glue ที่เปราะและไม่ fail อะไร (คนปั่นเลขได้เสมอ)

เกณฑ์จริงคือ**ความเข้มต่างกันตามชั้น**:

| ชั้น | ความเข้ม | เหตุผล |
|---|---|---|
| Domain / business rule | ใกล้ 100% โดยธรรมชาติ | pure, test ถูกสุด, มูลค่าสูงสุด — ไม่มีข้ออ้าง |
| Use case / repository | ทุก flow สำคัญ + failure ของมัน | ที่ที่บั๊ก orchestration/SQL อาศัย |
| Glue / controller บาง / config | ต่ำได้โดยตั้งใจ | logic ถูกดันไป domain แล้ว — ถ้า controller หนาจน "ต้อง" test เยอะ = logic รั่วผิดชั้น |

แนวตอบสัมภาษณ์: *"ผมไม่ไล่เลข coverage — ผมไล่ behavior: ทุก business rule มี test, ทุก external call มี failure test, ทุก consumer มี duplicate test — แล้ว coverage ฝั่ง domain จะสูงเองเป็นผลพลอยได้"*

## Testing Failure Case — ครึ่งที่มักหายไป

Test สีเขียวทั้ง suite แต่ทุกตัวคือ happy path = ความมั่นใจปลอม สิ่งที่ต้องมี:

- ทุก external call: test ว่าเกิดอะไรเมื่อ timeout / 500 / ตอบช้า (fault injection ใน stub: `stub.failNext(2)`)
- Consumer: message ซ้ำสองครั้ง → side effect ครั้งเดียว (test idempotency จริงๆ ไม่ใช่เชื่อว่าเขียนแล้ว)
- Saga: ทุกขั้นที่ fail ได้ → compensation ถูกเรียกครบและถูกลำดับ
- Concurrency: สอง request ตัด stock ตัวสุดท้ายพร้อมกัน (บท 7 — optimistic lock ทำงานจริงไหม)

## Test ไม่มีวันครบ — แล้วทำยังไงต่อ

Dijkstra: *"Testing shows the presence of bugs, not their absence"* — ตาข่ายถักจากจินตนาการของคนเขียน เคสที่คาดไม่ถึงหลุดโดยนิยาม คำถาม senior จึงไม่ใช่ "ทำยังไงให้ครบ" แต่คือทำให้เคสที่คาดไม่ถึง **เกิดน้อย เจ็บน้อย ไม่กลับมาซ้ำ** — สามชั้น:

1. **ลดพื้นที่ต้องคาดเดา (design)**: ประกาศ invariant แล้วให้ระบบบังคับแทนการแจกแจงเคส — type ที่สถานะผิดสร้างไม่ได้ (`Money` ไม่รับติดลบ), DB constraint เป็นแนวรับสุดท้าย, idempotency ทำให้ "message ซ้ำจังหวะไหนก็ปลอดภัยโดยโครงสร้าง" — ไม่ต้องคาดถึงทุกลำดับ
2. **จำกัดความเสียหายเมื่อเจอจริง (บท 10 ทั้งบท)**: timeout/breaker/bulkhead ไม่ได้กันบั๊ก — มันกัน*บั๊กที่ไม่รู้จัก*ไม่ให้ลามทั้งระบบ; **failure handling คือการยอมรับว่า test ไม่มีวันครบ** — สองเรื่องนี้คือเหรียญเดียวกันคนละด้าน
3. **เจอแล้วอย่าให้กลับมา (วงจร regression)** — ดูหัวข้อถัดไป

## จากบั๊กจริงสู่ regression test — reproduce ก่อนเสมอ

ลำดับที่ถูก (ไม่ใช่ไล่หา edge case ก่อน):

```
1. Reproduce  — เขียน test จากเคสที่เกิดจริง → ต้องแดง
              ถ้าเขียนแล้วไม่แดง = ยังไม่เข้าใจบั๊ก ห้าม fix
2. Fix        — ให้ test นั้นเขียว
3. Generalize — "บั๊กนี้เป็นสมาชิกตระกูลไหน?" → เติม edge case ญาติๆ
```

Reproduce มาก่อนเพราะ test ที่แดงด้วยเคสจริงคือหลักฐานว่าเข้าใจ root cause (diagnose: reproduce → isolate → fix → prevent) — ส่วนขั้น 3 สำคัญเพราะ**บั๊กอยู่เป็นฝูง**: ตัวที่โผล่คือสมาชิกตระกูลที่ตาข่ายรูใหญ่สุด ชุดคำถามหาญาติที่ใช้ได้ทุกตระกูล: **ศูนย์ / ว่าง / null / ซ้ำ / ลำดับสลับ / พร้อมกัน / ใหญ่เกิน / ลบ**

ข้อระวังเดียว: production เลือดไหลอยู่ให้ reproduce + fix ก่อน แล้วกลับมาถักตาข่ายเพิ่มใน PR ถัดไป — แต่จดเป็น ticket ไม่ใช่จดในใจ

## Contract-first Workflow — รอยต่อ FE↔BE ที่ไม่ควรปล่อยให้คุยกันด้วยความจำ

หลายทีมทำ contract test แล้วก็ยังเจ็บ เพราะ contract ถูกสร้าง "ทีหลัง" จากโค้ดที่เขียนไปแล้ว ผลคือ spec ตามไม่ทันของจริง, mock ฝั่ง frontend เก่า, provider ฝั่ง backend เปลี่ยน response shape โดยไม่รู้ตัว ปัญหาจริงจึงไม่ใช่แค่ว่า "มี Pact หรือยัง" แต่คือ **ใครเป็นเจ้าของสัญญา และสัญญานั้นไหลเข้าการพัฒนาทั้งสองฝั่งยังไง**

แนวที่ทีมโตแล้วอยู่รอดได้มักเป็น **contract-first**:

1. ตกลง shape ของ request/response ก่อนใน spec เดียว
2. ให้ frontend generate type/mock จาก spec เดียวกัน
3. ให้ backend validate ว่า implementation ยังตรง spec
4. ทุก breaking change ต้องผ่านกติกา versioning/compatibility ชัดเจน

ตัวอย่าง spec ระดับพอคุยกันรู้เรื่องสำหรับหน้า checkout:

```yaml
openapi: 3.1.0
info:
  title: Checkout API
  version: 1.0.0
paths:
  /api/checkout/quote:
    post:
      summary: Calculate checkout summary before payment
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [items, couponCode]
              properties:
                items:
                  type: array
                  items:
                    type: object
                    required: [sku, qty]
                    properties:
                      sku: { type: string }
                      qty: { type: integer, minimum: 1 }
                couponCode:
                  type: [string, "null"]
      responses:
        "200":
          description: Calculated price summary
          content:
            application/json:
              schema:
                type: object
                required: [subtotal, discount, total, currency]
                properties:
                  subtotal: { type: integer }
                  discount: { type: integer }
                  total: { type: integer }
                  currency: { type: string, enum: [THB] }
```

สิ่งที่ spec นี้ให้เกินกว่าการคุยปากเปล่า:

- FE เห็นทันทีว่า field ไหน nullable จริง
- BE รู้ว่าการเปลี่ยน `discount` จาก number เป็น object คือ breaking change
- QA/automation มี source of truth เดียว
- mock/test data ไม่ต้องเดาจาก screenshot หรือ Postman collection เก่า

### Provider กับ Consumer ต้องรับผิดชอบคนละด้าน

**Frontend (consumer)** เป็นคนตอบว่า "หน้าจอนี้ต้องการ shape อะไร"  
**Backend (provider)** เป็นคนตอบว่า "จะส่ง shape นี้ได้จริงอย่างเสถียรยังไง"

ตรงนี้คือจุดที่หลายทีมพลาด: ถ้า backend ออกแบบจาก schema DB โดยไม่ดูหน้าจอ FE จะได้ payload ที่ต้องยิงหลาย endpoint มาประกอบเองและผูกกับ persistence detail โดยไม่จำเป็น แต่ถ้า frontend เป็นคนกำหนด shape ฝั่งเดียวโดยไม่คุยเรื่อง cost backend ก็ได้ endpoint พิเศษเต็มบ้าน

คำตอบระดับ senior คือคุยกันที่ **รอยต่อของ use case**:

- หน้า checkout ต้องใช้ข้อมูลอะไรใน request เดียว
- อะไรคือ field ที่ business มองว่า stable
- อะไรเป็น convenience field ที่ generate เพิ่มได้
- ถ้า field ไหนจะหาย ต้อง deprecate ยังไงและนานเท่าไร

### Breaking Change ต้องใช้ expand-contract เหมือน DB

ตัวอย่างพังจริง:

- เดิม FE อ่าน `name`
- BE เห็นว่า domain ควรชัด เลยเปลี่ยนเป็น `displayName`
- integration test ฝั่ง backend เขียวหมด
- FE พังทั้งหน้าใน production

วิธีเปลี่ยนที่ถูก:

1. **Expand** — เพิ่ม `displayName` แต่ยังคง `name` อยู่
2. FE migrate ไปอ่าน `displayName`
3. contract test/provider compatibility check ยืนยันว่าทั้งสอง field ยังมี
4. **Contract** — ลบ `name` ใน major หรือหลัง deadline ที่ตกลงแล้ว

นี่คือตรรกะเดียวกับ DB migration แบบเพิ่มคอลัมน์ใหม่ก่อนค่อยลบคอลัมน์เก่า (บท 20) เพราะ API response ก็คือ public schema เช่นกัน

### Test แบบไหนคุ้มที่สุดในรอยต่อ FE↔BE

มีสามชั้นที่เสริมกัน:

1. **Spec validation** — backend response ต้องตรง schema
2. **Consumer-driven contract test** — FE บอก expectation ที่ตัวเองใช้จริง
3. **Generated client/mock** — FE ใช้ type และ handler ที่ออกจาก spec เดียวกัน

ถ้าขาดข้อ 3 mock จะโกหกง่าย  
ถ้าขาดข้อ 2 spec อาจสวยแต่ไม่สะท้อนสิ่งที่ consumer ใช้จริง  
ถ้าขาดข้อ 1 provider อาจคุยว่าตรง spec แต่ runtime หลุดไปแล้ว

แนวตอบสัมภาษณ์ที่ได้คะแนน: *"ผมไม่อยากให้ FE กับ BE คุยกันด้วย wiki หรือ Postman snapshot ผมอยากให้มี machine-readable contract เดียว แล้วให้ทั้ง generated type, MSW (Mock Service Worker — library ฝั่ง frontend ที่ดัก network request ใน test/dev แล้วตอบ mock ตาม spec) handler, provider validation และ compatibility gate วิ่งจากไฟล์เดียวกัน"*

## Testability คือเกณฑ์ design ไม่ใช่เรื่องของ QA

"ใช้ได้ปกติ" กับ "test ได้" เป็นเกณฑ์คนละความเข้ม:

```java
boolean canCancel() {
    var config = GlobalConfig.get();               // static — ใช้งานปกติไม่มีปัญหา
    return created.isAfter(Instant.now()           // new เวลาเอง — ก็ใช้ได้
        .minus(config.cancelWindow()));
}
```

ใช้งานจริงไม่มีปัญหาเลย — แต่พอจะเทส "order อายุ 23:59 ชม. ยกเลิกได้ไหม": ต้อง mock static, ต้องรอเวลาจริง — **ความยากของ test คือเสียงกรีดร้องของ hidden dependency** (clock, config) ที่ตอนใช้งานปกติมองไม่เห็น การคิดถึง test ตั้งแต่ออกแบบจึงบังคับให้: dependency โผล่บน signature (inject `Clock`), domain ต้อง pure (I/O ถูกดันไปหลัง port เอง), scope เล็กเอง (test ที่ setup ยาว 30 บรรทัดเขียนไม่ไหว) — **โค้ดที่ test ง่ายคือโค้ดที่ดีนั่นแหละ test แค่ทำให้ความเน่าโผล่เร็วขึ้นจากเดือนเป็นนาที**

## TDD (Test-Driven Development) — ใช้เป็นเครื่องมือ ไม่ใช่ศาสนา

Red → Green → Refactor: เขียน test ที่ fail ก่อน → ทำให้ผ่านแบบง่ายสุด → จัดบ้านโดยมี test คุม

คุณค่าจริงที่ควรตอบในสัมภาษณ์: TDD บังคับให้คิด **interface กับ testability ก่อน implementation** — dependency จะชัดเอง (เพราะต้อง inject ได้ตั้งแต่ test แรก) และ scope จะเล็กเอง (เพราะ test ใหญ่เขียนยาก)
มุมที่ senior ควรพูดตรงๆ: TDD เหมาะกับ logic ที่ requirement ชัด (pricing, validation, saga state) / ฝืนกับงาน exploratory (spike, UI ที่ยัง iterate) — เลือกใช้ตามงาน ไม่ใช่ all-in หรือ anti ทั้งแผง

## Code Review Principle (สำหรับ Dev Lead)

- Review **design ก่อน style**: coupling ใหม่ที่เพิ่ม, boundary ที่ถูกละเมิด (domain import infra ไหม), failure case มี test ไหม — เรื่อง format ยกให้ formatter/linter ใน CI ไปเลย มนุษย์ไม่ควรเถียงเรื่อง tab
- คำถามมาตรฐานตอน review: "ถ้าตัวนี้ timeout จะเกิดอะไร" / "message ซ้ำแล้ว idempotent ไหม" / "test ที่เพิ่ม fail ได้จริงหรือ pass ตลอดกาล" (test ที่ไม่เคย fail = ไม่ได้ test อะไร)
- ขนาด PR สำคัญกว่าความขยันของ reviewer: PR 200 บรรทัดได้ review จริง, PR 2,000 บรรทัดได้ "LGTM" — บังคับแตกงานคือหน้าที่ lead
- กฎ scope สองชั้น: **ชั้น PR** — 1 PR = 1 หน่วยงานเล็กสุดที่ track ได้ (sub-task ถ้ามี) ห้ามข้ามหน่วย / ทิศกลับได้: 1 issue แตกหลาย PR (migration → logic → เปิด flag) — ได้ review เต็มตา, revert ทีละหน่วย, board ไม่โกหก · **ชั้น backlog** — issue ถูกหั่นตอน refinement ให้ ≈ 1–3 PR ที่ review ไหว ไม่งั้นน้องทำตามกฎเป๊ะก็ยังผลิต PR ยักษ์
- PR ใหญ่มาแล้ว วินิจฉัยก่อนสั่งแตก: **หลายเรื่องปนกัน** (feature+refactor+format) → ขอแยก สอน stacked PR / **เรื่องเดียวใหญ่จริง** (migration, กระทบ 40 ไฟล์) → อย่าฝืนแตก เปลี่ยนวิธี review: walkthrough 30 นาที + ไล่ทีละ commit · ตัวปลดล็อคที่ทำให้ PR เล็กเป็นไปได้จริง: **draft PR เร็วๆ + feature flag** (merge งานครึ่งทางได้ปลอดภัย ไม่ต้องกอดโค้ดจนเสร็จทั้งก้อน)
- Sub-task ที่แยก merge ไม่ได้ = แตกงานผิดเส้น → กลับไปหั่นใหม่ตาม seam ของระบบ (layer, dependency order, vertical slice) — และประโยคที่ลึกสุด: **แตกงานยาก = architecture ฟ้องตัวเอง** (ทุก sub-task แตะกองไฟล์เดียวกัน = God Service) — testability ฟ้อง design ระดับ class, task breakdown ฟ้อง design ระดับระบบ
- Comment แยกระดับชัด: blocking (bug, ละเมิด boundary) vs suggestion (nit:) — และ reviewer ที่ดี **ชมของที่ดีด้วย** ไม่ใช่หา defect อย่างเดียว

## คำถามสัมภาษณ์ที่ต้องตอบได้

- **"Mock กับ Stub ต่างกัน"** → stub จัดฉาก/mock ตรวจการเรียก + เสริม fake และเหตุผลที่ fake ทน refactor กว่า — คำตอบนี้แยกระดับผู้สมัครได้จริง
- **"Test pyramid ทำไมต้องเป็นสามเหลี่ยม"** → ต้นทุน feedback + ชี้ ice cream cone ที่เคยเห็น/เคยแก้
- **"ถ้า test เขียนยากมาก บอกอะไร"** → ประโยคแกนของบท: design ฟ้องตัวเอง — ยกตัวอย่าง: ต้อง mock 6 ตัว = class นั้น God Service, ต้อง sleep ใน test = ไม่มี clock injection
- **"Contract test คืออะไร ต่างจาก integration"** → integration = เรากับของจริงของเรา / contract = สัญญาระหว่างทีม ที่รันได้ใน CI ของทั้งสองฝั่งโดยไม่ต้องยก environment ร่วม

บทต่อไป: สามภาษา หลักเดียวกัน สำเนียงต่างกัน — Java / Python / Go

## สรุปท้ายบท

- test ที่ดีเป็นทั้งตาข่ายกัน regression และกระจกสะท้อนคุณภาพ design
- ถ้า business logic test ยาก มักเป็นเพราะ dependency ซ่อนอยู่หรือความรับผิดชอบของโค้ดปนกัน ไม่ใช่เพราะ framework ของ test ไม่เก่งพอ
- การจัดสัดส่วน unit, integration และ E2E อย่างเหมาะสมคือการจัด feedback loop ของทีม ไม่ใช่แค่จัดหมวด test
- บทนี้จึงไม่ใช่แค่เรื่อง testing แต่เป็นบทพิสูจน์ว่าสถาปัตยกรรมที่พูดมาก่อนหน้านี้ใช้งานได้จริงหรือไม่

## ก่อนไปบทถัดไป

จากการดู design ผ่านแว่นของ test บทถัดไปจะพาไปดูว่า principle เดิมทั้งหมดแปลออกมาเป็น code คนละสำเนียงอย่างไรใน Java, Python และ Go
