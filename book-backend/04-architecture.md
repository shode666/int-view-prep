# บทที่ 4 — Layered Architecture / Clean Architecture

> Architecture ที่ดีไม่ได้วัดจากจำนวน layer แต่วัดจากคำถามเดียว: **การตัดสินใจที่แพง (DB, framework, external service) ถูกเลื่อนออกไปหรือถูกล็อกตาย?**

## เข็มทิศก่อนอ่าน

บทก่อนหน้าพูดเรื่องหลักการในระดับ module และ dependency ส่วนบทนี้ขยายภาพออกมาจนเห็นทั้งระบบ ว่าเราจะจัดโครงสร้างแอปอย่างไรให้ business rule ไม่ถูกจับมัดติดกับ framework, database และของภายนอกเร็วเกินไป

ให้อ่านบทนี้โดยยึดคำถามเดียวไว้ในหัวว่า dependency ลูกศรชี้เข้าหาใคร ถ้าทิศของ dependency ยังไม่ชัด ต่อให้มี layer สวยแค่ไหนก็เป็นเพียงรูปทรงของ architecture ไม่ใช่แก่นของมัน

## ทำไมต้องมี Layer

ระบบที่ไม่มี layer ไม่ได้พังทันที — มันพังแบบดอกเบี้ยทบต้น:

```java
// ปีที่ 1: ใช้งานได้ ส่งงานทัน
@PostMapping("/orders")
public ResponseEntity<?> createOrder(@RequestBody OrderRequest body) {
    int stock = jdbc.queryForObject(
        "SELECT qty FROM stock WHERE sku = ?", Integer.class, body.sku());
    if (stock < body.qty())
        return ResponseEntity.status(409).body(Map.of("error", "out of stock"));
    if (body.total() > getUserCredit(body.userId()))               // อ่าน DB อีกที่
        return ResponseEntity.status(402).body(Map.of("error", "credit"));
    jdbc.update("INSERT INTO orders ...");
    restClient.post().uri(PAYMENT_URL).body(...).retrieve();      // เรียก external ตรงๆ
    jdbc.update("UPDATE stock ...");
    mailSender.send(body.email(), "Order confirmed");
    return ResponseEntity.status(201).body(Map.of("ok", true));
}
```

ปีที่ 2 เกิดอะไร:

- ทีมขายอยากสร้าง order จาก batch import → logic อยู่ใน HTTP handler เรียก reuse ไม่ได้ → **ก๊อปวาง** → กติกา credit check สองที่เริ่มไม่ตรงกัน
- อยาก test กติกา "credit ไม่พอ" → ต้องยก DB + payment gateway จริง → ไม่มีใครเขียน test
- payment gateway เปลี่ยนเจ้า → ไล่แก้ 14 endpoint ที่ `requests.post` กระจายอยู่

## Layered Architecture มาตรฐาน

```
┌─────────────────────────────┐
│  Presentation (HTTP/gRPC)   │  แปลง protocol ↔ ภาษา domain, auth, validation รูปแบบ
├─────────────────────────────┤
│  Application / Service      │  orchestrate use case, transaction boundary
├─────────────────────────────┤
│  Domain                     │  business rule ล้วน — ไม่รู้จัก HTTP, SQL, JSON
├─────────────────────────────┤
│  Infrastructure             │  Postgres, Kafka, payment client, SMTP
└─────────────────────────────┘
```

ตัวย่อในภาพ: **gRPC** (gRPC Remote Procedure Calls — RPC framework ประสิทธิภาพสูงบน HTTP/2 ของ Google, ดูบท 9), **SMTP** (Simple Mail Transfer Protocol — โปรโตคอลส่งอีเมล)

กฎมีข้อเดียวที่ห้ามแหก: **Domain ไม่ import อะไรจากชั้นอื่นเลย** และทุกชั้น import ลงได้ทางเดียว ห้ามข้ามหัว ห้ามย้อนขึ้น

### Clean Architecture ต่างตรงไหน

