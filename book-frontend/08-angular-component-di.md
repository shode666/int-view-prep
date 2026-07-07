# บท 8 — Angular Component Model & Dependency Injection: DI ที่คุณรู้จักจาก Spring แต่ต้นไม้คนละต้น

> เป้าหมายของบทนี้: อ่านจบแล้วมองเห็น Angular เป็น "Spring ของฝั่ง browser" — ไม่ใช่เพราะมันเหมือนกันทุกอย่าง แต่เพราะปัญหาที่มันแก้ (DI, lifecycle, การแบ่ง module) คือปัญหาชุดเดียวกับที่คุณแก้มาแล้วทั้งชีวิตในฝั่ง backend — สิ่งที่ต้องเรียนใหม่จริงๆ มีน้อยกว่าที่คิด และบทนี้จะชี้ว่าตรงไหน "เหมือน Spring เป๊ะ" ตรงไหน "หน้าตาเหมือนแต่ไส้ต่าง ระวัง"

> **สถานะ ณ กลางปี 2026:** เวอร์ชันปัจจุบันอยู่ราว **Angular v22** (รอบ release ทุก 6 เดือน — ตัวเลขเวอร์ชันตรวจกับ angular.dev อีกทีตอนอ่าน) · standalone component เป็นแนวทางที่แนะนำและ CLI generate ให้เป็น standalone โดย default (ตั้งแต่ v19 ไม่ต้องเขียน `standalone: true` ใน decorator แล้ว) · `input()`/`output()`/`model()` แบบ signal เป็น **stable** และเป็นธรรมเนียมหลักแล้ว · NgModule ยังใช้ได้ปกติ แต่สถานะในทางปฏิบัติคือ legacy interop

## เข็มทิศก่อนอ่าน

บท React สองบทก่อนหน้าเน้นการประกอบแอปจาก library หลายชิ้น ส่วน Angular เริ่มต้นจากมุมกลับกันคือ framework ให้ของมาครบและมี opinion ชัดกว่า ถ้าไม่ตั้งต้นด้วยภาพนี้ คนอ่านจะเผลอถาม Angular ด้วยคำถามแบบ React แล้วรู้สึกว่ามันเยอะหรือบังคับเกินไป ทั้งที่จริงมันกำลังซื้อความสม่ำเสมอของทีม

บทนี้จึงไม่ใช่แค่แนะนำ syntax ของ Angular แต่เป็นการวาง mental model ว่า component, template และ DI container อยู่ตรงไหนของระบบ เมื่อฐานนี้ชัด บท 9-11 เรื่อง change detection, RxJS, forms และ routing จะเข้าใจเป็นเรื่องต่อเนื่องกันแทนที่จะเป็น API หลายก้อนแยกกัน

## 8.1 Angular เป็น framework แบบไหน — และราคาของความครบ

สถานการณ์จริง: คุณเพิ่งย้ายจากทีมที่ใช้ React มาทีม Angular คำถามแรกในหัวคือ "ทำไมโปรเจกต์นี้ dependency น้อยจัง — ไม่มี react-router, ไม่มี axios wrapper, ไม่มี form library?" คำตอบ: เพราะ Angular ให้มาหมดแล้ว

React (บท 6) เรียกตัวเองว่า **library** — มันทำเรื่องเดียวคือ render UI แล้วปล่อยให้คุณเลือก router, form, HTTP client, state management เอง ส่วน Angular เป็น **full framework**: CLI (Command Line Interface), router, `HttpClient`, form system สองแบบ, DI (Dependency Injection) container, test harness, i18n — มาในกล่องเดียว พร้อม "ความเห็น" ว่าควรใช้ยังไง

เทียบให้เห็นภาพแบบ backend: **React คือการเอา Jetty + Jackson + JDBC มาประกอบเอง ส่วน Angular คือ Spring Boot** — ตัวแรกอิสระสูง ตัวหลังมี convention พาไป ทีมใหญ่หน้าตาโค้ดจะคล้ายกันข้ามทีมโดยอัตโนมัติ

