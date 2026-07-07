# บทที่ 8 — Strategy, Factory, Adapter, Facade, Builder

> Pattern แต่ละตัวในบทนี้เดินโครงเดียวกัน: **ปัญหา → refactor → trade-off → ใช้ผิดพังแบบไหน → สำเนียง 3 ภาษา**

## เข็มทิศก่อนอ่าน

บทนี้จะเริ่มเรียกชื่อ pattern ตรง ๆ แต่แกนยังเหมือนบทแรกคือ pattern เป็นคำอธิบายของวิธีแก้ปัญหาที่เกิดซ้ำ ไม่ใช่เครื่องหมายของความ senior การรู้ชื่อจึงมีประโยชน์ก็ต่อเมื่อเรายังจำแรงกดดันที่ทำให้ pattern นั้นเกิดขึ้นได้อยู่

ให้อ่านแบบจับคู่ pattern กับอาการ เช่น if-else ที่งอกไม่หยุด, vendor lock หรือ constructor ที่ยาวเกินไป ถ้าจับคู่นี้ได้ เวลาเจอปัญหาจริงคุณจะหยิบ pattern ไปใช้เพราะจำเป็น ไม่ใช่เพราะคุ้นชื่อ

## Pattern คืออะไร ก่อนจะเริ่มเรียกชื่อมัน

คำว่า design pattern มักถูกสอนแบบเป็นรายชื่อ จนหลายคนเริ่มต้นด้วยการจำว่า Strategy, Factory หรือ Adapter "หน้าตาเป็นยังไง" มากกว่าจะเข้าใจว่า pattern เกิดขึ้นมาเพราะอะไร จริง ๆ แล้ว pattern คือ **ชื่อเรียกของวิธีจัดโครงสร้างโค้ดที่คนในวงการพบซ้ำ ๆ ว่าใช้แก้ปัญหาแบบหนึ่งได้ดีพอสมควร**

พูดอีกแบบคือ pattern ไม่ใช่ชิ้นส่วนสำเร็จรูปที่ต้องยัดใส่ทุกโปรเจกต์ มันคือภาษากลางในการคุยกันว่า:

- ปัญหานี้ซ้ำกับของเดิมที่โลกเคยเจอไหม
- โครงแบบที่คนเคยใช้แก้มันคืออะไร
- ถ้าเลือกโครงนี้ เราต้องยอมจ่ายความซับซ้อนอะไรเพิ่ม

ตัวอย่างง่ายที่สุด:

- โค้ดมี `if/else` หลายชั้นเพราะพฤติกรรมเปลี่ยนตามประเภทงาน นี่คืออาการที่ชวนให้นึกถึง Strategy
- โค้ดผูกกับ SDK ภายนอกเต็มไปหมดจนเปลี่ยน vendor ลำบาก นี่คืออาการที่ชวนให้นึกถึง Adapter
- การสร้าง object ยุ่งจนทุกที่ต้องรู้รายละเอียดเหมือนกันหมด นี่คืออาการที่ชวนให้นึกถึง Factory หรือ Builder

สิ่งสำคัญกว่าจำชื่อคือจำให้ได้ว่า **pattern เป็นผลลัพธ์ของแรงกดดันในระบบ** ถ้าแรงกดดันนั้นยังไม่เกิด การรีบใช้ pattern มักทำให้โค้ดมีชั้นเกินจำเป็น แต่ถ้าแรงกดดันเกิดแล้วและเราไม่จัดโครงสร้างใหม่ โค้ดก็จะโตแบบแก้ยากขึ้นทุก sprint บทนี้จึงไม่ได้สอนให้ "ท่อง pattern" แต่สอนให้เห็นว่าแต่ละ pattern เป็นคำตอบต่ออาการแบบไหน

## Strategy Pattern

**ปัญหา**: พฤติกรรมหนึ่งจุดมีหลายแบบ และแบบใหม่งอกเรื่อยๆ → if/elif ที่โตทุก sprint (เห็นเต็มๆ แล้วในบท 3 หัวข้อ Open-Closed Principle (OCP) — discount engine)

**หัวใจ**: แยก "อัลกอริทึมที่เลือกได้" ออกเป็น object/function ที่สลับกันได้หลัง interface เดียว — caller เลือก **ว่าใช้ตัวไหน**, strategy รู้แค่ **วิธีทำ**

