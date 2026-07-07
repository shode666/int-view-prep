# บท 15 — Frontend Testing: ทำไม test 47 ไฟล์ถึงแดงทั้งที่ refactor แล้วพฤติกรรมเหมือนเดิมทุกอย่าง

> ประโยคแกนของบท: **test พฤติกรรมที่ผู้ใช้เห็น ไม่ใช่ implementation ข้างใน** — นี่คือประโยคเดียวกับ "assert ที่ผลลัพธ์ ไม่ใช่ที่ลำดับการเรียก" ของฝั่ง backend (เล่ม backend บท 12) เป๊ะๆ แค่เปลี่ยนโลก: ผลลัพธ์ของ backend คือ state/response, ผลลัพธ์ของ frontend คือ**สิ่งที่ปรากฏบนจอและตอบสนองต่อผู้ใช้**

## เข็มทิศก่อนอ่าน

บทนี้คือจุดที่ของจากทั้งเล่มเริ่มถูกถามกลับว่า "สิ่งที่คุณออกแบบและเขียนมานั้นพิสูจน์ยังไงว่ามันยังทำงานอยู่" ถ้า state placement จากบท 7 ดี, data fetching จากบท 12 เป็นระบบ และ accessibility จากบท 14 ถูกต้อง การเขียน test จะง่ายขึ้นอย่างเห็นได้ชัด เพราะระบบมี boundary และพฤติกรรมที่ชัดเจนอยู่แล้ว

ระหว่างอ่านอย่าคิดว่า testing เป็นเรื่องของเครื่องมือก่อน แต่ให้มองว่าเป็นเรื่องของ feedback loop: เรากำลังป้องกัน regression อะไร และต้องการความมั่นใจระดับไหนจาก test แต่ละชนิด

## ปรัชญาแกน — Test อะไรคือ "ผลลัพธ์" ของ UI

สถานการณ์จริง: ทีม refactor component จาก class เป็น hooks — พฤติกรรมเหมือนเดิมทุกประการ ผู้ใช้แยกไม่ออก แต่ test แดง 47 ไฟล์ เพราะ test เก่า assert `wrapper.state('isOpen')` และ `instance.handleClick` ซึ่งไม่มีอยู่แล้ว — test แบบนี้ไม่ได้คุ้มครองพฤติกรรม มัน**คุ้มครอง implementation** ทำให้ refactor ที่ควรปลอดภัยกลายเป็นงานแก้ test ครึ่งวัน นี่คือ "mock แล้ว verify ทุกบรรทัด" เวอร์ชัน frontend (เล่ม backend บท 12 เรียกว่ากลิ่นเน่าจาก mock)

**Testing Library** ถูกสร้างมาแก้ปัญหานี้ด้วย guiding principle เดียว: *"The more your tests resemble the way your software is used, the more confidence they can give you"* — test ควรมองแอปผ่านสายตาผู้ใช้: หา element แบบที่ผู้ใช้หา (ข้อความ, role), กระทำแบบที่ผู้ใช้ทำ (คลิก, พิมพ์), assert สิ่งที่ผู้ใช้เห็น (ข้อความปรากฏ/หาย) — internal state, ชื่อ method, จำนวนครั้งที่ render คือสิ่งที่ผู้ใช้ไม่รู้ และ test ก็ไม่ควรรู้

Analogy: test ที่ดีคือ**นักชิมอาหาร** — ชิมจานที่เสิร์ฟแล้วตัดสิน ไม่ใช่ผู้คุมครัวที่จับผิดว่าเชฟถือตะหลิวมือไหน เชฟเปลี่ยนวิธีผัด (refactor) นักชิมไม่ควรรู้สึกอะไรถ้ารสเดิม

## Testing Pyramid ฝั่ง Frontend

Pyramid หลักการเดิม (เล่ม backend บท 12) แต่สัดส่วนหน้าตาต่างนิดหน่อย เพราะ "unit ล้วน" ฝั่ง FE มีน้อยกว่า — มูลค่าส่วนใหญ่อยู่ที่รอยต่อระหว่าง markup, state, event:

| ชั้น | ฝั่ง FE คืออะไร | สัดส่วน | เครื่องมือ |
|---|---|---|---|
| Unit | logic ล้วนไม่มี DOM: ฟังก์ชัน format, reducer, validation, custom hook เดี่ยว | พอประมาณ | Vitest/Jest |
| **Component test** | **ตัวหลักของ FE** — render component จริง + interaction จริง + mock แค่ network | เยอะสุด | Testing Library + MSW |
| E2E | flow ธุรกิจสำคัญไม่กี่เส้นบน browser จริง | น้อย | Playwright |

หมายเหตุปี 2026: test runner สำหรับโปรเจกต์ใหม่ ธรรมเนียมตลาดคือ **Vitest** (เร็วกว่า, ESM ไม่ต้องเซ็ตอะไร, API เข้ากันกับ Jest เกือบหมด) — Jest ยังอยู่ในโปรเจกต์เก่าจำนวนมาก สัมภาษณ์ตอบได้ทั้งคู่เพราะ concept เหมือนกัน

## React Testing Library ลึก

**RTL (React Testing Library)** render component ลง DOM จริง (jsdom) แล้วให้เรา query แบบผู้ใช้ สิ่งที่ต้องแม่นสามเรื่อง:

**1) Query priority — `getByRole` มาก่อนเสมอ** ลำดับที่ RTL แนะนำ: `getByRole` → `getByLabelText` → `getByPlaceholderText` → `getByText` → ... → `getByTestId` เป็นทางเลือกสุดท้าย เหตุผลไม่ใช่ความสวยงาม — **มันคือ a11y test ฟรี** (บท 14): `getByRole("button", { name: "บันทึก" })` จะเจอก็ต่อเมื่อ element เป็นปุ่มจริงและมีชื่อที่ screen reader อ่านออก ถ้าทีมเขียน `<div onClick>` test จะหาไม่เจอ → test บังคับ semantic HTML โดยไม่ต้องมี reviewer มานั่งเฝ้า ส่วน `data-testid` คือการยอมแพ้: ผู้ใช้ไม่มีทางหา element ด้วย testid

**2) `userEvent` ไม่ใช่ `fireEvent`** — `fireEvent.click()` ยิง event เดี่ยวๆ ใส่ DOM ตรงๆ แต่ `userEvent.click()` จำลอง*พฤติกรรมผู้ใช้ทั้งลำดับ*: pointerdown → focus → pointerup → click และเคารพความจริง เช่น คลิกปุ่ม `disabled` แล้ว**ไม่เกิดอะไร** (fireEvent ยิงทะลุ) `userEvent.type()` พิมพ์ทีละตัวพร้อม keydown/keyup — บั๊กประเภท "handler ผูกกับ keydown แต่ test ผ่านเพราะ fireEvent.change" จะโผล่เฉพาะกับ userEvent

**3) Async — `findBy` / `waitFor`** — UI ส่วนใหญ่ async (โหลดข้อมูล, transition) `getBy` โยน error ทันทีถ้าไม่เจอ / `queryBy` คืน null (ใช้ assert "ต้องไม่มี") / `findBy` = getBy + รอจนเจอ (retry จนกว่า timeout) — และ `screen.debug()` คือเพื่อนตอน test งง: พ่น DOM ปัจจุบันออกมาดู

```tsx
test("ค้นหาแล้วแสดงผลลัพธ์", async () => {
  const user = userEvent.setup();
  render(<ProductSearch />);

  await user.type(screen.getByRole("searchbox", { name: /ค้นหา/ }), "เมาส์");
  await user.click(screen.getByRole("button", { name: "ค้นหา" }));

  // findBy = รอ async จนผลลัพธ์โผล่ — ไม่มี sleep, ไม่มี act() เอง
  expect(await screen.findByText("Logitech MX")).toBeInTheDocument();
  // assert "ไม่มี" ใช้ queryBy (getBy จะ throw ก่อน assert)
  expect(screen.queryByText("ไม่พบสินค้า")).not.toBeInTheDocument();
});
```

