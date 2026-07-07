# บทเสริม — JVM Deep Dive: Architecture & Memory Management

> อุดช่องว่างจากภาคผนวก Production Q&A (ข้อ 11, 13, 15): ความต่างระหว่าง "เขียน Java ได้" กับ "ดูแล Java ใน production ได้" อยู่ที่ชั้นนี้ — และเป็นหมวดที่ interviewer สาย Java Virtual Machine (JVM) ชอบขุดเมื่อเห็นเรซูเม่เขียนว่า senior

## เข็มทิศก่อนอ่าน

บทนี้เป็นชั้นลึกเฉพาะทางที่สุดของเล่ม แต่เหตุผลที่มันสำคัญไม่ใช่เพื่อให้ทุกคนกลายเป็น JVM engineer ทันที มันสำคัญเพราะหลาย incident ฝั่ง Java แก้ไม่ได้ถ้ายังมอง JVM เป็นกล่องดำ เรื่อง memory, GC, JIT และ container limit จะกลายเป็นคำตอบจริงก็ต่อเมื่อเห็นสถาปัตยกรรมด้านล่างพอสมควร

ให้อ่านบทนี้แบบต่อจากภาคผนวก 21 และโยงกลับไปบท database กับ failure handling เสมอ จะได้เห็นว่าปัญหา performance และ outage จำนวนมากไม่ได้เริ่มจาก business logic ผิด แต่อาจเริ่มจาก runtime ที่กำลังทุกข์อยู่ข้างใต้

## สถาปัตยกรรม JVM — ภาพใหญ่ก่อน

```
.java → javac → .class (bytecode)
                   │
┌─ JVM ────────────▼──────────────────────────────────┐
│  Class Loader     โหลด → link → initialize          │
│       ▼                                              │
│  Runtime Data Areas                                  │
│  ├ Heap           object ทั้งหมด (แชร์ทุก thread)     │
│  ├ Metaspace      class metadata (native memory)     │
│  ├ Thread Stacks  frame ต่อ method call (ต่อ thread) │
│  └ Code Cache     โค้ดที่ JIT compile แล้ว            │
│       ▼                                              │
│  Execution Engine                                    │
│  ├ Interpreter    อ่าน bytecode ทีละคำสั่ง (เริ่มแบบนี้)│
│  ├ JIT Compiler   method ร้อน → compile เป็น native   │
│  └ GC             เก็บกวาด heap                       │
└──────────────────────────────────────────────────────┘
```

สามเรื่องที่ควรเล่าได้จากภาพนี้:

- **Class loading สามชั้น**: Bootstrap (core JDK) → Platform → Application — ลูกถามพ่อก่อนเสมอ (parent delegation — กันใครปลอม `java.lang.String`) · classloader คือที่มาของ leak ตอน hot-redeploy: class เก่าถูกถือไว้ผ่าน static/thread → metaspace บวม
- **Interpreter + JIT**: รายละเอียดเต็มในหัวข้อถัดไป — สาระสั้น: เริ่มตีความ → นับความร้อน → แปลเป็น native เป็นขั้นบันได

## JIT ทำงานยังไง — จากตีความสู่การเดิมพัน

JIT (Just-In-Time compilation) คือคำตอบของคำถามเก่าแก่: *"ตีความ (ช้าแต่เริ่มทันที) หรือ compile ล่วงหน้า (เร็วแต่ไม่รู้พฤติกรรมจริง)"* — Java ตอบว่า: เอาทั้งคู่ แล้วให้**ข้อมูลจริงตอนรัน**เป็นคนตัดสิน

**บันไดสามขั้น (tiered compilation):**

```
ทุก method เริ่มที่ interpreter (ตีความ bytecode ทีละคำสั่ง)
   │  JVM แอบนับ: ถูกเรียกกี่ครั้ง? loop วนกี่รอบ?
   ▼ ครบ threshold ต้น
C1 (client compiler) — แปลเร็วๆ ได้โค้ดเร็วขึ้น ~เท่าตัว
   │  + ฝังตัวเก็บสถิติ (profiling): branch ไหนไปบ่อย, type จริงที่วิ่งผ่านคืออะไร
   ▼ ร้อนจริง (หลักหมื่นครั้ง)
C2 (server compiler) — แปลช้ากว่าแต่ optimize สุดตัวโดยใช้สถิติจาก C1
   → เก็บผลลง code cache
```

จุดฉลาด: C1 ไม่ได้แค่เร่งความเร็ว — มัน**สอดแนม** เก็บว่าโค้ดนี้*ในชีวิตจริง*ประพฤติยังไง แล้ว C2 ใช้ข้อมูลนั้น optimize แบบที่ compiler ล่วงหน้า (Ahead-Of-Time (AOT)) ทำไม่ได้เพราะไม่มีทางรู้

**สามท่า optimize หลัก:**

