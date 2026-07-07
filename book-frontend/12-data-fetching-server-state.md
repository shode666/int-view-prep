# บท 12 — Data Fetching & Server State: ทำไมข้อมูลจาก API ถึงไม่ควรอยู่ใน Redux เหมือน state ธรรมดา

> บั๊กเปิดเรื่อง: ทีมหนึ่งเก็บข้อมูลจาก API (Application Programming Interface) ทุกก้อนลง Redux — user เปิดหน้า order ค้างไว้ข้ามคืน กลับมากดปุ่ม refund ใส่ order ที่อีกเครื่องยกเลิกไปแล้วเมื่อ 6 ชั่วโมงก่อน เพราะ "state ใน store ยังบอกว่า order นี้ active" ทีมแก้ด้วยการเขียน `refetchOrders()` โปรยไว้ 14 จุด แล้วก็ยังหลุด — ปัญหาไม่ใช่ขยัน refetch ไม่พอ แต่คือ**เอาของยืมมาเก็บเหมือนของตัวเอง**

## เข็มทิศก่อนอ่าน

บท 7 สอนว่า state มีหลายบ้าน และบทนี้จะเจาะบ้านที่คนวางผิดบ่อยที่สุดคือ server state นี่เป็นจุดเชื่อมสำคัญระหว่าง React, Angular และ framework สมัยใหม่ทั้งหมด เพราะไม่ว่าคุณจะใช้ UI stack ไหน ปัญหาเรื่อง cache, refetch, optimistic update และ race condition ก็หน้าตาเดิม

ให้อ่านบทนี้ด้วยคำถามว่า "ใครเป็นเจ้าของความจริง" ถ้าคำตอบคือ server การจัดการข้อมูล, loading, retry และ invalidation ต้องคิดอีกแบบจาก state ที่อยู่ในมือเราเอง นี่คือแกนที่เชื่อมไปบท performance, testing และ production โดยตรง

## Server State ≠ Client State — ความเข้าใจผิดรากฐาน

ข้อมูลใน frontend มีสองสายพันธุ์ที่นิสัยต่างกันคนละขั้ว:

**Client state** คือของที่เราเป็นเจ้าของจริง — modal เปิดอยู่ไหม, tab ไหน active, ค่าที่พิมพ์ค้างในฟอร์ม — เราคือ source of truth, มันเปลี่ยนเมื่อเราสั่งเท่านั้น, synchronous ล้วน

**Server state** คือของที่**ยืมคนอื่นมา** — รายการ order, โปรไฟล์ user, ราคาสินค้า — source of truth อยู่ที่ server, มัน**เก่าได้ตลอดเวลาโดยเราไม่รู้** (คนอื่น/เครื่องอื่น/ระบบหลังบ้านแก้ได้), ต้อง fetch แบบ async, และหลายหน้าจอมักอยากใช้ก้อนเดียวกัน

Analogy: client state คือ**สมุดโน้ตส่วนตัว** — เขียนเองอ่านเอง ไม่มีวัน "ผิดจากต้นฉบับ" เพราะมันคือต้นฉบับ ส่วน server state คือ**หนังสือที่ยืมจากห้องสมุด** — ระหว่างอยู่ในมือเรา ห้องสมุดอาจพิมพ์ฉบับแก้ไขใหม่ไปแล้ว สิ่งที่เราถือคือ *snapshot ณ เวลายืม* คำถามสำคัญจึงไม่ใช่ "เก็บไว้ที่ไหน" แต่คือ "**ยอมให้เก่าได้แค่ไหน แล้วไปเอาฉบับล่าสุดมาเมื่อไหร่**"

| คุณสมบัติ | Client state | Server state |
|---|---|---|
| ใครเป็นเจ้าของ | เรา (browser tab นี้) | server |
| เก่า (stale) ได้ไหม | ไม่มีคอนเซปต์นี้ | ได้ตลอดเวลา |
| ต้อง refetch/sync | ไม่ | ต้อง — คำถามคือเมื่อไหร่ |
| การได้มา | sync, ทันที | async, พลาดได้, ช้าได้ |
| แชร์ข้ามหน้าจอ | นานๆ ที | เป็นปกติ (order โผล่ทั้ง list และ detail) |
| ต้องมี loading/error state | ไม่ | เสมอ |
| เครื่องมือที่เหมาะ | useState/signal/Zustand/URL (บท 7) | TanStack Query / SWR / resource API |

