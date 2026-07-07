# บท 10 — RxJS: คิดเป็น Stream ให้เป็น ก่อนจะจำ operator

> RxJS (Reactive Extensions for JavaScript) คือ library ที่ Angular ใช้เป็นกระดูกสันหลังของงาน async ทั้งหมด — HTTP (HyperText Transfer Protocol) client, router events, form valueChanges ล้วนคืนค่าเป็น Observable ทั้งสิ้น สัมภาษณ์ senior Angular แทบทุกรอบจะมีคำถาม RxJS อย่างน้อยหนึ่งชุด และคำถามที่แยก junior ออกจาก senior ไม่ใช่ "operator นี้ทำอะไร" แต่คือ "ทำไมโค้ดนี้ยิง HTTP สองครั้ง" กับ "ทำไม search พังหลัง error แรก"
>
> เวอร์ชันที่ใช้อ้างอิง: RxJS 7.8.x (stable ปัจจุบัน — v8 ยังเป็น alpha รอ TC39 Observable standard นิ่งก่อน) คู่กับ Angular สมัยใหม่ (v16+)

## เข็มทิศก่อนอ่าน

บทนี้ต่อจากบท 1 และบท 9 โดยตรง: บท 1 ให้รากเรื่อง async ของ JavaScript ส่วนบท 9 ให้ภาพว่า Angular รู้ได้อย่างไรว่าต้องวาดใหม่ RxJS คือเครื่องมือที่นั่งอยู่ตรงกลางระหว่าง "ข้อมูลไหลเข้ามาเรื่อย ๆ" กับ "UI ต้องตอบสนองต่อการไหลนั้นอย่างมีวินัย"

ให้อ่านโดยยึดแนวคิด stream ก่อน operator เสมอ ถ้ามองไม่เห็นว่า source เริ่มเมื่อไร, ใคร subscribe, unsubscribe ตอนไหน และ error/completion เดินทางอย่างไร การจำชื่อ operator เพิ่มอีกสิบตัวก็ช่วยอะไรไม่ได้

## 10.1 Observable คืออะไรเชิงกลไก — lazy push collection

**สถานการณ์จริง:** dev ย้ายจาก backend มาเขียน Angular วันแรก เขียน `this.http.get('/api/users')` แล้วงงว่าทำไม network tab ว่างเปล่า — ไม่มี request ยิงออกไปเลย ทั้งที่โค้ดรันผ่านบรรทัดนั้นแล้วแน่ๆ

คำตอบอยู่ที่นิยาม: **Observable คือ lazy push collection of multiple values** — แกะทีละคำ:

- **Push** — ฝั่ง producer เป็นคนกำหนดว่าจะส่งค่ามาเมื่อไหร่ (ต่างจาก pull เช่น iterator ที่ consumer เป็นคนขอ) เหมือน Kafka consumer ที่คุณคุ้นเคย (เล่ม backend บท 9): broker push message มาเรื่อยๆ คุณไม่ได้ควบคุมจังหวะ
- **Multiple values** — Promise ให้ค่าเดียวแล้วจบ แต่ Observable ส่งได้ 0, 1 หรือ อนันต์ค่า
- **Lazy** — นี่คือตัวการของบั๊กข้างบน: การสร้าง Observable **ยังไม่ทำอะไรเลย** มันคือ "สูตร" หรือ "พิมพ์เขียว" ของงาน งานจะเริ่มก็ต่อเมื่อมีคน `subscribe()`

analogy ที่ช่วยได้: **Promise คือใบเสร็จร้านอาหารที่สั่งไปแล้ว** — จ่ายเงินปุ๊บครัวเริ่มทำทันที (eager) ได้อาหารหนึ่งจาน จบ ส่วน **Observable คือเมนูอาหาร** — ถือเมนูไว้ทั้งวันครัวก็ไม่ทำอะไร จนกว่าจะกดสั่ง (subscribe) และถ้าเป็นเมนูบุฟเฟ่ต์สายพาน อาหารจะไหลมาเรื่อยๆ จนกว่าจะบอกพอ (unsubscribe)