1. **Inlining — ท่าแม่ของทุกท่า**: ยุบ method call ทิ้ง เอาเนื้อในมาแปะแทน — `order.total().multiply(rate)` สาม call กลายเป็นเลขคูณกันตรงๆ — และพอโค้ดมากองรวมกัน ท่าอื่นถึงเห็นภาพกว้างพอจะ optimize ต่อ → **method เล็กตามหลัก S ไม่ได้ทำให้ช้า**: JIT ยุบรวมเองตอนรัน — เขียนให้คนอ่าน ปล่อยเครื่องจัดการความเร็ว
2. **Speculation — เดิมพันด้วยสถิติ**: profile บอกว่า `PaymentGateway` ตรงจุดนี้เป็น `StripeAdapter` 100% → ตัด virtual dispatch เรียกตรง + inline / branch ที่ไม่เคยเกิด → โยนออกจาก hot path
3. **Escape analysis**: object ที่ไม่หลุดออกนอก method → ไม่ขึ้น heap เลย (รายละเอียดในหัวข้อ Stack กับ Heap)

**Deoptimization — ตาข่ายที่ทำให้กล้าเดิมพัน**: วันดีคืนดี `OmiseAdapter` โผล่มาครั้งแรก สมมติฐาน "เป็น Stripe เสมอ" พัง → JVM ถอยอย่างปลอดภัย: ทิ้งโค้ดเวอร์ชันเดิมพัน กลับไปตีความ/แปลใหม่ด้วยสถิติอัพเดต — ไม่มีอะไรผิด แค่ช้าลงแวบหนึ่ง — หัวใจเชิงปรัชญา: **กล้า optimize สุดโต่งเพราะถอยได้เสมอ** (เดิมพัน + ตรวจทีหลัง — ปรัชญาเดียวกับ optimistic locking คนละชั้น) · ของแถม: loop ร้อนกลาง method ถูกสลับเวอร์ชัน**กลางอากาศทั้งที่กำลังวิ่ง**ได้ (OSR — On-Stack Replacement)

**ผลเชิงปฏิบัติสามข้อ:**

- **Warm-up ไม่ใช่ myth** — นาทีแรกหลัง deploy ช้ากว่า steady state เป็นเรื่องปกติ: canary ที่ตัดสินจาก latency วินาทีแรกๆ = ตัดสินคนที่ยังไม่ตื่น
- **Benchmark มือเปล่าโกหกเสมอ** — วัด loop เย็นได้เลขของ interpreter, โค้ดที่ result ไม่ถูกใช้ JIT โยนทิ้งทั้ง loop (dead code) ได้ 0ns — เครื่องมือจริงคือ **JMH**
- **Deopt storm** — ระบบที่ type/เส้นทางแกว่ง (plugin โหลดเพิ่ม, feature flag สลับถี่) เดิมพัน-ถอย-เดิมพันวน → latency แกว่งลึกลับ — ดูจาก JFR

## Memory Layout — เงินอยู่ห้องไหนบ้าง

**ความจริงข้อแรกที่คนพลาด (Q&A ข้อ 15)**: memory ของ process ≠ heap

```
Process memory ทั้งหมด
├ Heap (-Xmx)                    ← ที่เดียวที่คนส่วนใหญ่มอง
├ Metaspace                      class metadata — โตตามจำนวน class
├ Thread stacks (~1MB × thread)  ← 500 threads = 0.5GB นอก heap!
├ Code cache                     โค้ดที่ JIT แล้ว
├ Direct buffers                 NIO/Netty — allocate นอก heap โดยตั้งใจ
└ GC/JVM overhead                โครงสร้างภายในของ GC เอง
```

กติกา container: **limit ≈ heap × 1.5** เผื่อก้อนที่เหลือ — ตั้ง limit = heap พอดีเมื่อไหร่ เจอ **OOMKilled** (kernel ฆ่า, exit 137, ไม่มี Java stack trace ใดๆ) ตอน traffic peak ที่ thread และ direct buffer โตพร้อมกัน · JVM ยุคใหม่รู้จัก container แล้ว (`UseContainerSupport` เปิด default) — ใช้ `-XX:MaxRAMPercentage=75` แทน `-Xmx` ตายตัวได้

### Heap ข้างใน: Young / Old — และเหตุผลที่ต้องแบ่ง

```
Heap
├ Young Generation
│  ├ Eden          ← object เกิดที่นี่ (ผ่าน TLAB — ช่องส่วนตัวต่อ thread, allocate เร็วมาก)
│  └ Survivor S0/S1 ← รอดจาก minor GC มาพักที่นี่ สลับฝั่งไปมา
└ Old Generation    ← รอดหลายรอบ (tenuring threshold) → เลื่อนขั้นมาอยู่ยาว
```

ทำไมแบ่ง: **weak generational hypothesis** — object ส่วนใหญ่ตายเร็วมาก (Data Transfer Object (DTO), string ชั่วคราว, iterator) → กวาดเฉพาะ Young บ่อยๆ ถูกกว่ากวาดทั้งบ้าน: **minor GC (Garbage Collection)** copy เฉพาะผู้รอดชีวิต (ซึ่งมีน้อย) — ของตายไม่ต้องแตะเลย นี่คือเหตุที่ Java สร้าง object ชั่วคราวได้ถูกกว่าที่ชื่อเสียงมันบอก

