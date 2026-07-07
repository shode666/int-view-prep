# บทที่ 13 — Java / Python / Go: หลักเดียวกัน สำเนียงต่างกัน

> ทั้งเล่มนี้ใช้หลักชุดเดียว (SOLID, DIP — Dependency Inversion Principle, layer, fail fast) — บทนี้ตอบว่าแต่ละภาษา **แปลหลักพวกนั้นเป็น code หน้าตาแบบไหน** และการก๊อปสำเนียงข้ามภาษาพังยังไง

## เข็มทิศก่อนอ่าน

บทนี้ไม่ใช่บทเปรียบเทียบภาษาเพื่อเลือกภาษาที่ดีที่สุด แต่เป็นบทที่ช่วยกันความเข้าใจผิดสำคัญว่า principle เดียวกันไม่จำเป็นต้องมีหน้าตา code แบบเดียวกัน Java, Python และ Go แก้ปัญหาเดียวกันได้ แต่ใช้เครื่องมือและวัฒนธรรมของภาษาไม่เหมือนกัน

อ่านบทนี้โดยมองหาสิ่งที่ "คงเดิม" กับสิ่งที่ "ต้องแปลสำเนียง" ถ้าแยกสองอย่างนี้ได้ คุณจะไม่ก๊อปแบบ Java ไปใส่ Go หรือคาดหวัง abstraction แบบ Go ใน Python แบบฝืนธรรมชาติภาษา

## ตารางเทียบแกนหลัก

| แกน | Java | Python | Go |
|---|---|---|---|
| ปรัชญา | ชัดแจ้งด้วย type + พิธี | ยืดหยุ่น อ่านเหมือนภาษาคน | เรียบง่าย ตรงไปตรงมา |
| Abstraction | interface (nominal — ต้อง implements) | duck typing / Protocol (structural) | interface เล็ก (structural, implicit) |
| ใครประกาศ interface | ฝั่ง provider (วัฒนธรรม) | ไม่ประกาศก็ได้ | **ฝั่ง consumer** (สำเนียงบังคับ) |
| DI | framework เป็น default (Spring) | constructor ธรรมดา / Depends | ต่อมือใน `main()` / wire |
| Error | checked/unchecked exception | exception + EAFP | **error คือ value** — return, ไม่ throw |
| Concurrency | thread pool, CompletableFuture, virtual threads (21+) | asyncio (single thread event loop), GIL (Global Interpreter Lock) | goroutine + channel + `context` |
| จุดพังประจำภาษา | over-engineering | ทุกอย่างกองรวม ไม่มี contract | ก๊อป Java abstraction มาเต็มชุด |

ตัวย่อในตาราง: **EAFP** (Easier to Ask Forgiveness than Permission — สไตล์ Python ที่ลองทำไปเลยแล้วดักด้วย `try/except` แทนการเช็คเงื่อนไขก่อน)

## สามระบบ type — ตรวจเมื่อไหร่ พลาดเจอตอนไหน

**Duck typing** มาจากประโยค *"ถ้ามันเดินเหมือนเป็ด ร้องเหมือนเป็ด มันก็คือเป็ด"* — ไม่สนว่าประกาศเป็น type อะไร สนแค่**ตอนถูกเรียก มี method นั้นไหม**

| | Java — nominal | Go — structural | Python — duck |
|---|---|---|---|
| เป็น type นั้นเมื่อ | ประกาศชื่อ (`implements`) | รูปร่างตรง (มี method ครบ) | ตอนรันแล้วเรียกได้ |
| ตรวจเมื่อไหร่ | compile | compile | **runtime — ตอนบรรทัดนั้นรันเท่านั้น** |
| พลาดเจอตอน | build แดง | build แดง | `AttributeError` ใน production |

ไทม์ไลน์เต็ม: Java/Go — เขียน → compile (เช็ค syntax + type ครบ) → รัน / Python — เขียน → import (เช็ค**แค่ syntax** → bytecode) → รัน → **บรรทัดถูกเหยียบถึงระเบิด** — จุดอันตรายจริงคือมันไม่ได้ "พังตอน start" แต่ "พังตอนเคสที่ test ไม่ครอบ": โค้ดเส้นที่ไม่เคยถูกรันคือระเบิดฝังที่รอวันยอดสั่งซื้อทะลุหมื่น

