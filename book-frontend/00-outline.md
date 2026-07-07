# คู่มือ Senior Frontend Developer — ฉบับเข้าใจเบื้องหลัง

> คู่เล่มกับ "คู่มือ Software Design" (backend) — เล่มนี้ตอบคำถามเดียวกันในอีกโลก: **เบื้องหลัง framework คืออะไร, ทำไมมันออกแบบมาแบบนั้น, พังยังไง, และ senior ตอบยังไงให้เห็นความลึก** — ไม่ใช่หนังสือท่องคำตอบ แต่เป็นการสร้างรากที่ทำให้ตอบคำถามที่ไม่เคยเห็นได้

## หลักการเขียนของเล่มนี้

ทุกหัวข้อเดินโครงเดียวกัน:

1. **ปัญหา/สถานการณ์จริง** — บั๊กหรือคำถามที่เจอหน้างานจริง
2. **กลไกเบื้องหลังทีละขั้น** — ทำไมถึงเป็นแบบนั้น ไม่ใช่แค่ว่าเป็นอะไร
3. **โค้ดจริง** — before/after พร้อม comment ชี้จุด
4. **Trade-off + ใช้ผิดพังแบบไหน**
5. **แนวตอบ senior** — 1–3 ประโยคที่พูดได้จริงในห้องสัมภาษณ์

ศัพท์/ตัวย่อทุกตัวนิยาม ณ จุดแรกที่ใช้ · อ้างข้ามเล่มด้วย "(เล่ม backend บท N)"

## สารบัญ

### Part 1 — ภาษาและ Runtime (บท 1–3)

| บท | ชื่อ | เนื้อหาหลัก |
|---|---|---|
| 1 | JavaScript Runtime & Async | event loop เต็มกลไก, microtask/macrotask, Promise ข้างใน, async/await, Promise combinators |
| 2 | JavaScript Language Mechanics | closure, this, prototype chain, hoisting/TDZ, copy ตื้น-ลึก, coercion, debounce/throttle |
| 3 | TypeScript เป็นเครื่องมือ Design | type = สัญญา, generic, discriminated union, narrowing, utility types, ขอบระบบ + zod |

### Part 2 — Browser (บท 4–5)

| บท | ชื่อ | เนื้อหาหลัก |
|---|---|---|
| 4 | Browser Rendering Pipeline | DOM/CSSOM → layout → paint → composite, reflow/repaint, layout shift, frame budget |
| 5 | CSS Architecture & Design System | specificity, stacking context, flexbox/grid, สาย styling + trade-off, design token, theme |

### Part 3 — React (บท 6–7)

| บท | ชื่อ | เนื้อหาหลัก |
|---|---|---|
| 6 | React Rendering Model | reconciliation, กติกา re-render, hooks ทุกตัว, memo คุ้มเมื่อไหร่, Suspense, Server Components |
| 7 | React Architecture & State Placement | state 4 บ้าน (local/global/URL/server), context pitfalls, custom hooks, component patterns, forms |

### Part 4 — Angular (บท 8–11)

| บท | ชื่อ | เนื้อหาหลัก |
|---|---|---|
| 8 | Angular Component Model & DI | dependency injection + provider scope, component/directive/pipe, lifecycle, standalone |
| 9 | Change Detection & Signals | zone.js, Default vs OnPush, signals/computed/effect, zoneless |
| 10 | RxJS | observable model, hot/cold, Subjects, สี่ flattening operators, leaks, error handling |
| 11 | Angular Forms & Routing | reactive forms + validators ครบสูตร, guards, lazy loading, route design |

### Part 5 — ข้าม Framework (บท 12–18)

| บท | ชื่อ | เนื้อหาหลัก |
|---|---|---|
| 12 | Data Fetching & Server State | server state ≠ client state, query cache, optimistic update, race condition, token refresh |
| 13 | Web Performance | Core Web Vitals (LCP/INP/CLS), bundle diet, virtualization, measure-first |
| 14 | Accessibility | semantic HTML ก่อน ARIA, keyboard/focus, modal ครบสูตร, การเทส |
| 15 | Frontend Testing | test พฤติกรรมไม่ใช่ implementation, MSW, TestBed, E2E, flaky, contract test |
| 16 | Frontend Security | XSS/CSRF/CSP, token storage, sanitization, supply chain, "FE ไม่ใช่ security boundary" |
| 17 | Frontend System Design & Production | framework ตอบ + เคสจริง 3 เคส, production scenarios, rollout/rollback |
| 18 | Interview Playbook | machine coding + เฉลย drill สำคัญ, behavioral ฉบับ FE, คำถามถามกลับ, checklist |

## ไฟล์ประกอบ

- ต้นทาง requirement: `senior-frontend-interview-guide.md` (ชุดคำถามที่เล่มนี้ตอบเบื้องหลังให้ครบ)
- เล่มคู่กัน: [`../book-backend/00-outline.md`](../book-backend/00-outline.md) — Software Design ฝั่ง backend (บทที่เป็น general ใช้ร่วมสองสาย: 1–5 หลักคิด/coupling/SOLID/architecture, 12 testing, 17–19 behavioral/system design/story bank)