พอเอา server state ยัด Redux/useState เราต้องประดิษฐ์เองทั้งหมด: cache, การรู้ว่าเก่า, refetch, dedup, loading/error ต่อก้อน — คือเขียน query library แบบบ้านๆ ที่มีบั๊กครบกว่า นี่คือเหตุผลที่เอกสาร Redux เองยังชี้ไปที่ RTK Query สำหรับงานนี้

## TanStack Query / SWR ทำอะไรให้จริง

ทั้งคู่ไม่ใช่ "ตัว fetch" — fetch ยังเป็นหน้าที่เรา มันคือ **async state manager**: จัดการวงจรชีวิตของของที่ยืมมา สี่กลไกหลัก:

1. **Cache by query key** — ผลลัพธ์ถูกเก็บใต้ key เช่น `['orders', {status:'paid'}]` — component ไหนขอ key เดียวกันได้ของจาก cache ทันที ไม่ยิงซ้ำ
2. **Stale-while-revalidate** — ชื่อ library SWR ก็มาจาก pattern นี้ตรงๆ: เสิร์ฟของเก่าจาก cache *ทันที* (หน้าไม่ว่าง) แล้ว refetch เบื้องหลัง พอของใหม่มาค่อยสลับ — คือกลไกเดียวกับที่ backend ใช้กัน cache stampede (เล่ม backend บท 21 ข้อ 28) ย้ายมาอยู่ใน browser: user ได้ของ stale แป๊บเดียว ดีกว่ารอ spinner
3. **Dedup in-flight requests** — 5 component ขอ key เดียวกันพร้อมกัน = ยิง network 1 ครั้ง ที่เหลือรอ promise เดียวกัน — นี่คือ single-flight ฝั่ง client (ญาติกับ mutex ต่อ key ของ backend)
4. **Background refetch + retry** — refetch อัตโนมัติตอน window focus/reconnect/ตาม interval และ retry พร้อม exponential backoff เมื่อพลาด

```tsx
// TanStack Query v5 — สังเกต: signature เป็น object เดียว, สถานะเริ่มต้นชื่อ isPending
import { useQuery, keepPreviousData } from '@tanstack/react-query';

function OrderList({ filters }: { filters: OrderFilters }) {
  const { data, isPending, isFetching, isError, error, refetch } = useQuery({
    // query key = identity ของข้อมูล — filter ทุกตัวที่มีผลต่อผลลัพธ์ต้องอยู่ใน key
    // filters เปลี่ยน → key เปลี่ยน → ถือเป็น "ข้อมูลคนละก้อน" → fetch ใหม่/หา cache ใหม่ให้เอง
    queryKey: ['orders', 'list', filters],
    queryFn: ({ signal }) => fetchOrders(filters, { signal }), // signal = AbortController (ดูหัวข้อ race)
    staleTime: 30_000,        // 30 วิแรกถือว่าสด — mount ซ้ำไม่ refetch
    placeholderData: keepPreviousData, // เปลี่ยน filter แล้วโชว์ผลชุดเก่าไว้ก่อน ไม่วูบเป็น spinner
  });

  if (isPending) return <ListSkeleton />;          // ยังไม่เคยมีข้อมูลเลย
  if (isError)   return <ErrorState error={error} onRetry={refetch} />;
  if (data.items.length === 0) return <EmptyState filters={filters} />;
  return <Table rows={data.items} refreshing={isFetching} />; // refetch เบื้องหลัง = indicator บางๆ พอ
}
```

**Query key design คือหัวใจ** — คิดเหมือน cache key ของ backend: ต้องหุ้ม *ทุก* พารามิเตอร์ที่เปลี่ยนผลลัพธ์ ลืมใส่ `filters` ใน key = เปลี่ยน filter แล้วได้ข้อมูลเก่าของ filter ก่อนหน้าจาก cache (บั๊กคลาสสิก) โครงแนะนำเป็นลำดับชั้น `['orders']` → `['orders','list',filters]` → `['orders','detail',id]` เพื่อให้ invalidate ได้เป็นแผง: `invalidateQueries({ queryKey: ['orders'] })` ล้างทั้งตระกูล

