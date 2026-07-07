# บทที่ 5 — Repository, Service, Use Case และ Unit of Work

> สามคำนี้ถูกใช้ปนกันจนเสียความหมาย บทนี้ตีเส้นให้ชัด: ใครทำอะไร ใครห้ามทำอะไร และ transaction เป็นของใคร

## เข็มทิศก่อนอ่าน

บทนี้คือจุดที่ architecture ลงมาสัมผัสโค้ดรายวันมากที่สุด เพราะคำว่า repository, service และ use case เป็นจุดที่หลายทีมใช้เหมือนกันแต่หมายถึงคนละอย่าง พอความหมายไม่ตรงกัน transaction, business rule และ dependency ก็เริ่มกระจัดกระจายทันที

อ่านบทนี้เหมือนกำลังกำหนดหน้าที่ของแต่ละห้องในบ้าน ถ้าใครทำงานนอกห้องตัวเองเล็กน้อยในวันนี้ มันมักจะกลายเป็นหนี้สถาปัตยกรรมก้อนใหญ่ในอีกไม่กี่เดือน

## Repository Pattern

### ปัญหาก่อนใช้

SQL กระจายทั่ว service:

```java
class OrderService {
    void confirm(String orderId) {
        var row = jdbc.queryForMap(
            "SELECT * FROM orders o JOIN customers c ON ... WHERE o.id = ?", orderId);
        // 30 บรรทัดถัดมา: business logic คลุกกับชื่อ column
        jdbc.update("UPDATE orders SET status='CONFIRMED', version=version+1 ...");
    }
}
```

ผลคือ: เปลี่ยน schema แล้วแก้ 40 จุด, test ต้องมี DB จริง, query ซ้ำๆ ถูกก๊อปไปหลายที่แล้วค่อยๆ ไม่เหมือนกัน (อันหนึ่ง JOIN customer อีกอันลืม)

### หลักของ Repository

Repository = **collection ของ aggregate ที่แกล้งทำเป็นอยู่ใน memory** — ภาษาของมันคือภาษา domain ไม่ใช่ภาษา SQL

```java
public interface OrderRepository {
    Optional<Order> findById(OrderId id);
    List<Order> findPendingOlderThan(Instant t);
    void save(Order order);
}
```

กติกาที่ทำให้ repository ยังเป็น repository:

- **รับ-คืน domain object** ไม่ใช่ row/Data Transfer Object (DTO)/`map[string]interface{}`
- Method ตั้งชื่อตามความหมายธุรกิจ (`findPendingOlderThan`) ไม่ใช่ตาม SQL (`selectWhereStatusAndDate`)
- **ห้ามมี business logic** — `repo.ConfirmOrder()` ที่ไป UPDATE status ตรงๆ คือ logic หนีไปอยู่ใน SQL แล้ว
- หนึ่ง repository ต่อหนึ่ง **aggregate** ไม่ใช่หนึ่งต่อหนึ่ง table (Order + OrderItem = repo เดียว เพราะ item ไม่มีความหมายนอก order)

### ใช้ผิดพังแบบไหน

- **Generic repository อย่างเดียว**: `Repository<T>` ที่มีแค่ CRUD → query ที่มีความหมายธุรกิจไม่มีที่อยู่ → เลยไปเขียน query ใน service → กลับไปจุดเริ่มต้น
- **Leaky abstraction**: method คืน `*gorm.DB` หรือรับ SQL fragment เป็น string — coupling กลับมาทางประตูหลัง
- **Repository อ้วน**: 25 method ที่แต่ละตัวมีคนใช้คนเดียว → แตกตาม consumer (ISP บท 3) หรือยอมรับว่า read model กับ write model ควรแยก (Command Query Responsibility Segregation (CQRS) อย่างเบา: `OrderRepository` สำหรับเขียน + `OrderReadModel` สำหรับหน้าจอ report)

## Service vs Use Case