Clean Architecture (และ Hexagonal / Ports & Adapters — ครอบครัวเดียวกัน) เพิ่มความเข้มข้อเดียว:
**Infrastructure ก็ห้ามถูก import เช่นกัน** — Application ประกาศ port (interface) แล้ว Infrastructure implement (DIP จากบท 2–3 นั่นเอง)

```
Presentation ──▶ Application ──▶ Domain
                     │ ประกาศ port (interface)
                     ▼
              Infrastructure (implement port, ถูก inject ตอน startup)
```

ผลที่จับต้องได้: test use case ทั้งตัวด้วย fake in-memory ได้โดยไม่มี DB, เปลี่ยน Postgres → DynamoDB โดย domain ไม่ diff แม้บรรทัดเดียว

## หน้าตาจริงในสามภาษา

```
Java (Spring)                 Python (FastAPI)              Go
src/main/java/...             app/                          /cmd/api/main.go   ← ต่อสายทุกอย่างที่นี่
  domain/        ← pure       ├ domain/      ← pure         /internal/
    Order.java                │  order.py                     ├ domain/        ← pure
    OrderPolicy.java          ├ application/                  ├ app/           ← use case + port
  application/                │  create_order.py              ├ adapter/
    CreateOrderUseCase.java   │  ports.py    ← Protocol       │  ├ postgres/
    port/OrderRepository.java ├ adapters/                     │  └ http/
  adapter/                    │  ├ api/      ← FastAPI        └ pkg/           ← ของ share จริงๆ เท่านั้น
    web/OrderController.java  │  └ db/
    persistence/JpaOrderRepo  └ main.py      ← wiring
```

- **Java**: ธรรมชาติของภาษาเข้าทาง layered ที่สุด — ระวังอย่างเดียวคือ `@Entity`/`@JsonProperty` เลื้อยเข้า domain (แปลว่า JPA/Jackson กลายเป็น dependency ของ business rule แล้ว)
- **Python**: ไม่มีอะไรบังคับ — วินัยต้องมาจาก convention + import-linter; กับดักประจำคือ SQLAlchemy model = domain model (ผูก schema DB กับ business object ตายตัว)
- **Go**: `internal/` ช่วยบังคับ boundary ระดับ compiler; อย่าทำ layer ครบพิธีถ้า service เล็ก — Go ชอบเริ่ม flat แล้วค่อยแตกเมื่อเจ็บจริง

## Transaction Boundary อยู่ชั้นไหน

คำถามที่แยก senior ออกจาก junior ตอน design review

- **Application layer คือเจ้าของ transaction** — เพราะ use case คือคนรู้ว่ากี่ aggregate ต้อง commit ด้วยกัน
- Domain ไม่รู้จัก transaction (มันคือเรื่องของ persistence)
- Presentation ยิ่งไม่เกี่ยว — `@Transactional` บน controller คือกลิ่นเน่า (transaction เปิดค้างระหว่างรอ serialize JSON)

```java
class CreateOrderUseCase {
    @Transactional  // ขอบเขต = หนึ่ง use case = หนึ่ง unit of work (บท 5)
    OrderId execute(CreateOrderCommand cmd) {
        var order = Order.create(cmd);      // domain ตัดสินใจ
        orderRepo.save(order);
        stockRepo.reserve(cmd.items());
        return order.id();
        // ห้ามยิง external call (payment, email) ในนี้ — ถ้า rollback แล้ว email ออกไปแล้วทำไง?
        // คำตอบที่ถูกคือ Outbox (บท 11)
    }
}
```

## เมื่อไหร่ Clean Architecture คือ Over-engineering

ตรงไปตรงมา: **Create-Read-Update-Delete (CRUD) ธรรมดาไม่ต้องการ 4 layer**

สัญญาณว่าเวอร์เกิน:

- ทุก request วิ่งผ่าน Controller → Data Transfer Object (DTO) → Mapper → UseCase → DTO2 → Mapper2 → Entity โดย **ไม่มี business rule เลยสักชั้น** — มีแต่การก๊อปข้อมูลข้าม object 5 รอบ
- แก้ field เดียวต้องแตะ 6 ไฟล์ (DTO, mapper, command, entity, response, test ของทุกตัว) — นี่คือ shotgun surgery ที่ architecture สร้างเอง
- ทีม 3 คนกับ internal tool ที่มีผู้ใช้ 12 คน แต่โครงเหมือน core banking