| มิติ | React (library) | Angular (full framework) |
|---|---|---|
| Router / HTTP / Forms | เลือกเอง (ecosystem) | มากับ framework |
| DI container | ไม่มี (ใช้ context/props) | มี — เป็นหัวใจของ framework |
| ภาษา | JS/TS ตามใจ | TypeScript เป็น first-class บังคับกลายๆ |
| ความหลากหลายของ codebase | สูง — สองโปรเจกต์ React หน้าตาคนละเรื่องได้ | ต่ำ — โครงเดาได้ ย้ายทีมง่าย |
| ราคา | ตัดสินใจเยอะ, "JavaScript fatigue" | เส้นโค้งการเรียนรู้ชันกว่า, ตามรอบ upgrade ทุก 6 เดือน |

ราคาของความครบ: คุณต้องเรียน "วิธีคิดของ Angular" ทั้งชุด (DI, template syntax, RxJS) ก่อนจะ productive และต้องตาม release cadence 6 เดือน — แต่ Angular มี `ng update` ที่รัน migration ให้อัตโนมัติ ทำให้ major upgrade ส่วนใหญ่เจ็บน้อยกว่าที่ชื่อเสียงเก่า (AngularJS → Angular 2) หลอกหลอนไว้

**แนวตอบ senior:** "React เป็น library ที่ให้อิสระสูงแลกกับภาระการเลือกและคุมมาตรฐานเอง ส่วน Angular เป็น full framework ที่ตัดสินใจให้แล้วเกือบหมด เหมาะกับทีมใหญ่/องค์กรที่อยากได้ความสม่ำเสมอข้ามทีม — ผมเลือกจากขนาดทีม อายุโปรเจกต์ และวินัยของทีม ไม่ใช่จาก benchmark"

## 8.2 DI ใน Angular — Spring ที่คุณรู้จัก แต่ต้นไม้คนละต้น

คุณรู้จัก DI ดีอยู่แล้วจากเล่ม backend (บท 2 เรื่อง DIP และบท 13 เรื่อง DI ของแต่ละภาษา): แทนที่ class จะ `new` dependency เอง ก็ประกาศว่า "ฉันต้องการอะไร" แล้วให้ container จัดหาให้ — ประโยชน์เดิมครบ: เปลี่ยน implementation ได้โดยไม่แก้ผู้ใช้, mock ได้ตอน test, lifetime ถูกจัดการจากที่เดียว

สิ่งที่ Angular เพิ่มเข้ามาและ **Spring ไม่มีในรูปนี้** คือ: container ไม่ได้เป็นก้อนเดียว แต่เป็น **ต้นไม้ของ injector** (hierarchical injector tree) ที่ซ้อนตามโครงสร้าง UI

### กลไกทีละขั้น: injector tree ทำงานยังไง

1. ตอน bootstrap แอป Angular สร้าง **root injector** — เทียบได้กับ `ApplicationContext` ของ Spring — service ที่ประกาศ `providedIn: 'root'` อยู่ที่นี่ เป็น singleton ของทั้งแอป
2. เมื่อ router โหลด route แบบ lazy (บท 11) Angular สร้าง **route-level injector** ลูกของ root — provider ที่ประกาศใน `Route.providers` อยู่ชั้นนี้
3. component ทุกตัวที่มี `providers: [...]` ของตัวเอง จะสร้าง **element injector** ที่ node ของมันใน DOM tree
4. เวลา component ขอ dependency Angular จะหา**จากใกล้ไปไกล**: element injector ของตัวเอง → ไล่ขึ้นตาม parent → route injector → root — เจอที่ไหนหยุดที่นั่น ไม่เจอเลยก็ `NullInjectorError`

Analogy: เหมือนถามหา "กรรไกร" ในออฟฟิศ — เริ่มจากลิ้นชักโต๊ะตัวเอง → ตู้ของทีม → ห้อง supply กลางของบริษัท ใครวางกรรไกรไว้ใกล้คุณที่สุด คุณได้อันนั้น และถ้าทีมคุณซื้อกรรไกรเอง ทีมอื่นก็ไม่เห็นของคุณ — นี่แหละความต่างจาก Spring ที่ (โดย default) มีห้อง supply กลางห้องเดียว