เรื่องชื่อ flag ใน v5 ที่สัมภาษณ์ชอบจี้: `status` เริ่มต้นคือ `'pending'` (ยังไม่มี data ใน cache), `isFetching` = มี request วิ่งอยู่ (รวม background refetch), และ `isLoading` ปัจจุบันคือ derived flag = `isPending && isFetching` (โหลดครั้งแรกจริงๆ) — แยกสามตัวนี้ได้คือสัญญาณว่าเข้าใจว่า cache กับ network เป็นคนละแกนกัน

**Trade-off / ใช้ผิดพังยังไง**: `staleTime` ต่ำเกิน = refetch ถี่จน backend ร้อง (โดยเฉพาะ `refetchOnWindowFocus` ค่า default เปิด — สลับ tab ทียิงทั้งหน้า), สูงเกิน = user เห็นของเก่านานกว่าที่ธุรกิจรับได้ · เอา TanStack Query ไปเก็บ client state (modal open) = ผิดฝั่ง เครื่องมือนี้ออกแบบมาให้ของ "หายได้ ถูกเก็บกวาดทิ้งเมื่อไม่มีใครใช้ได้ ถูกทับด้วยของใหม่ได้" · mutate แล้วลืม invalidate = หน้าอื่นที่แชร์ key ค้างของเก่า

**แนวตอบ senior**: "ผมแยกก่อนว่าเป็น server state หรือ client state — server state คือ cache ของของที่คนอื่นเป็นเจ้าของ ผมให้ query library ดูแลวงจร stale/refetch/dedup ด้วย query key ที่หุ้มพารามิเตอร์ครบ ส่วน Redux/useState เหลือไว้ให้ state ที่เราเป็น source of truth จริงๆ ซึ่งเหลือนิดเดียว"

## ฝั่ง Angular — คนละหน้าตา ปัญหาเดียวกัน

ท่าดั้งเดิม: service + RxJS `shareReplay` ทำหน้าที่ cache + dedup แบบมือ:

```ts
@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  // shareReplay(1): subscriber ทุกคนแชร์ HTTP call เดียว + คนมาทีหลังได้ค่าล่าสุดทันที
  readonly orders$ = this.http.get<Order[]>('/api/orders').pipe(
    shareReplay({ bufferSize: 1, refCount: true }), // refCount: ไม่มีใครฟังแล้วปล่อย — กัน cache ค้างชั่วนิรันดร์
  );
}
```

ได้ dedup กับ replay แต่*ไม่มี* staleness, ไม่มี background refetch, ไม่มี retry policy ต่อ query — ต้องประกอบเอง ปี 2026 มีทางที่ตรงกว่า: **resource API ตระกูล `resource()`/`rxResource()`/`httpResource()`** (`httpResource` เริ่ม experimental ใน v19.2 แล้วเป็น stable ใน v22 — ตรวจ changelog รุ่นที่ใช้ก่อน) — `httpResource` เป็น wrapper บน HttpClient คืนสถานะเป็น signals (บท 9) และ reactive ตาม params:

```ts
export class OrderListComponent {
  filters = signal<OrderFilters>({ status: 'paid' });
  // filters เปลี่ยน → URL เปลี่ยน → ยกเลิก request เก่า + ยิงใหม่ให้เอง (กัน race ในตัว)
  orders = httpResource<Order[]>(() => `/api/orders?${toParams(this.filters())}`);
  // template: @if (orders.isLoading()) ... @else { orders.value() } / orders.error()
}
```

ข้อจำกัดที่ต้องพูดในสัมภาษณ์: resource ตระกูลนี้ออกแบบเพื่อ **read** — เอกสารบอกตรงๆ ว่า mutation (POST/PUT) ให้ใช้ HttpClient ตรง และมันยังไม่ใช่ query cache เต็มรูป (ไม่มี cache ข้าม component ด้วย key, ไม่มี SWR) ใครอยากได้ครบชุดใช้ **TanStack Query for Angular** ได้ — adapter อยู่บน signals แต่ ณ กลางปี 2026 ยังแพ็กเกจชื่อ `@tanstack/angular-query-experimental` (API ครบ ใช้ production ได้ แต่ทีมยังสงวนสิทธิ์ขยับ API ก่อนประกาศ stable)

