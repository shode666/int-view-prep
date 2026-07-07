# บทที่ 2 — Coupling, Cohesion และ Dependency

> เป้าหมายของบทนี้: เปลี่ยน "coupling สูง" จากคำด่าลอยๆ ให้เป็นสิ่งที่ **ชี้ได้ วัดได้ และแก้เป็นขั้นตอน** — สองคำนี้คือรากของแทบทุกบทที่เหลือในเล่ม ถ้าบทนี้แน่น บทอื่นจะกลายเป็น "อ๋อ ก็เรื่องเดิมในมุมใหม่"

## เข็มทิศก่อนอ่าน

ถ้าบทแรกให้หลักคิดกว้าง ๆ บทนี้จะเปลี่ยนมันให้กลายเป็นเครื่องมือวินิจฉัยที่จับต้องได้จริง Coupling กับ cohesion ไม่ใช่ศัพท์ไว้ใช้ใน design review ให้ดูเก่ง แต่เป็นแว่นที่ใช้มองว่าทำไมระบบหนึ่งแก้นิดเดียวพังไปทั่ว ขณะที่อีกระบบหนึ่งขยับได้โดยไม่สะเทือนทั้งบ้าน

ระหว่างอ่านให้พยายามโยงทุกตัวอย่างกลับไปที่คำถามสองข้อเสมอ: ของที่อยู่ด้วยกันควรอยู่ด้วยกันจริงไหม และของที่แยกกันอยู่ควรรู้จักกันมากขนาดนี้ไหม ถ้าถามสองข้อนี้จนชิน บทถัด ๆ ไปจะต่อกันง่ายมาก

## ภาพใหญ่ก่อน: สองคำนี้ถามคนละคำถาม

- **Cohesion** ถามว่า: ของที่อยู่**ข้างใน** module เดียวกัน เกี่ยวข้องกันจริงแค่ไหน → เป้าหมายของเราคือทำให้**สูง** (ยิ่งเกี่ยวข้องกันมาก ยิ่งหาเจอง่าย แก้ที่เดียวจบ)
- **Coupling** ถามว่า: module **ต่างตัวกัน** พึ่งพากันแน่นแค่ไหน → เป้าหมายของเราคือทำให้**ต่ำ** (ยิ่งพึ่งกันน้อย แก้ตัวหนึ่งยิ่งไม่สะเทือนตัวอื่น)

ท่องสั้นๆ: **"ข้างในแน่น ข้างนอกหลวม"** (high cohesion, low coupling)

เปรียบง่ายๆ: แผนกที่ดีในบริษัท คือแผนกที่งานข้างในเกี่ยวข้องกันหมด (cohesion สูง) และคุยกับแผนกอื่นผ่านช่องทางชัดๆ ไม่ต้องเดินไปค้นลิ้นชักโต๊ะของอีกแผนก (coupling ต่ำ) — ระบบ software ที่ดีก็โครงเดียวกัน

ทำไมต้องแคร์: เพราะต้นทุนที่แท้จริงของ software ไม่ใช่การเขียนครั้งแรก แต่คือ**การแก้ครั้งที่ร้อย** — coupling สูง = แก้จุดเดียวสะเทือนสิบไฟล์, cohesion ต่ำ = หาไม่เจอว่าเรื่องนี้อยู่ไฟล์ไหน

## Coupling คืออะไรกันแน่

นิยามที่ใช้งานได้: Coupling = ปริมาณ **ความรู้** ที่ module A ต้องมีเกี่ยวกับ module B เพื่อทำงานได้

"ความรู้" หมายถึงทุกอย่างที่ถ้า B เปลี่ยนแล้ว A ต้องเปลี่ยนตาม: ชื่อ method, ลำดับ parameter, โครงสร้างข้อมูลภายใน, พฤติกรรมที่ไม่ได้เขียนไว้ (เช่น "ต้องเรียก init ก่อน save") — ยิ่ง A รู้เรื่อง B มาก การแก้ B ยิ่งเสี่ยงพัง A