| มิติ | Promise | Observable |
|---|---|---|
| เริ่มทำงานเมื่อ | สร้างปุ๊บทำเลย (eager) | ต่อเมื่อ subscribe (lazy) |
| จำนวนค่า | 1 ค่า (หรือ reject) | 0..∞ ค่า + complete/error |
| ยกเลิกได้ไหม | ไม่ได้ (native) | ได้ — unsubscribe |
| ใช้ซ้ำ | ค่า cache ไว้ then กี่ครั้งก็ได้ค่าเดิม | subscribe ใหม่ = รันงานใหม่ (ถ้า cold) |
| เทียบโลก backend | function call ที่ return Future | Kafka topic ที่ consumer ต่อเข้าไปฟัง |
| operator ประกอบ | then/catch เท่านั้น | 100+ operators (map, filter, retry, ...) |

ฝั่ง RxJS มี `firstValueFrom(obs$)` / `lastValueFrom(obs$)` สำหรับแปลง Observable → Promise เมื่อต้องการค่าเดียวจริงๆ (แทน `toPromise()` ที่ deprecated ตั้งแต่ RxJS 7 และจะถูกถอดใน v8)

**แนวตอบ senior:** "Observable คือ lazy push collection — มันเป็นแค่พิมพ์เขียวจนกว่าจะ subscribe ต่างจาก Promise ที่ eager, ให้ค่าเดียว และ cancel ไม่ได้ ความ lazy นี่แหละคือรากของพฤติกรรม cold ที่ทำให้ HTTP ยิงซ้ำเมื่อ subscribe หลายครั้ง"

## 10.2 subscribe แล้วเกิดอะไรจริงๆ — รากของ cold

กลไกทีละขั้นเมื่อเรียก `obs$.subscribe(observer)`:

1. RxJS ห่อ callback ของเราเป็น `Subscriber` (observer ที่มีกลไกป้องกัน เช่น ไม่ส่งค่าหลัง complete)
2. **ฟังก์ชัน producer ที่ฝังไว้ตอนสร้าง Observable ถูกเรียก ณ ตอนนี้** — นี่คือหัวใจ
3. producer เริ่มผลิตค่า แล้ว push ผ่าน `next()` / จบด้วย `complete()` หรือ `error()`
4. คืน `Subscription` ที่มี `.unsubscribe()` ไว้สั่งหยุด producer + คืน resource

```ts
const timer$ = new Observable<number>((subscriber) => {
  console.log('producer ถูกสร้าง!');        // รันตอน subscribe ไม่ใช่ตอนประกาศ
  let i = 0;
  const id = setInterval(() => subscriber.next(i++), 1000);
  return () => clearInterval(id);            // teardown — รันตอน unsubscribe
});

timer$.subscribe(v => console.log('A:', v)); // producer ตัวที่ 1 (interval ตัวที่ 1)
timer$.subscribe(v => console.log('B:', v)); // producer ตัวที่ 2 — คนละ interval กัน!
```

สังเกตว่า subscribe สองครั้ง = `setInterval` สองตัว — **ผู้ subscribe แต่ละคนได้ producer ของตัวเอง** พฤติกรรมนี้มีชื่อว่า **cold**

## 10.3 Cold vs Hot — ทำไม HTTP ที่ subscribe สองที่ยิงสองครั้ง

- **Cold** — producer ถูกสร้าง "ข้างใน" Observable ตอน subscribe → ของใครของมัน เหมือน Netflix: กด play เมื่อไหร่หนังเริ่มจากต้นเรื่องของคุณเอง คนอื่นกดก็ได้ stream ของเขาเอง
- **Hot** — producer มีอยู่แล้ว "ข้างนอก" Observable แค่ต่อสายเข้าไปฟัง → ทุกคนแชร์ producer เดียว เหมือนทีวีถ่ายทอดสด: เปิดช้าก็พลาดช่วงต้น ทุกคนเห็นภาพเดียวกัน

ตัวอย่างจริง: `HttpClient.get()` = cold (สร้าง XHR ใหม่ต่อ subscribe), `fromEvent(button, 'click')` และ WebSocket ที่ share connection = hot (DOM event / socket มีอยู่แล้ว ใครมาทีหลังก็ฟังจากจุดนั้น)

**บั๊กคลาสสิก** ที่ออกสัมภาษณ์บ่อยมาก:

```ts
const user$ = this.http.get<User>('/api/me'); // cold — ยังไม่ยิง

user$.subscribe(u => this.name = u.name);     // ยิง request ครั้งที่ 1
user$.subscribe(u => this.role = u.role);     // ยิง request ครั้งที่ 2!
```

หรือเวอร์ชัน template ที่เนียนกว่า: ใช้ `{{ (user$ | async)?.name }}` กับ `{{ (user$ | async)?.role }}` สองจุด — async pipe แต่ละตัวคือหนึ่ง subscribe → สอง request เหมือนกัน ทางแก้คือทำให้มัน multicast ด้วย `shareReplay` (หัวข้อ 10.10) หรือ subscribe ครั้งเดียวแล้วกระจายค่า

**แนวตอบ senior:** "cold คือ producer ถูกสร้างต่อ subscriber — HTTP จึงยิงซ้ำถ้า subscribe สองที่ ส่วน hot คือแชร์ producer เดียวเช่น DOM event ผมเจอบั๊กนี้บ่อยสุดตอนใช้ async pipe หลายจุดกับ stream เดียว วิธีแก้มาตรฐานคือ shareReplay หรือจัด structure ให้ subscribe จุดเดียว"

## 10.4 ตระกูล Subject — สะพานจาก cold ไป hot

`Subject` เป็นทั้ง Observable (subscribe ได้) และ Observer (เรียก `next()` ใส่ได้) — มันคือ "ลำโพงประกาศ" ที่ multicast ค่าเดียวไปหาผู้ฟังทุกคนพร้อมกัน จึงเป็นเครื่องมือแปลง cold → hot: ให้ Subject ไป subscribe cold ตัวเดียว แล้วทุกคนมาฟัง Subject แทน (นี่คือกลไกภายในของ `share()`/`shareReplay()`)

| ชนิด | ผู้มาใหม่ได้อะไร | ต้องมีค่าเริ่มต้น | เคสใช้จริง |
|---|---|---|---|
| `Subject` | เฉพาะค่าหลังจากนี้ (พลาดของเก่า) | ไม่ | event bus, สัญญาณ destroy$, ปุ่มถูกกด |
| `BehaviorSubject` | ค่าล่าสุด 1 ค่าทันที + ของใหม่ | ต้องมี | **state** — current user, filter ที่เลือก, ค่าที่ UI ต้องมีเสมอ |
| `ReplaySubject(n)` | ค่าเก่า n ค่าย้อนหลัง + ของใหม่ | ไม่ | log/history, ผู้มาช้าต้องเห็นเหตุการณ์ก่อนหน้า |
| `AsyncSubject` | เฉพาะค่าสุดท้าย และเฉพาะเมื่อ complete | ไม่ | แทบไม่ใช้ตรงๆ — เป็นกลไกภายในของ cache แบบ "ค่าเดียวตอนจบ" |

กติกาเลือกฉบับสั้น: ถ้าคำถามคือ "state ตอนนี้คืออะไร" → `BehaviorSubject` (เพราะ UI มาถามเมื่อไหร่ก็ต้องมีคำตอบ) ถ้าคำถามคือ "มีเหตุการณ์เกิดขึ้น" → `Subject` ธรรมดา

```ts
@Injectable({ providedIn: 'root' })
export class CartService {
  // private เขียน / public อ่าน — กันคนนอก next() มั่ว
  private readonly items = new BehaviorSubject<CartItem[]>([]);
  readonly items$ = this.items.asObservable();

  add(item: CartItem) {
    this.items.next([...this.items.value, item]); // immutable update — เข้ากับ OnPush (บท 9)
  }
}
```

**ใช้ผิดพังยังไง:** ใช้ `Subject` เก็บ state → component ที่ mount ทีหลังไม่ได้ค่า หน้าจอว่างจนกว่าจะมี event ถัดไป — บั๊ก "refresh แล้วหาย" คลาสสิก อีกทางคือ expose Subject ตรงๆ ให้ใครก็ `next()` ได้ → ตามหาที่มา state ไม่เจอ (เหตุผลเดียวกับที่ห้าม setter สาธารณะใน domain model — เล่ม backend บท 2)