## Optimistic Update — อัปเดตก่อน ขอโทษทีหลัง

สถานการณ์: ปุ่ม like — ถ้ารอ server ตอบค่อยเปลี่ยน UI จะหน่วง 300ms ทุกคลิก ท่า optimistic คือ**อัปเดต UI ทันทีโดยเชื่อว่าจะสำเร็จ แล้วเตรียมทาง rollback ถ้าพลาด** — ใจเดียวกับ compensation ใน saga (เล่ม backend บท 11): ไม่มี rollback อัตโนมัติข้ามระบบ เราต้องจด "ของเดิม" ไว้เองเพื่อชดเชย

```tsx
const queryClient = useQueryClient();

const likeMutation = useMutation({
  mutationFn: (postId: string) => api.likePost(postId),

  onMutate: async (postId) => {
    // 1) หยุด refetch ที่กำลังวิ่ง — กันของจริง(เก่า)มาทับของ optimistic กลางคัน
    await queryClient.cancelQueries({ queryKey: ['post', postId] });
    // 2) จด snapshot ของเดิม = "compensation log" ของเรา
    const previous = queryClient.getQueryData<Post>(['post', postId]);
    // 3) เขียน cache ทับด้วยผลที่คาดหวัง — UI ทุกจุดที่ subscribe key นี้เด้งทันที
    queryClient.setQueryData<Post>(['post', postId], (old) =>
      old && { ...old, liked: true, likeCount: old.likeCount + 1 });
    return { previous }; // ส่งเข้า context ให้ onError ใช้
  },

  onError: (_err, postId, context) => {
    // fail → ชดเชย: คืนค่าเดิมจาก snapshot (user เห็นหัวใจดับกลับ — ถูกต้องแล้ว อย่าโกหก)
    queryClient.setQueryData(['post', postId], context?.previous);
    toast.error('ไลก์ไม่สำเร็จ ลองใหม่อีกครั้ง');
  },

  onSettled: (_data, _err, postId) => {
    // สำเร็จหรือพลาดก็ตาม — ทวนกับ server เสมอ ให้ server เป็นผู้ตัดสินสุดท้าย
    queryClient.invalidateQueries({ queryKey: ['post', postId] });
  },
});
```

**ใช้เมื่อไหร่**: โอกาสสำเร็จสูง + ผลเห็นชัด + ย้อนได้ไม่เจ็บ (like, toggle, rename) **อย่าใช้กับ**การจ่ายเงิน/ยืนยัน order — บอก user ว่า "จ่ายแล้ว" แล้วถอนคำพูด คือฝันร้าย UX เทียบเท่า saga ที่ compensate เงินคืนไม่ได้ · กับดักอีกจุด: ลืม `cancelQueries` แล้ว background refetch ที่ออกตัวก่อน mutation กลับมาพร้อมค่าเก่า — ทับ optimistic ของเราหน้าตาเฉย

**แนวตอบ senior**: "Optimistic update คือสัญญาว่าเรามีแผนชดเชย — ผมทำสามจังหวะ: cancel in-flight, snapshot ของเดิม, เขียนค่าคาดหวัง แล้ว onError คืน snapshot, onSettled invalidate ให้ server ตัดสินเสมอ และเลือกใช้เฉพาะ action ที่ rollback แล้ว user ไม่เจ็บ"

## Race Condition ใน Search Box — ปัญหาเดียว สามภาษา

เคสเต็ม: user พิมพ์ "iph" → request A ออก → พิมพ์ต่อ "iphone" → request B ออก → **A ช้ากว่า B** (network ไม่การันตีลำดับ) → ผล "iph" มาถึงทีหลังแล้ว `setResults()` ทับผล "iphone" — user เห็นผลลัพธ์ไม่ตรงกับช่องค้นหา บั๊กนี้ reproduce ยากเพราะขึ้นกับจังหวะ network — โจทย์สัมภาษณ์ senior FE ยอดฮิต