### 6 ระดับ จากแย่สุด → ดีสุด (พร้อมตัวอย่างทุกระดับ)

**ระดับ 1 — Content coupling (แย่สุด)**: A ล้วงไส้ B ตรงๆ — แก้ internal ของ B โดยไม่ผ่านหน้าบ้าน

```java
// OrderService ล้วงเข้าไปแก้ list ข้างใน Cart ตรงๆ (field ถูกเปิดไว้)
class OrderService {
    void applyPromo(Cart cart) {
        cart.items.add(new PromoItem());                             // ล้วงไส้!
        cart.total = cart.total.multiply(new BigDecimal("0.9"));     // คำนวณแทน Cart เอง
    }
}
```

ปัญหา: Cart เปลี่ยนวิธีเก็บ `items` เมื่อไหร่ OrderService พังทันที และ invariant ของ Cart (เช่น total ต้องตรงกับ items เสมอ) ถูกทำลายจากข้างนอกโดย Cart ป้องกันตัวเองไม่ได้
ทางแก้: บังคับผ่าน method ที่ Cart เป็นเจ้าของ — `cart.add_item(...)`, `cart.apply_discount(...)` — ให้ Cart คุมกติกาตัวเอง

**ระดับ 2 — Common coupling**: A และ B แชร์ global mutable state

```java
// ทุก module อ่าน/เขียน static map ก้อนเดียวกัน
public class GlobalState {
    public static final Map<String, Object> CONFIG = new HashMap<>();
}

void processOrder(Order order) {
    GlobalState.CONFIG.put("lastOrderId", order.getId());  // ใครเขียนทับเมื่อไหร่ ไม่มีใครรู้
}
```

ปัญหา: bug ตามหาไม่ได้ว่าใครเปลี่ยนค่า (ทุกคนมีสิทธิ์), test รันขนานกันไม่ได้ (แชร์ state), ลำดับการรันมีผลลับๆ
ทางแก้: ส่ง config/state เป็น parameter ชัดๆ (Explicit Dependencies — บท 1) หรือถ้าต้อง mutable จริง ให้มีเจ้าของเดียวที่คุมการเปลี่ยน

**ระดับ 3 — Control coupling**: A ส่ง flag ไปสั่งว่า B ควรทำงาน "แบบไหน"

```java
// ทุกครั้งที่มี use case ใหม่ ก็เพิ่ม flag — สุดท้าย 5 flags = 32 เส้นทางที่ต้อง test
void createOrder(OrderData data, boolean skipStock, boolean isAdmin, boolean dryRun) {
    if (!skipStock) checkStock(data);
    if (isAdmin) { ... }
    ...
}
```

ปัญหา: caller ต้อง**รู้ภายใน**ของ B ว่า flag ตัวไหนกระทบ path ไหน — นั่นแหละคือความรู้ที่ไม่ควรมี และ function กำลังทำหลายเรื่องในร่างเดียว (cohesion ต่ำ)
ทางแก้: caller เลือก "พฤติกรรม" ไม่ใช่ส่ง flag — แยกเป็น `OrderCreator` / `AdminOrderCreator` หรือส่ง strategy เข้าไป (บท 8) — flag parameter ที่งอกเรื่อยๆ คือป้ายบอกทางไปหา Strategy pattern เกือบเสมอ

**ระดับ 4 — Stamp coupling**: A ส่ง object ทั้งก้อนให้ B ทั้งที่ B ใช้แค่ 2 field

```java
// เมธอดส่งอีเมล รับ Order ทั้งก้อน — ทั้งที่ใช้แค่ email กับชื่อ
void sendConfirmation(Order o) {            // Order มี 25 fields
    send(o.getCustomer().getEmail(), "สั่งซื้อสำเร็จ คุณ" + o.getCustomer().getName());
}
```

