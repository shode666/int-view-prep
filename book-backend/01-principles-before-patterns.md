# บทที่ 1 — หลักคิดก่อน Design Pattern

## เข็มทิศก่อนอ่าน

บทนี้ทำหน้าที่เป็นฐานของทั้งเล่ม ถ้าคนอ่านเริ่มจากการจำ pattern ก่อน จะเผลอมองทุกปัญหาเป็นโจทย์ที่ต้องหา pattern มาครอบ แต่ถ้าเริ่มจากหลักคิด จะเริ่มเห็นว่า pattern เป็นเพียงผลลัพธ์ของการตัดสินใจที่ดีในบริบทหนึ่งเท่านั้น

ให้อ่านบทนี้เหมือนกำลังตั้งเกณฑ์ตัดสินงานออกแบบทั้งหมดที่จะตามมา ไม่ใช่เก็บศัพท์ใหม่ เพราะบท 2–16 แทบทั้งหมดคือการเอาหลักคิดไม่กี่ตัวในบทนี้ไปมองจากหลายมุม

## ทำไมต้องเริ่มจาก Principle

Pattern คือ "วิธีแก้ปัญหาที่เกิดซ้ำ" — มันคือ **ผลลัพธ์** ของการใช้หลักคิดกับปัญหาหนึ่ง ไม่ใช่จุดเริ่มต้น
คนที่จำ pattern ได้ 30 ตัวแต่ไม่มีหลักคิด จะเอา pattern ไปยัดใส่ปัญหาที่ไม่มีอยู่จริง
คนที่มีหลักคิดแน่น ต่อให้ไม่รู้ชื่อ pattern ก็จะ "ค้นพบ" มันเองตอนเจอปัญหา

สัญญาณว่าทีมใช้ pattern แบบไม่มีหลักคิด:

- มี `Factory` ที่สร้าง object ได้ชนิดเดียว
- มี interface ที่มี implementation เดียว และไม่มีแผนจะมีตัวที่สอง
- มี layer ที่ทำแค่ส่งต่อ parameter (pass-through layer)
- อธิบายไม่ได้ว่า "ถ้าเอา pattern นี้ออก จะเสียอะไร"

