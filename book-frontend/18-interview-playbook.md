# บท 18 — Interview Playbook: เอาของ 17 บทออกมาใช้ใต้แรงกดต่อหน้ากรรมการ

> บทสุดท้ายไม่มีทฤษฎีใหม่ — มีแต่การเอาของ 17 บทออกมาใช้ใต้แรงกด: machine coding 45–60 นาทีต่อหน้ากรรมการ, behavioral ฉบับ frontend, คำถามถามกลับ, และแผนซ้อม เกมนี้เหมือนสอบใบขับขี่ภาคปฏิบัติ: ขับเป็นอยู่แล้วไม่พอ ต้องขับให้กรรมการ**เห็น**ว่าเป็น — เปิดไฟเลี้ยวเสียงดังๆ มองกระจกให้เห็นว่ามอง

## เข็มทิศก่อนอ่าน

ถ้าบท 17 คือการประกอบภาพใหญ่ บทนี้คือการเปลี่ยนภาพใหญ่นั้นให้กลายเป็นพฤติกรรมที่ผู้สัมภาษณ์มองเห็น หลายคนมีความรู้ครบแต่คะแนนไม่ออก เพราะตอบอยู่ในหัว ไม่ได้จัดลำดับการสื่อสารให้คู่สนทนาเห็นว่าคิดเป็นระบบ

ให้อ่านบทนี้แบบแผนซ้อม ไม่ใช่แบบอ่านผ่าน ๆ ทุก checklist, ตัวอย่างคำตอบ และ machine coding drill ควรทำหน้าที่เป็นสะพานเชื่อมกลับไปยังบทก่อนหน้า เพื่อให้เวลาถูกกดดัน คุณยังดึง mental model เดิมออกมาใช้ได้ทันที

## Machine Coding — เกณฑ์ที่กรรมการดูจริง

โจทย์ machine coding (สร้าง component/feature เล็กๆ ให้เสร็จในเวลาจำกัด) ไม่ได้วัดว่าเสร็จไหม — โจทย์ถูกออกแบบให้ "เสร็จ 100%" ยากอยู่แล้ว สิ่งที่กรรมการถือ checklist ดูจริงคือหกข้อนี้ และ "ดี" ของแต่ละข้อหน้าตาแบบนี้:

1. **แยก component ถูกขนาด** — ดี: แยกตามความรับผิดชอบ (SearchInput / ResultList / ResultItem) ไม่ใช่ไฟล์เดียว 200 บรรทัด และไม่ใช่แตกละเอียดยิบ 10 ไฟล์สำหรับโจทย์ 45 นาที — ขนาดที่พออธิบายได้ว่า "ทำไมตัดตรงนี้" คือขนาดที่ถูก
2. **State วางถูกบ้าน** (บท 7) — ดี: state อยู่ต่ำที่สุดเท่าที่ใช้งานได้, derived value คำนวณเอาไม่เก็บซ้ำ (เก็บ `items` + `filter` แล้วคำนวณ `visibleItems` — ไม่เก็บ `visibleItems` เป็น state ที่สาม), ไม่มี useEffect ไล่ sync state ชนกันเอง
3. **Loading / error / empty ครบ** — ดี: สามสถานะนี้โผล่ในโค้ด**โดยไม่ต้องถูกทวง** — กรรมการหลายคนถือเป็นด่านตัดสิน senior เพราะมันสะท้อนว่าเคยเขียนของที่ user ใช้จริง — และ "empty" ต้องแยกจาก "ยังไม่ค้น" (ผลลัพธ์ศูนย์รายการ ≠ ยังไม่เริ่ม)
4. **Type ดี** (บท 3) — ดี: type สื่อเจตนา ไม่ใช่แค่ผ่าน compiler — discriminated union ทำให้สถานะเป็นไปไม่ได้เขียนไม่ได้เลย (`status: 'success'` แล้วไม่มี `data` — compiler จับ) ไม่มี `any` ที่ไม่ได้แถลงเหตุผล
5. **Edge case** — ดี: พูดถึงเองก่อนโดนถาม: กดซ้ำเร็วๆ, response กลับมาสลับลำดับ, query ว่าง, unmount ระหว่าง fetch — ไม่ต้องกันครบทุกอันในโค้ด แต่ต้อง**เอ่ยถึง**และเลือกกันอันที่สำคัญ
6. **ไม่ over-engineer** — ดี: ไม่ลาก Redux/Zustand มาใส่โจทย์ component เดียว ไม่ memo ทุกบรรทัด (บท 6) ไม่ abstract เผื่ออนาคตที่โจทย์ไม่ได้ขอ — ประโยคทอง: "ตอนนี้ useState พอ ถ้า scale เป็น X ผมค่อยย้ายไป Y"

## เฉลยข้อ 1 — Debounced Search Autocomplete (React)

โจทย์ machine coding ที่ออกบ่อยที่สุดในตำแหน่ง senior frontend — เพราะมันบังคับให้ชนทั้ง async, race condition, state modeling ในโจทย์เดียว (สถาปัตยกรรมภาพใหญ่อยู่บท 17 เคส 2 — ที่นี่คือโค้ดจริง)