**Render กับ provider จริง** — component จริงมักพึ่ง context: router, query client, theme, i18n ถ้าแต่ละเทสประกอบเองจะทั้งรกและหลุด config จริง ธรรมเนียมคือทำ `renderWithProviders` กลางไว้ใช้ทั้งโปรเจกต์ — และนี่คือ fake "โลกจำลอง" ฉบับ FE (เล่ม backend บท 12): สลับสภาพแวดล้อมทั้งใบ ไม่ใช่ mock เป็นจุดๆ

```tsx
export function renderWithProviders(ui: React.ReactElement, { route = "/" } = {}) {
  // QueryClient ใหม่ต่อเทส — cache ไม่รั่วข้ามเทส (isolation)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}
```

จุดสังเกต: ปิด `retry` ใน test เสมอ — ไม่งั้นเทส failure path จะรอ retry 3 รอบจน timeout ก่อนถึง assert

## Test อะไร — ไม่ Test อะไร

**Test:** พฤติกรรมที่ผู้ใช้เห็น (กรอกผิด → เห็น error), edge case (list ว่าง, ข้อมูลยาวผิดปกติ, โหลดช้า, API พัง), และ **regression จากบั๊กจริงทุกตัว** — บั๊กที่เคยหลุด production คือ spec ที่แพงที่สุดที่บริษัทเคยจ่าย เขียน test ขังมันไว้

**ไม่ test:** style/พิกัด CSS (เปราะและไม่ใช่ behavior — งาน visual ใช้ visual regression tool แยก), internal state (`expect(component.state.x)` — ผูก implementation), จำนวน re-render (ยกเว้นกำลังทำ performance โดยตรง บท 13)

**Snapshot test — คำตอบแบบ nuance:** snapshot ใหญ่ทั้ง component = anti-pattern: มันไม่ได้ assert พฤติกรรมอะไรเลย แค่ assert ว่า "เหมือนเมื่อวาน" พอ diff ยาว 300 บรรทัด ทุกคนกด update โดยไม่อ่าน — กลายเป็นพิธีกรรมที่จับบั๊กไม่ได้แต่ขวาง refactor ที่ยังพอมีที่ใช้: snapshot *เล็กและตั้งใจ* เช่น serialize ของ error object หรือ inline snapshot ของ output สั้นๆ ที่อ่าน diff รู้เรื่องจริง

## MSW — Mock ที่ Network Layer

คำถามสำคัญ: component ที่ fetch ข้อมูล จะ mock ตรงไหน? mock `axios`/`fetch` โดยตรง (`vi.mock("axios")`) ทำให้ test รู้จัก implementation อีกแล้ว — วันที่ทีมย้าย axios → fetch หรือครอบด้วย TanStack Query test แดงทั้งที่พฤติกรรมเดิม

**MSW (Mock Service Worker)** แก้ด้วยการดักที่ **network layer**: โค้ดแอปยิง request จริงตามปกติ MSW ดักไว้ก่อนออกเครื่องแล้วตอบตาม handler — analogy: แทนที่จะ**ปลอมตัวเป็นพนักงานส่งของในบริษัท** (mock module ภายใน) เราตั้ง**ด่านชายแดนจำลอง** (network boundary) ทุกอย่างในประเทศทำงานจริงหมด ต่างแค่ของที่ข้ามด่านถูกจัดฉาก

ข้อดีสามชั้น: (1) test ไม่รู้ว่าแอปใช้ fetch, axios หรือ query lib — refactor ชั้น data ได้อิสระ (บท 12) (2) handler ชุดเดียว**ใช้ซ้ำ**ได้ทั้ง test / dev server / Storybook (3) เทสได้ทั้ง happy และ failure path สมจริง