ปัญหา: ดูเผินๆ ไม่เป็นไร แต่ (1) test ต้องประกอบ Order ทั้งก้อนเพื่อ test การส่งเมล (2) อ่าน signature แล้วไม่รู้ว่าจริงๆ ใช้อะไรบ้าง (3) Order เปลี่ยน โมดูลเมลต้อง recompile/เสี่ยงพังทั้งที่ไม่เกี่ยว
ทางแก้: รับเท่าที่ใช้ — `sendConfirmation(String email, String name)` หรือรับ object เล็กเฉพาะทาง (`Recipient`) — นี่คือญาติของ Interface Segregation (บท 3)

**ระดับ 5 — Data coupling (ดี ✅)**: A ส่งเฉพาะข้อมูลที่ B ต้องใช้ ผ่าน parameter ชัดๆ

```java
Money calculateShipping(double weightKg, Zone destination)
```

อ่าน signature เดียวรู้ครบ: ต้องใช้อะไร คืนอะไร — เปลี่ยนโครงสร้างภายในของใครก็ไม่กระทบกัน นี่คือเป้าหมาย default ของ function ทั่วไป

**ระดับ 6 — Message coupling (ดีสุด ✅✅ แต่มีราคา)**: A แค่ประกาศ event — ไม่รู้ด้วยซ้ำว่าใครฟัง

```java
events.publish(new OrderPlaced(orderId, items));
// ใครอยากทำอะไรต่อ (ส่งเมล, ตัด stock) ไปฟังเอาเอง — A ไม่รู้จักใครเลย
```

coupling ต่ำสุดที่เป็นไปได้ แต่**ไม่ฟรี**: flow มองไม่เห็นใน call graph, debug ต้องมี tracing, message มาซ้ำได้ — รายละเอียดเต็มๆ คือบท 9 ทั้งบท จำตอนนี้แค่: อย่าใช้ระดับ 6 เพียงเพราะมัน "ดีสุดในตาราง" — เลือกระดับที่**ราคาเหมาะกับรอยต่อนั้น**

### สรุปวิธีใช้ตาราง 6 ระดับ

เวลา review code ให้ถามว่า "การคุยกันคู่นี้อยู่ระดับไหน แล้ว**เลื่อนขึ้นหนึ่งระดับได้ไหม**" — ไม่ต้องดันทุกอย่างไประดับ 6 แค่กำจัดระดับ 1–3 ให้หมดก็ยกคุณภาพ codebase ได้มหาศาลแล้ว

## Cohesion คืออะไรกันแน่

นิยามที่ใช้งานได้: ของที่อยู่ใน module เดียวกัน **เปลี่ยนด้วยเหตุผลเดียวกัน** แค่ไหน

ตัวอย่างที่เห็นภาพสุด — class ที่ cohesion ต่ำ:

```java
class OrderService {
    void placeOrder(...) { ... }          // เปลี่ยนเมื่อ กติกาการสั่งซื้อ เปลี่ยน
    String renderInvoiceHtml(...) { ... } // เปลี่ยนเมื่อ ดีไซน์ใบแจ้งหนี้ เปลี่ยน
    void exportToAccounting(...) { ... }  // เปลี่ยนเมื่อ ระบบบัญชี เปลี่ยน
    boolean isHoliday(LocalDate d) { ... }// ...อันนี้มาอยู่ตรงนี้ทำไม?
}
```

สี่ method สี่เหตุผลการเปลี่ยน สี่กลุ่มคนที่จะมาขอแก้ — มันคือสี่ module ที่บังเอิญอยู่บ้านเดียวกัน

### สามคำถามทดสอบ cohesion (ใช้ได้ทันทีตอน review)

**ทดสอบ 1 — ประโยคเดียวไม่มี "และ"**: อธิบาย module นี้ให้จบในประโยคเดียวได้ไหม
"จัดการกติกาการสั่งซื้อ" ✅ / "จัดการการสั่งซื้อ **และ** render ใบแจ้งหนี้ **และ** ส่งออกบัญชี" ❌ — ทุก "และ" คือรอยตัดที่ควรผ่า

**ทดสอบ 2 — field ถูกใช้ทั่วถึงไหม**: ถ้า field หนึ่งถูกใช้โดย method เดียว แปลว่ามี class เล็กซ่อนอยู่ข้างใน