### Token และ Provider — สัญญากับผู้ส่งมอบ

สิ่งที่ใช้ค้นหาใน tree เรียกว่า **token** — ปกติคือ class ของ service เอง แต่จะเป็น `InjectionToken` สำหรับค่าที่ไม่ใช่ class ก็ได้ (เทียบ `@Qualifier` + `@Bean` ของ Spring):

```ts
// token สำหรับ config ที่ไม่ใช่ class — เหมือน @Value/@Bean ใน Spring
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

// provider หลายทรง — เทียบ Spring ตรงๆ
providers: [
  OrderService,                                        // shorthand ของ useClass ตัวเอง
  { provide: PaymentGateway, useClass: StripeGateway },// เหมือน @Bean คืน implementation อื่น
  { provide: API_BASE_URL, useValue: 'https://api.example.com' },
  { provide: Logger, useFactory: () => isDev ? new ConsoleLogger() : new RemoteLogger() },
]
```

| แนวคิด | Spring | Angular |
|---|---|---|
| Container | `ApplicationContext` ก้อนเดียว (โดยหลัก) | injector **tree** ซ้อนตาม UI |
| ประกาศ bean/service | `@Service`, `@Component` | `@Injectable({ providedIn: 'root' })` |
| เลือก implementation | `@Bean`, `@Qualifier`, `@Profile` | provider object (`useClass`/`useValue`/`useFactory`) |
| Scope | singleton, prototype, request, session | ตามตำแหน่งใน tree: root / route / component |
| ขอ dependency | constructor injection | `inject()` function (ธรรมเนียมปัจจุบัน) หรือ constructor |
| หา bean ไม่เจอ | `NoSuchBeanDefinitionException` ตอน start | `NullInjectorError` ตอน **runtime เมื่อ component ถูกสร้าง** |

จุดต่างสุดท้ายในตารางสำคัญ: Spring fail-fast ตอน boot แต่ Angular บาง error โผล่ตอน user คลิกเข้าหน้านั้นแล้วเท่านั้น (เพราะ component เพิ่งถูกสร้าง) — test coverage ระดับ component จึงช่วยจับเรื่องนี้

## 8.3 Provider scope — เลือกผิดแล้วพังยังไงจริงๆ

สามระดับที่ใช้จริง:

- **`providedIn: 'root'`** — singleton ทั้งแอป + **tree-shakable** (ถ้าไม่มีใคร inject ตัว bundler ตัดทิ้งได้ เพราะการประกาศอยู่ที่ตัว service ไม่ใช่ที่ module) → default ที่ถูกต้องของ service 90%
- **Route-level (`Route.providers`)** — instance ใหม่ต่อ subtree ของ route นั้น อยู่ยาวจน route ถูกทำลาย → เหมาะกับ state เฉพาะ feature เช่น wizard หลายหน้าที่แชร์ draft กัน
- **Component-level (`@Component({ providers: [...] })`)** — instance ใหม่**ต่อ component instance** ตายพร้อม component → เหมาะกับ helper ที่ผูกกับ view เช่น service คุม state ของ widget ที่วางซ้ำหลายตัวในหน้าเดียวแล้วต้องไม่ปนกัน

### บั๊กคลาสสิก: ตะกร้าสินค้าหลายใบ

```ts
// ตั้งใจให้ทั้งแอปแชร์ตะกร้าเดียว...
@Injectable() // ⚠️ ไม่มี providedIn
export class CartService {
  private items = signal<CartItem[]>([]);
  readonly count = computed(() => this.items().length);
  add(item: CartItem) { this.items.update(list => [...list, item]); }
}

@Component({
  selector: 'app-product-page',
  providers: [CartService],   // 💣 จุดพัง: สร้าง instance ใหม่ให้ "หน้านี้"
  /* ... */
})
export class ProductPage {
  cart = inject(CartService);
}
```