เกณฑ์ตัดสินใจแบบ pragmatic:

| สถานการณ์ | โครงที่เหมาะ |
|---|---|
| CRUD / admin tool / อายุสั้น | 2 ชั้นพอ: handler + repository |
| มี business rule จริง, ทีมโต, อายุยาว | 3–4 ชั้น + DIP ที่รอยต่อ infrastructure |
| Business rule ซับซ้อนหนัก (pricing, underwriting) | Clean Architecture เต็มรูป + domain model เข้มข้น |

หลักคือ **จ่ายค่า abstraction ตรงจุดที่ความเปลี่ยนแปลงจะมาจริง** — ทุก service ไม่จำเป็นต้องโครงเดียวกันทั้งบริษัท แต่ service เดียวกันต้อง consistent

## บังคับกฎด้วย Continuous Integration (CI) ไม่ใช่ด้วย code review

กฎ architecture ที่อยู่ในหัวคน = กฎที่จะถูกแหกใน sprint ที่รีบ

```java
// Java — ArchUnit: test ที่แดงเมื่อมีคน import ผิดทิศ
@Test void domainMustNotDependOnInfrastructure() {
    noClasses().that().resideInAPackage("..domain..")
        .should().dependOnClassesThat().resideInAPackage("..infrastructure..")
        .check(importedClasses);
}
```

```ini
# Python — import-linter
[importlinter:contract:layers]
name = Layered architecture
type = layers
layers =
    myapp.adapters
    myapp.application
    myapp.domain
```

Go: package cycle เป็น compile error ฟรีอยู่แล้ว + depguard สำหรับกฎเพิ่มเติม

## สรุปบท

- Layer มีไว้เพื่อให้ **business rule ไม่รู้จักโลกภายนอก** — reuse ได้, test ได้, เปลี่ยน infra ได้
- กฎเดียวที่ศักดิ์สิทธิ์: dependency ชี้เข้าหา domain — ที่เหลือคือรายละเอียด
- Transaction boundary = application layer, external call ห้ามอยู่ใน transaction (ปูทางไป Outbox บท 11)
- Clean Architecture คือเครื่องมือ ไม่ใช่ศาสนา — CRUD 2 ชั้นที่ตรงไปตรงมา ดีกว่า 4 ชั้นที่ก๊อปข้อมูลไปมา
- กฎที่บังคับด้วย CI เท่านั้นที่จะรอดข้ามปี

บทต่อไป: ลงลึกชั้นที่คนสับสนบ่อยสุด — Repository, Service, Use Case ต่างกันตรงไหน และ Unit of Work คืออะไร

## สรุปท้ายบท

- architecture ที่ดีไม่ใช่จำนวน layer มากหรือน้อย แต่คือการคุมไม่ให้ business rule ไปผูกติดกับรายละเอียดแพงเร็วเกินไป
- dependency direction เป็นกฎแกนที่สำคัญที่สุดของบทนี้ และมักบอกได้ทันทีว่า layer ที่มีอยู่มีความหมายจริงหรือไม่
- transaction boundary, framework boundary และ infra dependency ต้องถูกวางอย่างมีเจตนา ไม่ใช่เกิดจากความสะดวกเฉพาะหน้า
- ถ้าชั้นนี้นิ่ง การเปลี่ยน database, framework หรือ external provider ในอนาคตจะกลายเป็นงานย้ายขอบ ไม่ใช่งานรื้อแกนกลาง

## ก่อนไปบทถัดไป

เมื่อภาพ architecture เริ่มชัดแล้ว บทถัดไปจะลงสู่ระดับโค้ดรายวันที่สุดของสถาปัตยกรรม นั่นคือการแยกหน้าที่ของ repository, service, use case และการวาง unit of work ให้ไม่มั่วกัน