```tsx
import { useEffect, useRef, useState } from 'react';

// ---------- 1) useDebounce: หน่วงค่า ไม่ใช่หน่วงฟังก์ชัน ----------
function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t); // ค่าใหม่มาก่อนครบเวลา → ยกเลิกตัวเก่า
  }, [value, delayMs]);
  return debounced;
}

// ---------- 2) State model: discriminated union — สถานะผิดเขียนไม่ได้ ----------
type SearchState =
  | { status: 'idle' }                          // ยังไม่พิมพ์ — ต่างจาก empty!
  | { status: 'loading' }
  | { status: 'empty' }                         // ค้นแล้วไม่เจอ
  | { status: 'success'; results: Product[] }
  | { status: 'error'; message: string };

export function SearchAutocomplete() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const [activeIndex, setActiveIndex] = useState(-1);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.trim() === '') { setState({ status: 'idle' }); return; }
    const controller = new AbortController();      // request ใหม่ → ฆ่าตัวเก่า
    setState({ status: 'loading' });
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((results: Product[]) =>
        setState(results.length ? { status: 'success', results } : { status: 'empty' }))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return; // ตั้งใจยกเลิก — ไม่ใช่ error
        setState({ status: 'error', message: 'ค้นหาไม่สำเร็จ ลองใหม่อีกครั้ง' });
      });
    return () => controller.abort(); // query เปลี่ยน/unmount → ยกเลิก request ค้าง
  }, [debouncedQuery]);

  const results = state.status === 'success' ? state.results : [];
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && activeIndex >= 0) selectProduct(results[activeIndex]);
    else if (e.key === 'Escape') setState({ status: 'idle' });
  };

  return (
    <div>
      <input role="combobox" aria-expanded={state.status === 'success'}
        aria-controls="search-listbox" aria-activedescendant={activeIndex >= 0 ? `opt-${activeIndex}` : undefined}
        value={query} onKeyDown={onKeyDown}
        onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); }} />
      {state.status === 'loading' && <p role="status">กำลังค้นหา…</p>}
      {state.status === 'empty' && <p>ไม่พบ "{debouncedQuery}"</p>}
      {state.status === 'error' && <p role="alert">{state.message}</p>}
      {state.status === 'success' && (
        <ul id="search-listbox" role="listbox">
          {state.results.map((p, i) => (
            <li key={p.id} id={`opt-${i}`} role="option" aria-selected={i === activeIndex}
              onMouseDown={() => selectProduct(p)}>
              <Highlight text={p.name} query={debouncedQuery} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

การตัดสินใจที่ต้องอธิบายออกเสียงระหว่างเขียน (นี่คือคะแนนจริง):

- **Debounce "ค่า" ไม่ใช่ "ฟังก์ชัน"** — ใน React การ debounce ฟังก์ชันชนกับ re-render (ฟังก์ชันถูกสร้างใหม่ทุกรอบ — บท 2, 6) การ debounce ค่าแล้วให้ effect วิ่งตามค่า debounced สะอาดกว่าและเทสง่ายกว่า
- **AbortController ใน cleanup ของ effect** — จุดนี้ฆ่าสองนกในดอกเดียว: race condition (พิมพ์ "iph"→"iphone" แล้วผล "iph" กลับมาทีหลังทับ) และ setState หลัง unmount — และต้องแยก `AbortError` ออกจาก error จริง ไม่งั้นทุกครั้งที่พิมพ์เร็วจะเห็น error กะพริบ
- **`idle` แยกจาก `empty`** — "ยังไม่ค้น" กับ "ค้นแล้วไม่เจอ" คือคนละประสบการณ์ — union type บังคับให้คิดเรื่องนี้ตั้งแต่ตอนประกาศ type
- **`onMouseDown` ไม่ใช่ `onClick`** ที่ตัวเลือก — click ยิงหลัง blur ของ input ถ้า dropdown ปิดตอน blur จะกดไม่ติด (edge case ที่เอ่ยถึงแล้วกรรมการยิ้ม)
- **Highlight เป็น component แยกที่ split ข้อความ** — ไม่ใช้ `dangerouslySetInnerHTML` เด็ดขาด (บท 16)

## เฉลยข้อ 2 — Custom Hooks: useFetch / useLocalStorage

โจทย์วัดว่าออกแบบ **API ให้คนอื่นใช้** เป็นไหม — hook ที่ดีคือ hook ที่ผู้ใช้เดา signature ได้โดยไม่เปิด docs

```tsx
// ---------- useFetch: คืน union ก้อนเดียว ไม่ใช่ boolean สามตัว ----------
type FetchState<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: undefined; error: Error };