อาการที่ user เห็น: กด "เพิ่มลงตะกร้า" ในหน้า product แล้ว badge ตะกร้าที่ header **ไม่ขยับ** — เพราะ header inject `CartService` ได้อีก instance (จากชั้นที่สูงกว่า หรือพังเลยถ้าไม่มีใคร provide) ของถูกใส่ลง "ตะกร้าเงา" ที่ไม่มีใครมองเห็น แล้วพอ navigate ออกจากหน้า ตะกร้าเงาก็ตายไปพร้อม component — ข้อมูลหายเงียบๆ ไม่มี error สักบรรทัด

นี่คือบั๊กประเภทที่เลวร้ายที่สุด: **ไม่ crash แต่พฤติกรรมผิด** — เทียบ backend คือการเผลอประกาศ bean เป็น `prototype` scope ทั้งที่มันถือ state ที่ทุกคนต้องแชร์ (เล่ม backend บท 6 เรื่อง stateless service ก็วนเรื่อง lifetime แบบเดียวกัน)

กติกาที่ใช้ตัดสิน: **service ถือ state ที่ต้องแชร์ → 'root' เสมอ** / state ต่อ feature → route / state ต่อ "ชิ้น UI ที่ซ้ำได้" → component-level เท่านั้น และการใส่ `providers: []` ที่ component ต้องเขียน comment อธิบายว่าตั้งใจ เพราะคนอ่านรุ่นหลังจะสงสัยเสมอว่าตั้งใจหรือพลาด

**แนวตอบ senior:** "provider scope คือการเลือก lifetime ของ state — ผม default ที่ `providedIn: 'root'` เพราะ singleton + tree-shakable แล้วจะลด scope ลงมาที่ route หรือ component ก็ต่อเมื่อต้องการหลาย instance โดยตั้งใจ เช่น widget ซ้ำๆ ที่ state ต้องไม่ปนกัน — บั๊กยอดฮิตคือ provide ซ้ำที่ component แล้วได้ instance เงาโดยไม่รู้ตัว"

## 8.4 `inject()` vs constructor injection — ธรรมเนียมเปลี่ยนแล้ว

แบบเก่า (ยังใช้ได้ ไม่ deprecated):

```ts
constructor(private cart: CartService, private http: HttpClient) {}
```

ธรรมเนียมปัจจุบัน (Angular style guide และ schematic ของ CLI generate แบบนี้):

```ts
export class ProductPage {
  private cart = inject(CartService);
  private http = inject(HttpClient);
  // อ่านชื่อ field แล้วเห็น dependency ทันที ไม่ต้องไล่ constructor ยาวๆ
}
```

ทำไมย้าย: (1) inheritance ไม่ต้องส่ง dependency ผ่าน `super(...)` เป็นทอดๆ (2) ใช้ใน function ได้ — route guard และ interceptor สมัยใหม่เป็น plain function ที่เรียก `inject()` ข้างใน ไม่ต้องเป็น class อีกต่อไป (3) type inference ดีกว่ากับ generic token

ข้อจำกัดที่ต้องรู้เพราะโดนถามบ่อย: `inject()` เรียกได้เฉพาะใน **injection context** — คือระหว่าง field initializer / constructor ของ class ที่ Angular สร้าง หรือใน factory/guard ที่ Angular เรียก — เรียกใน `ngOnInit` หรือใน callback ของ `setTimeout` จะได้ error `NG0203` ทันที ถ้าจำเป็นจริงต้องเก็บ `Injector` ไว้แล้วใช้ `runInInjectionContext()`

เทียบ backend: เหมือนตอน Spring ทีมคุณย้ายจาก field injection มา constructor injection — ตัว mechanic ไม่ใช่สาระ สาระคือ**ความอ่านง่ายและการใช้งานในบริบทใหม่** (functional guard) ที่ผลักธรรมเนียมให้เปลี่ยน

## 8.5 สี่ผู้เล่น: Component / Directive / Pipe / Service

แบ่งหน้าที่ให้ขาดก่อน แล้วโค้ดจะไม่ปนกันเอง:

| ผู้เล่น | หน้าที่เดียวของมัน | เทียบ backend |
|---|---|---|
| Component | ผูก template + state ของ "ชิ้น UI" หนึ่งชิ้น | Controller ที่มี view ติดตัว |
| Directive | เพิ่มพฤติกรรมให้ element **ที่มีอยู่แล้ว** โดยไม่มี template ของตัวเอง | AOP/decorator ที่แปะพฤติกรรมเสริม |
| Pipe | แปลงค่าใน template (format, filter) — pure function มีชื่อ | Formatter/Converter |
| Service | logic + state ที่ไม่ผูกกับ UI | Service layer ตรงตัว |

**Directive สองพันธุ์** — ต้องแยกให้ได้ในสัมภาษณ์:

- **Attribute directive** เปลี่ยน "หน้าตา/พฤติกรรม" ของ element เดิม เช่น directive ที่ auto-focus หรือไฮไลต์ค่าติดลบเป็นสีแดง — DOM node เดิมยังอยู่ครบ
- **Structural directive** เปลี่ยน "โครงสร้าง" — เพิ่ม/ลบ element ออกจาก DOM จริงๆ เช่น `*ngIf`/`*ngFor` แบบเก่า ซึ่งปัจจุบันถูกแทนด้วย **built-in control flow** (`@if`, `@for`, `@switch`) ที่เป็น syntax ของ template ตรงๆ เร็วกว่าและไม่ต้อง import — โปรเจกต์ใหม่ใช้ `@if`/`@for` เป็น default แล้ว (`@for` บังคับใส่ `track` ซึ่งช่วยเรื่อง performance แบบเดียวกับ `key` ของ React ในบท 6)

**Pipe: pure vs impure — ทำไม impure อันตราย**

Pipe ปกติเป็น **pure**: Angular จะเรียกซ้ำก็ต่อเมื่อ input **reference** เปลี่ยน — เท่ากับได้ memoization ฟรี ส่วน **impure pipe** (`pure: false`) ถูกเรียกใหม่**ทุกรอบ change detection** — ถ้าใน pipe มีงานหนัก (sort/filter array ใหญ่) เท่ากับจ่ายงานนั้นหลายสิบครั้งต่อวินาทีตอน user พิมพ์หรือ scroll เหตุผลเต็มๆ ว่า "ทุกรอบ change detection" แปลว่าบ่อยแค่ไหน อยู่บท 9 — ตอนนี้จำไว้ก่อนว่า impure pipe คือการสมัครใจออกจากระบบ cache แล้วส่วนใหญ่มีทางเลือกที่ดีกว่าเสมอ (แปลงข้อมูลใน `computed()` แทน)

## 8.6 Lifecycle hooks — ตัวที่ใช้จริงและเหตุผลเบื้องหลัง

**ทำไม `constructor` กับ `ngOnInit` ต้องแยกกัน?** เพราะมันคนละเฟส: constructor ถูกเรียกตอน **DI สร้าง object** — ณ จุดนั้น input ยังไม่ถูก bind (parent ยังไม่ได้ส่งค่ามา) ส่วน `ngOnInit` ถูกเรียกหลัง Angular set input รอบแรกเสร็จ — logic ที่ต้องใช้ค่า input จึงต้องอยู่ `ngOnInit` เทียบ Spring คือ constructor vs `@PostConstruct` เป๊ะ: ตัวแรกแค่รับของ ตัวหลังค่อยเริ่มทำงานเมื่อของครบ

```ts
@Component({ selector: 'app-order-detail', /* ... */ })
export class OrderDetail implements OnInit, AfterViewInit {
  private ordersApi = inject(OrdersApi);
  private destroyRef = inject(DestroyRef);

  orderId = input.required<string>();               // signal input (หัวข้อ 8.8)
  chartEl = viewChild<ElementRef>('chart');         // signal query แทน @ViewChild

  constructor() {
    // ✅ แค่รับ dependency / ตั้งค่า field — this.orderId() ยังไม่มีค่าจาก parent!
  }

  ngOnInit() {
    // ✅ input พร้อมแล้ว — จุด kick-off งานที่พึ่ง input
    this.ordersApi.load(this.orderId())
      .pipe(takeUntilDestroyed(this.destroyRef))     // auto-unsubscribe ตอน destroy
      .subscribe(/* ... */);
  }

  ngAfterViewInit() {
    // ✅ DOM ของ view พร้อมแล้ว — จุดเดียวที่ library ที่จับ DOM จริง (chart, map) เริ่มได้
    initChart(this.chartEl()!.nativeElement);
  }
}
```