คำว่า "Service" ถูกใช้จนแทบไร้ความหมาย — แยกให้ชัดเป็นสองชนิด:

### Application Service (= Use Case)

หนึ่ง class/function ต่อ **หนึ่งเรื่องที่ผู้ใช้ต้องการทำ** — orchestrate เท่านั้น ไม่ตัดสินใจเชิงธุรกิจเอง

```java
class PlaceOrderUseCase {
    // dependencies: repo, stockPort, clock — ทั้งหมดเป็น interface
    @Transactional
    public OrderId execute(PlaceOrderCommand cmd) {
        var customer = customerRepo.getById(cmd.customerId());   // 1. โหลด
        var order = Order.place(customer, cmd.items(), clock);   // 2. domain ตัดสินใจ
        stockPort.reserve(order.lines());                        // 3. ประสานงาน
        orderRepo.save(order);                                   // 4. เก็บ
        return order.id();
    }
}
```

สังเกต: ไม่มี if เชิงธุรกิจใน use case — กติกา "สั่งได้ไหม/ราคาเท่าไหร่" อยู่ใน `Order.place(...)` (domain) ทั้งหมด use case แค่เรียงลำดับ

สูตรจำ: **1 action = โหลด → domain ตัดสิน → save, ใน transaction เดียว — use case ไม่ตัดสินเอง**
และขอบเขตวัดจาก **user intent ไม่ใช่จำนวน table**: เขียน 4 table ใน DB เดียวก็ยังเป็น use case เดียว Unit of Work (UoW) เดียว — เส้นที่แตกจริงคือขอบ database (ข้าม service เมื่อไหร่ ACID — Atomicity, Consistency, Isolation, Durability — หาย → บท 11)

### Domain Service

Logic ธุรกิจที่ **ไม่มีเจ้าของเป็น entity เดียว** เช่น `PricingService` ที่ต้องดูทั้ง order + customer + promotion — ยังเป็น pure logic (ไม่แตะ I/O) แค่ไม่รู้จะฝากไว้ใน entity ไหน

### กลิ่นเน่าที่พบบ่อยสุด: God Service

`OrderService` 1,800 บรรทัด 32 method — มันคือทั้ง use case ทุกตัว + domain logic + query + mapper ในร่างเดียว
ทางแก้ไม่ใช่ "แตกครึ่ง" แต่คือแตกตาม use case: `PlaceOrderUseCase`, `CancelOrderUseCase`, `RefundOrderUseCase` — แต่ละตัว inject เฉพาะ dependency ที่ใช้จริง (จาก 12 เหลือ 3)
ฝั่งตรงข้ามคือ **Anemic Domain Model**: entity เป็นถุง getter/setter แล้ว logic ทั้งหมดไปกองใน service — รายละเอียดอยู่บท 14

## Unit of Work (UoW)

### ปัญหา

Use case หนึ่งแตะหลาย repository — ถ้า `orderRepo.save()` สำเร็จแต่ `stockRepo.reserve()` fail ระบบเหลือ order ที่ไม่มี stock จอง = ข้อมูลโกหก

### หลักการ

Unit of Work = ขอบเขตที่รวบทุกการเปลี่ยนแปลงใน use case เดียว แล้ว **commit หรือ rollback พร้อมกันทั้งก้อน**

```java
@Service
public class PlaceOrderUseCase {
    private final CustomerRepository customers;   // repo ทุกตัวทำงานใต้
    private final OrderRepository orders;         // persistence context เดียวกัน
    private final StockRepository stock;          // = Unit of Work ที่ JPA ถือให้

    @Transactional                                // ← ประกาศขอบเขต UoW ครอบทั้ง method
    public OrderId execute(PlaceOrderCommand cmd) {
        var customer = customers.getById(cmd.customerId());
        var order = Order.place(customer, cmd.items());
        orders.save(order);
        stock.reserve(order.lines());
        return order.id();
        // ออกจาก method ปกติ = commit ทุกอย่างพร้อมกันจุดเดียว
        // exception หลุดออกไป = rollback ทั้งก้อน — ไม่มีสถานะครึ่งๆ กลางๆ
    }
}
```

