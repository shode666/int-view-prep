# บทที่ 3 — SOLID แบบใช้จริง

> SOLID ไม่ใช่ checklist ที่ทุก class ต้องผ่านครบ 5 ข้อ — มันคือ **ชื่อของ trade-off** 5 แบบที่โผล่ซ้ำๆ เวลาระบบโต แต่ละตัวมีทั้งจุดที่ช่วยชีวิตและจุดที่คนเอาไปทำ over-engineering

## เข็มทิศก่อนอ่าน

บทนี้ควรอ่านต่อจาก coupling/cohesion โดยตรง เพราะ SOLID ที่ใช้งานได้จริงแทบทั้งหมดเป็นการมองปัญหาเดิมในมุมที่เฉพาะขึ้น SRP คือเรื่อง cohesion, ISP กับ DIP คือเรื่อง coupling, ส่วน OCP และ LSP คือการคุมรอยต่อกับ contract ให้ขยายได้โดยไม่หลอกตัวเอง

อย่าอ่านบทนี้แบบท่องห้าข้อให้ครบ แต่ให้อ่านแบบจำ failure mode ของแต่ละข้อให้ได้ ว่ามันเข้ามาแก้แรงกดดันแบบไหน และเมื่อใช้เกินจำเป็นจะกลายเป็นภาระอะไร

## S — Single Responsibility Principle

นิยามที่ใช้งานได้จริง: **หนึ่ง module ควรมีผู้มีส่วนได้เสีย (reason to change) กลุ่มเดียว**
ไม่ใช่ "หนึ่ง class ทำหนึ่งอย่าง" (ถ้าตีความแบบนั้นจะได้ class ละ method เต็มระบบ)

### ปัญหาก่อนใช้

```java
class ReportService {
    byte[] generateMonthlyReport(Month m) { ... }   // ฝ่ายบัญชีขอแก้สูตร
    String renderHtml(ReportData d) { ... }         // ฝ่าย design ขอแก้ layout
    void scheduleDaily() { ... }                    // ฝ่าย ops ขอเปลี่ยนเวลา
    void uploadToS3(byte[] file) { ... }            // ทีม infra ย้ายไป GCS
}
```

สี่ทีมแก้ไฟล์เดียวกัน → merge conflict ประจำ, แก้ layout แล้วสูตรบัญชีพังได้, test ต้องยก S3 ขึ้นมาเพื่อ test สูตรคำนวณ

### หลังแยกตาม "ใครขอแก้"

```java
class ReportCalculator { ReportData calculate(Month m) }   // บัญชี
class ReportRenderer   { String render(ReportData d) }     // design
class ReportScheduler  { ... }                              // ops
class ReportStorage    { void store(byte[] f) }             // infra
```

### ใช้ผิดพังแบบไหน

แยกละเอียดเกิน: `OrderValidator`, `OrderValidatorHelper`, `OrderValidationContext`, `OrderValidationResultMapper` — สี่ไฟล์สำหรับ if สามบรรทัด การอ่าน flow หนึ่งเส้นต้องเปิด 7 ไฟล์ = cohesion พังในนามของ SRP
เกณฑ์: แยกเมื่อ **เห็นเหตุผลการเปลี่ยนที่ต่างกันจริง** ไม่ใช่แยกกันเผื่อ

## O — Open/Closed Principle

นิยามใช้งานจริง: **จุดที่ requirement งอกซ้ำๆ ควรเพิ่มได้โดยไม่แก้ code เดิม**

### ปัญหาก่อนใช้ — if-else ที่งอกทุก sprint

```java
BigDecimal calculateDiscount(Order order) {
    if (order.getCustomer().getTier().equals("gold"))
        return order.getTotal().multiply(new BigDecimal("0.10"));
    else if (order.getCustomer().getTier().equals("silver"))
        return order.getTotal().multiply(new BigDecimal("0.05"));
    else if (order.getCoupon() != null && order.getCoupon().isValid())  // sprint 3 เพิ่ม
        return order.getCoupon().getAmount();
    else if (isBlackFriday())                                            // sprint 7 เพิ่ม
        return order.getTotal().multiply(new BigDecimal("0.15"));
    // sprint 12: "gold + coupon ได้สองต่อไหม?" ← ระเบิดตรงนี้
    return BigDecimal.ZERO;
}
```