function useFetch<T>(url: string): FetchState<T> & { refetch: () => void } {
  const [state, setState] = useState<FetchState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);      // เพิ่มเลข = บังคับ effect วิ่งใหม่

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });               // url เปลี่ยน → กลับ loading เสมอ
    fetch(url, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: T) => setState({ status: 'success', data }))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setState({ status: 'error', error: e instanceof Error ? e : new Error(String(e)) });
      });
    return () => controller.abort();               // กัน race ตอน url เปลี่ยนเร็วๆ
  }, [url, attempt]);

  return { ...state, refetch: () => setAttempt((n) => n + 1) };
}
```

ทำไมออกแบบแบบนี้: (1) คืน **union ไม่ใช่ `{data, loading, error}` หลวมๆ** — แบบหลวมมี 8 combination ที่เป็นไปได้ แต่ valid จริงแค่ 3 ผู้ใช้ต้องเดาเองว่า `loading && error` แปลว่าอะไร (2) **refetch ผ่าน state counter** ไม่ใช่เรียกฟังก์ชัน fetch ตรง — ให้ logic ทั้งหมดอยู่ใน effect ที่เดียว cancel/cleanup ทำงานครบทุกเส้นทาง (3) ปิดท้ายด้วยประโยคกันข้อครหา: "ของจริง production ผมใช้ TanStack Query (บท 12) — hook นี้คือการโชว์ว่าเข้าใจกลไกข้างในของมัน"

```tsx
// ---------- useLocalStorage: สัญญาเดียวกับ useState ----------
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {           // lazy init: อ่าน storage ครั้งเดียว
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initialValue;
    } catch { return initialValue; }                       // JSON พัง/ถูก block → ไม่ crash
  });

  const set = (next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = next instanceof Function ? next(prev) : next;
      try { localStorage.setItem(key, JSON.stringify(resolved)); } catch { /* quota เต็ม/private mode */ }
      return resolved;
    });
  };
  return [value, set] as const;
}
```

จุดขาย: **signature เหมือน `useState` ทุกประการ** (รวม updater function) — ผู้ใช้ย้ายจาก useState มาได้โดยแก้บรรทัดเดียว, lazy initializer กันอ่าน storage ทุก render, และ try/catch สองจุดเพราะ localStorage ล้มได้จริง (Safari private mode, quota, ค่าที่คนอื่นเขียนไว้ไม่ใช่ JSON) — edge case ที่เอ่ยเพิ่มถ้ามีเวลา: sync ข้ามแท็บด้วย `storage` event

## เฉลยข้อ 3 — Modal Component (a11y ครบ)

โจทย์นี้คือข้อสอบ accessibility ในคราบโจทย์ UI — checklist เต็มมาจากบท 14 ตรงๆ

```tsx
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type ModalProps = { open: boolean; onClose: () => void; title: string; children: React.ReactNode };

export function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement; // จำคนเปิดไว้
    dialogRef.current?.focus();                                 // ย้าย focus เข้า modal
    document.body.style.overflow = 'hidden';                    // ล็อก scroll ฉากหลัง
    return () => {
      document.body.style.overflow = '';
      openerRef.current?.focus();                               // คืน focus ให้คนเปิด — จุดที่คนลืมบ่อยสุด
    };
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key !== 'Tab') return;
    // focus trap: Tab วนอยู่ใน modal — ไม่หลุดไปหน้าหลัง
    const focusables = dialogRef.current!.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusables.length === 0) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  if (!open) return null;
  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)' }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="modal-title"
        tabIndex={-1} onKeyDown={onKeyDown} onClick={(e) => e.stopPropagation()}>
        <h2 id="modal-title">{title}</h2>
        {children}
        <button onClick={onClose} aria-label="ปิดหน้าต่าง">×</button>
      </div>
    </div>,
    document.body
  );
}
```

หกอย่างที่ต้องพูดออกเสียงว่า "ทำไม": (1) **portal** — หนี stacking context / `overflow: hidden` ของ parent (บท 5) (2) **focus เข้าตอนเปิด + คืนตอนปิด** — คนใช้คีย์บอร์ด/screen reader ไม่งั้นหลงอยู่หลังฉาก (3) **focus trap** — Tab วนใน modal (4) **Esc ปิด** (5) `role="dialog"` + `aria-modal` + `aria-labelledby` — screen reader ประกาศว่าเข้า dialog ชื่ออะไร (6) คลิก backdrop ปิดแต่ `stopPropagation` ที่เนื้อ modal ถ้าเหลือเวลา บอกว่าของจริงใช้ `<dialog>` element ที่ได้ trap + Esc ฟรี — แต่เขียนมือให้ดูเพราะโจทย์วัดความเข้าใจ

## เฉลยข้อ 4 — Angular Search ด้วย RxJS + Reactive Form

ฝั่ง Angular โจทย์เดียวกับข้อ 1 แต่ตัววัดคือ **เลือก operator ถูก** (บท 10, 11)

```typescript
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, AsyncPipe],
  template: `
    <input [formControl]="searchCtrl" role="combobox" aria-label="ค้นหาสินค้า" />
    @if (vm$ | async; as vm) {
      @switch (vm.status) {
        @case ('loading') { <p role="status">กำลังค้นหา…</p> }
        @case ('error')   { <p role="alert">ค้นหาไม่สำเร็จ</p> }
        @case ('empty')   { <p>ไม่พบผลลัพธ์</p> }
        @case ('success') { <ul>@for (p of vm.results; track p.id) { <li>{{ p.name }}</li> }</ul> }
      }
    }
  `,
})
export class SearchComponent {
  private api = inject(SearchApiService);
  searchCtrl = new FormControl('', { nonNullable: true });