## 10.5 สี่ flattening operators — หัวใจของบท

ปัญหาตั้งต้น: มี stream ชั้นนอก (เช่น user พิมพ์) ที่แต่ละค่าต้อง**สร้าง Observable ชั้นใน** (เช่น ยิง HTTP) ถ้า `map` เฉยๆ จะได้ `Observable<Observable<T>>` — ต้องมี operator "flatten" ชั้นในลงมา และคำถามเดียวที่แยกทั้งสี่ตัวคือ: **ถ้าค่าใหม่มาจากชั้นนอก ขณะที่งานชั้นในยังไม่เสร็จ จะทำยังไงกับงานเก่า?**

analogy ร้านกาแฟ: ลูกค้า (ค่าจากชั้นนอก) สั่งเมนู (งานชั้นใน) แล้วบาริสต้าสี่คนมีนิสัยต่างกัน — คนแรกเททิ้งแก้วที่ชงค้างแล้วชงออเดอร์ใหม่ทันที (switchMap), คนที่สองชงพร้อมกันหลายแก้วมือเป็นระวิง (mergeMap), คนที่สามชงทีละแก้วตามคิวเป๊ะ (concatMap), คนที่สี่ถ้ามือไม่ว่างจะทำหูทวนลมไม่รับออเดอร์เลย (exhaustMap)

### switchMap — ยกเลิกของเก่า เอาแต่ล่าสุด

```ts
searchResults$ = this.query$.pipe(
  switchMap(q => this.http.get<Result[]>(`/api/search?q=${q}`))
  // พิมพ์ตัวใหม่ → unsubscribe request เก่า (ยกเลิก XHR จริงๆ) → ยิงใหม่
);
```

นี่คือคำตอบของ **race condition** ในหน้า search (บท 12 ลงลึกฝั่ง data layer): ถ้าไม่ยกเลิก request เก่า ผลของคำค้น "ab" ที่ server ตอบช้า อาจกลับมา**ทีหลัง**ผลของ "abc" แล้วทับหน้าจอด้วยข้อมูลเก่า switchMap ตัดปัญหาที่ราก — งานเก่าถูก unsubscribe ผลลัพธ์มันจึงไม่มีวันโผล่มา

**เลือกผิดพังยังไง:** เอา switchMap ไปใช้กับ **write operation** เช่น กด save รัวๆ → request save เก่าถูกยกเลิก**ฝั่ง client** แต่ server อาจประมวลผลไปแล้ว! ข้อมูลถูกเขียนแต่ client ไม่รู้ผล — ใช้ switchMap กับ read เท่านั้น

### mergeMap (ชื่อเดิม flatMap) — ทำขนานทุกงาน

```ts
// upload หลายไฟล์พร้อมกัน — อยากได้ขนานจริงๆ
uploadAll$ = from(files).pipe(
  mergeMap(f => this.uploadOne(f), 3) // arg ที่สอง = concurrency limit
);
```

**เลือกผิดพังยังไง:** สองแบบ — (1) **ordering ไม่การันตี**: ผลลัพธ์ออกตามใครเสร็จก่อน ถ้าเอาไปอัปเดต state ที่ลำดับสำคัญ (เช่น auto-save ต่อเนื่อง) เวอร์ชันเก่าอาจทับเวอร์ชันใหม่ (2) ไม่จำกัด concurrency แล้วชั้นนอกยิงถี่ → เปิด connection ท่วม เหมือนปล่อย consumer ไม่จำกัดถล่ม downstream (เล่ม backend บท 10 เรื่อง backpressure)

### concatMap — เข้าคิว ทีละงาน ตามลำดับ

```ts
// user แก้หลายรายการรัวๆ — ต้อง save ตามลำดับที่แก้ ห้ามสลับ
save$ = this.edits$.pipe(
  concatMap(edit => this.http.put(`/api/items/${edit.id}`, edit))
  // งานถัดไปเริ่มต่อเมื่องานก่อนหน้า complete — FIFO (First-In-First-Out: มาก่อนเสร็จก่อน) เหมือน queue ที่ partition เดียว
);
```