```ts
// MSW v2 API — http + HttpResponse (v1 คือ rest.get + res(ctx.json()) — เลิกใช้แล้ว)
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const handlers = [
  http.get("/api/products", ({ request }) => {
    const q = new URL(request.url).searchParams.get("q");
    return HttpResponse.json([{ id: 1, name: `ผลลัพธ์ของ ${q}` }]);
  }),
];

const server = setupServer(...handlers);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers()); // ล้าง override รายเทส — กัน test รั่วใส่กัน
afterAll(() => server.close());

test("API พัง → เห็นข้อความ error", async () => {
  // override เฉพาะเทสนี้ — เทสอื่นยังได้ handler ปกติ
  server.use(http.get("/api/products", () => HttpResponse.json({}, { status: 500 })));
  render(<ProductSearch />);
  expect(await screen.findByRole("alert")).toHaveTextContent("โหลดข้อมูลไม่สำเร็จ");
});
```

## Custom Hook และ Timer

**Hook** — hook เรียกนอก component ไม่ได้ RTL จึงมี `renderHook`:

```tsx
const { result } = renderHook(() => useCounter(5));
act(() => result.current.increment());     // การเปลี่ยน state ต้องอยู่ใน act
expect(result.current.count).toBe(6);
```

`act()` คือฟังก์ชันของ React ที่ห่อโค้ดซึ่ง trigger การอัปเดต state — มันบอก React ว่า "โค้ดข้างในนี้ทำให้เกิด state change ให้ flush การ re-render + effect ให้เสร็จก่อนออกจากบล็อก" ถ้าเรียก `increment()` นอก `act` state จะเปลี่ยนแต่ DOM/`result.current` อาจยังไม่ทันอัปเดตตอน assert (แถม React พ่น warning "not wrapped in act") — RTL ห่อ `render`/`userEvent`/`findBy` ด้วย `act` ให้อัตโนมัติอยู่แล้ว (จึงไม่ต้องเขียนเองในเทสปกติ) แต่ตอนสั่ง state เปลี่ยน "ตรงๆ" เองอย่างใน `renderHook` หรือหมุน fake timer ต้องห่อ `act` เอง

กติกาเดิมยังใช้: ถ้า hook ถูกใช้ใน component เดียว test ผ่าน component ตรงๆ ดีกว่า — renderHook เหมาะกับ hook ที่เป็น library ภายใน (ใช้หลายที่ ควรมี contract ของตัวเอง)

**Timer / debounce** — test debounce 300ms ห้ามรอจริง ใช้ fake timers แล้ว**หมุนเวลาเอง**เหมือนหมุนเข็มนาฬิกาแทนการนั่งเฝ้า:

```tsx
test("debounce แล้วค่อยยิงค้นหา", async () => {
  vi.useFakeTimers();
  // ⚠️ กับดักคลาสสิก: userEvent ก็ใช้ timer ภายใน — ต้องบอกให้มัน advance ด้วยตัวเดียวกัน
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<Search onSearch={spy} />);
  await user.type(screen.getByRole("searchbox"), "abc");
  expect(spy).not.toHaveBeenCalled();          // ยังไม่ครบ 300ms — ต้องยังไม่ยิง
  act(() => vi.advanceTimersByTime(300));
  expect(spy).toHaveBeenCalledWith("abc");     // ครบแล้วยิงครั้งเดียว
  vi.useRealTimers();
});
```

ลืม `advanceTimers` ใน setup = test ค้างจน timeout เพราะ userEvent รอ timer ที่ไม่มีวันเดิน — บั๊กยอดฮิตอันดับหนึ่งของคู่ fake timers + userEvent

## ฝั่ง Angular