วงจรชีวิต object: เกิดใน Eden → Eden เต็ม → minor GC → ผู้รอดย้ายไป Survivor → รอดครบ N รอบ (tenuring) → **promote ขึ้น Old** → Old เต็ม → major/full GC (แพงกว่ามาก)

โรคที่ต้องวินิจฉัยเป็น: **premature promotion** — allocation rate สูงจน Eden เต็มถี่ / Survivor เล็กเกิน → ของอายุสั้นถูกดันขึ้น Old ก่อนเวลาตาย → Old เต็มเร็ว → full GC ถี่ — อาการ: full GC บ่อยทั้งที่ steady state, แก้ที่ต้นเหตุ (ลด allocation ใน hot path, ขยาย young) ไม่ใช่ขยาย heap อย่างเดียว (ยิ่งใหญ่ pause ยิ่งยาว)

### Stack กับ Heap ทำงานร่วมกันยังไงจริงๆ — โกดังกับโต๊ะ

ภาพจำแกนกลาง: **heap = โกดังกลาง (object ทุกตัว ทุก thread เห็น) / stack = โต๊ะทำงานส่วนตัวต่อ thread (frame + สำเนาชั่วคราว) — CPU ทำงานบนโต๊ะเท่านั้น ไม่มีใครคำนวณในโกดัง**

```java
void process(Order order) {          // Order { int qty = 5; int price = 300; }
    int cost = order.qty * order.price;
}
```

```
HEAP                        STACK (frame ของ process)
┌──────────────┐            ┌─ local vars: order → @7f3a, cost = 1500 ─┐
│ Order        │ ──copy 5──▶├─ operand stack (โต๊ะคำนวณ):               │
│  qty:   5    │ ──copy 300▶│    5, 300 → imul → 1500                  │
│  price: 300  │            └───────────────────────────────────────────┘
└──────────────┘  ← ไม่ขยับสักค่า        งานทั้งหมดเกิดที่นี่
```

bytecode จริง (ดูได้ด้วย `javap -c`): `getfield qty` → copy ค่าขึ้นโต๊ะ, `imul` → คูณสองค่าบนโต๊ะ, `istore` → เก็บผลลง local — **field ตัวจริงใน heap ไม่ถูกแตะระหว่างคำนวณ** จะให้ผลกลับเข้า object ต้องเขียนกลับชัดๆ (`putfield`)

กติกาที่ตอบคำถามยอดฮิตได้หมด:

- **ชื่อตัวแปรไม่มีอยู่ตอนรัน** (compile หายไปเหลือช่อง slot) — สิ่งที่อยู่ใน frame คือ **primitive value** กับ **reference (ที่อยู่)**
- **primitive อาศัยตามเจ้าของเสมอ**: local variable → stack / field ใน object → **heap ฝัง inline ในก้อน** / static → heap ส่วนของ class / ช่องใน array → heap เรียงติดกัน
- **object ทุกตัวอยู่ heap** — thread stack ไม่เก็บ object: สอง thread ถือ reference ชี้ก้อนเดียวกันได้ → นี่คือรากของ race condition ทั้งศาสตร์ (ของบนโต๊ะปลอดภัยโดยกำเนิด ของในโกดังคือของกลางที่ต้องมีกติกา)
- **Java copy ค่าเสมอ (pass-by-value)** — แค่ "ค่า" ต่างชนิด: primitive → copy ตัวเลข = สำเนาอิสระ / object → copy **ที่อยู่** = ชี้ก้อนเดิม แก้ข้างในแล้วทุกคนเห็น
- **TLAB** ชื่อมี thread-local แต่คือ**ช่องส่วนตัวที่กั้นใน Eden ของ heap** (คิวจ่ายเงินแยกช่อง — ของยังวางในห้างเดียวกัน) ไม่ใช่ stack

**Escape analysis — ข้อยกเว้นเดียวของ "object อยู่ heap"**: ถ้า JIT พิสูจน์ได้ว่า object **ไม่หลุดออกนอก method** (ไม่ return ตัวมัน, ไม่ฝากใส่ field, ไม่ข้าม thread) → ไม่สร้างบน heap เลย — แตกเป็นค่าบนโต๊ะ ใช้เสร็จหายพร้อม frame: **ไม่มีขยะให้ GC แม้แต่ชิ้นเดียว** — object ชั่วคราวใน hot path (Money ระหว่างคำนวณ, iterator) จึงฟรียิ่งกว่าฟรี · แต่**อย่าออกแบบโดยพึ่งมัน** — เป็น optimization ล่องหนที่เปิดเฉพาะเมื่อพิสูจน์ได้ เขียนโค้ดให้ถูกให้อ่านง่าย แล้วรับมันเป็นโบนัสเงียบๆ