**เลือกผิดพังยังไง:** ถ้างานชั้นในตัวใดตัวหนึ่ง**ไม่ complete** (stream ค้าง เช่น ลืม take(1) กับ source ที่ไม่จบ) คิวทั้งเส้นตันถาวร — งานใหม่รอชั่วนิรันดร์ และถ้าชั้นนอกผลิตเร็วกว่าชั้นในเสร็จ คิวจะยาวขึ้นเรื่อยๆ (unbounded buffer = memory โต)

### exhaustMap — เมินค่าใหม่จนงานเก่าเสร็จ

```ts
// กัน double submit — กดปุ่ม login รัวๆ ยิงครั้งเดียว
login$ = this.submit$.pipe(
  exhaustMap(cred => this.auth.login(cred))
  // ระหว่าง request แรกยังไม่ตอบ คลิกซ้ำถูก "ทิ้ง" ไม่เข้าคิวด้วย
);
```

**เลือกผิดพังยังไง:** เอาไปใช้กับ search → ตัวอักษรที่พิมพ์ระหว่างรอถูกทิ้งเงียบๆ ผลค้นหาไม่ตรงกับที่พิมพ์ล่าสุด user รู้สึกว่า "แอปไม่ตอบสนอง"

### ตารางช่วยจำ

| operator | งานเก่ายังไม่เสร็จ + ค่าใหม่มา | ordering | เคสมาตรฐาน | พังเมื่อ |
|---|---|---|---|---|
| `switchMap` | **ยกเลิก**งานเก่า | ล่าสุดเสมอ | search, autocomplete, โหลดตาม route param | ใช้กับ write → ผลลัพธ์หาย |
| `mergeMap` | ทำ**ขนาน**กันไป | ไม่การันตี | งานอิสระต่อกัน, bulk upload | ลำดับสำคัญ / ไม่คุม concurrency |
| `concatMap` | **ต่อคิว** | การันตี FIFO | save ตามลำดับ, งานที่ต้อง serial | งานในไม่ complete → คิวตัน |
| `exhaustMap` | **ทิ้ง**ค่าใหม่ | — | submit form, refresh token, กัน double-click | ใช้กับ input ที่ทุกค่ามีความหมาย |

**แนวตอบ senior:** "ทั้งสี่ตัวต่างกันแค่นโยบายจัดการงานเก่าเมื่อค่าใหม่มา — switch ยกเลิก, merge ขนาน, concat ต่อคิว, exhaust เมินของใหม่ ผมเลือกจาก semantics ของงาน: read ที่เอาแต่ล่าสุด = switchMap, write ที่ลำดับสำคัญ = concatMap, กัน double submit = exhaustMap และจะใช้ mergeMap ต่อเมื่อยืนยันได้ว่างานอิสระต่อกันจริง"

## 10.6 combineLatest vs forkJoin vs withLatestFrom

| operator | ยิงเมื่อ | จบเมื่อ | เคสใช้ |
|---|---|---|---|
| `combineLatest` | ตัวใดตัวหนึ่งมีค่าใหม่ (หลังจาก**ทุกตัวเคยมีค่าแล้ว**) | source ทุกตัว complete | รวม filter หลายตัว → query ใหม่ทุกครั้งที่อะไรเปลี่ยน |
| `forkJoin` | ครั้งเดียว — เอา**ค่าสุดท้าย**ของทุกตัวเมื่อ**ทุกตัว complete** | ทันทีที่ยิง | ยิง HTTP หลายเส้นขนานแล้วรอครบ (คือ `Promise.all` ของ RxJS) |
| `withLatestFrom` | เฉพาะเมื่อ **stream หลัก**ยิง — แนบค่าล่าสุดของตัวอื่นไปด้วย | ตาม stream หลัก | ปุ่ม submit (หลัก) + แนบค่า form ล่าสุด (รอง) โดยไม่อยากยิงตอน form เปลี่ยน |