ทุกกติกาใหม่ = แก้ function เดิม = ต้อง regression test ทุกกติกาเก่า และ semantics ของ elif (เลือกอันแรกที่เข้าเงื่อนไข) เป็น business decision ที่ซ่อนอยู่โดยไม่มีใครตั้งใจเลือก

### หลัง refactor — Strategy + composition (ดูเต็มๆ บท 8)

แตกเป็นสามส่วน: **กติกาแต่ละตัว** (แยกกันอยู่), **นโยบายการรวม** (ตอบคำถาม "ได้สองต่อไหม" ที่เดิมซ่อนอยู่ใน elif), และ **เครื่องยนต์** (แค่ประกอบ):

```java
// ส่วนที่ 1 — สัญญาว่ากติกาหน้าตาเป็นยังไง
public interface DiscountRule {
    boolean appliesTo(Order order);      // กติกานี้ใช้กับ order นี้ไหม
    BigDecimal amount(Order order);      // ถ้าใช้ ลดเท่าไหร่
}

// ส่วนที่ 2 — กติกาจริง ตัวละ class เล็กๆ (ของเดิมที่เคยเป็น else-if แต่ละก้อน)
class GoldTierDiscount implements DiscountRule {
    public boolean appliesTo(Order o) { return o.getCustomer().getTier().equals("gold"); }
    public BigDecimal amount(Order o) { return o.getTotal().multiply(new BigDecimal("0.10")); }
}

class CouponDiscount implements DiscountRule {
    public boolean appliesTo(Order o) { return o.getCoupon() != null && o.getCoupon().isValid(); }
    public BigDecimal amount(Order o) { return o.getCoupon().getAmount(); }
}

class BlackFridayDiscount implements DiscountRule {
    public boolean appliesTo(Order o) { return isBlackFriday(); }
    public BigDecimal amount(Order o) { return o.getTotal().multiply(new BigDecimal("0.15")); }
}

// ส่วนที่ 3 — นโยบายการรวม: business decision ที่เดิมซ่อนอยู่ในลำดับ else-if
class BestSingleDiscount implements CombinePolicy {   // ได้ตัวที่ลดมากสุดตัวเดียว (ไม่มีสองต่อ)
    public BigDecimal combine(List<DiscountRule> rules, Order order) {
        return rules.stream().map(r -> r.amount(order))
                    .max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
    }
}

// ส่วนที่ 4 — เครื่องยนต์: ไม่รู้จักกติกาใดๆ เลย แค่ประกอบ
public class DiscountEngine {
    private final List<DiscountRule> rules;
    private final CombinePolicy policy;

    public DiscountEngine(List<DiscountRule> rules, CombinePolicy policy) {
        this.rules = rules;
        this.policy = policy;
    }

    public BigDecimal calculate(Order order) {
        var applicable = rules.stream().filter(r -> r.appliesTo(order)).toList();
        return policy.combine(applicable, order);
    }
}

// ตอนประกอบใช้ (ที่ startup / DI — Spring ฉีด List<DiscountRule> ของทุก @Component ให้เองได้)
var engine = new DiscountEngine(
    List.of(new GoldTierDiscount(), new CouponDiscount(), new BlackFridayDiscount()),
    new BestSingleDiscount());
var discount = engine.calculate(order);
```

ทีนี้ดูว่าแต่ละเหตุการณ์ในอนาคตกระทบตรงไหน:

| Requirement ใหม่ | ต้องแตะอะไร | ของเดิมเสี่ยงไหม |
|---|---|---|
| "เพิ่มส่วนลด silver tier" | class ใหม่ 4 บรรทัด + เพิ่มเข้า list | ไม่แตะของเดิมเลย |
| "gold + coupon ได้สองต่อ" | เปลี่ยน policy ตัวเดียว (`SumDiscounts`) | กติกาทุกตัวเดิมไม่แตะ |
| "test กติกา coupon" | test `CouponDiscount` โดดๆ 3 บรรทัด | ไม่ต้อง setup กติกาอื่น |