```java
class ReportService {
    private final Db db;                 // ใช้โดยทุก method ✅
    private final SmtpClient smtp;       // ใช้โดย sendReport() เท่านั้น ← กลิ่น!
}
// smtp + sendReport ควรแยกเป็น ReportSender ของตัวเอง
```

**ทดสอบ 3 — ชื่อกว้างขึ้นเรื่อยๆ ไหม**: วิวัฒนาการ `OrderService` → `OrderAndInvoiceService` → `OrderManager` → `utils.py` — ชื่อที่กว้างขึ้นคือสัญญาณว่าของข้างในเลิกเกี่ยวข้องกันแล้ว
`utils` / `common` / `helper` คือหลุมฝัง cohesion: ของที่ "ไม่รู้จะวางไหน" จริงๆ คือของที่เรายังไม่เข้าใจว่าเป็น concern ของใคร — ทู่ซี้ตั้งชื่อตาม concern จริง (`money.py`, `thai_date.py`) จะเจอบ้านที่ถูกเสมอ

### Coupling กับ Cohesion เป็นเหรียญเดียวกัน

สังเกตว่า God class (cohesion ต่ำ) จะ**สร้าง** coupling สูงโดยอัตโนมัติ: ทุกคนต้อง import มัน เพราะทุกอย่างอยู่ในนั้น → มันกลายเป็นศูนย์กลางที่แตะแล้วสะเทือนทั้งระบบ — แก้ cohesion มักได้ coupling ที่ดีขึ้นแถมมาด้วย

## ทิศทางของ Dependency สำคัญกว่าจำนวน

ปูพื้นก่อน: "ลูกศร dependency" ก็คือ **บรรทัด import ในโค้ด** — ไฟล์ไหนมี `import` = ไฟล์นั้นชี้ลูกศรออกไปหาของที่มัน import และกฎธรรมชาติของ software คือ **แก้ของที่ถูกชี้ คนที่ชี้มาจะพังตาม** (แก้ PostgresRepo → OrderService ที่ import มันอยู่เสี่ยงพัง / แก้ OrderService → PostgresRepo ไม่รู้เรื่องเลย)

ส่วนใหญ่คนนับว่า "module นี้ import กี่ตัว" — แต่คำถามที่สำคัญกว่าคือ **import ไปหาของที่เสถียรแค่ไหน**

กฎเหล็ก: **ของที่เสถียรน้อย ควรพึ่งของที่เสถียรมาก — ห้ามกลับกัน**

ลองไล่ความเสถียรในระบบทั่วไป:

| ของ | เปลี่ยนบ่อยแค่ไหน |
|---|---|
| Business rule แกนกลาง ("ยอดขั้นต่ำ", "วิธีคิดส่วนลด") | เปลี่ยนเมื่อธุรกิจเปลี่ยน — **เสถียรสุด** |
| โครง use case ("สั่งซื้อ = ตรวจ → จอง → เก็บ") | นานๆ เปลี่ยน |
| HTTP framework, Object-Relational Mapping (ORM), DB driver | เปลี่ยน version ทุกไตรมาส, เปลี่ยนตัวทุก 3–5 ปี — **ผันผวนสุด** |

แต่ code ส่วนใหญ่ที่เน่า เขียน**กลับด้าน**: business rule import SQLAlchemy, `@Entity` ของ JPA แปะอยู่บน domain object, retry logic ฝังใน controller — เท่ากับเอาของเสถียรที่สุดไปฝากชีวิตไว้กับของที่ผันผวนที่สุด พอ framework ขยับ business rule ต้องขยับตามทั้งที่ธุรกิจไม่ได้เปลี่ยนอะไรเลย

### Dependency Inversion — เครื่องมือกลับทิศ ทีละขั้น

โจทย์: `OrderService` (business) ต้องเซฟ order ลง Postgres (infrastructure)

**ขั้นที่ 0 — แบบตรงไปตรงมา (ทิศผิด):**

```
OrderService ──import──▶ PostgresOrderRepo
(เสถียร)                    (ผันผวน)
```