Performance ที่ตามมาจากภาพนี้: **การเดินไปโกดังมีราคา** — pointer chasing หลายทอด (`o.getCustomer().getAddress().getZip()` ใน loop ล้านรอบ) = เวลาหมดกับการเดิน ไม่ใช่การคำนวณ / `int[]` ชนะ `Integer[]` ขาดลอยเพราะของเรียงติดกันหยิบทีเดียวได้ทั้งถาด (CPU cache) — และ pattern "ของใช้บ่อยไว้ใกล้มือ" ตัวเดียวกันนี้ไล่ขึ้นไปทุกสเกล: register←stack←heap, memory←disk, app←Redis←DB, service←cache←อีก service

### Metaspace, Stack, Direct — OOM คนละชนิด อ่านจาก message ได้เลย

| OOM message | ที่ไหน | สาเหตุประจำ |
|---|---|---|
| `Java heap space` | heap | leak (ดูหัวข้อถัดไป) หรือ heap เล็กจริง |
| `Metaspace` | class metadata | classloader leak (hot redeploy), generate class รัว (proxy/reflection ผิดวิธี) |
| `unable to create native thread` | OS thread limit | thread รั่ว — สร้างไม่จำกัด (executor ไม่ bound) |
| `Direct buffer memory` | off-heap | Netty/NIO ไม่คืน buffer, `MaxDirectMemorySize` เล็ก |
| `GC overhead limit exceeded` | heap | GC วิ่ง >98% เวลาแต่ได้คืน <2% — ใกล้ตายจาก leak |
| ไม่มี message — process หายเงียบ exit 137 | container | **OOMKilled** — limit < heap + off-heap รวม |

แถวสุดท้ายสำคัญสุดในโลก K8s: **แอปตายแต่ log สะอาด = อย่าหาใน log แอป ไปดู `kubectl describe pod` / dmesg**

## Code Cache กับ Direct Buffer — สองห้อง native ที่ประสานกับทุกห้อง

**Code cache เก็บ "โค้ด" / direct buffer เก็บ "ข้อมูลดิบ"** — คนละชนิดกันสิ้นเชิง:

**Code cache — คู่มือเครื่องจักรฉบับแปลแล้ว**: เก็บ native code ของ **method ที่ร้อนพอ** (จาก JIT) — เกณฑ์คือ*ความร้อนไม่ใช่ความสำคัญ*: `calculateDiscount` ที่เรียกวันละล้านครั้ง → เข้า / `@PostConstruct loadConfig()` รันครั้งเดียว → ถูกตีความตลอดชีวิต (ซึ่งไม่เป็นไร — มันเรียกน้อย ค่าแปลไม่คุ้ม) · อาการเมื่อเต็ม: log `CodeCache is full. Compiler has been disabled` → JIT หยุดแปล → **ระบบช้าลงเรื่อยๆ โดยไม่มี error สักตัว** — อาการลึกลับที่รู้ไว้ได้แต้ม

**Direct buffer — เขตส่งมอบสินค้าระหว่าง JVM กับ OS**: เก็บ raw bytes ช่วงเดินทางเข้า-ออกระบบ (HTTP body, Kafka batch, ไฟล์ผ่าน FileChannel, TLS record) — เหตุที่ต้องมีเขตกลางนอก heap: สองฝ่ายมีเงื่อนไขขัดกัน — **OS ต้องการที่อยู่นิ่งสนิท** (สั่ง network card เทข้อมูลลงตำแหน่งหนึ่ง ห้ามขยับกลางคัน) แต่ **heap ไม่นิ่งโดยธรรมชาติ** (GC ย้ายของตอน compact) → I/O ผ่าน heap จริงๆ ต้อง copy เพิ่มรอบหนึ่งเสมอ — direct buffer ตัดรอบนั้นทิ้ง: อยู่ฝั่ง native (ที่อยู่ตายตัว) แต่ JVM ถือโฉนดผ่าน object จิ๋วบน heap

โครงสร้างที่ทำให้มันอันตราย (ที่มาของ OOM `Direct buffer memory`):

```
HEAP                          NATIVE
┌───────────────────┐         ┌──────────────────┐
│ ByteBuffer object │──ชี้───▶│ ก้อนจริง 64MB      │
│ (จิ๋ว ~48 byte)     │         └──────────────────┘
└───────────────────┘          คืนเมื่อตัวจิ๋วโดน GC เก็บ
  GC เห็นแค่ตัวจิ๋ว → heap โล่ง GC ไม่ตื่น → ก้อน native กองพะเนิน
```

แก้: `MaxDirectMemorySize`, buffer pool (Netty ทำให้), นับมันในสมการ container limit เสมอ

**ประกอบร่าง — หนึ่ง request อ่านจาก socket วิ่งผ่านทุกห้อง:**

```
CPU ← รัน native code จาก [CODE CACHE] (handleRead ที่ JIT แล้ว)
 ├ [STACK]  frame: reference → buffer, ค่าคำนวณชั่วคราว
 ├ [HEAP]   ByteBuffer ตัวห่อจิ๋ว + object ธุรกิจที่ parse เสร็จ (Order)
 └ [NATIVE] direct buffer — kernel เท bytes จาก network ลงตรงนี้ (DMA)
```