- **TestBed** — สร้าง Angular module จำลองสำหรับเทส: ประกาศ component ที่จะเทส + **override DI ได้** (บท 8) — นี่คือจุดที่ DI จ่ายผลตอบแทน: `TestBed.configureTestingModule({ providers: [{ provide: PriceService, useValue: fakePriceService }] })` สลับ dependency ทั้งใบโดย component ไม่รู้ตัว (โลกจำลองแบบ fake ของเล่ม backend บท 12)
- **HttpTestingController** — mock HTTP ระดับ framework: แอปยิงผ่าน `HttpClient` ปกติ เทสค่อย flush คำตอบ

```ts
it("โหลดสินค้าแล้วแสดงชื่อ", () => {
  const httpMock = TestBed.inject(HttpTestingController);
  fixture.detectChanges();                             // ngOnInit → ยิง request
  const req = httpMock.expectOne("/api/products/1");   // assert ว่ายิงจริง + จับ request ไว้
  expect(req.request.method).toBe("GET");
  req.flush({ id: 1, name: "เมาส์" });                 // ป้อนคำตอบ — ตอนนี้ Observable ค่อย emit
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain("เมาส์");
  httpMock.verify();                                   // มี request ค้างที่ไม่คาดคิด = fail
});
```

- **Component harness** (Angular CDK) — API สำหรับคุย component แบบ semantic (`await select.open()`) แทนการ query CSS class ภายใน — ปรัชญาเดียวกับ RTL: อย่าผูกกับ DOM ภายในของ Material
- **Observable** — ง่ายสุด: `firstValueFrom(service.load())` แล้ว await / ซับซ้อนเชิงเวลา (debounce, retry) ใช้ marble test เบื้องต้น: `cold("--a--b|")` วาด timeline เป็นตัวอักษรแล้วเทียบผลด้วย `expectObservable` — เล่าได้ว่ามันคือการวาดเวลาบนกระดาษแทนการรอจริง
- **Signals component** (บท 9) — เทสง่ายขึ้น: set input ผ่าน `fixture.componentRef.setInput()`, อ่าน `component.total()` ตรงๆ เป็นค่า sync ไม่ต้อง subscribe

## E2E — Playwright vs Cypress

| ประเด็น | Playwright | Cypress |
|---|---|---|
| สถาปัตยกรรม | คุม browser จาก process นอก (CDP/BiDi) | รันในเบราว์เซอร์ข้างแอป |
| Browser | Chromium, Firefox, WebKit (Safari engine) | Chromium-family, Firefox (WebKit จำกัด) |
| Multi-tab / หลาย origin / iframe | ได้ธรรมชาติ | เป็นจุดอ่อนมาแต่ไหนแต่ไร (ดีขึ้นแต่ยังมีข้อจำกัด) |
| Parallel ฟรีใน CI | ✅ built-in | ต้องพึ่ง Cypress Cloud (จ่ายเงิน) หรือ hack เอง |
| Auto-wait | ✅ ทั้งคู่ — assert แบบ retry จนจริงหรือ timeout | ✅ |
| DX | trace viewer, codegen | time-travel UI ที่คนรัก |

ธรรมเนียมตลาดปี 2026 ชัดแล้ว: **Playwright เป็น default ของโปรเจกต์ใหม่** — npm downloads แซง Cypress ตั้งแต่ปลายปี 2024 และตอนนี้ทิ้งห่างราว 5 เท่า (~30M+ ต่อสัปดาห์ vs ~6.5M) Cypress ไม่ได้แย่ — ทีมที่ใช้อยู่ไม่จำเป็นต้องย้าย แต่ถ้าเริ่มใหม่แล้วเลือก Cypress ควรมีเหตุผลเฉพาะ

สังเกตว่าปรัชญาเดินทางมาถึง E2E ด้วย: Playwright ใช้ `getByRole` เป็น locator แนะนำอันดับแรกเหมือน RTL และ assertion เป็นแบบ **web-first** — retry จนเงื่อนไขจริงหรือ timeout ไม่ใช่เช็คครั้งเดียวแล้วตัดสิน:

```ts
test("checkout flow", async ({ page }) => {
  await page.goto("/products/1");
  await page.getByRole("button", { name: "หยิบใส่ตะกร้า" }).click();
  await page.getByRole("link", { name: "ตะกร้า (1)" }).click();
  // web-first assertion: รอจน visible เอง — ไม่มี sleep ในโค้ดเลย
  await expect(page.getByRole("heading", { name: "สรุปคำสั่งซื้อ" })).toBeVisible();
});
```

## Flaky Test — สาเหตุและวิธีแก้

Flaky = ผ่านบ้างพังบ้างโดยโค้ดไม่เปลี่ยน — อันตรายกว่า test แดงตลอด เพราะมันสอนทีมให้กด rerun จนวันที่บั๊กจริงโผล่ก็กด rerun ใส่เหมือนกัน (เล่ม backend บท 12 เจอโรคเดียวกัน) สาเหตุหลักฝั่ง FE:

1. **รอแบบเดา ไม่ใช่รอแบบ deterministic** — `sleep(2000)` / `cy.wait(2000)` คือการรอเพื่อนด้วยการนับถึงสิบแทนที่จะรอจนเห็นหน้า: วันที่ CI ช้ากว่าเครื่องเรา นับครบแล้วเพื่อนยังไม่มา → แก้ด้วย assertion ที่ retry จนเงื่อนไขจริง (`findBy`, `expect(locator).toBeVisible()` ของ Playwright, `waitFor`)
2. **Test ไม่ isolate** — test A ทิ้ง state (localStorage, MSW override, ข้อมูลใน DB ของ E2E) ให้ test B → พังเฉพาะเมื่อรันบางลำดับ/parallel — แก้: reset ทุกอย่างใน `afterEach`, E2E สร้างข้อมูลของตัวเองต่อเทส
3. **E2E วิ่งผ่าน network/บริการจริง** — third-party ช้าหรือล่ม = test พังโดยไม่เกี่ยวกับโค้ดเรา → mock ขอบเขตที่เราไม่ได้คุมด้วย `page.route()` ของ Playwright หรือ MSW เหลือ network จริงเฉพาะ backend ของเราใน staging

## A11y ใน Test Suite (โยงบท 14)

สองชั้นที่ได้แทบฟรี: (1) query ด้วย `getByRole` อยู่แล้ว = ทุกเทสบังคับ semantic structure โดยไม่ต้องทำอะไรเพิ่ม (2) เติม automated scan ด้วย axe ใน component test:

```tsx
import { axe } from "vitest-axe";

test("หน้า checkout ไม่มี a11y violation ที่เครื่องจับได้", async () => {
  const { container } = renderWithProviders(<CheckoutPage />);
  expect(await axe(container)).toHaveNoViolations();
  // จำ nuance จากบท 14: axe จับได้ ~30–40% — นี่คือตาข่ายชั้นแรก ไม่ใช่ใบรับรอง
});
```

## Contract Test FE↔BE

Component test ทั้งหมด mock API ผ่าน MSW — แล้วอะไรการันตีว่า **mock ไม่โกหก**? ถ้า backend เปลี่ยน `name` เป็น `productName` ทุก test ฝั่ง FE ยังเขียวสนิท (mock เก่ายังตอบแบบเดิม) แล้วไปพังต่อหน้าผู้ใช้ — ปัญหาเดียวกับ "mock โกหก" ข้าม service ของเล่ม backend บท 12 และคำตอบก็ชุดเดียวกัน:

- **Consumer-driven contract (Pact)**: FE (consumer) ประกาศ expectation จาก test ของตัวเอง → backend (provider) รัน expectation นั้นใน CI ฝั่งเขา — เปลี่ยน API แล้ว build ฝั่ง provider แดง**ก่อน deploy**
- ทางที่เบากว่าและนิยมในทีมที่มี OpenAPI: **generate types + MSW handler จาก OpenAPI schema** — mock ที่หลุดจาก schema จะ type error ตั้งแต่ compile ไม่ต้องรออะไรพัง