เครื่องมืออุดช่องว่างฝั่ง Python — สี่ชิ้นคนละหน้าที่: **type hints** (PEP 484 — ป้ายที่ runtime เมินสนิท) + **Pyright/Pylance** (ตัวขีดแดงใน editor) + **mypy ใน CI** (javac เทียม — ผิด type = build แดง) + **Protocol** (structural check บน duck typing — "เป็ดที่มีสัตวแพทย์ตรวจก่อนขึ้นเวที") ส่วนขอบระบบที่รับข้อมูลนอกใช้ **Pydantic** ตรวจของจริงตอนรัน — แบ่งงาน: checker กันคนเขียนพลาด / Pydantic กันข้อมูลนอกพลาด (validation split บท 6)

มุมกลับที่สวย: Go คือ **"duck typing ที่มียามเฝ้า"** — เป็น type นั้นด้วยรูปร่างเหมือนเป็ด แต่ยามตรวจตอน compile — ได้ความหลวมของเป็ด + ความปลอดภัยของ compile ในตัวเดียว

## Java — ชัดเจน, interface เยอะ, ระวัง over-engineering

- **จุดแข็ง**: type system + ecosystem ทำให้ทีมใหญ่บังคับ boundary ได้จริง (ArchUnit, module system), Spring จัดการ cross-cutting (transaction, security) ให้เป็นระบบ — เหมาะกับ layered architecture ตรงตามตำราที่สุด
- **สำเนียงปัจจุบัน**: record สำหรับ value object, `Optional` แทน null ที่ boundary, virtual threads ลดความจำเป็นของ reactive stack, constructor injection เท่านั้น (field injection = ซ่อน dependency — บท 1)
- **โรคประจำ**: abstraction ล่วงหน้าเผื่ออนาคตที่ไม่มา — `AbstractSingletonProxyFactoryBean` เป็น meme ด้วยเหตุผล; interface เปล่าประโยชน์ (impl เดียวตลอดกาล), layer ที่ก๊อปข้อมูลผ่าน DTO 4 รอบ (บท 4)
- ประโยคสัมภาษณ์: "ผมใช้พลังของ Spring แต่กัน framework ออกจาก domain — `@Entity` กับ business rule ไม่อยู่ class เดียวกัน"

## Kotlin — ญาติร่วม JVM ที่ควรตอบได้

- เกิดมาเพื่อ**ลด boilerplate ของตัวภาษา Java + อุดจุดอ่อน** — ไม่เกี่ยวกับขนาด JDK (compile เป็น bytecode เดียวกัน ใช้ library Java ได้หมด): `data class` บรรทัดเดียว = POJO (Plain Old Java Object) 40 บรรทัด, **null safety ในระบบ type** (`String` ≠ `String?` — NullPointerException (NPE) ถูกจับตั้งแต่ compile = "สถานะผิดสร้างไม่ได้" ฝังในภาษา), named/default args ทำให้ **Builder pattern ระเหย** (บท 8 — pattern คือการชดเชยสิ่งที่ภาษาขาด), coroutines
- Java ยุคใหม่ไล่ทันไปมาก: `record` ≈ data class, virtual threads ตอบโจทย์ครึ่งหนึ่งของ coroutines — ที่ Kotlin ยังนำขาด: null safety ระดับภาษา + named args; ที่ชนะขาด: Android (ภาษาหลักตั้งแต่ 2019) — **ถ้าเป้าแค่ลดบรรทัด POJO ให้เช็คก่อนว่า record พอไหม** — ไม่ต้องเพิ่มภาษาที่สองให้ทีมแบก
- **ผสมใน repo เดียวได้และถูกออกแบบมาเพื่อสิ่งนี้**: เรียกกันสองทิศ, Spring inject ข้ามภาษา · จุดสะดุด: type จาก Java เข้ามาเป็น platform type (`String!` — Kotlin การันตี null ไม่ได้ ต้องแปะ `@Nullable`/`@NotNull` ฝั่ง Java), named args ไม่ข้ามไปฝั่ง Java (`@JvmOverloads` generate overload ช่วย)
- **Migration ที่ถูก = strangler ระดับไฟล์**: ตั้ง build สองภาษา → ไฟล์ใหม่เขียน Kotlin → ของเก่าแปลงแบบ boy scout (แตะเพราะมีงานจริงค่อยแปลง ใน PR เดียวกับงาน) — **ห้าม big-bang** PR แปลง 80 ไฟล์ที่ไม่มี business value → เริ่มจากขอบ: DTO, value object, test
- **JPA `@Entity` แปลงท้ายสุดหรือไม่แปลงเลย**: ต้องมี kotlin-jpa/allopen plugin (no-arg constructor + proxy) และ **data class + `@Entity` คือคู่ต้องห้าม** — `equals` ที่ generate จากทุก field คือนิยามความเท่าแบบ *value object* แต่ entity ต้องเท่ากันด้วย **id**: hashCode เปลี่ยนกลางทางแล้วหายจาก HashSet, lazy collection ถูกลากโหลดทั้ง graph — สูตรจำ: **entity ถามว่า "ใคร" (id) / value object ถามว่า "เท่าไหร่" (ค่า)** — framework ขอ `@Id` เพราะงานมันคือดูแล "ใคร" (identity map, dirty checking, proxy ล้วนวิ่งผ่าน id)