ลำดับ: kernel เทลง direct buffer ด้วย DMA (Direct Memory Access — ฮาร์ดแวร์ย้าย bytes เข้า memory ตรง ๆ โดยไม่ต้องให้ CPU คัดลอกทีละ byte, ไม่ผ่าน heap) → โค้ดจาก code cache รัน → stack ถือสำเนาชั่วคราว → parse เป็น object ลง heap → buffer คืน pool — **ข้อมูลอยู่นอกบ้านแค่ช่วง "ยังเป็น bytes" กลายเป็น object เมื่อไหร่ย้ายเข้าโกดัง**

ภาพโรงงานฉบับเต็ม: **โกดัง (heap) — โต๊ะ (stack) — คู่มือเครื่องจักร (code cache) — ท่ารับส่งของหน้าประตู (direct buffer)** — ท่าเรือต้องอยู่นอกโกดัง เพราะรถส่งของ (OS) ไม่มีสิทธิ์ขับเข้าโกดังที่ GC จัดของใหม่ตลอดเวลา

## GC Deep Dive — เลือกยาให้ถูกโรค

### กลไกร่วมทุกตัว: reachability ไม่ใช่ "ไม่ใช้แล้ว"

GC เก็บ object ที่ **unreachable จาก GC roots** (stack ทุก thread, static field, JNI ref) — จุดที่คนเข้าใจผิดและเป็นบ่อเกิด leak ทั้งปวง: **"ไม่ใช้แล้ว" ≠ "unreachable"** — object ใน static Map ที่ไม่มีใครเรียกอีกเลยก็ยัง reachable → GC ไม่มีวันเก็บ → นี่คือคำตอบข้อสอบคลาสสิก *"มี GC แล้วทำไม Java ยัง memory leak ได้"*

### Collector หลักในตลาด

| Collector | ท่า | Pause | เหมาะกับ |
|---|---|---|---|
| **Serial** | thread เดียว STW (Stop-The-World) ทั้งงาน | ยาว | container จิ๋ว, CLI tool |
| **Parallel** | หลาย thread ช่วยกันกวาด แต่ยัง STW เต็มๆ | ยาวแต่ throughput ดี | batch job — สนใจงานเสร็จไว ไม่สนหยุดเป็นช่วง |
| **G1** (default ตั้งแต่ Java 9) | หั่น heap เป็น region — กวาดทีละชุด region เลือกอันที่ขยะเยอะสุดก่อน (garbage first) ตามงบ pause | ตั้งเป้าได้ (`MaxGCPauseMillis`, default 200ms) | ตัวกลางที่ดีของ service ทั่วไป |
| **ZGC / Shenandoah** | ทำงาน concurrent เกือบหมด — แทบไม่หยุดโลก | **< 1–2ms** แม้ heap ระดับ TB | latency-sensitive จริง (trading, p99 SLA โหด) — แลกกับ CPU/memory overhead เพิ่ม |

การเลือก = trade-off **throughput vs pause**: Parallel ได้งานรวมมากสุดแต่หยุดเป็นพักๆ / ZGC แทบไม่หยุดแต่กิน overhead ตลอดเวลา — service ทั่วไปอยู่ G1 แล้วจบ อย่าเปลี่ยนเพราะอ่าน blog เปลี่ยนเมื่อ **วัดแล้ว** pause คือปัญหาจริง

จุดที่ควรรู้ของ G1 อีกหนึ่ง: **humongous object** — object ใหญ่กว่าครึ่ง region (เช่น byte[] ก้อนโต, list ยักษ์) ถูก allocate ตรงเข้าพื้นที่พิเศษ จัดการแพง — แอปที่ชอบสร้าง payload ก้อนใหญ่ (อ่านไฟล์ทั้งก้อน, JSON ยักษ์) แล้ว GC เหนื่อยผิดปกติ มักเจอตัวนี้ (ทางแก้เชิงระบบ: stream แทน buffer ทั้งก้อน — โยง `countLines` ที่เราทำกันเลย)

### GC ทำงานเมื่อไหร่ — ตามความต้องการ ไม่ใช่ตามเวลา

GC **ไม่มีนาฬิกาปลุก** — มันคือทีมเก็บกวาดที่มาเมื่อ "ชั้นวางเริ่มเต็ม" (demand-driven):

1. **Eden เต็ม** (allocation failure) — trigger หลัก: `new` แล้ววางไม่ลง → minor GC ทันที → **ความถี่ GC สะท้อน allocation rate ตรงๆ**: peak = GC ถี่ / ตีสามไม่มี traffic = แทบไม่รัน — GC เดินตามจังหวะธุรกิจ ไม่ใช่จังหวะนาฬิกา
2. **Old ใกล้เต็ม / promote ไม่ลง** → major/full GC — ถี่เมื่อไหร่ = โรค (promotion เร็วเกิน หรือ leak)
3. **G1 เริ่มก่อนเต็ม**: occupancy แตะ ~45% (IHOP) → เริ่ม concurrent marking เบื้องหลังล่วงหน้า — รอเต็มจริงค่อยทำ = full GC ยาวสถานเดียว
4. Metaspace เต็ม → full GC / `System.gc()` = แค่*คำขอ* (prod มัก `-XX:+DisableExplicitGC`)