แต่ละภาษาได้ UoW มาคนละทาง:

- **Java**: `@Transactional` + JPA persistence context คือ UoW สำเร็จรูป (Hibernate track dirty object ให้) — ราคาที่จ่ายคือ magic ที่ต้องเข้าใจ (lazy loading, flush timing)
- **Python**: SQLAlchemy `Session` คือ UoW อยู่แล้ว — pattern ข้างบนแค่ห่อให้ boundary ชัดและ test ได้
- **Go**: ไม่มี magic — ส่ง `*sql.Tx` เข้า repo ทุกตัว หรือทำ `WithinTx(ctx, func(repos) error)` แล้วให้ closure คุม commit/rollback; ความชัดแจ้งนี้คือสำเนียง Go

### กฎเหล็กที่โยงไปบท 11

**ใน Unit of Work ห้ามมี external call** — payment API, Kafka publish, email ไม่ rollback ตาม DB
ถ้า use case ต้อง "commit DB **และ** ส่ง event" → นั่นคือปัญหา dual-write ซึ่งคำตอบที่ถูกคือ **Outbox pattern** (บท 11) ไม่ใช่การภาวนาว่า network จะไม่พังระหว่างสองบรรทัดนั้น

## Testing มุมมองของชั้นนี้ (โยงบท 12)

| ชั้น | Test ด้วยอะไร |
|---|---|
| Domain (`Order.place`) | unit test ล้วน — ไม่มี mock เลย เร็วระดับ ms |
| Use case | fake repository ใน memory — test orchestration + ลำดับ |
| Repository จริง | integration test กับ DB จริง (testcontainers) + contract test ชุดเดียวกับ fake |

ถ้า test domain ต้องใช้ mock = domain แอบพึ่ง I/O อยู่ — design ฟ้องตัวเองผ่าน test เสมอ

## สรุปบท

- Repository พูดภาษา domain, หนึ่งตัวต่อ aggregate, ห้ามมี business logic
- Use case = orchestrator ต่อหนึ่ง user intent; การตัดสินใจอยู่ใน domain; God Service แตกตาม use case
- Unit of Work = ทุกการเขียนใน use case commit/rollback เป็นก้อนเดียว — และห้ามมี external call ข้างใน
- โครงนี้คือรากที่ทำให้บท 11 (Outbox/Saga) และบท 12 (Testing) เป็นไปได้

จบ Part 1 — Part 2 ถัดไปคือความรู้พื้นฐาน backend (Core Backend + Database) ก่อนเข้า pattern รายตัวใน Part 3

## สรุปท้ายบท

- repository, service, use case และ unit of work มีค่าเพราะมันแบ่งหน้าที่และ transaction boundary ให้ชัด ไม่ใช่เพราะเป็นศัพท์ยอดนิยม
- business decision ควรอยู่กับ domain/use case ส่วน persistence และรายละเอียดภายนอกควรถูกดันออกไปที่ขอบ
- ถ้าหน้าที่ของชั้นเหล่านี้ปนกัน ระบบจะเริ่มทดสอบยาก, แก้ยาก และขยายต่อยากแทบทุกมิติ
- บทนี้จึงเป็นรากเชิงปฏิบัติของเรื่อง outbox, testing และ system design ที่จะตามมา

## ก่อนไปบทถัดไป

หลังจากปูหลักคิดและโครงสถาปัตยกรรมครบแล้ว เล่มจะขยับไปฐานความรู้ backend โดยตรง เริ่มจากคำถามพื้นฐานที่ถูกใช้เปิดสัมภาษณ์บ่อยที่สุดก่อนในบทถัดไป