**กับดัก combineLatest ที่ออกสัมภาษณ์บ่อย:** มันจะ**ไม่ยิงสักครั้งจนกว่าทุก source เคย emit อย่างน้อยหนึ่งค่า** — ถ้ารวม filter สามตัวแล้วตัวหนึ่งเป็น `Subject` ที่ยังไม่มีใคร next หน้าจอจะว่างเปล่าแบบไม่มี error ใดๆ วิธีแก้: ใช้ `BehaviorSubject` หรือแปะ `startWith(defaultValue)` ให้ทุกตัวมีค่าตั้งต้น ส่วนกับดักของ `forkJoin` คือถ้า source ใด**ไม่ complete** (เช่นเผลอใส่ Subject) มันจะรอตลอดกาล และถ้า source ใด error ทั้งก้อน error

## 10.7 สูตร search มาตรฐาน — debounceTime + distinctUntilChanged + switchMap

```ts
results$ = this.searchControl.valueChanges.pipe(
  debounceTime(300),        // รอ user หยุดพิมพ์ 300ms — ตัด keystroke รัว
  distinctUntilChanged(),   // ค่าเดิมซ้ำ (พิมพ์แล้วลบกลับมาเหมือนเดิม) ไม่ยิงซ้ำ
  switchMap(q => this.api.search(q).pipe(
    catchError(() => of([] as Result[]))  // สำคัญ! — ดูหัวข้อ 10.9
  ))
);
```

ลำดับสำคัญ: debounce ก่อน distinct (กรองความถี่ก่อน แล้วค่อยกรองค่าซ้ำ) แล้วจึง switchMap สามบรรทัดนี้แก้สามปัญหา: ยิงถี่เกิน, ยิงค่าซ้ำ, race condition — ตามลำดับ

## 10.8 Subscription leak — เกิดยังไง และสามทางแก้

**กลไกการรั่ว:** component subscribe stream ที่อายุยืนกว่าตัวเอง (store, router events, interval) → component ถูก destroy แต่ Subscription ยังถืออ้างอิง callback ซึ่งถืออ้างอิง component → GC (Garbage Collector) เก็บไม่ได้ + callback ยังรันอยู่กับ component ผี (เขียน state, ยิง request ต่อ) เปิดหน้าเดิมซ้ำสิบรอบ = สิบ subscription ซ้อน — อาการคือ "ทำไม handler รันสิบครั้ง" กับ memory โตเรื่อยๆ

สามทางแก้ เรียงตามลำดับที่ควรเลือก:

```ts
// 1) async pipe — DEFAULT เสมอ: template subscribe/unsubscribe ให้อัตโนมัติ
// <div *ngIf="user$ | async as user">{{ user.name }}</div>
user$ = this.store.user$;

// 2) takeUntilDestroyed (@angular/core/rxjs-interop, มาตั้งแต่ v16)
//    — เมื่อ "ต้อง" subscribe ในคลาส เช่นมี side effect
constructor() {
  this.store.user$
    .pipe(takeUntilDestroyed())        // ผูกกับ DestroyRef ของ component อัตโนมัติ
    .subscribe(u => this.analytics.identify(u));
}

// 3) manual — เก็บ Subscription แล้ว unsubscribe ใน ngOnDestroy
//    ใช้เมื่อจัดการ lifecycle เองแบบละเอียด (เช่น สลับ subscription ระหว่างทาง)
private sub = new Subscription();
ngOnDestroy() { this.sub.unsubscribe(); }
```

**ทำไม async pipe เป็น default:** เพราะมันตัดปัญหาทั้ง class — ไม่มี subscribe ในโค้ด = ไม่มีทางลืม unsubscribe, ทำงานเข้ากับ OnPush (mark for check ให้เอง — บท 9), และบังคับให้เราคิดแบบ declarative (ประกาศ stream แล้วให้ template ดึง) แทน imperative (subscribe แล้ว set ตัวแปร) ข้อควรรู้ของ `takeUntilDestroyed`: เรียกนอก constructor/injection context ต้องส่ง `DestroyRef` เข้าไปเอง

## 10.9 Error handling — error คือช่อง terminal, stream ตายจริง

**บั๊กจริงที่เจอกันทั้งวงการ:** หน้า search ทำงานดี จน request หนึ่ง 500 — หลังจากนั้น**พิมพ์อะไรก็ไม่ค้นหาอีกเลย** ไม่มี error ซ้ำ ไม่มีอะไร เงียบสนิท ต้อง refresh หน้า