สองความจริงต่อยอด: **unreachable ≠ ถูกเก็บทันที** — object ตายแล้วนอนเป็นศพจนกว่า GC จะกวาดผ่านย่านนั้น → heap usage บน dashboard = ของเป็น+ศพปนกัน — ค่าที่เชื่อได้จริงมีตัวเดียว: **heap หลัง full GC** (วินาทีเดียวที่ศพถูกเคลียร์หมด) · **Safepoint** — ก่อน STW ทุก thread ต้องเดินถึงจุดรวมพลก่อน (จุดที่ JVM รู้สถานะ reference ครบ): pause จริง = เวลารอคนสุดท้าย + เวลากวาด — loop คำนวณล้วนยาวๆ ที่ไม่มีจุดเช็คทำทั้ง JVM รอมันคนเดียวได้ (time-to-safepoint)

### G1 กายวิภาค — ทำไมถึงเป็น default

ปัญหาที่มันเกิดมาแก้: collector รุ่นก่อนมอง heap เป็น**สองห้องยักษ์** — เก็บ Old ต้องกวาดทั้งห้อง = pause โตตามขนาด heap: ยุค heap 32GB pause เป็นวินาที รับไม่ได้

ไอเดีย G1: **เลิกมีห้องยักษ์ — หั่นเป็น region เล็กเท่าๆ กัน** (~2,048 ก้อน, 1–32MB) — Eden/Old/Humongous เป็นแค่*ป้าย*ที่ region ไหนก็เป็นได้ เปลี่ยนได้ตลอด แล้วทำงานสามจังหวะตามชื่อมันเลย:

1. **สำรวจล่วงหน้า** — concurrent marking (เริ่มที่ IHOP ~45%) เดินดูเงียบๆ ไม่หยุดโลก จดว่าแต่ละ region มี**ขยะกี่ %**
2. **เก็บโซนขยะเยอะสุดก่อน** (*Garbage First*): region ขยะ 90% เก็บแล้วได้พื้นที่เกือบเต็มก้อนด้วยแรง copy ของเป็นแค่ 10% — region ของเป็นล้วน**ไม่แตะเลย** — ผลตอบแทนสูงสุดต่อวินาทีที่หยุด
3. **คุมงบ pause** — ประกาศงบ (`MaxGCPauseMillis` default 200ms) แล้ว G1 เลือก*จำนวน region ต่อรอบ*ให้พอดีงบ: รอบนี้ทัน 30 ก้อนก็เอา 30 ที่เหลือรอบหน้า — จาก "pause ยาวเท่าที่งานมี" เป็น "งานถูกหั่นให้พอดี pause ที่สัญญา"

ของแถมจาก evacuation (copy ของเป็นไป region ใหม่): region เก่าว่าง**ทั้งก้อน** — ไม่มี fragmentation, โกดังถูกจัดใหม่ทุกรอบ · และนี่คือที่มาของ humongous object: ของใหญ่เกินครึ่ง region ยัดล็อคเดียวไม่ลง ต้องจองหลายล็อคติดกัน = ตัวป่วนระบบล็อคเล็ก · สังเกตปรัชญา: **หั่นก้อนยักษ์เป็นหน่วยเล็ก + งบต่อรอบ + เลือกทำตามความคุ้ม** — batch backfill ตารางใหญ่ใช้สูตรเดียวกันเป๊ะ

### อ่านอาการ GC — ดูอะไรก่อน (โยง Q&A ข้อ 11, 13)

เปิด `-Xlog:gc*` (หรือดูผ่าน Micrometer `jvm_gc_*`) แล้วถามสามคำถามตามลำดับ:

1. **Pause นานไหม** — p99 ของ pause time เทียบ SLA: pause 200ms คือ 200ms ที่*ทุก request ค้างพร้อมกัน* โดย CPU ไม่ขยับ (ข้อ 11)
2. **ถี่ไหม** — minor ถี่ = allocation rate สูง / **full GC ถี่ = สัญญาณอันตรายเสมอ** (premature promotion หรือ leak)
3. **หลังกวาดเหลือเท่าไหร่** — **heap after full GC คือเส้นชีวิต**: floor คงที่ = สุขภาพดี / floor ไต่ขึ้นเรื่อยๆ ข้ามวัน = leak แน่นอน (ข้อ 13) — ตั้ง alert บนเส้นนี้เส้นเดียว จับ leak ได้ตั้งแต่วันที่สอง

## Memory Leak — จับตัวการอย่างเป็นระบบ

วงจร (จาก Q&A ข้อ 13 ขยายเป็นขั้น):