ตัวที่เหลือที่ใช้จริง:

- **`ngOnChanges`** — ถูกเรียกทุกครั้งที่ input (แบบ decorator) เปลี่ยน พร้อม object บอกค่าเก่า/ใหม่ — โค้ดสมัย signal input ใช้น้อยลงมาก เพราะ `computed()`/`effect()` ตอบโจทย์ "ทำอะไรเมื่อ input เปลี่ยน" ได้ตรงกว่า (บท 9)
- **`ngOnDestroy`** — จุด cleanup: unsubscribe, clearInterval, ปลด event listener ที่แปะกับ `window` — ลืมแล้วได้ **memory leak แบบสะสม**: component ตายแล้วแต่ subscription ยังถือ reference ไว้ GC (Garbage Collector) เก็บไม่ได้ ยิ่ง navigate ไปมายิ่งบวม (แผลเดียวกับบท 10 เรื่อง subscription leak) — ปัจจุบันนิยมฉีด `DestroyRef` + `takeUntilDestroyed` แทนการ implement `OnDestroy` เองเพราะ declarative กว่า

Analogy ชุด hook: เหมือนการเปิดร้านอาหาร — constructor คือ "เซ็นสัญญาเช่าตึก" (ได้ที่ แต่ยังไม่มีของ), `ngOnInit` คือ "ของเข้าครบ เริ่มเตรียมครัว", `ngAfterViewInit` คือ "หน้าร้านตกแต่งเสร็จ เปิดรับลูกค้า" และ `ngOnDestroy` คือ "ปิดร้าน — ต้องคืนกุญแจ ตัดน้ำตัดไฟ" ใครปิดร้านแล้วไม่ตัดไฟ บิล (memory) เดินต่อ

## 8.7 Standalone components — ทำไม Angular เลิกบังคับ NgModule

ประวัติย่อ: Angular เดิมบังคับให้ทุก component สังกัด **NgModule** — กล่องที่ประกาศว่า "component กลุ่มนี้ + import เหล่านี้ อยู่ด้วยกัน" ปัญหาที่สะสมมา:

1. **Dependency ไม่ชัด** — component ใช้อะไรได้บ้างขึ้นกับว่า module แม่ import อะไร อ่านไฟล์ component ไฟล์เดียวตอบไม่ได้ ต้องไล่ไปดู module (ความรู้แอบแฝง — coupling ชนิดที่เล่ม backend บท 2 เตือน)
2. **Tree-shaking ทื่อ** — bundler มอง module เป็นก้อน ตัดของที่ไม่ใช้ยาก
3. **Lazy loading งุ่มง่าม** — ต้องสร้าง module ห่อทุกครั้งที่อยาก lazy load

**Standalone component** แก้ตรงจุด: component ประกาศ `imports` ของตัวเองในไฟล์ตัวเอง — dependency ชัดเจนระดับไฟล์, bundler ตัดแม่นขึ้น, lazy load ได้ระดับ component/route โดยตรง — ตั้งแต่ **v19 ไม่ต้องเขียน `standalone: true` แล้ว** (decorator ถือว่า standalone เป็นค่าตั้งต้น) และ CLI generate component ใหม่เป็น standalone ให้เอง — standalone จึงเป็นแนวทางแนะนำอย่างเป็นทางการสำหรับโค้ดใหม่

```ts
// main.ts — ไม่มี AppModule อีกต่อไป
bootstrapApplication(AppComponent, appConfig);

// app.config.ts — สิ่งที่เคยอยู่ใน AppModule ย้ายมาเป็น provider functions
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),          // แทน RouterModule.forRoot(...)
    provideHttpClient(),            // แทน HttpClientModule
    // v21+ แอปใหม่เป็น zoneless โดย default — รายละเอียดบท 9
  ],
};
```

Migration path สำหรับ codebase เก่า: `ng generate @angular/core:standalone` — schematic สามจังหวะ (แปลง component → ลบ NgModule ที่ว่างลง → เปลี่ยน bootstrap) ทำทีละ feature ได้ ไม่ต้อง big bang