business พึ่ง infrastructure → เปลี่ยน DB สะเทือน business, test business ต้องมี DB

**ขั้นที่ 1 — business ประกาศ "สิ่งที่ฉันต้องการ" เป็น interface:**

```go
// ไฟล์นี้อยู่ฝั่ง business — คำศัพท์เป็นภาษา business ล้วน
type OrderRepository interface {
    FindByID(ctx context.Context, id string) (*Order, error)
    Save(ctx context.Context, o *Order) error
}
```

**ขั้นที่ 2 — infrastructure มา implement interface นั้น:**

```
OrderService ──ใช้──▶ OrderRepository (interface, อยู่บ้าน business)
                            ▲
                            └── implement โดย PostgresOrderRepo (บ้าน infra)
```

ดูลูกศร compile-time ตอนนี้: PostgresOrderRepo **ชี้เข้าหา** business (มัน import interface ไป implement) — ทิศกลับแล้ว! business ไม่รู้จัก Postgres อีกต่อไป เปลี่ยนเป็น DynamoDB ก็เขียน impl ใหม่มาเสียบ business ไม่ diff สักบรรทัด และ test ใช้ in-memory fake ได้ทันที

จุดที่คนงงบ่อย: **interface ต้องอยู่บ้านผู้ใช้ (business) ไม่ใช่บ้านผู้ implement (infra)** — ถ้า interface อยู่ฝั่ง infra ลูกศรก็ยังชี้ผิดทางเหมือนเดิม การย้ายที่อยู่ของ interface คือหัวใจของการกลับทิศ

### สามภาษา สามสำเนียง

```java
// Java — interface ชัดแจ้ง (nominal: ต้องประกาศ implements), DI framework ต่อสายให้
public interface OrderRepository {
    Optional<Order> findById(OrderId id);
    void save(Order order);
}
@Repository
class JpaOrderRepository implements OrderRepository { ... }
```

```python
# Python — Protocol (structural typing): แค่ shape ตรงก็นับว่า implement
from typing import Protocol

class OrderRepository(Protocol):
    def find_by_id(self, order_id: str) -> Order | None: ...
    def save(self, order: Order) -> None: ...

class PostgresOrderRepository:      # ไม่ต้อง extends อะไรเลย
    def find_by_id(self, order_id: str) -> Order | None: ...
    def save(self, order: Order) -> None: ...
```

```go
// Go — interface ประกาศฝั่งผู้ใช้ และเล็กที่สุดเท่าที่ใช้จริง
// สำเนียงประจำภาษา: "accept interfaces, return structs"
type OrderRepository interface {
    FindByID(ctx context.Context, id string) (*Order, error)
    Save(ctx context.Context, o *Order) error
}

type OrderService struct{ repo OrderRepository }

func NewOrderService(repo OrderRepository) *OrderService {
    return &OrderService{repo: repo}
}
```

จุดต่างที่ senior ควรอธิบายได้ — สามภาษาใช้ระบบ "นับว่าใคร implement interface" คนละแบบ:

**Java — นับที่การประกาศ (nominal typing)**
Class จะถือว่า implement interface ได้ต่อเมื่อเขียน `implements OrderRepository` ชัดๆ เท่านั้น — ต่อให้ method ครบทุกตัวแต่ไม่ประกาศ ก็ไม่นับ
ข้อดีคือความชัด: IDE บอกได้ทันทีว่าใคร implement อะไร แต่มันสร้างวัฒนธรรม "สร้าง interface ให้ทุก class ตั้งแต่วันแรกเผื่อไว้" → เกิด interface เปล่าประโยชน์เต็มระบบ (มี implementation เดียวตลอดกาล และไม่มี test ไหน fake มัน — บท 14) ก่อนสร้าง interface ใน Java ให้ถามก่อนว่า "จะมีตัวที่สองจริงไหม หรือมี test ที่ต้อง fake ไหม" — ถ้าไม่มีทั้งคู่ ยังไม่ต้องสร้าง