หลักแก้มีหลักเดียว: **คำตอบที่ถูกยอมรับได้ต้องเป็นของคำถามล่าสุดเท่านั้น** — เหมือนเคาน์เตอร์ที่ลูกค้าเปลี่ยนออเดอร์: ตะโกนออเดอร์ใหม่ทับ ครัวต้องทิ้งจานของออเดอร์เก่าแม้ทำเสร็จช้ากว่า สามเครื่องมือคือสามวิธี "ทิ้งจานเก่า":

**ทางที่ 1 — AbortController (fetch เปล่า)**: ยกเลิกคำถามเก่าเชิงรุก

```ts
let controller: AbortController | null = null;

async function search(term: string) {
  controller?.abort();                    // ฆ่า request ก่อนหน้าที่ยังวิ่งอยู่
  controller = new AbortController();
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
      signal: controller.signal,          // ผูกชะตา request กับ controller ตัวนี้
    });
    render(await res.json());             // มาถึงบรรทัดนี้ = ไม่ถูก abort = เป็นของ term ล่าสุดแน่
  } catch (e) {
    if ((e as Error).name === 'AbortError') return; // ถูกยกเลิก — เงียบไว้ ไม่ใช่ error จริง
    throw e;
  }
}
```

**ทางที่ 2 — switchMap (RxJS/Angular)**: ความหมายของ operator ตรงโจทย์เป๊ะ — "สลับไป observable ใหม่ แล้ว **unsubscribe ตัวเก่าทิ้ง**" (สี่ flattening operators — บท 10):

```ts
results$ = this.searchTerm$.pipe(
  debounceTime(300),                      // รอนิ้วหยุด — ลดจำนวนคำถาม (คนละหน้าที่กับกัน race)
  distinctUntilChanged(),
  switchMap((term) => this.api.search(term)), // term ใหม่มา = ทิ้ง request เก่าอัตโนมัติ
);
// ถ้าเผลอใช้ mergeMap = ทุก request รอด แข่งกันเข้าเส้นชัย → race กลับมา
```

**ทางที่ 3 — Query key (TanStack Query)**: ไม่ต้องเขียนอะไรเลย — `queryKey: ['search', term]` ทำให้ term ใหม่คือ "ข้อมูลคนละก้อน" UI ผูกกับ key ล่าสุดเสมอ ผลของ key เก่าที่มาช้าก็ลง cache ช่องเก่าไป ไม่มีสิทธิ์ทับ (และ library ส่ง `signal` ให้ queryFn เพื่อ abort จริงด้วย)

จุดที่ทำให้คำตอบเป็น senior: ชี้ว่า **สามท่านี้คือ solution เดียวกันในสามสำเนียง** — ผูกคำตอบเข้ากับ identity ของคำถาม แล้วทิ้งคำตอบที่ identity ไม่ตรงปัจจุบัน และแยกให้ออกว่า debounce คือ "ลดจำนวน request" ไม่ใช่ตัวกัน race — debounce อย่างเดียวยังโดน race ได้ถ้าสอง request หลุดออกไปแล้ว

## Pagination ฝั่ง FE

ทฤษฎี offset vs cursor จบไปแล้วที่เล่ม backend บท 7 — สรุปหนึ่งบรรทัด: offset อ่านแล้วทิ้ง+แถวเลื่อนระหว่างหน้า, cursor (keyset) ชี้ตำแหน่งด้วยค่าของแถวสุดท้ายจึงนิ่งและเร็ว ฝั่ง FE สิ่งที่เพิ่มคือ**ผลกระทบต่อ UX**: ตารางแบบกดเลขหน้า (admin UI) → offset พออยู่ / feed เลื่อนไม่รู้จบที่ข้อมูล insert หัวตารางตลอด → ต้อง cursor ไม่งั้นเจอรายการซ้ำ/หายตอนเปลี่ยนหน้า (แถวเลื่อนใต้เท้า)