```java
public interface ShippingCalculator {
    Money cost(Order o);
}
class FlatRate  implements ShippingCalculator { ... }
class ByWeight  implements ShippingCalculator { ... }
class Express   implements ShippingCalculator { ... }

// เลือก strategy จาก config/context ตอน runtime
static ShippingCalculator newCalculator(String kind) { ... }   // ← นี่คือ Factory (ตัวถัดไป)
```

**Trade-off**: กติกาใหม่ = class ใหม่ ไม่แตะของเดิม, test แยกรายตัว ⟷ จำนวนไฟล์เพิ่ม, การอ่าน flow ต้องรู้ว่า runtime เลือกตัวไหน (ชี้ด้วย log/trace)

**ใช้ผิด**: มี 2 ทางเลือกที่นิ่งมาสองปี แล้วทำ Strategy + registry + config — if เดียวอ่านง่ายกว่า / อีกแบบ: strategy ที่ต้องรู้ internal ของกันเอง (ส่ง flag หากัน) = แค่ย้าย if ไปซ่อน

**3 ภาษา**: Java — interface + Dependency Injection (DI) เลือก impl (`Map<String, ShippingStrategy>` inject ทั้ง map ได้ใน Spring) · Python — ไม่ต้องมี class ก็ได้: **function คือ strategy** (`Callable[[Order], Decimal]` ใส่ dict) · Go — interface เล็ก หรือ field ที่เป็น func type (`CostFn func(Order) (Money, error)`)

## Factory Pattern

**ปัญหา**: การสร้าง object ซับซ้อน (เลือก class จาก config, ต้องประกอบ dependency หลายชั้น) ถูกก๊อปกระจายทั่ว codebase → เปลี่ยนวิธีสร้างทีต้องไล่แก้ทุกจุด และ caller ผูกกับ concrete class (new PostgresRepo() โผล่ 30 ไฟล์)

**หัวใจ**: รวม "การตัดสินใจว่าสร้างอะไร + สร้างยังไง" ไว้ที่เดียว — caller ได้ interface กลับไป ไม่รู้จัก concrete

```java
static PaymentGateway createPaymentGateway(String provider, Config config) {
    return switch (provider) {
        case "stripe"  -> new StripeGateway(config.stripeKey(), config.timeout());
        case "omise"   -> new OmiseGateway(config.omiseKey());
        case "sandbox" -> new FakeGateway();       // test/local ใช้ตัวปลอมได้ทันที
        default -> throw new IllegalArgumentException(
            "unknown provider: " + provider);      // fail fast
    };
}
```

**Trade-off**: จุดเปลี่ยน implementation จุดเดียว, เปิดทาง test double ⟷ อีกชั้น indirection; ถ้า object สร้างง่าย (`new` ตรงๆ ไม่มีเงื่อนไข) factory คือพิธีกรรมเปล่า

**ใช้ผิด**: `UserFactory.create()` ที่ข้างในมีบรรทัดเดียวคือ `new User()` — พังคลาสสิกของ Java · FactoryFactory / AbstractFactoryBuilder = ขั้น abstraction ที่ไม่มีปัญหาให้แก้

**3 ภาษา**: Java — DI container คือ factory ยักษ์อยู่แล้ว เขียนเองเมื่อเลือก runtime · Python — module-level function พอ · Go — `NewXxx(...)` คือ convention ของภาษาอยู่แล้ว; factory ที่เลือก impl มักอยู่ใน `main()` ตอน wiring

**Factory คืนอะไรก็ได้ ไม่ใช่แค่ adapter**: `Order.place(...)` / `Money.of(1500, "THB")` คือ static factory ของ domain object (รวมกติกาการเกิดไว้จุดเดียว), factory ที่คืน `DiscountRule` คืน strategy — ที่คู่ factory+adapter เจอบ่อยจนเหมือนของคู่กัน เพราะ adapter มักถูก**เลือกจาก config ตอน runtime** (จ่ายเจ้าไหน, sandbox หรือจริง) ซึ่งคือเงื่อนไขที่เรียก factory พอดี — ความบังเอิญเชิงการใช้งาน ไม่ใช่กติกาของ pattern · ตัวอย่างในโลกจริง: `DriverManager.getConnection(url)` = factory, driver แต่ละ DB = adapter, `Connection` = port