**NgModule ยังจำเป็นตรงไหน (2026):** แทบไม่จำเป็นแล้วสำหรับโค้ดใหม่ — เหลือเจอใน (1) codebase เก่าที่ยังไม่ migrate (2) library ภายนอกบางตัวที่ยัง export เป็น module (standalone component import NgModule ได้ตรงๆ ไม่มีปัญหา) — คำตอบสัมภาษณ์ที่ดีคือรู้ว่ามันไม่ตาย แต่เป็น legacy interop

## 8.8 Input/Output ยุค signals — ธรรมเนียมปัจจุบัน

แบบ decorator (`@Input()`/`@Output()`) ยังทำงานได้ แต่ของใหม่ **stable และเป็นค่า default ที่ CLI generate** แล้ว:

```ts
export class PriceTag {
  // แบบใหม่ — คืนค่าเป็น signal: อ่านด้วย this.amount()
  amount = input.required<number>();          // บังคับส่ง — ไม่ส่ง = compile error
  currency = input('THB');                    // มี default
  discounted = output<number>();              // แทน @Output + EventEmitter

  // สองทาง (banana-in-a-box [(value)]) แบบ signal
  value = model<number>(0);                   // อ่าน value(), เขียน value.set(x) → แจ้ง parent อัตโนมัติ

  // computed ต่อยอดจาก input ได้ทันที — นี่คือเหตุผลใหญ่ที่ input เป็น signal
  vatIncluded = computed(() => this.amount() * 1.07);
}
```

ทำไมเปลี่ยน: `@Input()` เป็นแค่ property ธรรมดา — จะรู้ว่ามันเปลี่ยนต้องพึ่ง `ngOnChanges` หรือ setter ส่วน `input()` เป็น **signal** ตั้งแต่เกิด → ต่อเข้า `computed()`/`effect()` ได้ตรงๆ และเป็นจิ๊กซอว์ที่ทำให้ change detection แบบเจาะจุด (บท 9) เป็นไปได้ · `input.required` ยังให้ type safety ที่ `@Input()` ให้ไม่ได้ (เดิมต้องยอมให้ field เป็น `!` หรือ `undefined`)

สถานะปี 2026: โค้ดใหม่ใช้ `input()`/`output()`/`model()` เป็นมาตรฐาน มี schematic `ng generate @angular/core:signal-input-migration` ช่วยแปลงของเก่า — decorator ยังไม่ถูก deprecate แต่ทิศทางชัดว่าโลกย้ายแล้ว

## 8.9 โครงสร้างโปรเจกต์ — boundary เดิมในโลกใหม่

หลักเดียวกับเล่ม backend (บท 2 coupling, บท 4 architecture): **แบ่งตาม feature ไม่ใช่ตามชนิดไฟล์** — โฟลเดอร์ `components/`, `services/` รวมทุก feature คือการจัดหนังสือตามสีปก

```
src/app/
├── core/                # ของที่ทั้งแอปใช้ครั้งเดียว: interceptor, auth, error handler
├── shared/              # UI components/pipes ที่ "โง่" ใช้ซ้ำได้ทุก feature (ห้ามมี business logic)
├── features/
│   ├── orders/          # ทุกอย่างของ orders อยู่บ้านเดียวกัน — routes, components, service, model
│   │   ├── orders.routes.ts        # lazy load ทั้ง feature จากไฟล์นี้
│   │   ├── order-list/  order-detail/  data/
│   └── products/
└── app.config.ts / app.routes.ts
```

กติกา boundary: feature ห้าม import ข้าม feature ตรงๆ — ถ้า orders ต้องใช้ของจาก products ให้ผ่าน shared หรือยกขึ้นเป็น service กลาง (บังคับด้วย lint rule ได้ เช่น eslint boundaries) — เหตุผลเดียวกับที่ backend ห้าม module ล้วง repository ของกันและกัน: **ให้เขตแดนพังตอน compile ไม่ใช่พังตอน refactor**

## คำถามสัมภาษณ์ที่ต้องตอบได้