เทียบกับ if-elif เดิม: ทุกข้อในตารางคือการผ่าเข้ากลาง function เดียวกัน แล้ว regression test ทุกกติกาใหม่หมด — และคำถาม "ได้สองต่อไหม" ที่เดิม**ไม่มีใครตั้งใจตอบ** (มันถูกตัดสินโดยลำดับ elif แบบบังเอิญ) ตอนนี้กลายเป็น object ชื่อ `BestSingleDiscount` ที่ product อ่านออกและสั่งเปลี่ยนได้

### ใช้ผิดพังแบบไหน

ทำ plugin system ให้จุดที่ **ไม่เคยเปลี่ยนเลย** — abstraction ฟรีไม่มีจริง ถ้า if-else มี 2 ทางและนิ่งมาปีกว่า ปล่อยมันไว้
สัญญาณที่ควรทำ OCP: แก้ function เดิมเป็น **ครั้งที่สาม** ด้วย requirement ชนิดเดียวกัน

## L — Liskov Substitution Principle

นิยามใช้งานจริง: **subtype ต้องแทน parent ได้โดย caller ไม่ต้องรู้** — ไม่ใช่แค่ type ตรง แต่ **พฤติกรรมตาม contract**

### ตัวอย่างพังคลาสสิก

```java
interface OrderRepository {
    /** @return order หรือ Optional.empty() ถ้าไม่เจอ */
    Optional<Order> findById(OrderId id);
}

class CachedOrderRepository implements OrderRepository {
    public Optional<Order> findById(OrderId id) {
        var cached = cache.get(id);
        if (cached != null) return Optional.of(cached);
        throw new CacheMissException(); // ผิด contract! caller เตรียมรับแค่ Optional
    }
}
```

Type checker ผ่าน, code review อาจผ่าน, production พังตอนตี 2 — เพราะ contract ("ไม่เจอ = empty, ห้าม throw") อยู่ใน javadoc ไม่ใช่ใน type system

จุดที่ LSP พังบ่อยจริง:

- โยน exception ชนิดใหม่ที่ parent ไม่เคยโยน
- คืน null ในจุดที่ parent สัญญาว่าไม่ null
- ทำ side effect เพิ่ม (impl ใหม่ดัน publish event)
- เข้มขึ้นกับ input (parent รับ list ว่างได้ subtype โยน error)

### วิธีกันเชิงปฏิบัติ

Contract test: test suite เดียว รันกับทุก implementation ของ interface

```java
// Test ชุดเดียว — ทุก implementation ต้อง extends แล้วผ่านเหมือนกันหมด
abstract class OrderRepositoryContractTest {
    abstract OrderRepository newRepo();

    @Test
    void notFound_returnsEmpty_neverThrows() {
        var repo = newRepo();
        assertTrue(repo.findById(new OrderId("missing")).isEmpty());  // ทุก impl ต้องผ่านข้อนี้
    }
}

class JpaOrderRepositoryTest extends OrderRepositoryContractTest { ... }
class InMemoryOrderRepositoryTest extends OrderRepositoryContractTest { ... }
class CachedOrderRepositoryTest extends OrderRepositoryContractTest { ... }
// ถ้า fake ผ่านแต่ของจริงไม่ผ่าน = mock โกหก
```

## I — Interface Segregation Principle

นิยามใช้งานจริง: **อย่าบังคับ consumer พึ่ง method ที่เขาไม่ใช้**

```java
// เน่า: interface อ้วน — NotificationService อยากได้แค่ email ของ user
public interface UserManager {
    void create(User u);
    void delete(String id);
    void updatePassword(String id, String pw);
    String getEmail(String id);
    byte[] exportGdpr(String id);
}

// ดี: consumer ประกาศเท่าที่ใช้ — mock ตัวเดียว method เดียว
public interface EmailLookup {
    String getEmail(String id);
}

class Notifier {
    Notifier(EmailLookup emails) { ... }
}
```