คำถามเดียวที่ตัดสินทุก design decision: **"ถ้าไม่ทำแบบนี้ จะเกิดปัญหาอะไร เมื่อไหร่"**
ถ้าตอบไม่ได้ = ยังไม่ควรทำ (You Aren't Gonna Need It — YAGNI)

## หลักคิดที่ต้องมีก่อนอ่านบทอื่น

### 1. Separation of Concerns (SoC)

หนึ่งหน่วยของ code ควรสนใจเรื่องเดียว "เรื่อง" ในที่นี้วัดจาก **เหตุผลที่ code ต้องเปลี่ยน**

```java
// เน่า: method เดียวรู้ทั้ง HTTP, business rule, SQL, SMTP
@PostMapping("/orders")
public ResponseEntity<?> createOrder(@RequestBody OrderRequest body) {
    if (body.amount() > 50_000)                                    // business rule
        return ResponseEntity.badRequest().body(Map.of("error", "limit"));
    jdbc.update("INSERT INTO orders ...", body);                   // persistence
    mailSender.send(body.email(), "Order confirmed");              // notification
    return ResponseEntity.status(201).body(Map.of("ok", true));
}
```

function นี้ต้องแก้เมื่อ: เปลี่ยน API shape, เปลี่ยน business rule, เปลี่ยน DB, เปลี่ยนวิธีส่งเมล — สี่เหตุผล = สี่ concern ที่พันกัน แก้เรื่องหนึ่งเสี่ยงพังอีกสามเรื่อง และ **test business rule ไม่ได้โดยไม่ยกทั้ง HTTP + DB + SMTP ขึ้นมา**

นี่คือรากของ Layered Architecture (บท 4) และ Repository/Service (บท 5)

### 2. High Cohesion / Low Coupling

- **Cohesion** — ของที่อยู่ด้วยกันควรเกี่ยวข้องกันจริง (module อธิบายได้ในประโยคเดียวโดยไม่มีคำว่า "และ")
- **Coupling** — module พึ่งพากันน้อยที่สุด ผ่าน interface ที่แคบที่สุด

สองตัวนี้สำคัญพอที่จะได้บทของตัวเอง (บท 2) — ตอนนี้จำแค่: **pattern เกือบทุกตัวในเล่มนี้คือเครื่องมือลด coupling หรือเพิ่ม cohesion อย่างใดอย่างหนึ่ง**

### 3. Explicit Dependencies

สิ่งที่ module ต้องใช้ ต้องมองเห็นได้จาก signature ไม่ใช่ไปหยิบเองจาก global / singleton / import ลึกๆ

```java
// ซ่อน dependency — อ่าน signature แล้วไม่รู้ว่าแตะ DB
public void chargePayment(String orderId) {
    var db = Database.getGlobalConnection();   // surprise!
    ...
}

// ชัดเจน — เห็นจาก constructor ว่าต้องใช้อะไร, test ได้ทันที
public class PaymentService {
    private final OrderRepository repo;
    private final PaymentGateway gateway;

    public PaymentService(OrderRepository repo, PaymentGateway gateway) {
        this.repo = repo;
        this.gateway = gateway;
    }
}
```

ถ้า dependency ซ่อน: test ต้อง monkey-patch, อ่าน code ต้องไล่ทั้งไฟล์, reuse ไม่ได้เพราะลาก global มาด้วย
Dependency Injection framework (Spring, FastAPI Depends, Wire) เป็นแค่ **เครื่องทุ่นแรง** ของหลักนี้ — ไม่ใช่ตัวหลักการ

### 4. Composition over Inheritance

Inheritance ผูก subclass กับ implementation ของ parent ตลอดชีวิต (fragile base class) — behavior ที่อยากได้ควร "ประกอบ" ไม่ใช่ "สืบทอด"

```java
// เน่า: สืบทอดเพื่อ reuse โค้ดนิดเดียว แต่ได้ contract ทั้งก้อนมาด้วย
class CsvReportService extends EmailService { ... } // Csv "is-a" Email??

// ประกอบ: ได้เฉพาะที่ต้องใช้
class CsvReportService {
    private final Notifier notifier; // interface
    CsvReportService(Notifier notifier) { this.notifier = notifier; }
}
```

Go บังคับหลักนี้เลย — ไม่มี inheritance มีแต่ embedding + interface ซึ่งเป็นเหตุผลหนึ่งที่ Go codebase ใหญ่ๆ มัก flat และตามอ่านง่าย

### 5. Fail Fast

พังให้เร็ว พังให้ดัง พังใกล้ต้นเหตุ — ดีกว่าเดินต่อด้วย state ผิดแล้วไประเบิดไกลๆ

```java
// เงียบ: null เดินทางต่ออีก 5 ชั้น ไประเบิดเป็น NPE ใน report ตอนตี 3
User user = userRepo.find(id); // คืน null ได้

// fail fast: ระเบิดตรงนี้ พร้อมข้อความที่ debug ได้
User user = userRepo.find(id)
    .orElseThrow(() -> new UserNotFoundException(id));
```

ใช้กับ: validate input ที่ขอบระบบ (แล้วข้างในไม่ต้อง validate ซ้ำ), assert invariant ใน constructor, config ที่หายให้ตายตอน startup ไม่ใช่ตอน request แรก

**ข้อยกเว้นสำคัญ**: fail fast ใช้กับ *bug และ invalid state* — ไม่ใช่กับ *expected failure* ของโลกภายนอก (network, downstream service) อันนั้นต้อง Design for Failure

### 6. Design for Failure

ทุกอย่างนอก process ของเรา **จะพัง** — คำถามไม่ใช่ "ถ้า" แต่คือ "เมื่อพังแล้วระบบเราทำอะไร"

- เรียก service อื่น → ต้องมี timeout เสมอ (missing timeout = anti-pattern อันดับหนึ่งของ production incident)
- retry ได้เฉพาะ operation ที่ idempotent
- partial failure คือ default: order สร้างแล้วแต่ email ไม่ออก — ระบบต้องนิยามไว้ก่อนว่ายอมรับได้ไหม

หลักนี้ใหญ่พอที่จะเป็นบท 10–11 ทั้งสองบท — ที่ยกมาไว้ตรงนี้เพราะมันต้องอยู่ในหัว **ตั้งแต่ตอนออกแบบ** ไม่ใช่มาเติมทีหลัง

### 7. ตระกูลความประหยัด: DRY / KISS / YAGNI

หลักสามตัวนี้**ไม่ใช่สมาชิกของ SOLID** — มาจากสาย *The Pragmatic Programmer* — SOLID (บท 3) ถามว่า "โครงสร้างถูกไหม" ส่วนตระกูลนี้ถามว่า "เขียนเกินจำเป็นไหม":

- **DRY** (Don't Repeat Yourself) — ความรู้หนึ่งเรื่องควรมี source of truth เดียว: กติกาภาษีมูลค่าเพิ่ม (Value Added Tax — VAT) อยู่สองที่ = วันหนึ่งจะไม่ตรงกัน ระวัง: DRY พูดถึง "ความรู้ซ้ำ" ไม่ใช่ "โค้ดหน้าตาเหมือนกัน" — ประเด็นนี้จะชนกับ SoC ในหัวข้อถัดไป
- **KISS** (Keep It Simple) — ทางแก้ที่ง่ายที่สุดที่ครอบ requirement ได้ คือทางแก้ที่ถูก; ความฉลาดที่อ่านยากคือหนี้
- **YAGNI** (You Aren't Gonna Need It) — อย่าสร้างเผื่ออนาคตที่ยังพิสูจน์ไม่ได้ว่าจะมา (คำถามเปิดบท "ถ้าไม่ทำแบบนี้จะเกิดปัญหาอะไร เมื่อไหร่" คือ YAGNI ในรูปคำถาม)

#### YAGNI ใช้ยากสุดในสามตัว — เกณฑ์ตัดสินจริง

ที่มันยากเพราะคำว่า "เผื่ออนาคต" ฟังดูเป็นความรอบคอบเสมอ — เกณฑ์ที่ทำให้ตัดสินได้คือ **ราคาของการเพิ่มทีหลัง**:

```
ถามสองคำถามต่อของหนึ่งชิ้น:
1. ถ้าไม่ทำตอนนี้ แล้ววันหน้าต้องทำ — แพงแค่ไหน?
2. โอกาสที่ต้องใช้จริง — มีหลักฐานอะไร (ไม่ใช่ "เผื่อ")?

เพิ่มทีหลังถูก + ยังไม่มีหลักฐาน  → YAGNI: ตัดทิ้ง
เพิ่มทีหลังแพงมาก                → ไม่ใช่เขต YAGNI: ทำเลยแม้ยังไม่มีใครขอ
```

ของที่ **YAGNI ตัดได้สบาย** (เพิ่มทีหลังถูก): abstraction เผื่อ vendor ที่สอง, config option ที่ยังไม่มีใครขอ, generic type เผื่อ reuse, microservice split เผื่อ scale, admin feature เผื่ออนาคต

ของที่ **อย่าอ้าง YAGNI** (แก้ทีหลังแพงมหาศาล — ต้องคิดวันแรก):

| ของ | ทำไมแก้ทีหลังแพง |
|---|---|
| ชนิดข้อมูลเงิน (Decimal ไม่ใช่ float) | migrate ข้อมูลผิดย้อนหลังไม่ได้ |
| API contract ที่ปล่อยให้คนนอกใช้แล้ว | เปลี่ยน = breaking change ตลอดชีวิต |
| Timeout / idempotency ของ operation เงิน | วันที่รู้ว่าต้องมี คือวันที่เงินหายไปแล้ว (บท 10–11) |
| Audit log / เขตข้อมูลส่วนบุคคล (Personal Data Protection Act — PDPA) | เก็บย้อนหลังไม่ได้, รื้อ schema ทีหลังเจ็บ |
| Event schema versioning (บท 9) | event ที่ publish แล้วคือ contract |

เกณฑ์นี้ภาษา system design เรียก **one-way vs two-way door**: ประตูที่เดินกลับได้ (เพิ่ม/ถอดทีหลังถูก) ตัดสินเร็วๆ ตาม YAGNI ได้เลย / ประตูทางเดียว (ถอยไม่ได้) ต้องคิดหน้างานแม้ยังไม่มีใครขอ — ตอบแบบนี้ในสัมภาษณ์ = แสดงว่าใช้ YAGNI แบบมีเกณฑ์ ไม่ใช่ท่องคำขวัญ

## Principle ชนกันเองได้ — และนั่นคืองานของ Senior

**DRY ชน SoC** — ตัวอย่างจริงที่เจอบ่อยสุด: ระบบมี "ส่วนลด" สองที่ — หน้าเว็บลูกค้า กับหลังบ้าน admin — โค้ดคำนวณ ณ วันนี้เหมือนกันเป๊ะ ควรรวมเป็น `calculate_discount()` ตัวเดียวไหม?

```
ถามคำถามเดียว: สองที่นี้จะเปลี่ยนด้วย "เหตุผลเดียวกัน" ตลอดไปไหม?
- ฝั่งลูกค้า: การตลาดขอแก้โปรโมชันทุกเดือน
- ฝั่ง admin: ทีมบัญชีคุมกติกา ปีละครั้ง
→ เหตุผลต่างกัน = คนขอแก้คนละกลุ่ม = รวมแล้ววันหนึ่งจะมี
  if is_admin งอกกลางฟังก์ชัน แล้วทุกการแก้ฝั่งหนึ่งเสี่ยงพังอีกฝั่ง
```

การรวม logic ที่ "หน้าตาเหมือนกันแต่เปลี่ยนด้วยเหตุผลต่างกัน" คือการสร้าง coupling ปลอม — จำประโยคนี้: **duplication ถูกกว่า wrong abstraction** (แยกกันก่อน รอเห็นว่ามันเปลี่ยนพร้อมกันจริงสามครั้ง ค่อยรวม)

**คำถามต่อยอดที่ดี: ต้องแยก "ทั้งก้อน" เลยเหรอ?** — ไม่ใช่ หน่วยของการตัดสินใจไม่ใช่การคำนวณทั้งก้อน แต่คือ**แต่ละกติกาย่อย** — ผ่าการคำนวณออกเป็นส่วน แล้วถามคำถามเดิมทีละส่วน:

| ส่วนของการคำนวณ | ใครเป็นเจ้าของเหตุผลการเปลี่ยน | รวม/แยก |
|---|---|---|
| ภาษี (VAT) | กฎหมาย — เปลี่ยนเมื่อไหร่ทุกที่ต้องตามพร้อมกัน | **รวม** (แยกแล้ววันที่กฎหมายเปลี่ยน ฝั่งที่ลืมอัพเดต = บั๊กบัญชี) |
| การปัดเศษเงิน | invariant ของระบบ | **รวม** |
| ส่วนลดโปรโมชัน | การตลาด (ฝั่งลูกค้า) vs บัญชี (ฝั่ง admin) — คนละจังหวะ | **แยก** |

```java
// ส่วนที่รวม: กติกากลางที่มี source of truth เดียว
BigDecimal applyVat(BigDecimal amount) { ... }
BigDecimal roundMoney(BigDecimal amount) { ... }

// ส่วนที่แยก: แต่ละ context เสียบกติกาส่วนลดของตัวเอง
BigDecimal priceOrder(Order order, DiscountRule discountRule) {
    var subtotal = order.subtotal().subtract(discountRule.amount(order));  // แยก
    return roundMoney(applyVat(subtotal));                                  // รวม
}
```

สังเกตว่านี่คือ composition: ของที่เปลี่ยนพร้อมกันอยู่ตรงกลาง ของที่เปลี่ยนคนละจังหวะถูกฉีดเข้ามา (`discount_rule` — นี่คือ Strategy ในบท 8 นั่นเอง) — DRY กับ SoC เลยไม่ได้ "เลือกอันใดอันหนึ่งทั้งระบบ" แต่เลือก**รายรอยต่อ**

ตัวอย่างการชนคู่อื่น:

- **Fail Fast ชน Design for Failure**: ข้างในระบบพังให้ดัง (bug ต้องโผล่เร็ว) แต่ขอบระบบพังให้นุ่ม (downstream ล่มต้องมี fallback) — ใช้คนละหลักกับคนละชั้น ไม่ใช่เลือกอันเดียวทั้งระบบ
- **Explicit ชน ergonomics**: constructor ที่ inject 12 ตัวคือ explicit จนอ่านไม่ไหว — แต่ทางแก้ไม่ใช่กลับไปซ่อน dependency มันคือสัญญาณว่า class นั้น cohesion ต่ำ ต้องผ่า (บท 2)

Junior ถามว่า "ทำตาม principle หรือยัง" / Senior ถามว่า "principle ไหนสำคัญกว่า **ในบริบทนี้** เพราะอะไร" — คำถามแบบหลังคือสิ่งที่ interviewer ระดับ lead ฟังหา

## สรุปบท

| หลัก | กันปัญหาอะไร | ถ้าละเมิดจะเห็นอะไร |
|---|---|---|
| Separation of Concerns | แก้เรื่องหนึ่งพังอีกเรื่อง | ไฟล์เดียวแก้บ่อยด้วยเหตุผลหลากหลาย |
| High Cohesion / Low Coupling | ripple effect | แก้ 1 feature ต้องแตะ 8 ไฟล์ |
| Explicit Dependencies | hidden coupling, test ยาก | ต้อง monkey-patch / mock static |
| Composition over Inheritance | fragile base class | แก้ parent แล้ว subclass พังเงียบ |
| Fail Fast | bug เดินทางไกลจากต้นเหตุ | NPE / KeyError ที่ไกลจากสาเหตุ |
| Design for Failure | production incident | ระบบค้างเพราะ downstream ช้า |

บทต่อไป: เจาะ Coupling / Cohesion ให้เป็นเครื่องมือวัด ไม่ใช่แค่คำพูดสวยๆ

## สรุปท้ายบท

- pattern มีค่าเมื่อเกิดจากแรงกดดันจริง ไม่ใช่เมื่อถูกยกมาใช้เพราะจำชื่อได้
- หลักคิดอย่าง separation of concerns, explicit dependency และ fail fast คือฐานที่ทำให้ pattern และ architecture ในบทถัด ๆ ไปมีความหมาย
- งานออกแบบที่ดีเริ่มจากการเห็นปัญหาและต้นทุนของทางเลือก ไม่ใช่จากการเลือกเครื่องมือก่อน
- ถ้าฐานบทนี้แน่น คุณจะอ่านบทต่อไปแบบเห็นรากร่วม แทนที่จะเห็นเป็นเทคนิคกระจัดกระจาย

## ก่อนไปบทถัดไป

เมื่อรู้แล้วว่าควรเริ่มจาก principle มากกว่าชื่อ pattern บทถัดไปจะหยิบเครื่องมือวัดที่สำคัญที่สุดสองตัวออกมาใช้ตรง ๆ คือ coupling และ cohesion เพื่อเปลี่ยนคำวิจารณ์ลอย ๆ ให้กลายเป็นเกณฑ์ตัดสินที่ชี้ได้จริง