1. **Angular DI ต่างจาก Spring DI ตรงไหนบ้าง?**
→ แนวคิดเดียวกัน (IoC container, token→provider, เลือก implementation ได้) แต่ Angular เป็น injector *tree* ซ้อนตามโครงสร้าง UI: หา dependency จาก element → route → root ทำให้มี scope ตามตำแหน่งใน tree ได้ ซึ่ง Spring ไม่มีในรูปนี้ และ Angular fail ตอน runtime เมื่อ component ถูกสร้าง ไม่ fail-fast ตอน boot แบบ Spring

2. **`providedIn: 'root'` กับ provide ที่ component ต่างกันยังไง เลือกยังไง?**
→ root = singleton ทั้งแอป + tree-shakable, component-level = instance ใหม่ต่อ component ตายพร้อมกัน — default ที่ root เสมอ ลด scope เฉพาะเมื่อต้องการหลาย instance โดยตั้งใจ บั๊กคลาสสิกคือเผลอ provide ที่ component แล้ว state ที่ควรแชร์กลายเป็น instance เงา ข้อมูลหายเงียบๆ

3. **ทำไม `ngOnInit` ต้องมี ทั้งที่มี constructor แล้ว?**
→ constructor คือจังหวะ DI สร้าง object — input ยังไม่ถูก bind ส่วน ngOnInit ถูกเรียกหลัง input พร้อม เทียบ Spring คือ constructor vs `@PostConstruct` — logic ที่พึ่ง input ต้องอยู่ ngOnInit หรือย้ายไปเป็น `computed()` จาก signal input ในโค้ดสมัยใหม่

4. **Standalone component แก้ปัญหาอะไรของ NgModule?**
→ สามเรื่อง: dependency ชัดระดับไฟล์ (ไม่ต้องไล่ดู module แม่), tree-shaking แม่นขึ้น, lazy loading ระดับ component/route โดยไม่ต้องห่อ module — เป็น default ตั้งแต่ v19 ส่วน NgModule เหลือสถานะ legacy interop

5. **`inject()` ต่างจาก constructor injection ยังไง และมีข้อจำกัดอะไร?**
→ ผลลัพธ์เท่ากันแต่ inject() อ่านง่ายกว่า ไม่ต้องส่งผ่าน super ตอน inherit และใช้ใน functional guard/interceptor ได้ — ข้อจำกัดคือเรียกได้เฉพาะใน injection context (field initializer/constructor/factory) เรียกใน lifecycle hook หรือ async callback จะ error NG0203

6. **pure pipe กับ impure pipe ต่างกันยังไง ทำไม impure ถึงอันตราย?**
→ pure ถูกเรียกซ้ำเฉพาะเมื่อ input reference เปลี่ยน (memoize ฟรี) ส่วน impure ถูกเรียกทุกรอบ change detection — ถ้ามีงานหนักข้างในคือจ่ายซ้ำมหาศาลตอน user โต้ตอบ ทางที่ดีกว่าคือแปลงข้อมูลใน computed() แล้วให้ template อ่านผลลัพธ์เฉยๆ

## สรุปท้ายบท

- Angular ต้องเข้าใจในฐานะ framework ที่มี opinion ครบชุด ไม่ใช่แค่ library สำหรับ render component
- component model, template และ DI container คือสามแกนที่ทำให้ของส่วนอื่นใน Angular เชื่อมต่อกันเป็นระบบ
- การเข้าใจ provider scope, lifecycle และ boundary ของ dependency สำคัญพอ ๆ กับการจำ syntax
- ถ้าฐานบทนี้แน่น การอ่าน change detection, RxJS, forms และ routing จะง่ายขึ้นมาก เพราะเห็นว่าทุกอย่างวิ่งอยู่บนโครงเดียวกัน

## ก่อนไปบทถัดไป

เมื่อเห็นโครงสร้างของ Angular แล้ว บทถัดไปจะลงไปที่เครื่องยนต์หลักว่า framework รู้ได้อย่างไรว่าควรวาดจอใหม่ และทำไม ecosystem ของ Angular จึงค่อย ๆ ย้ายจาก zone.js ไปสู่ signals