## Adapter Pattern

**ปัญหา**: ระบบเราต้องคุยกับของนอก (payment SDK, legacy API) ที่ interface ไม่ตรงกับภาษา domain เรา — ถ้าเรียก SDK ตรงๆ ทั่ว codebase: เปลี่ยนเจ้า = แก้ทุกไฟล์, ศัพท์ของ vendor (charge, source, intent) รั่วเข้า business logic, test ต้องยิงของจริง

**หัวใจ**: เราประกาศ port เป็นภาษา domain (Dependency Inversion Principle (DIP) — บท 2) แล้วเขียน adapter แปลงไป-กลับกับ vendor

```java
// Port — ภาษาเรา, ไม่มีศัพท์ Stripe
public interface PaymentGateway {
    PaymentResult charge(OrderId id, Money amount, PaymentMethod method);
}

// Adapter — ที่เดียวที่ import com.stripe.*
class StripePaymentAdapter implements PaymentGateway {
    public PaymentResult charge(OrderId id, Money amount, PaymentMethod m) {
        try {
            var intent = PaymentIntent.create(Map.of(
                "amount", amount.minorUnits(), "currency", amount.currency(),
                "idempotency_key", id.value()));            // โยงบท 11
            return PaymentResult.success(intent.getId());
        } catch (CardException e) {
            return PaymentResult.declined(e.getDeclineCode()); // แปลง exception เป็นภาษา domain
        }
    }
}
```

**Trade-off**: เปลี่ยน vendor = เขียน adapter ใหม่ตัวเดียว, mock ที่ port ได้ ⟷ ต้อง maintain การแปลงสองทิศ และ **อย่าทำ port ให้เป็นเงาของ vendor** (มี method ชื่อ `createPaymentIntent` ใน port = แปลว่า abstraction รั่วแล้ว — vendor คนที่สองจะ implement ไม่ได้)

**ใช้ผิด**: adapter ครอบ library มาตรฐานที่ไม่มีวันเปลี่ยน (ครอบ `json` ของภาษา) = ชั้นเปล่า

**Adapter ห้ามตัดสินใจเชิงธุรกิจ** — งานของล่ามคือแปลงรูปเท่านั้น (แปลงหน่วย บาท→สตางค์, map ชื่อ field, แปลง exception เป็นภาษา domain) — `if (amount > 10_000) return declined` ใน adapter = กติกาธุรกิจหนีไปซ่อนในล่าม ที่ที่ unit test มองไม่เห็น (ต้อง integration test ถึงเจอ) — กติกาแบบนี้บ้านมันคือ domain

**Adapter vs Strategy — โครงเหมือนกันเป๊ะ แยกด้วยคำถามเดียว**: interface + หลาย impl + มีคนเลือก คือ skeleton ของทั้งคู่ ดูเผินๆ แยกไม่ออก — สิ่งที่ต่างคือ**อีกฝั่งของ class เป็นใคร**: มีของนอกที่เราคุมภาษาไม่ได้ยืนอยู่ (SDK, legacy API) = adapter — แก้โรคภาษาไม่ตรง / เป็นสูตรคิดของเราเอง (`GoldTierDiscount` รับ Order คืน Money ไม่คุยกับใคร) = strategy — แก้โรค if งอก · จำ: **มีล่ามต้องมีคนต่างชาติ** — และจำนวนตัวเลือกไม่เกี่ยว: DiscountRule 50 ตัวก็ยัง strategy, StripeAdapter ตัวเดียวโดดๆ ก็ยัง adapter

**3 ภาษา**: โครงเหมือนกันหมด ต่างที่พิธี — Java: interface + class · Python: Protocol + class ธรรมดา · Go: interface ฝั่ง consumer + struct; Go มี variant เบา: adapt function ด้วย func type

## Facade Pattern

**ปัญหา**: การทำงานหนึ่งเรื่องต้องเรียก subsystem 5 ตัวเรียงลำดับถูกต้อง — caller ทุกคนต้องรู้ลำดับนี้ → ก๊อปกัน แล้ววันหนึ่งมีคนเรียงผิด