**Python — ไม่นับอะไรเลย ดูพฤติกรรมเอา (duck typing)**
"ถ้ามันเดินเหมือนเป็ด ร้องเหมือนเป็ด ก็ใช้มันแบบเป็ดได้เลย" — object ไหนมี method ที่ถูกเรียกครบ ก็ใช้แทนกันได้ ไม่ต้องประกาศอะไรทั้งนั้น
ข้อดี: decouple ได้ฟรีไม่มีพิธี ข้อเสีย: สัญญาที่ว่า "repository ต้องมี method อะไรบ้าง" **ไม่ได้เขียนอยู่ในโค้ด — อยู่ในความจำของคน** พอทีมโตหรือคนเขียนลาออก ของที่ผิดสัญญาจะไปพังตอน runtime ต่อหน้า user
ทางแก้เมื่อ codebase โต: ประกาศสัญญาเป็น `Protocol` แล้วให้ mypy ตรวจใน CI — ได้ความยืดหยุ่นแบบ duck typing เหมือนเดิม แต่เครื่องตรวจสัญญาแทนความจำคน

**Go — นับที่ shape โดย compiler ตรวจให้ (implicit / structural typing)**
Struct ไหนมี method ครบตาม interface ก็ถือว่า implement **โดยอัตโนมัติ** ไม่ต้องประกาศ — เหมือน duck typing แต่ compiler ตรวจให้ตั้งแต่ตอน compile ไม่ต้องรอพังตอน runtime
ผลพิเศษที่อีกสองภาษาทำไม่ได้: อยากกลับทิศ dependency ตรงไหน ประกาศ interface เล็กๆ ฝั่งผู้ใช้ตรงนั้นได้ทันที **โดยไม่ต้องแตะโค้ดของ provider แม้แต่บรรทัดเดียว** (เช่น อยาก fake การคุย DB ใน test ก็ประกาศ interface ที่มีเฉพาะ method ที่เราใช้ แล้ว `*sql.DB` ของจริงก็ "บังเอิญ" implement มันอยู่แล้ว)
สำเนียงของภาษา: interface ควรเล็ก 1–3 method — `io.Reader` ทั้ง ecosystem ยืนอยู่บน method เดียว (`Read`) คือแบบอย่าง; การขน interface 20 method สไตล์ Java มา Go ถือว่าผิดสำเนียง

## วัดยังไงว่า coupling เริ่มสูงเกิน

สัญญาณเชิงพฤติกรรม — สังเกตได้โดยไม่ต้องใช้เครื่องมือ:

1. **Shotgun surgery**: feature เล็กหนึ่งอัน ("เพิ่ม field เบอร์โทรใน order") ต้องแก้ 6–8 ไฟล์กระจายทั่วระบบ — concern เดียวถูกหั่นกระจาย
2. **Test แดงเป็นโดมิโน**: แก้ module A แล้ว test ของ B, C, D พังพร้อมกันเป็นประจำ — แปลว่า B, C, D รู้เรื่อง A มากเกินไป
3. **Mock บวม**: เขียน unit test หนึ่งตัวต้อง mock 5+ dependency — test กำลังฟ้องว่า class นี้พึ่งคนอื่นเยอะเกิน (บท 12 จะใช้สัญญาณนี้เต็มๆ)
4. **Circular dependency**: A import B, B import A — ตัดสินใจอะไรไม่ได้สักอย่างโดยไม่ลากอีกตัวมาด้วย; Go ห้ามที่ compile time, Python/Java มันงอกเงียบๆ จนวันที่แก้ไม่ไหว
5. **ความกลัว**: ทีมพูดว่า "อย่าไปแตะ module นั้น" — นั่นคือ coupling สูงที่วัดจากพฤติกรรมมนุษย์

เครื่องมือบังคับใน Continuous Integration (CI) (กันคนแหกกฎตอนรีบ):

- Java: **ArchUnit** — เขียน test ว่า "package `domain` ห้าม import `infrastructure`"
- Python: **import-linter** — ประกาศ layer contract ในไฟล์ config
- Go: package cycle เป็น compile error ฟรีอยู่แล้ว + **depguard** ใน golangci-lint สำหรับกฎเพิ่มเติม