```tsx
const q = useInfiniteQuery({
  queryKey: ['feed'],
  queryFn: ({ pageParam, signal }) => api.feed({ cursor: pageParam, signal }),
  initialPageParam: null as string | null,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined, // undefined = สุดทางแล้ว
});
// q.data.pages = อาร์เรย์ของทุกหน้า — flatMap ก่อน render
// เลื่อนใกล้ก้นจอ (IntersectionObserver) → q.fetchNextPage()
```

Infinite scroll มีค่าผ่อนที่คนลืม: DOM โตไม่หยุด — โหลดไป 50 หน้า = หลายพัน node, memory บวม, scroll หน่วง ทางออกคือจับคู่กับ **virtualization** (render เฉพาะแถวที่อยู่ในจอ — กลไกเต็มๆ บท 13): infinite query ดูแล "มีข้อมูลกี่แถว" ส่วน virtualizer ดูแล "วาดกี่แถว" — สองเรื่องนี้ orthogonal กันและควรใช้คู่กันเมื่อ list ยาวจริง

## Retry ฝั่ง FE — ควร Retry อะไร

หลักเดียวกับ backend (เล่ม backend บท 10) แต่ย้ำในบริบท client: **retry เฉพาะความผิดพลาดชั่วคราว** — network error, timeout, 5xx, 429 (อ่าน `Retry-After` ด้วย) ส่วน **4xx ห้าม retry**: 400/422 คือ request ผิดเอง ส่งซ้ำก็ผิดซ้ำ, 401 คือหน้าที่ของ token refresh (หัวข้อถัดไป) ไม่ใช่ retry, 403/404 retry ไปก็เท่านั้น

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const s = (error as HttpError).status;
        if (s >= 400 && s < 500 && s !== 429) return false; // client error — ยิงซ้ำไร้ประโยชน์
        return failureCount < 3;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000), // exponential backoff
    },
  },
});
```

และประโยคที่เชื่อมสองเล่มเข้าด้วยกัน: query (GET) retry ได้สบายใจเพราะ idempotent โดยธรรมชาติ แต่ **mutation retry ได้ก็ต่อเมื่อ backend รองรับ idempotency key** (เล่ม backend บท 11) — FE คือฝ่ายที่*สร้างและถือ* key นั้น: สร้าง UUID (Universally Unique Identifier) ตอน user กดปุ่ม (หนึ่งความตั้งใจ = หนึ่ง key), retry อัตโนมัติแนบ key เดิม, user กดใหม่โดยตั้งใจ = key ใหม่ — ไม่มีท่านี้ retry ตอน network ขาดหลัง server ทำงานสำเร็จ = จ่ายเงินซ้ำ

## Token หมดอายุกลางคัน — Interceptor + Single-flight Refresh

Flow ที่ต้องเล่าได้ครบ: access token (เช่น JWT — JSON Web Token) อายุสั้น หมดกลางการใช้งาน → request โดน 401 → interceptor ไม่โยน error ใส่ user แต่ (1) เรียก refresh token แลก access token ใหม่ (2) ยิง request เดิมซ้ำด้วย token ใหม่ — user ไม่รู้ตัวเลยว่ามีอะไรเกิดขึ้น

**กับดักที่แยก junior/senior**: หน้าหนึ่งยิง 5 request พร้อมกัน → หมดอายุพร้อมกัน → 401 ห้าตัว → **refresh ห้าตัวแข่งกัน** — ถ้า backend หมุน refresh token ทุกครั้งที่ใช้ (rotation) ตัวที่มาช้าจะถือ token ตาย โดนมองเป็น token reuse attack → session หลุดทั้งยวง นี่คือ **stampede ย่อส่วน** (เล่ม backend บท 21 ข้อ 28) และยาก็ตัวเดียวกัน: **single-flight** — คนแรกได้สิทธิ์ refresh คนที่เหลือเข้าคิวรอผลตัวเดียวกัน

```ts
let refreshPromise: Promise<string> | null = null;