กลไก: Observable contract คือ `next* (error | complete)?` — **error เป็นสัญญาณจบ stream แบบถาวร** เมื่อ HTTP ชั้นในพ่น error และไม่มีใครดัก มันลามขึ้นไปฆ่า stream ชั้นนอก (`valueChanges` ทั้งเส้น) — subscription จบไปแล้ว การพิมพ์ครั้งถัดไปจึงไม่มีใครฟัง

**ตำแหน่งของ catchError จึงชี้เป็นชี้ตาย:**

```ts
// ผิด — catchError อยู่นอก: ดักได้ก็จริง แต่ stream นอกจบแล้ว (search ตายถาวร)
this.query$.pipe(
  switchMap(q => this.api.search(q)),
  catchError(() => of([]))
);

// ถูก — catchError อยู่ "ใน" switchMap: inner stream ตายแล้วแทนด้วย of([])
// แต่ stream นอกไม่รับรู้ error → ยังมีชีวิตรอค่าถัดไป
this.query$.pipe(
  switchMap(q => this.api.search(q).pipe(
    catchError(err => { this.toast.error('ค้นหาไม่สำเร็จ'); return of([]); })
  ))
);
```

จำเป็นภาพ: catchError คือฟิวส์ — ต้องติดที่**วงจรย่อย** (inner) ให้ไฟดับเฉพาะห้อง ไม่ใช่ติดที่สายเมนแล้วดับทั้งบ้าน ข้อสังเกตเพิ่ม: `catchError` ต้อง return Observable เสมอ (`of(fallback)` หรือ `EMPTY` ถ้าไม่อยากส่งอะไร หรือ `throwError(() => err)` ถ้าจะโยนต่อ)

**แนวตอบ senior:** "error ใน RxJS เป็น terminal event — มันฆ่า stream ทั้งเส้นถ้าไม่ดัก บั๊กคลาสสิกคือ search ตายหลัง error แรกเพราะวาง catchError ไว้นอก switchMap ผมวางมันใน inner observable เสมอเพื่อให้ outer stream รอด"

## 10.10 shareReplay — cache ที่ต้องรู้จังหวะปล่อยมือ

แก้ปัญหา HTTP ยิงซ้ำจากหัวข้อ 10.3 ด้วยการ multicast + จำค่าล่าสุดไว้ให้ผู้มาทีหลัง:

```ts
config$ = this.http.get<Config>('/api/config').pipe(
  shareReplay({ bufferSize: 1, refCount: true })
);
// subscriber แรก → ยิง HTTP หนึ่งครั้ง
// subscriber ต่อมา → ได้ค่าจาก replay buffer ทันที ไม่ยิงซ้ำ
```

จุดที่ senior ต้องอธิบายได้คือ `refCount`:

- `refCount: false` (default) — ต่อให้ทุกคน unsubscribe แล้ว shareReplay **ยังถือ subscription ต่อ source ไว้** เพื่อจำค่าให้ผู้มาใหม่ ถ้า source ไม่ complete (เช่น interval, WebSocket) = **memory leak + งานเบื้องหลังรันไม่หยุด** ถาวรระดับแอป
- `refCount: true` — คนสุดท้าย unsubscribe → ปล่อย source → ผู้มาใหม่ trigger งานใหม่ (cache หาย แต่ไม่รั่ว)

กติกานิ้วโป้ง: source ที่ **complete แน่นอน** (HTTP) ใช้ default ได้เพราะจบแล้วไม่มีอะไรค้าง / source **อายุยืน** ต้อง `refCount: true` เกือบเสมอ

## 10.11 retry + backoff — ลายเซ็นเดียวกับฝั่ง backend

หลักการเดียวกับ retry policy ที่คุณรู้จาก (เล่ม backend บท 10): retry เฉพาะ error ชั่วคราว, มี backoff กันถล่ม server, มีเพดานครั้ง — RxJS 7.4+ ใส่ได้ใน operator เดียว:

```ts
data$ = this.http.get<Data>('/api/data').pipe(
  retry({
    count: 3,
    delay: (error, retryCount) =>
      error.status >= 500                      // retry เฉพาะ 5xx — 4xx retry ไปก็เท่านั้น
        ? timer(1000 * 2 ** (retryCount - 1))  // exponential backoff: 1s, 2s, 4s
        : throwError(() => error),
  }),
  catchError(() => of(FALLBACK_DATA))          // สุดท้ายยังพัง → fallback
);
```