## Contract-first Workflow ฝั่ง Frontend — อย่าให้ type ในจอเดา shape จากใจ backend

ฝั่ง frontend มักเป็นคนเจ็บก่อนเมื่อ contract หลุด เพราะจอพังให้ user เห็นทันที แต่ทีม FE มักมีอำนาจน้อยสุดในการคุม schema ถ้าไม่มี workflow ที่ดี สิ่งที่เกิดขึ้นประจำคือ:

- backend เปลี่ยน field name เล็กน้อยแล้ว FE พัง
- FE เขียน type เองจากตัวอย่าง JSON ใน Postman แล้วค่อย ๆ หลุดจากของจริง
- MSW handler เก่าอยู่ต่อไปแม้ API เปลี่ยนแล้ว

ทางที่นิ่งที่สุดคือ **spec เดียว → generate ทั้ง type และ mock** แทนการเขียนซ้ำด้วยมือ

ตัวอย่างถ้า backend มี OpenAPI spec:

```ts
// generated type จาก spec เดียวกัน
type CheckoutQuoteResponse = {
  subtotal: number;
  discount: number;
  total: number;
  currency: "THB";
};

async function getCheckoutQuote(body: CheckoutQuoteRequest): Promise<CheckoutQuoteResponse> {
  const res = await fetch("/api/checkout/quote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("quote failed");
  return res.json();
}
```

พอ type ออกมาจาก spec เดียวกัน FE จะไม่ได้ "ตีความ response เอง" แต่กำลังผูก UI กับสัญญาที่ทั้งสองฝั่งตกลงร่วมกันจริง

### ใช้ spec เดียวกันกับ MSW

ประโยชน์ที่ใหญ่กว่าการ generate type อย่างเดียวคือ **mock ก็ต้องอยู่ในโลกเดียวกัน**:

```ts
const quoteOk: CheckoutQuoteResponse = {
  subtotal: 1200,
  discount: 200,
  total: 1000,
  currency: "THB",
};

server.use(
  http.post("/api/checkout/quote", async () => {
    return HttpResponse.json(quoteOk);
  }),
);
```

ถ้า backend เปลี่ยน `discount` จาก number เป็น object แล้ว regenerate type ใหม่ โค้ด mock ก้อนนี้จะพังตั้งแต่ compile ไม่ต้องรอให้ E2E หรือ production บอกเรา

### FE ต้องช่วย define contract จากมุมหน้าจอ

ข้อได้เปรียบของ frontend คือรู้ว่า UI ต้องการ shape แบบไหนจึงจะใช้ง่าย เช่น หน้า checkout มักอยากได้:

- `subtotal`
- `discount`
- `total`
- `currency`

ไม่อยากได้:

- ตาราง promotion rule ทั้งก้อน
- field ภายในที่มีไว้ debug
- shape ที่ต้องยิง 3 endpoint แล้วค่อยมารวมบน client ทุกครั้ง

นี่คือเหตุผลที่ senior FE ต้องคุยเรื่อง contract ได้ ไม่ใช่แค่รับ payload มาใช้ เพราะ contract ที่ดีลดทั้ง coupling ของ UI และปริมาณ state แปลงร่างใน component

### เวลาจะเปลี่ยน response ต้องคิดแบบ expand-contract

ถ้าจำเป็นต้อง rename field:

1. backend เพิ่ม field ใหม่ก่อน
2. frontend migrate ไปใช้ field ใหม่
3. test/contract gate ต้องเขียวทั้งสองแบบในช่วงย้าย
4. ค่อยลบ field เก่าใน release ถัดไป

คำตอบที่โตแล้วไม่ใช่ "เดี๋ยว FE แก้ตาม" แต่คือ "เราจะเปลี่ยน contract โดยไม่ทำให้สองฝั่งต้อง deploy พร้อมกันยังไง"

## คำถามสัมภาษณ์ที่ต้องตอบได้