ผลพลอยได้ที่มักถูกมองข้าม: interface เล็ก → mock เล็ก → test สั้น และ signature บอกเลยว่า function นี้ **ทำอะไรได้มากสุดแค่ไหน** (`Notifier` แตะ password ไม่ได้แน่นอน — อ่านแค่ signature ก็ audit ได้)

ภาษาอื่นเทียบเท่า: Go — interface เล็กฝั่ง consumer เป็นสำเนียงบังคับอยู่แล้ว; Python — `Protocol` เล็กๆ ต่อ consumer

## D — Dependency Inversion Principle

บท 2 ปูไว้แล้ว — สรุปสั้น: **business logic เป็นเจ้าของ interface, infrastructure มา implement** ลูกศรชี้เข้าหา domain เสมอ

ที่เพิ่มในบริบท SOLID: DIP คือตัวที่ทำให้ S/O/L/I **ทำงานร่วมกันได้จริง** — Strategy (O) ต้องมี abstraction ให้เสียบ, contract test (L) ต้องมี interface ให้ test, interface เล็ก (I) คือ abstraction ที่ดีของ (D)

ระวังความเข้าใจผิด: DIP ≠ DI framework — Spring/Wire/FastAPI Depends เป็นแค่คนต่อสาย หลักการคือ **ทิศของ arrow** ต่อสายด้วยมือใน `main()` ก็เป็น DIP ที่สมบูรณ์ (Go นิยมแบบนี้)

## SOLID ในสามภาษา — โทนที่ต่างกัน

| | Java | Python | Go |
|---|---|---|---|
| หน่วยของ abstraction | interface + class | Protocol / duck typing | interface เล็ก (1–3 method) |
| ใครประกาศ interface | ฝั่ง provider (วัฒนธรรม) — ควรย้ายมาฝั่ง domain | ไม่ประกาศก็ได้ ใช้ Protocol เมื่ออยากให้ mypy ตรวจ | ฝั่ง consumer (สำเนียงบังคับ) |
| DI | framework (Spring) เป็น default | constructor ธรรมดา / FastAPI Depends | ต่อมือใน main / wire |
| ความเสี่ยงประจำภาษา | over-abstraction, interface เปล่าประโยชน์ | ทุกอย่างกองใน function เดียว ไม่มี contract | ก๊อป Java style มา = ผิดสำเนียง |

## สรุปบท

- SRP = cohesion (แยกตามผู้ขอแก้) · OCP = จุดงอกซ้ำต้องเสียบได้ · LSP = contract คือพฤติกรรม ไม่ใช่ type · ISP = interface เล็กตาม consumer · DIP = ลูกศรชี้เข้า domain
- ทุกตัวมี failure mode ฝั่ง over-engineering — ใช้เมื่อ **เห็นแรงกดดันจริง** (แก้ซ้ำ, merge conflict, mock บวม) ไม่ใช่ใช้เพราะเป็นข้อบังคับ

บทต่อไป: เอา DIP มาขยายเป็นสถาปัตยกรรมทั้งระบบ — Layered / Clean Architecture

## สรุปท้ายบท

- SOLID ที่ใช้เป็นคือการมองแรงกดดันซ้ำ ๆ ในระบบ ไม่ใช่ checklist ที่ต้องแปะให้ครบทุก class
- แต่ละข้อมีค่าเมื่อใช้แก้ปัญหาจริง และมีโทษเมื่อถูกใช้ล่วงหน้าเกินจำเป็น
- ถ้ามอง SOLID ผ่านแว่น coupling/cohesion จะเห็นว่ามันไม่ได้ลอยจากบริบท แต่เป็นการแตกคำถามเดิมให้เฉพาะเจาะจงขึ้น
- ความสามารถระดับ senior จึงไม่ใช่แค่จำคำนิยาม แต่คือบอกได้ว่าข้อไหนกำลังช่วยและข้อไหนกำลังสร้างพิธีกรรม

## ก่อนไปบทถัดไป

จากหลักการระดับ module และ class บทถัดไปจะขยับภาพออกไปทั้งระบบ โดยใช้ DIP และทิศของ dependency เป็นแกนในการอธิบาย layered และ clean architecture