```
1. ยืนยัน:   heap-after-full-GC ไต่ขึ้นข้ามวัน? (ฟันปลาปกติไม่ใช่ leak)
2. เก็บหลักฐาน: heap dump 2 จุดเวลา — เพิ่ง start vs อาการขึ้น
             (jcmd <pid> GC.heap_dump หรือ actuator /heapdump — ระวัง: dump ตัวใหญ่ STW ชั่วครู่)
3. วิเคราะห์:  Eclipse MAT → Dominator Tree → เทียบสอง dump หา "ใครโตข้างเดียว"
             → Path to GC Roots: ใครถือมันไว้ไม่ปล่อย
4. แก้ + กัน: fix + regression (ถ้าเทสได้) + alert บน heap-after-full-GC
```

แก๊งผู้ต้องสงสัยประจำ (เรียงตามความถี่ในชีวิตจริง):

- **static Map/List ที่โตข้างเดียว** — cache ทำมือไม่มี eviction: ใส่ทุก request ไม่เคยลบ → ใช้ Caffeine (มี size/TTL) แทน HashMap เสมอเมื่อคำว่า "cache" โผล่ในหัว
- **ThreadLocal ใน thread pool** — thread ไม่ตาย ค่าที่ฝากไว้เลยอมตะ: ต้อง `remove()` ใน finally (web framework ทำให้ แต่ pool ที่สร้างเองไม่มีใครทำให้)
- **Listener/callback ลงทะเบียนแล้วไม่ถอน** — โดยเฉพาะ object อายุสั้นไปลงทะเบียนกับ registry อายุยาว (ตัวยาวถือตัวสั้นไว้ทั้งชีวิต)
- **Unbounded queue** — producer เร็วกว่า consumer แล้วคิวคือ `LinkedBlockingQueue` ไม่จำกัด: ไม่ใช่ leak เชิงเทคนิคแต่ตายเหมือนกัน (bulkhead บอกให้ bound เสมอ)
- **Classloader leak** — hot redeploy ใน app server: class เวอร์ชันเก่าถูก thread/static ถือ → Metaspace OOM — โลก container ฆ่าปัญหานี้ด้วยการ restart ทั้ง pod แทน redeploy

### สายพันธุ์ reference — เครื่องมือคุม lifetime

- **Strong** (ปกติ) — ถืออยู่ = ไม่ถูกเก็บ
- **Soft** — เก็บเมื่อ memory ตึง: เหมาะ cache แบบ "มีก็ดีไม่มีก็ได้" (แต่ Caffeine คุมพฤติกรรมได้ดีกว่า — soft ref ทำ full GC ยาวขึ้น)
- **Weak** — เก็บทันทีที่ไม่มี strong ref: `WeakHashMap` สำหรับ metadata แนบ object ที่ไม่อยากยื้อชีวิตมัน
- **Phantom** — hook หลังตาย ใช้ทำ cleanup native resource (แทน `finalize()` ที่ deprecated เพราะ resurrect object ได้และหน่วง GC)

## เครื่องมือที่ต้องหยิบถูกในห้าวินาที

| อยากรู้อะไร | หยิบอะไร |
|---|---|
| ภาพรวม ณ ตอนนี้ (heap, thread, GC) | `jcmd <pid>` (มีดพก — GC.heap_info, Thread.print, VM.native_memory), Micrometer + Grafana dashboard JVM |
| ใครกิน heap | heap dump → **Eclipse MAT** (dominator tree) |
| Thread ค้าง/deadlock | `jcmd <pid> Thread.print` — ดู thread รอ lock อะไร (จับ pool exhaustion ได้ด้วย: thread ทั้ง pool ค้างที่ external call เดียวกันเห็นๆ) |
| Memory นอก heap | `-XX:NativeMemoryTracking=summary` + `jcmd VM.native_memory` |
| ช้าที่ไหนใน production โดยไม่ทำระบบพัง | **JFR (Java Flight Recorder)** — profiler ในตัว overhead ~1% เปิดใน prod ได้เลย + async-profiler (flame graph) |

**แนวตอบ senior เวลาถูกถามเรื่อง JVM tuning**: *"ผมไม่เริ่มจาก flag — เริ่มจาก metric สามตัว: GC pause p99, ความถี่ full GC, heap หลัง full GC — สุขภาพดีก็ไม่แตะอะไรเลย G1 default ฉลาดพอ / ป่วยค่อยวินิจฉัยว่า allocation, promotion หรือ leak แล้วแก้ที่โค้ดก่อน flag เสมอ"* — คนที่ท่อง flag มา 20 ตัวแต่ไม่รู้จะดู metric ไหน คือ junior ที่แต่งตัวเป็น senior

## Virtual Threads (Java 21) — จุดที่กระทบ memory model

Platform thread เดิม: 1 thread = 1 OS thread + stack จอง ~1MB → หมื่น concurrent = ไม่ไหว → เกิดสถาปัตยกรรม thread pool + async ทั้งยวง