**หัวใจ**: หน้ากากเดียวที่ห่อความซับซ้อนของหลาย subsystem ให้เหลือ method ที่ตรง use case — ต่างจาก Adapter (แปลง interface หนึ่งต่อหนึ่ง) ตรงที่ Facade **ลดจำนวนหน้าสัมผัส**

```java
// ก่อน: caller ทุกคนต้องรู้ลำดับพิธี 5 ขั้น — วันหนึ่งมีคนลืมขั้น 3
var priced   = pricingEngine.price(cart, promoService.activePromos());
var reserved = stockClient.reserve(priced.lines());
var payment  = paymentGateway.charge(priced.total(), method);
invoiceService.issue(priced, payment);
notifier.sendConfirmation(cart.customerEmail(), priced);

// หลัง: หน้าเดียวต่อ use case — ลำดับพิธีมีเจ้าของ
var result = checkout.placeOrder(cart, method);
```

สังเกตว่านี่คือสิ่งเดียวกับ **Use Case ในบท 5** — ใน backend สมัยใหม่ application service คือ facade ที่มีชื่อเป็นทางการแล้ว จึงแทบไม่ต้องสร้างคลาสชื่อ "FacadeXxx" แยก; อีกที่ที่ facade โผล่บ่อยคือการห่อ legacy subsystem ให้ทีมอื่นเรียกง่าย

ภาพจำทั้งทีมในฉากเดียว — **ร้านขายของ**: "ซื้อของ" คือ **facade** (จ่ายเงิน รับทอน รับของ — หลายขั้นตอนยุบเหลือกริยาเดียวตามเจตนา) / ขั้น "จ่ายเงิน" คือ **port** (สัญญา: จ่ายให้ครบ ไม่สนวิธี) / เงินสด-โอน-บัตร แต่ละวิธีคือ **adapter** (ล่ามคุยกับลิ้นชัก/ธนาคาร/เครื่องรูด) / คนเลือกวิธีจ่าย = **factory** — สี่ตัวนี้คือทีมเดียวกันในระบบจริงแทบทุกระบบ และการ "มีหลายวิธีให้เลือก" เป็นงานของ factory ไม่ใช่ของ adapter ตัวไหน

แยกกับ Adapter ให้ขาดด้วยคู่คำ: **Adapter = ล่าม** (แปล 1↔1 — จำนวนหน้าสัมผัสเท่าเดิม) / **Facade = ประตูเดียว** (ยุบ — ลดจำนวนหน้าสัมผัส) — facade ไม่ได้แปลอะไร front desk โรงแรมไม่ได้แปลภาษา มันแค่รู้ว่าออเดอร์ "อาหารเช้าที่ห้อง" ต้องสั่งครัว แจ้งแม่บ้าน ลงบิล

**ใช้ผิด**: facade ที่ re-export ทุก method ของทุก subsystem (ไม่ได้ลดอะไร แค่เพิ่ม hop) / facade กลายเป็น God Service เพราะ "สะดวกดี ยัดตรงนี้แหละ" (บท 14)

## Builder Pattern

**ปัญหา**: constructor รับ 9 parameter, ครึ่งหนึ่ง optional, สอง boolean ติดกัน — `new Report(true, false, null, null, "pdf", true)` อ่านไม่ออกและสลับลำดับแล้ว compiler ไม่ช่วย

**หัวใจ**: ประกอบ object ทีละส่วนด้วยชื่อชัดๆ แล้วปิดท้ายด้วย build ที่ validate ความครบ — บรรทัดเดิมด้านบนกลายเป็น `Report.builder().format("pdf").inlineCss(true).build()` (แต่ละ field มีชื่อกำกับ สลับลำดับไม่ได้ compiler ช่วย, `build()` โยน error ถ้า field บังคับขาด)

**จุดที่ต้องรู้ต่อภาษา (สำคัญกว่าตัว pattern)**:

- **Java** — ภาษาเดียวที่ต้องการ builder จริง (ไม่มี named argument): เขียนเองหรือใช้ record + `@Builder` (Lombok); Effective Java แนะนำเมื่อ param ≥ 4
- **Python** — **ไม่ต้องใช้**: keyword arguments + dataclass ทำงานเดียวกันฟรี `Report(fmt="pdf", inline_css=True)` — เขียน Builder class ใน Python = ก๊อป Java มาผิดสำเนียง
- **Go** — ไม่มี named args แต่นิยม **Functional Options** แทน builder:

```go
func NewServer(addr string, opts ...Option) *Server { ... }
type Option func(*Server)
func WithTimeout(d time.Duration) Option { return func(s *Server) { s.timeout = d } }
// NewServer(":8080", WithTimeout(5*time.Second), WithTLS(cert))
```

**ใช้ผิด**: builder ที่ไม่ validate ตอน `build()` (ได้ object ครึ่งๆ กลางๆ — เสีย invariant ที่ constructor เคยการันตี) / ใช้ builder กับ object ที่มี 2 field

## Pattern เสริมที่ควรรู้จักไว้

- **Command** — ห่อ "คำสั่ง + ข้อมูลของมัน" เป็น object → ต่อคิวได้ (object มีของครบในตัว ส่งข้ามเวลา/ข้ามเครื่องได้), retry ได้ (เก็บไว้ยิงซ้ำ), undo ได้ (command เก็บข้อมูลพอที่จะย้อนตัวเอง — บันทึก state ก่อนทำ หรือจับคู่กับ command ตรงข้าม เช่น `AddItem` ↔ `RemoveItem`); ใน backend คือ message/job ใน queue นั่นเอง (`PlaceOrderCommand` ในบท 5 คือญาติเบาของมัน) และ compensating action ของ saga (บท 11) คือ undo เวอร์ชันข้าม service
- **Template Method vs Pipeline** — โครงงานตายตัวแต่บางขั้นเปลี่ยนได้: Template Method ใช้ inheritance (นิยมใน Java framework) แต่สำเนียงปัจจุบันชอบ **Pipeline/middleware composition** มากกว่า (Express/Gin middleware, `http.Handler` ซ้อนชั้น) เพราะเป็น composition (บท 1)
- **Specification** — ห่อเงื่อนไข business เป็น object ที่ combine ได้ (`spec1.and(spec2)`) — คุ้มเมื่อเงื่อนไขต้อง reuse ทั้งใน memory และแปลงเป็น query; ถ้าไม่ถึงขั้นนั้น function ธรรมดาพอ

## คำถามสัมภาษณ์ที่ต้องตอบได้

- **"ยกตัวอย่าง pattern ที่เคยใช้จริง"** → เลือก Strategy หรือ Adapter แล้วเล่าด้วยโครง: ปัญหา (if งอก / vendor lock) → ทำอะไร → ได้อะไร → แลกอะไร — ห้ามเล่าแบบนิยาม
- **"Adapter กับ Facade ต่างกันยังไง"** → แปลง interface 1:1 ให้ตรง port ของเรา vs ลดหลาย subsystem เหลือหน้าเดียวตาม use case
- **"เมื่อไหร่ไม่ควรใช้ pattern"** → เมื่อยังไม่เห็นแรงกดดันจริง (แก้ซ้ำครั้งที่ 3, เปลี่ยน vendor, param ล้น) — pattern คือการจ่ายค่า indirection ล่วงหน้า จ่ายเมื่อของจะมาจริงเท่านั้น

บทต่อไป: Observer/Pub-Sub ขยายเป็น Event-driven Design ทั้งระบบ

## สรุปท้ายบท

- pattern จะมีประโยชน์เมื่อถูกผูกกับปัญหาซ้ำที่จับต้องได้ เช่น behavior ที่งอก, integration ที่ต้องแปลง หรือ object ที่สร้างยากเกินไป
- แต่ละ pattern ในบทนี้คือการจ่ายค่า indirection เพื่อซื้อความยืดหยุ่นบางแบบ จึงต้องรู้ทั้งประโยชน์และราคาที่ตามมา
- การเล่า pattern ที่ดีในห้องสัมภาษณ์ต้องเริ่มจากบริบทและผลลัพธ์ ไม่ใช่เริ่มจากนิยาม
- ถ้าจับเหตุที่ทำให้ pattern เกิดได้ คุณจะเลือกใช้มันได้แม่นกว่าการจำ UML

## ก่อนไปบทถัดไป

บทถัดไปจะขยายจาก pattern ระดับใน process ไปสู่ event-driven design ทั้งระบบ ซึ่งให้พลังในการลด coupling สูงขึ้นมาก แต่ก็เพิ่มความซับซ้อนด้านเวลาและความแน่นอนเข้ามาพร้อมกัน