ระวังจุดวางเหมือน catchError: retry ที่นอก switchMap จะ re-subscribe ทั้ง pipeline ไม่ใช่แค่ request ที่พัง

## คำถามสัมภาษณ์ที่ต้องตอบได้

1. **Observable ต่างจาก Promise ยังไง และความ lazy ส่งผลอะไรในทางปฏิบัติ?**
→ Observable เป็น lazy push collection: ไม่เริ่มงานจนกว่าจะ subscribe, ส่งได้หลายค่า, cancel ได้ ผลทางปฏิบัติคือ HTTP ไม่ยิงถ้าไม่ subscribe และ subscribe สองครั้งยิงสองครั้ง — ต่างจาก Promise ที่ eager, ค่าเดียว, cancel ไม่ได้

2. **cold กับ hot ต่างกันตรงไหน ยกตัวอย่างบั๊กจริง?**
→ cold สร้าง producer ต่อ subscriber (HTTP), hot แชร์ producer เดียว (DOM event, WebSocket) บั๊กจริง: async pipe สองจุดกับ HTTP stream เดียว = สอง request แก้ด้วย shareReplay

3. **switchMap / mergeMap / concatMap / exhaustMap เลือกยังไง?**
→ ต่างกันแค่นโยบายต่องานเก่าเมื่อค่าใหม่มา: ยกเลิก/ขนาน/ต่อคิว/ทิ้งของใหม่ เลือกตาม semantics: search = switchMap (แก้ race condition), save ตามลำดับ = concatMap, กัน double submit = exhaustMap, งานอิสระขนาน = mergeMap พร้อม concurrency limit

4. **ทำไม search พังถาวรหลังเจอ error ครั้งแรก แก้ยังไง?**
→ error เป็น terminal event ฆ่า stream ทั้งเส้น — catchError ที่วางนอก switchMap ดักได้แต่ outer stream จบไปแล้ว ต้องวางใน inner observable เพื่อแทน stream ที่ตายด้วย fallback โดย outer ไม่รับรู้ error

5. **จัดการ subscription ใน Angular ยังไงไม่ให้ leak?**
→ ลำดับ: async pipe เป็น default (ไม่ subscribe เอง = ไม่มีทางลืม + เข้ากับ OnPush), จำเป็นต้อง subscribe ในคลาสใช้ takeUntilDestroyed, manual unsubscribe เป็นทางเลือกสุดท้าย leak เกิดเมื่อ stream อายุยืนกว่า component

6. **shareReplay refCount สำคัญยังไง?**
→ refCount: false จะถือ source ไว้แม้ไม่มี subscriber — กับ source ที่ไม่ complete คือ memory leak ถาวร ใช้ default ได้เฉพาะ source ที่จบแน่นอนอย่าง HTTP, source อายุยืนต้อง refCount: true

## สรุปท้ายบท

- RxJS จะเข้าใจได้จริงเมื่อคิดเป็น stream ก่อนค่อยคิดเป็น operator
- ประเด็นสำคัญกว่า "ตัวไหนใช้ยังไง" คือ source เริ่มเมื่อไร, ใคร subscribe, ผลลัพธ์ถูก share หรือไม่ และ stream จบอย่างไรเมื่อ error หรือ unsubscribe
- บั๊กยอดฮิตของ RxJS เช่น HTTP ยิงซ้ำ, search พังหลัง error แรก, หรือ memory leak จาก subscription ล้วนย้อนกลับมาอธิบายได้จาก model เดียวกัน
- เมื่อเห็นภาพรวมนี้แล้ว operator ต่าง ๆ จะกลายเป็นเครื่องมือ ไม่ใช่รายชื่อให้ท่องจำ

## ก่อนไปบทถัดไป

หลังจากปูเรื่อง stream แล้ว บทถัดไปจะพาไปงาน enterprise ที่เจอทุกวันที่สุดใน Angular คือ forms และ routing ซึ่งเป็นจุดที่ state, validation และ navigation มาบรรจบกันจริง ๆ