## Python — สั้น ยืดหยุ่น, ระวังทุกอย่างกองใน function เดียว

- **จุดแข็ง**: เร็วในการเขียน, duck typing ทำให้ decouple ได้โดยไม่มีพิธี, ecosystem data/scripting — FastAPI + type hints + pydantic ทำให้ contract ที่เคยหายไปกลับมา validate ได้จริง
- **สำเนียงปัจจุบัน**: type hints ทุก signature (โดยเฉพาะ public), `Protocol` แทน ABC เมื่อต้องการ interface (structural — บท 2), dataclass/pydantic แทน dict เปล่าๆ ที่ส่งกันทั้งระบบ (dict คือ "stringly-typed" — refactor แล้วไม่มีอะไรฟ้อง), mypy/pyright ใน CI
- **โรคประจำ**: route function 200 บรรทัดที่ทำครบทุกชั้น (บท 4 เปิดด้วยตัวอย่างนี้), monkey-patch ใน test แทนการออกแบบ dependency ให้ inject ได้ (`unittest.mock.patch("app.services.db")` เต็มไฟล์ = design ฟ้องว่า dependency ซ่อน — บท 12), mutable default argument
- ประโยคสัมภาษณ์: "Python ไม่มีอะไรบังคับ boundary ผมเลยใช้ convention + import-linter + mypy เป็นตัวบังคับแทน compiler"

## Go — simple, interface เล็ก, error ชัด, ระวัง abstraction แบบ Java

- **จุดแข็ง**: อ่านง่ายเป็น design goal (code ถูกอ่านมากกว่าถูกเขียน), deploy ง่าย (binary เดียว), concurrency ใน runtime, **implicit interface ทำให้ DIP เกิดโดยไม่ต้องวางแผน** — ประกาศ interface ฝั่ง consumer ตอนที่ต้องใช้ ของเดิมไม่ต้องแก้
- **สำเนียงบังคับ**:
  - interface เล็ก ประกาศฝั่งผู้ใช้ — `io.Reader` หนึ่ง method คือแบบอย่าง; "accept interfaces, return structs"
  - **error เป็น value**: `if err != nil` ไม่ใช่ความน่ารำคาญ แต่คือ explicit contract ว่าจุดไหนพังได้ (fail fast เชิงโครงสร้าง — บท 1) + `errors.Is/As` + wrap ด้วย context (`fmt.Errorf("charge order %s: %w", id, err)`)
  - `context.Context` เป็น parameter แรกของทุกอย่างที่แตะ I/O — timeout/cancellation ไหลทั้งเส้น (บท 10)
  - composition ผ่าน embedding, ไม่มี inheritance ให้ใช้ผิด (บท 1 สมหวัง)
- **โรคประจำ**: คน Java ย้ายมาแล้วสร้าง `repository/interfaces.go` ที่ประกาศ interface 20 method ฝั่ง provider + factory + wrapper ครบชุด — Go ที่ดีเริ่ม concrete แล้ว abstract เมื่อเจ็บจริง; อีกโรคคือ goroutine leak (ยิงแล้วไม่มีทางจบ — ทุก goroutine ต้องรู้ว่าตายเมื่อไหร่ผ่าน context)
- ประโยคสัมภาษณ์: "ใน Go ผม abstract ทีหลัง — interface เกิดตอนมี consumer ที่สองหรือมี test ที่ต้อง fake ไม่ใช่วันแรก"

## ตัวอย่างเดียว สามสำเนียง: "charge payment พร้อม retry"

```java
// Java — ประกาศ intent ผ่าน annotation/config, framework จัดการ mechanic
@Retry(name = "payment", fallbackMethod = "chargeFallback")
public PaymentResult charge(Order order) {
    return gateway.charge(order.id(), order.total(), key(order));
}
```