async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(input, withToken(init, tokenStore.access));
  if (res.status !== 401) return res;

  // single-flight: มีคน refresh อยู่แล้ว → รอ promise เดิม ห้ามเปิด flight ใหม่
  refreshPromise ??= refreshAccessToken().finally(() => { refreshPromise = null; });

  try {
    const newToken = await refreshPromise;          // ทุก request ที่โดน 401 มารอที่นี่ร่วมกัน
    return fetch(input, withToken(init, newToken)); // replay request เดิมด้วย token ใหม่
  } catch {
    logout();                                       // refresh เองก็ตาย = session จบจริง — เด้ง login
    throw new SessionExpiredError();
  }
}
```

รายละเอียดที่ควรพูดต่อได้: replay ต้องระวัง body ที่เป็น stream (อ่านได้ครั้งเดียว — ต้อง clone/สร้างใหม่) · ฝั่ง Angular ท่าเดียวกันเขียนเป็น `HttpInterceptorFn` + แชร์ refresh observable ตัวเดียว (`shareReplay(1)` ทำหน้าที่ single-flight ให้) · ที่เก็บ token ปลอดภัยแค่ไหน — ยกไปบท 16

## Upload ไฟล์ใหญ่

ไฟล์ 2GB อย่าลากผ่าน backend ตัวเอง — เปลือง bandwidth/memory ของ server ที่ควรไว้ทำงานจริง ท่ามาตรฐาน: **presigned URL** — backend เซ็น URL อายุสั้นที่อนุญาตให้ PUT ตรงเข้า object storage (S3 และญาติ) → browser อัปโหลดตรง → เสร็จแล้วแจ้ง backend ยืนยัน ไฟล์ใหญ่จริงยกระดับเป็น **chunk upload**: หั่นด้วย `file.slice(start, end)` เป็นก้อน (เช่น 8MB) อัปทีละก้อน/ขนานกันจำกัดจำนวน — ได้สามอย่างฟรี: **progress** จริง (นับก้อนที่จบ หรือ `xhr.upload.onprogress` ต่อก้อน — fetch ยังไม่ให้ upload progress ตรงๆ), **retry เฉพาะก้อนที่พลาด** (ไม่ต้องเริ่มใหม่ทั้ง 2GB — ก้อน = หน่วย idempotent ตามธรรมชาติ: อัปก้อน 37 ซ้ำผลเท่าเดิม), และ **resume** (ถามว่า server มีก้อนไหนแล้ว ส่งต่อจากตรงนั้น — เจตนาเดียวกับ S3 multipart upload / โปรโตคอล tus) — สังเกตว่านี่คือ retry + idempotency + checkpoint ของเล่ม backend มาโผล่ในงาน UI ชิ้นเดียว

## Loading / Error / Empty — สถานะเป็น First-class

"loading" ไม่ใช่สถานะเดียว — จับยัด spinner ก้อนเดียวคือ UX มักง่าย:

| สถานะ | ความหมาย | UX ที่เหมาะ |
|---|---|---|
| initial load (`isPending`) | ยังไม่เคยมีข้อมูล | skeleton ตามโครงจริง (กัน layout กระโดด/CLS — บท 13) |
| background refetch (`isFetching`) | มีของเก่าโชว์อยู่ กำลังทวนของใหม่ | indicator บางๆ มุมจอ — **อย่า**เอา spinner ทับของที่โชว์อยู่ |
| pending mutation | user เพิ่งสั่ง action | disable ปุ่ม + spinner ในปุ่ม (กันกดซ้ำ = กันยิงซ้ำที่ต้นทาง) |
| error | พลาดจริงหลัง retry หมด | บอกว่าอะไรพัง + ปุ่ม retry — ไม่ใช่หน้าขาว |
| empty | สำเร็จแต่ไม่มีข้อมูล | **ไม่ใช่ error!** — บอกว่าทำไมว่าง + ชวนทำ action ต่อ ("ยังไม่มี order — สร้างเลย?") |

Empty state ที่ดีคือจุดที่ product sense ของ senior โผล่: "ไม่พบผลลัพธ์ของ filter นี้ — ล้าง filter?" มีค่ากว่า div ว่างๆ มหาศาล และ error กับ empty ต้องออกแบบตั้งแต่ design ไม่ใช่เขียน happy path เสร็จแล้วค่อยนึกได้

## คำถามสัมภาษณ์ที่ต้องตอบได้

1. **ทำไมไม่ควรเก็บข้อมูลจาก API ใน Redux/useState ตรงๆ?** → เพราะมันคือ server state — ของยืมที่ stale ได้ตลอด ต้องการวงจร cache/refetch/dedup/invalidate ซึ่ง store ธรรมดาไม่มี เก็บเองคือเขียน query library เวอร์ชันบั๊กเยอะ — ใช้ TanStack Query/SWR/resource API แล้วเหลือ client state จริงๆ ให้ store นิดเดียว

2. **stale-while-revalidate คืออะไร ทำไมดีต่อ UX?** → เสิร์ฟของเก่าจาก cache ทันทีแล้ว refetch เบื้องหลัง ค่อยสลับเมื่อของใหม่มา — user ไม่เจอจอว่าง ได้ perceived speed โดยแลกกับ staleness สั้นๆ เป็น pattern เดียวกับที่ backend ใช้กัน cache stampede แค่ย้ายมาฝั่ง browser

3. **อธิบาย optimistic update และการ rollback** → สามจังหวะใน onMutate: cancel query ที่วิ่งอยู่ (กันของเก่ามาทับ), snapshot ค่าเดิม, เขียน cache เป็นค่าคาดหวัง — onError คืน snapshot (คือ compensation), onSettled invalidate ให้ server เป็นผู้ตัดสินสุดท้าย ใช้กับ action ที่ย้อนได้ไม่เจ็บเท่านั้น

4. **Search box พิมพ์เร็วแล้วผลเก่าทับผลใหม่ — เกิดจากอะไร แก้ยังไง?** → network ไม่การันตีลำดับ response — request เก่ากลับมาช้ากว่าแล้วทับ state หลักแก้คือยอมรับเฉพาะคำตอบของคำถามล่าสุด: AbortController ยกเลิกตัวเก่า / switchMap unsubscribe ตัวเก่า / query key ผูกผลกับ term — สามท่านี้คือ solution เดียวกันสามสำเนียง และ debounce ช่วยลด request แต่ไม่ได้กัน race

5. **FE ควร retry request แบบไหน และเงื่อนไขของการ retry mutation?** → retry เฉพาะ transient: network/timeout/5xx/429 พร้อม exponential backoff — 4xx ไม่ retry เพราะส่งซ้ำก็ผิดซ้ำ (401 เป็นงานของ token refresh) ส่วน mutation จะ retry ได้ต่อเมื่อแนบ idempotency key ที่ FE สร้างต่อหนึ่งความตั้งใจ ไม่งั้นเสี่ยงงานซ้ำเช่นจ่ายเงินสองรอบ

6. **ออกแบบ token refresh ยังไงไม่ให้พังตอนหลาย request โดน 401 พร้อมกัน?** → interceptor จับ 401 → single-flight refresh: เก็บ promise ของ refresh ไว้ตัวเดียว ทุก request ที่โดน 401 มารอ promise เดียวกันแล้ว replay ด้วย token ใหม่ — ปล่อยให้ refresh แข่งกันเจอ refresh token rotation จะโดนมองเป็น token reuse แล้ว session หลุดทั้งยวง เป็น stampede ย่อส่วนที่ยาแก้ตัวเดียวกับฝั่ง backend

## สรุปท้ายบท

- server state มีธรรมชาติไม่เหมือน client state เพราะเราไม่ได้เป็นเจ้าของความจริงของข้อมูลนั้น
- ปัญหาอย่าง stale data, race condition, retry, cache invalidation และ optimistic update จึงต้องใช้ model ที่ต่างจาก `useState` หรือ store ทั่วไป
- query library หรือกลไกของ framework มีค่าเพราะมันทำงานโครงสร้างเหล่านี้แทนเราอย่างเป็นระบบ
- พอมองข้อมูลจาก server ให้ถูกบ้าน การออกแบบ UI, performance และ testing จะนิ่งขึ้นพร้อมกัน

## ก่อนไปบทถัดไป

เมื่อข้อมูลเริ่มไหลเข้าระบบอย่างเป็นระบบแล้ว บทถัดไปจะถามต่อว่าแอปที่ถูกต้องแล้วยังเร็วพอหรือไม่ และ performance ควรถูกวัดกับแก้ไขด้วยกรอบคิดแบบไหน