**Virtual thread**: stack เล็กเริ่มไม่กี่ KB โตได้ อยู่บน heap, ตอน block ที่ I/O ตัว carrier thread ถูกปล่อยไปทำงานอื่น → สร้างเป็นล้านตัวได้ — ผลต่อ design: โค้ด blocking ธรรมดา (`RestClient` sync ต่อ request) กลับมา scale ได้โดยไม่ต้อง reactive — Spring Boot 3.2+: เปิด `spring.threads.virtual.enabled=true`

ระวังสองจุดที่ interviewer ชอบขุด: (1) **pinning** — `synchronized` block ที่ครอบ I/O ทำ virtual thread ติดหนึบกับ carrier (ใช้ `ReentrantLock` แทนในเส้นทางนั้น — JDK 24 แก้เรื่องนี้ไปมากแล้วแต่ควรพูดถึงได้) (2) virtual thread **ไม่ช่วยงาน CPU-bound** — มันแก้ปัญหา "thread นั่งรอ I/O เปลืองที่" เท่านั้น

## คำถามสัมภาษณ์ที่ต้องตอบได้

- **"Stack กับ Heap ต่างกันยังไง"** → stack: ต่อ thread, เก็บ frame + primitive + reference, ตายตาม method / heap: แชร์, เก็บ object, GC ดูแล — แต้มโบนัส: escape analysis ทำให้ object บางตัวไม่ขึ้น heap
- **"Minor กับ Full GC ต่างยังไง อะไรน่ากลัวกว่า"** → minor = กวาด young ถูกและถี่ได้ / full = ทั้ง heap แพงและ STW ยาว — full GC ถี่คือ alarm เสมอ: promotion เร็วเกินหรือ leak
- **"มี GC แล้ว leak ได้ไง"** → GC เก็บ unreachable — ของที่ static/ThreadLocal/listener ถืออยู่ยัง reachable แม้ไม่มีใครใช้ → dominator tree ใน MAT คือคำตอบว่าใครถือ
- **"เลือก GC ยังไง"** → G1 default พอ 90% — เปลี่ยนเมื่อวัดได้ว่า pause เกิน SLA จริง → ZGC / batch ล้วน → Parallel — ตอบด้วยเกณฑ์ ไม่ตอบด้วยชื่อ
- **"OOM แต่ heap ปกติ"** → ไล่ off-heap: thread stacks, direct, metaspace, container limit (OOMKilled ไม่มี stack trace — ดู exit code 137)
- **"ทำไมต้อง warm up ก่อนวัด performance"** → tiered JIT: ช่วงแรกยัง interpret อยู่ — ตัวเลขก่อน warm คือคนละโปรแกรมกับ steady state

---

โยงกลับเล่มหลัก: บทนี้คือชั้นใต้ดินของบท 7 (connection pool, statement timeout — ผู้เช่า thread และ memory ตัวจริง) และบท 10 (thread ค้างจาก missing timeout = ทั้ง stack memory และ pool ที่ถูกยึด) — ระบบที่ design ดีแต่ JVM ป่วยก็ล่มได้เหมือนกัน ต่างกันแค่ชั้นที่ต้องเปิดดู

## สรุปท้ายบท

- JVM เป็น runtime ที่มีพฤติกรรมของตัวเอง และหลาย incident ที่ดูเหมือนปัญหาระดับแอปจริง ๆ แล้วเกิดจากชั้นนี้
- การเข้าใจ heap, GC, JIT, off-heap memory และ container interaction ช่วยให้การวิเคราะห์ production issue ฝั่ง Java มีหลักมากขึ้นมาก
- บทนี้ไม่ได้มีไว้ให้ทุกคนเป็นผู้เชี่ยวชาญ JVM เต็มตัว แต่มีไว้ให้เห็นว่าเมื่อไรควรสงสัย runtime และจะเปิดดูชั้นไหนต่อ
- มันจึงทำหน้าที่เป็นชั้นปิดท้ายของเล่ม ที่พาภาพจาก principle ไปจนถึงพฤติกรรมของเครื่องรันจริงใต้โค้ดของเรา

## บทส่งท้าย

ตั้งแต่บท 1 ถึงบท 22 เล่มนี้พยายามย้ำความคิดเดียวกันซ้ำ ๆ ว่าการออกแบบระบบที่ดีไม่ใช่การสะสมศัพท์ แต่คือการเห็นความสัมพันธ์ระหว่าง principle, structure, runtime และคนที่ต้องอยู่กับระบบนั้นจริง ๆ

ถ้าอ่านแล้วเหลืออะไรติดมือกลับไป สิ่งนั้นไม่ควรเป็นรายชื่อ pattern หรือ checklist อย่างเดียว แต่ควรเป็นชุดคำถามที่ลึกขึ้น: รอยต่อนี้ควรมีไหม, dependency นี้กำลังล็อกอนาคตอะไรไว้, ข้อมูลก้อนนี้มีเจ้าของจริงไหม, failure mode นี้ถูกออกแบบรองรับแล้วหรือยัง, และทีมจะเข้าใจระบบนี้ต่อจากเราหรือเปล่า ถ้าคำถามพวกนี้คมขึ้น เล่มนี้ทำงานของมันแล้ว