```python
# Python — decorator ประกอบพฤติกรรม (composition บนฟังก์ชัน)
@retry(stop=stop_after_attempt(3),
       wait=wait_exponential_jitter(),
       retry=retry_if_exception_type(TransientError))
def charge(order: Order) -> PaymentResult:
    return gateway.charge(order.id, order.total, idempotency_key=key(order))
```

```go
// Go — เขียน mechanic เองให้เห็นตรงๆ, context คุมงบเวลาทั้งก้อน
func (s *PaymentService) Charge(ctx context.Context, o Order) (PaymentResult, error) {
    var lastErr error
    for attempt := 0; attempt < 3; attempt++ {
        res, err := s.gw.Charge(ctx, o.ID, o.Total, key(o))
        if err == nil {
            return res, nil
        }
        if !isTransient(err) {
            return PaymentResult{}, fmt.Errorf("charge %s: %w", o.ID, err)
        }
        lastErr = err
        select {
        case <-time.After(backoff(attempt)):
        case <-ctx.Done():
            return PaymentResult{}, ctx.Err()
        }
    }
    return PaymentResult{}, fmt.Errorf("charge %s after retries: %w", o.ID, lastErr)
}
```

สามตัวนี้คือ retry + idempotency key เหมือนกันเป๊ะ (บท 10–11) — ต่างแค่ว่าภาษาอยากให้ mechanic **ซ่อนอยู่ใน framework**, **ประกอบเป็น decorator**, หรือ **มองเห็นเต็มตา**

## คำถามสัมภาษณ์ที่ต้องตอบได้

- **"ชอบภาษาไหนสุด ทำไม"** → กับดัก — คำตอบดีคือ mapping งานกับภาษา: ทีมใหญ่ domain ซับซ้อน → Java / velocity + data → Python / infra + concurrency + operational simplicity → Go
- **"Go ไม่มี exception ลำบากไหม"** → พลิกเป็นจุดแข็ง: error เป็น value = ทุก call site ประกาศชัดว่า handle ยังไง ไม่มี invisible control flow
- **"Duck typing ปลอดภัยไหมในระบบใหญ่"** → ลำพังไม่พอ — Protocol + mypy คือการเอา structural typing มาแบบตรวจได้ ซึ่งที่จริงคือโมเดลเดียวกับ interface ของ Go
- **"ย้ายทีม Java ไป Go ต้องระวังอะไร"** → อย่าขน abstraction มาด้วย — เริ่ม concrete, interface ฝั่ง consumer, error ไม่ใช่ exception, ไม่มี DI container ก็ต่อมือใน main ได้
- **"Java หรือ Kotlin"** → บน backend มองเป็น dialect เดียวกัน (architecture, Spring, JVM tuning เหมือนหมด) — เลือกตามทีมและโค้ดเบส; Java ใหม่ปิดช่องว่างไปมาก เหลือ null safety ที่ Kotlin นำขาด; โปรเจกต์ผสมใช้ strangler ระดับไฟล์ ไม่ big-bang
- **"DIP กับ DI ต่างกันยังไง"** → กับดักคำย่อ: **DIP = หลักการ** (D ของ SOLID — ใครควรพึ่งใคร, business เป็นเจ้าของ interface) / **DI = เทคนิค** (ส่ง dependency เข้า constructor) — DI เป็นแค่เครื่องมือหนึ่งที่ช่วยทำตาม DIP และมี DI แต่ละเมิด DIP ได้ (inject concrete class ตรงๆ)

บทต่อไป: กลิ่นเน่าทั้งระบบ — Anti-patterns และวิธี refactor ออก

## สรุปท้ายบท

- principle ที่ดีไม่ผูกกับภาษาเดียว แต่การแสดงออกของมันต้องเคารพสำเนียงของภาษานั้น
- การก๊อป style ข้ามภาษาโดยไม่ดูธรรมชาติของ ecosystem มักสร้างทั้งพิธีกรรมและความขัดแย้งกับคนในภาษาเอง
- สิ่งที่ควรคงไว้คือแกนคิด ส่วนสิ่งที่ต้องแปลคือรูปแบบการประกาศ abstraction, error handling, dependency และ composition
- บทนี้ช่วยกันการเข้าใจผิดสำคัญว่า code ที่ดูคล้ายกันคือ design ที่ดีเสมอในทุกภาษา

## ก่อนไปบทถัดไป

เมื่อเห็นแล้วว่าหลักเดียวกันแปลได้หลายสำเนียง บทถัดไปจะกลับมาฝั่งงานจริงมากขึ้นด้วยการไล่กลิ่นโค้ดและ anti-pattern ที่โผล่ซ้ำในระบบที่โตมานาน