## ลด coupling มากเกินไปก็พัง

Decoupling ไม่ฟรี — ทุก interface, ทุก event, ทุก indirection คือ hop ที่คนอ่านต้องกระโดดตามเพิ่ม ตัวอย่างของการจ่ายแพงเกินราคา:

- **Distributed Monolith**: แยก 40 microservice แต่ทุก deploy ต้องปล่อยพร้อมกัน — coupling เท่าเดิมเป๊ะ แค่เพิ่ม network, serialization และ 3AM pager เข้าไป (บท 14)
- **Event Spaghetti**: ทุกอย่างคุยผ่าน event จน trace flow ไม่ได้ (บท 9)
- **Interface ทุก class**: ทั้งที่มี impl เดียวและไม่มีแผนจะมีตัวที่สอง — อ่าน code ต้อง Ctrl+B สองเด้งทุกบรรทัด

เกณฑ์ตัดสินที่ใช้จริง: decouple ตรง **รอยต่อที่คาดว่าจะเปลี่ยนไม่พร้อมกัน** — DB (จะเปลี่ยน/อยาก fake ใน test), external vendor (จะย้ายเจ้า), business rule ที่ผันผวน (จะงอก) — ส่วนรอยต่อที่เปลี่ยนพร้อมกันเสมอ (helper ภายใน module) ปล่อยให้ concrete ไปเถอะ

## สรุปบท

| แนวคิด | ใช้ตัดสินใจอะไร |
|---|---|
| Coupling = ปริมาณความรู้ที่ A มีต่อ B | ยิ่งรู้มาก แก้ B ยิ่งพัง A |
| ระดับ coupling 6 ขั้น | ชี้ได้ว่าคู่ไหนแย่ระดับไหน + เลื่อนขึ้นทีละขั้น (กำจัดระดับ 1–3 ก่อน) |
| Cohesion = เปลี่ยนด้วยเหตุผลเดียวกัน | สามคำถามทดสอบ: ประโยคเดียวไม่มี "และ" / field ใช้ทั่วถึง / ชื่อไม่กว้างขึ้น |
| ทิศ dependency: ผันผวน → เสถียร | interface อยู่บ้านผู้ใช้ ลูกศรชี้เข้า business เสมอ |
| สัญญาณ 5 ตัว + เครื่องมือ CI | จับ coupling สูงก่อนมันจับเรา |
| ราคาของ decoupling | แยกเฉพาะรอยต่อที่เปลี่ยนไม่พร้อมกัน — ไม่ใช่ทุกรอยต่อ |

บทต่อไป: SOLID — ซึ่งจะเห็นว่าแทบทุกตัวคือ coupling/cohesion ในมุมเฉพาะทาง: SRP คือ cohesion, ISP กับ DIP คือ coupling, OCP คือการเตรียมรอยต่อไว้ล่วงหน้า

## สรุปท้ายบท

- cohesion กับ coupling เป็นภาษากลางของการคุยเรื่อง design ที่จับต้องได้จริง
- เป้าหมายไม่ใช่แยกทุกอย่างออกจากกัน แต่คือทำให้ของที่ควรอยู่ด้วยกันอยู่ด้วยกันแน่น และของที่ไม่ควรรู้กันไม่รู้กันเกินจำเป็น
- ทิศของ dependency สำคัญพอ ๆ กับจำนวน dependency เพราะมันชี้ว่าใครกำลังผูกอนาคตของใครอยู่
- หลายปัญหาที่ดูเป็นเรื่อง pattern, layering หรือ testing จริง ๆ แล้วเริ่มจาก coupling/cohesion ผิดตั้งแต่ต้น

## ก่อนไปบทถัดไป

เมื่อมีแว่นวัด coupling/cohesion แล้ว บทถัดไปจะพาไปดู SOLID ในฐานะชุดชื่อของ trade-off ที่ขยายหลักสองข้อนี้ออกมาให้ใช้กับ class, interface และรอยต่อของระบบได้ละเอียดขึ้น