  vm$: Observable<SearchVm> = this.searchCtrl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),                    // "iphone" → ลบ → พิมพ์ "iphone" เดิม ไม่ยิงซ้ำ
    switchMap((q) => {                         // ← หัวใจ: ยกเลิก request เก่าอัตโนมัติ
      if (!q.trim()) return of<SearchVm>({ status: 'idle' });
      return this.api.search(q).pipe(
        map((results): SearchVm =>
          results.length ? { status: 'success', results } : { status: 'empty' }),
        startWith<SearchVm>({ status: 'loading' }),
        catchError(() => of<SearchVm>({ status: 'error' })), // ← ต้องอยู่ "ใน" switchMap!
      );
    }),
  );
}
```

สามจุดที่กรรมการ Angular จ้องเป็นพิเศษ: (1) **`switchMap` ไม่ใช่ `mergeMap`** — switch ยกเลิก inner observable เก่าทันทีที่ค่าใหม่มา = แก้ race condition ในตัว (บท 10: mergeMap คือบั๊ก autocomplete สำเร็จรูป) (2) **`catchError` อยู่ใน inner pipe** — ถ้าวางที่ outer stream error หนึ่งครั้งจะฆ่า stream ทั้งเส้น พิมพ์ต่อไม่มีอะไรเกิดขึ้นอีกเลย — บั๊กที่เงียบที่สุดใน Angular (3) **`async` pipe จัดการ subscribe/unsubscribe ให้** — ไม่มี subscription รั่ว (บท 10) และ `startWith` ทำสถานะ loading ต่อรอบค้นหาโดยไม่ต้องมี state แยก

## โจทย์ที่เหลือ — จุดที่กรรมการดูต่อข้อ

| โจทย์ | กรรมการดูอะไร |
|---|---|
| Todo list + filter | derived state (filter คำนวณเอา ไม่เก็บ list ที่สอง), key ตอน render list, การแยก TodoItem |
| Tabs | ARIA tabs pattern (`role="tablist"`, ลูกศรสลับ tab), state = activeId เดียว, lazy render เนื้อหา tab |
| Carousel | setInterval + cleanup (memory leak trap — บท 17), pause on hover/focus, ปุ่มมี aria-label |
| Virtualized list | คำนวณ visible window จาก scrollTop + item height, spacer เก็บความสูงรวม — วัดความเข้าใจบท 13 ไม่ใช่ท่องสูตร |
| Kanban drag & drop | state model (columns → item ids — normalize!), optimistic move + rollback เมื่อ API พัง (บท 12) |
| Star rating | keyboard (ลูกศร + Enter), hover ≠ selected (สอง state), form integration |
| Stopwatch / countdown | ห้ามเชื่อ setInterval สะสมเวลา (drift) — เก็บ startTime แล้วคำนวณ diff, cleanup ตอน unmount |
| Infinite scroll | IntersectionObserver ไม่ใช่ scroll event, กันยิงซ้ำระหว่าง loading, จุดจบ list |
| File tree | recursive component, expand state เป็น `Set<id>` ไม่ใช่ flag ในตัว node data |
| Form wizard หลาย step | state ทุก step อยู่ที่ parent (ไม่หายตอนย้อน), validate ต่อ step, submit ครั้งเดียวตอนจบ |

## พฤติกรรมระหว่างทำ — คะแนนที่ไม่อยู่ในโค้ด

- **Clarify ก่อนพิมพ์** (2–3 นาทีแรก): "ผลลัพธ์ต้อง paginate ไหม / ใช้ library ได้ไหม / เน้น a11y หรือ feature ครบ" — คำถามเหล่านี้คือสัญญาณ senior ตั้งแต่ยังไม่มีโค้ดสักบรรทัด
- **คิดดังๆ ตลอดเวลา** — กรรมการให้คะแนนวิธีคิด ไม่ใช่ความเงียบที่จบด้วยโค้ดถูก ติดตรงไหนพูดตรงนั้น: "ตรงนี้มี race ได้ ผมจะใช้ AbortController" — การพูดถึงปัญหาก่อนเจอมีค่ากว่าแก้มันเงียบๆ
- **เทสเอง ไม่รอถูกจับ** — เขียนเสร็จหนึ่งก้อน ลองเคสปกติ + เคสขอบทันที (query ว่าง, กดเร็วๆ) เจอบั๊กเองแล้วแก้ = บวก, ให้กรรมการชี้ = ลบ
- **บอก trade-off ของทางที่เลือก** — "ผม inline style เพื่อประหยัดเวลา ของจริงใช้ระบบของทีม" / "ผมยังไม่ virtualize เพราะโจทย์ 20 รายการ — เกินพันเมื่อไหร่ค่อยทำ" — การรู้ว่าตัวเองตัดอะไรทิ้งคือหัวใจของความ senior
- **หมดเวลาแบบมืออาชีพ** — เหลือ 5 นาทีให้หยุดเพิ่ม feature แล้วสรุป: อะไรเสร็จ อะไรยัง ถ้ามีเวลาต่อจะทำอะไรตามลำดับไหน

## Behavioral ฉบับ Frontend

โครง STAR เต็มและกติกา ("ผม" ไม่ใช่ "เรา", มีตัวเลขใน Result, จบด้วยสิ่งที่ทำต่างไป) อยู่เล่ม backend บท 17 และ template story bank อยู่เล่ม backend บท 19 — ที่นี่เติมเฉพาะสามสถานการณ์ที่สนาม FE เจอบ่อย พร้อมโครงตอบย่อ:

**"เคย mentor junior ที่เขียน component มีปัญหาไหม"** — S: junior เขียนหน้า list ที่ re-render ทั้งหน้าทุก keystroke T: สอนโดยไม่ทำให้เสียกำลังใจ A: ไม่แก้ให้ — นั่ง profile ด้วยกันใน React DevTools ให้**เขาเห็นเอง**ว่า state วางสูงเกิน แล้วให้เขาย้ายเองโดยผมตั้งคำถามนำ R: หน้าเร็วขึ้นวัดได้ + เขากลายเป็นคน review เรื่อง state placement ให้คนอื่นต่อ — บทเรียน: สอนวิธีเห็น ไม่ใช่ให้คำตอบ

**"Design system ชนกับความต้องการ product ทำยังไง"** — S: product ขอปุ่มหน้าตาพิเศษเฉพาะ campaign ซึ่งไม่มีใน design system T: ไม่อยากเปิดประตู one-off ที่จะพัง consistency ทั้งระบบ A: คุยหา**เจตนา**เบื้องหลัง (อยากให้เด่นขึ้น ไม่ใช่อยากได้ hex สีนั้น) เสนอ variant ใหม่เข้า system อย่างถูกกระบวนการแทน override เฉพาะจุด R: campaign ได้ของทัน + system ได้ variant ที่ทีมอื่นใช้ต่อ — บทเรียน: design system คือสัญญา ไม่ใช่คุก แต่แก้สัญญาต้องแก้ที่ตัวสัญญา

**"เคยไม่เห็นด้วยกับ tech lead ไหม"** — S: lead จะ rewrite หน้า legacy เป็น framework ใหม่ทั้งก้อน ผมเห็นว่าเสี่ยงเกิน T: ค้านด้วยข้อมูล ไม่ใช่ความรู้สึก A: ทำ POC (Proof of Concept) เล็กๆ + ตัวเลข bundle/effort เทียบ strangler fig ทีละหน้า (เล่ม backend บท 14) เสนอในที่ประชุมแบบให้เขาตัดสินใจ ไม่ใช่ประจาน R: ได้ทาง migrate ทีละหน้า ship คุณค่าระหว่างทางได้ — และถ้าเขายืนยันทางเดิม ผม commit เต็มที่ (disagree and commit)

## คำถามถามกลับ — 10 ข้อที่ฉลาด

ช่วงท้ายสัมภาษณ์กรรมการมักถามว่า "มีอะไรอยากถามเราไหม" — คนส่วนใหญ่ตอบ "ไม่มีครับ" ซึ่งเป็นการทิ้งแต้มฟรี เพราะจังหวะนี้คือรอบที่ **คุณกำลังสัมภาษณ์บริษัทกลับ** และคำถามที่ถามเผยว่าคุณคิดแบบ senior แค่ไหนโดยไม่ต้องอวดตัวเอง คำถามที่ดีทำ 3 อย่างพร้อมกัน: (1) โชว์ว่าคุณคิดเป็นระบบ (2) ขุดข้อมูลจริงเพื่อตัดสินใจว่าที่นี่น่าอยู่ไหม (3) จับ red flag ก่อนเซ็นรับงาน

แต่ละข้อข้างล่างบอกครบว่า **ถามไปวัดอะไร · คำตอบที่ดีฟังแล้วเป็นยังไง · ได้ยินแบบไหนคือธงแดง** — เพื่อให้คุณไม่ใช่แค่ท่องคำถาม แต่ฟังคำตอบเป็น

**1. "Frontend deploy บ่อยแค่ไหน แล้ว rollback ครั้งล่าสุดเกิดอะไรขึ้น"**
วัด maturity ของ CI/CD จากเหตุการณ์จริง ไม่ใช่คำโฆษณา — เพราะถ้ามีระบบ deploy ที่ดีจริง เขาจะเล่า rollback ครั้งล่าสุดได้ลื่น
*คำตอบที่ดี:* "deploy หลายครั้งต่อวันผ่าน pipeline อัตโนมัติ, rollback ล่าสุดตอนเจอ chunk error หลัง deploy — เราปิด feature flag แล้ว deploy ย้อนภายใน 5 นาที"
*ธงแดง:* อึกอักตอบไม่ได้ หรือ "deploy อาทิตย์ละครั้ง ต้องรอ QA กด manual, rollback ไม่ค่อยได้ทำ" = ไม่มีระบบจริง คุณจะเจ็บทุกครั้งที่ปล่อยของ

**2. "มี performance budget หรือ Core Web Vitals target ไหม ใครเป็นเจ้าของตัวเลข"**
วัดว่าที่นี่คิดเรื่อง performance เป็นระบบ (proactive) หรือค่อยดูตอนมันช้าแล้ว (reactive) และมีคนรับผิดชอบตัวเลขจริงไหม
*คำตอบที่ดี:* "มี budget LCP ต่ำกว่า 2.5 วินาที, มี CI gate เช็ค bundle size ทุก PR, ทีม platform เป็นเจ้าของ dashboard CWV"
*ธงแดง:* "ไม่มี target ชัด แล้วแต่คนทำ" หรือ "performance ค่อยดูตอนลูกค้าบ่น" = ไม่มีใครเป็นเจ้าภาพ ปัญหาจะสะสมเงียบ ๆ

**3. "Design system อยู่ stage ไหน แล้วทีม product ปฏิบัติกับมันยังไง"**
คำถามเดียวได้สองคำตอบ — ทั้ง tech maturity (มี design system จริงหรือแค่ component library) และการเมืองระหว่างทีม (product เคารพ system หรือสั่ง override เอาแต่ใจ)
*คำตอบที่ดี:* "มี design system ที่ product กับ eng ใช้ร่วมกัน มี process เพิ่ม variant, ปุ่ม one-off ต้องผ่าน review เข้า system"
*ธงแดง:* "มี component library แต่แต่ละทีม copy ไปแก้เอง" หรือ "product ขออะไรก็ override ให้" = consistency พังทั้งระบบ คุณจะใช้เวลาไปกับการดีลของซ้ำ

**4. "เทสหน้าตาเป็นไง ratio ประมาณไหน แล้วทีมเชื่อ test suite แค่ไหน"**
คำว่า "เชื่อ" คือกับดักที่ตั้งใจวาง — ที่ที่ test flaky คนจะหน้าเปลี่ยนหรือหัวเราะแห้งทันทีตอนได้ยินคำนี้
*คำตอบที่ดี:* "unit เยอะ integration กลาง E2E คุมเฉพาะเส้นเงิน, คนเชื่อพอที่จะ deploy เมื่อ test เขียว"
*ธงแดง:* "test เยอะแต่ flaky หลายคนเลย skip" หรือ "เขียนไว้แต่ไม่ค่อย maintain" = test suite ไม่มีคุณค่าจริง สุดท้ายทุกคนเทสด้วยมือ

**5. "Tech debt ฝั่ง FE ก้อนใหญ่สุดตอนนี้คืออะไร มีแผนจัดการยังไง"**
ทุกที่มี debt — สิ่งที่วัดคือเขา *รู้ตัว* และ *มีแผน* ไหม และคุณจะได้รู้ว่ากำลังจะเซ็นรับปัญหาอะไรถ้าเข้าไปทำ
*คำตอบที่ดี:* "ก้อนใหญ่คือ legacy AngularJS ที่กำลัง migrate ทีละหน้าด้วย strangler fig มี timeline ชัด"
*ธงแดง:* "ไม่ค่อยมี debt เท่าไหร่" (โกหกหรือไม่รู้ตัว — อันตรายทั้งคู่) หรือ "เยอะมากแต่ไม่มีเวลาแก้" = คุณจะจมไปกับมันโดยไม่มีทางออก

**6. "Junior ถึง senior ที่นี่ต่างกันตรงไหน มีเส้นทางโตยังไง"**
โชว์ว่าคุณมองยาว + วัดว่าที่นี่นิยาม senior ด้วยอะไร — ด้วย *impact/ownership* หรือแค่ *จำนวนปี*
*คำตอบที่ดี:* "senior วัดที่ impact และการ own ปัญหาข้ามทีม มี career ladder ชัด มี mentor คอยดัน"
*ธงแดง:* "อยู่ครบ 3 ปีก็ขึ้น senior" = นิยามด้วยเวลาไม่ใช่ความสามารถ หรือตอบไม่ได้ = ไม่มีเส้นทางโตจริง

**7. "Incident ฝั่ง FE ล่าสุดคืออะไร แล้วหลังจากนั้นเปลี่ยนอะไรไปบ้าง"**
วัดวัฒนธรรม postmortem — องค์กรที่ดีเรียนรู้จาก incident อย่างเป็นระบบ (blameless)
*คำตอบที่ดี:* เล่า incident จริงได้ + บอกสิ่งที่เปลี่ยนหลังจากนั้น (เพิ่ม monitoring, ปรับ process) โดยไม่โทษตัวบุคคล
*ธงแดง:* "ไม่ค่อยมี incident นะ" = ธงแดงชัดสุด (ทุกที่มี incident แค่เขาไม่ยอมรับหรือไม่เรียนรู้) หรือคำตอบที่โทษว่า "คนนั้นทำพัง" แทนที่จะมองระบบ

**8. "ทีม FE มีเสียงในการออกแบบ API ไหม หรือรับ contract ที่ backend กำหนดมาอย่างเดียว"**
คำถามที่คนเคยเจ็บจาก API contract แย่ ๆ เท่านั้นที่จะถาม — และมันเผย power dynamic ระหว่างทีม
*คำตอบที่ดี:* "FE ร่วมออกแบบ contract ตั้งแต่ต้น มี BFF หรือคุยกับ backend เรื่อง shape ที่หน้าจอต้องใช้"
*ธงแดง:* "backend ออกแบบ API มาให้ FE เอาไปใช้" = FE เป็นแค่คนประกอบปลายทาง คุณจะเสียเวลาไปกับการดัด data ที่ไม่ตรง shape ตลอด

**9. "การตัดสินใจ technical ใหญ่ ๆ เกิดขึ้นยังไง — ใครตัดสิน ด้วยข้อมูลอะไร"**
วัดว่า engineer มีส่วนร่วมในการตัดสินใจหรือรอรับคำสั่ง — เป็นตัวชี้วัดความสุขระยะยาวที่แม่นที่สุดตัวหนึ่ง
*คำตอบที่ดี:* "มี RFC/ADR เขียนก่อนตัดสินใจใหญ่ ๆ, ตัดสินด้วยข้อมูล/POC, engineer ทุกระดับเสนอได้"
*ธงแดง:* "architect หรือ lead ตัดสินคนเดียว" หรือ "เจ้านายสั่งมา" = top-down คุณจะเป็นแค่มือที่ทำตาม ไม่ได้คิด

**10. "อะไรทำให้คนที่เคยทำตำแหน่งนี้ไม่รอด"**
คำถามกลับด้านที่บังคับให้กรรมการนึกถึง *คนจริงที่ล้มเหลวจริง* → ได้คำตอบตรงกว่าถาม "งานนี้ต้องการอะไร" มาก
*คำตอบที่ดี:* คำตอบเจาะจง "คนที่รอรับงานอย่างเดียวไม่ proactive สื่อสาร มักไม่รอด" — แปลว่าเขารู้ว่าอะไรสำคัญจริง และคุณรู้ว่าต้องระวังอะไร
*ธงแดง:* "ไม่มีใครไม่รอดหรอก" (เลี่ยง ไม่จริงใจ) หรือตอบกว้าง ๆ ลอย ๆ = อาจไม่เคยคิด หรือไม่อยากให้คุณเห็นความจริง

เลือกถาม 3–4 ข้อตามเวลาที่เหลือ — และฟังคำตอบจริงๆ เพราะนี่คือข้อมูลตัดสินใจของคุณ ไม่ใช่พิธีกรรม

## Checklist ก่อนเข้าห้อง + แผนซ้อม 4 สัปดาห์

**คืนก่อนสัมภาษณ์** — ไม่อ่านของใหม่ ทวนของที่มี: (1) เล่าเรื่อง STAR หลักได้ 3 เรื่องแบบไม่ติดขัด (2) เขียน autocomplete จากกระดาษเปล่าได้ใน 25 นาที (3) เดิน framework 10 ขั้น (บท 17) ปากเปล่าได้ (4) มีคำถามถามกลับ 4 ข้อที่เลือกแล้ว (5) เช็คอุปกรณ์/environment ถ้าสัมภาษณ์ remote — editor ที่คุ้นมือ ไม่ใช่มาหัดใช้ CoderPad ในห้อง

| สัปดาห์ | โฟกัส | ทำอะไร |
|---|---|---|
| 1 | รากฐาน (บท 1–5) | event loop, closure, this ตอบปากเปล่า · debounce/throttle เขียนสด · CSS specificity/layout ทวนด้วยการอธิบายให้คนอื่นฟัง |
| 2 | Framework หลัก (บท 6–11) | React: rendering + hooks + state placement / Angular: CD + RxJS operators — เขียนโจทย์เฉลย 4 ข้อของบทนี้จากกระดาษเปล่า จับเวลา |
| 3 | Cross-cutting (บท 12–16) | data fetching + race, CWV, a11y modal, XSS/token — เอาโจทย์จากตาราง "โจทย์ที่เหลือ" มาทำวันละข้อ |
| 4 | สนามจริง (บท 17–18) | mock interview 2–3 รอบ (อัดวิดีโอดูตัวเอง — เจ็บแต่ได้ผลสุด), เดินเคส system design 3 เคสปากเปล่า, ขัดเรื่อง STAR + intro pitch |

กติกาการซ้อมที่สำคัญกว่าตาราง: **ซ้อมแบบที่จะถูกวัด** — ตอบออกเสียง เขียนโค้ดโดยไม่มี autocomplete ช่วย จับเวลาจริง เพราะความรู้ที่ดึงออกมาใต้แรงกดไม่ได้ คือความรู้ที่ยังไม่พร้อมใช้ในห้อง

## ปิดเล่ม — แต้มต่อของคนที่มาจาก Backend

คุณอาจเดินเข้าห้องสัมภาษณ์ frontend ด้วยความรู้สึกว่ากำลังแข่งในสนามเยือน — มุมมองนั้นผิด และเล่มนี้ทั้งเล่มพยายามพิสูจน์ว่ามันผิด: ปัญหาที่ยากที่สุดของ frontend ยุคนี้คือปัญหาที่คุณ**ชำนาญกว่า**คนที่โตมาฝั่ง frontend อย่างเดียว

ดูรายการนี้: race condition ใน autocomplete คือ concurrency, retry + backoff ของ SSE คือ resilience pattern (เล่ม backend บท 10), duplicate submit จบที่ idempotency key (เล่ม backend บท 11), breaking change ของ design system คือ expand–contract (เล่ม backend บท 14), การเถียงเรื่อง BFF คือการออกแบบ contract (เล่ม backend บท 6), memory leak ไล่ด้วย heap snapshot วิธีเดียวกับ JVM (เล่ม backend บท 22) — frontend สมัยใหม่คือ distributed system ที่ node หนึ่งบังเอิญเป็น browser และคุณเรียนวิชา distributed system มาแล้วทั้งเล่ม

สิ่งที่เล่มนี้เติมให้คือครึ่งที่ขาด: browser คือ runtime ที่คุณไม่ได้คุม, user คือ input ที่ไม่มี schema, และทุก state ที่ลืมออกแบบคือหน้าจอที่มีคนเห็นจริง เมื่อสองครึ่งประกบกัน คุณไม่ใช่ "backend dev ที่พอเขียน frontend ได้" — คุณคือคนที่มองเห็นระบบ**ทั้งเส้น** ตั้งแต่ pixel ที่ user แตะ จนถึง row ที่ database เขียน และเห็นว่าปัญหาที่หน้าตาต่างกันสองฝั่งคือปัญหาเดียวกันใส่เสื้อคนละตัว

ในห้องสัมภาษณ์ อย่าซ่อนพื้นเพ — ใช้มัน: ตอบ system design แล้วลากเส้นไปถึง API contract, ตอบ duplicate submit แล้วพูดถึงฝั่ง server ที่ต้องรองรับ, ตอบ micro frontend ด้วยบทเรียนจาก microservice นั่นแหละคือคำตอบที่ผู้สมัครสาย frontend-only ให้ไม่ได้ — และคือเหตุผลที่เขาควรเลือกคุณ

โชคดีในห้องสัมภาษณ์ — คุณพร้อมกว่าที่คุณคิด

## สรุปท้ายบท

- ความรู้ที่ใช้ได้ในห้องสัมภาษณ์ไม่ใช่ความรู้ที่อ่านจบ แต่คือความรู้ที่จัดลำดับและสื่อสารออกมาได้ภายใต้เวลาและแรงกด
- machine coding, behavioral และ system design ใช้กล้ามเนื้อเดียวกันคือการทำให้เหตุผล, trade-off และลำดับความคิดของเรามองเห็นได้
- การซ้อมที่มีคุณภาพต้องใกล้เคียงกับวิธีถูกวัดจริง ทั้งการตอบออกเสียง การจับเวลา และการเขียนโค้ดโดยไม่มีตัวช่วยเกินจริง
- จุดแข็งของคนที่มาจาก backend ไม่ได้ต้องซ่อน แต่ต้องแปลให้เห็นชัดว่ามันช่วยยกระดับการออกแบบ frontend อย่างไร

## บทส่งท้าย

จากบท 1 ถึงบท 18 เล่มนี้พยายามสร้างภาพเดียวกันซ้ำ ๆ ว่า frontend ระดับ senior ไม่ใช่การจำ framework ให้เยอะขึ้น แต่คือการมองเห็นระบบทั้งเส้น ตั้งแต่ runtime, rendering, state, data, quality ไปจนถึงการคุย trade-off กับคนอื่นให้เข้าใจตรงกัน

ถ้าอ่านแล้วกลับไปเจอโค้ดจริง สิ่งที่ควรเหลือไม่ใช่แค่คำตอบสัมภาษณ์ แต่คือชุดคำถามที่ดีขึ้น: ตอนนี้อะไรเป็น source of truth, ต้นทุนจริงอยู่ตรงไหน, boundary ไหนควรถือความรับผิดชอบ, และเรารู้ได้อย่างไรว่าของที่ทำอยู่ยังถูกต้อง ปลอดภัย และเร็วพอ คำถามพวกนี้ต่างหากที่ทำให้คนอ่านเล่มนี้เก่งขึ้นต่อได้เองหลังปิดหนังสือ