1. **"test behavior ไม่ใช่ implementation" แปลว่าอะไรในทางปฏิบัติ**
   → assert สิ่งที่ผู้ใช้เห็น (ข้อความ, element ที่ปรากฏ) ผ่าน query แบบผู้ใช้ (role/label) และ interaction จริง (userEvent) — ไม่แตะ internal state, ชื่อ method, จำนวน render ผลคือ refactor ใหญ่แล้ว test ยังเขียวถ้าพฤติกรรมไม่เปลี่ยน หลักเดียวกับ "assert ผลลัพธ์ไม่ใช่ลำดับการเรียก" ฝั่ง backend

2. **ทำไม getByRole ควรเป็น query แรก**
   → เพราะมัน query ผ่าน accessibility tree — เจอได้ก็ต่อเมื่อ element มี role และ accessible name จริง เท่ากับ test บังคับ semantic HTML ให้ฟรีทุกครั้งที่รัน ส่วน data-testid ผู้ใช้มองไม่เห็น จึงเป็นทางเลือกสุดท้าย

3. **ทำไม mock API ด้วย MSW ดีกว่า mock axios/fetch**
   → MSW ดักที่ network boundary — test ไม่รู้และไม่สนว่าแอปใช้ HTTP client อะไร refactor ชั้น data ได้โดย test ไม่แดง แถม handler ใช้ซ้ำได้ทั้ง test/dev/Storybook และเทส failure path (500, ช้า) ได้สมจริง

4. **จะกัน flaky test ยังไง**
   → สามเสา: รอแบบ deterministic (retry-assertion ไม่ใช่ sleep), isolation (reset state ทุกเทส สร้างข้อมูลของตัวเอง), และตัด dependency ที่คุมไม่ได้ (mock third-party ใน E2E) — flaky ต้อง fix หรือ quarantine ทันที ไม่งั้นทีมจะเลิกเชื่อ test ทั้ง suite

5. **TestBed กับ HttpTestingController ทำหน้าที่อะไร**
   → TestBed สร้าง module จำลอง + override DI เพื่อสลับ dependency เป็น fake ได้ทั้งใบ ส่วน HttpTestingController ดัก HttpClient: expectOne assert ว่า request ถูกยิงจริงพร้อมจับไว้ แล้ว flush ป้อนคำตอบตามจังหวะที่เทสคุม จบด้วย verify กัน request ค้าง

6. **Mock API ใน test แล้วอะไรการันตีว่า mock ตรงกับ backend จริง**
   → contract test: Pact แบบ consumer-driven ให้ provider รัน expectation ของเราใน CI ฝั่งเขา หรือเบากว่านั้นคือ generate type + handler จาก OpenAPI schema เดียวกัน — ทั้งคู่ทำให้ API เปลี่ยนแล้วพังตั้งแต่ CI ไม่ใช่ production

## สรุปท้ายบท

- test ที่ดีต้องปกป้องพฤติกรรมที่ผู้ใช้เห็น ไม่ใช่รายละเอียด implementation ที่เปลี่ยนได้ตลอด
- การเลือกขอบเขตของ test ให้เหมาะช่วยให้ feedback เร็วพอและเชื่อถือได้พอโดยไม่จ่ายต้นทุนเกินเหตุ
- tooling อย่าง Testing Library, MSW, Playwright หรือ TestBed มีค่าเพราะช่วยให้เราทดสอบที่ boundary ที่ถูกต้อง
- ถ้า architecture ชัดและ a11y ดี test จะง่ายขึ้นมาก เพราะระบบมี semantic และ state flow ที่ชัดอยู่แล้ว

## ก่อนไปบทถัดไป

จากการพิสูจน์ว่าระบบยังทำงานถูกต้อง บทถัดไปจะเพิ่มอีกชั้นที่มักถูกมองข้ามในฝั่ง frontend คือความปลอดภัย และเส้นแบ่งที่ชัดระหว่างหน้าที่ของ client กับ server
