# บท 11 — Angular Forms & Routing: สองระบบที่ enterprise ใช้หนักที่สุด

> แอป enterprise คือ form กับ table ต่อกันเป็นสิบหน้า — ระบบ forms กับ router จึงเป็นสองส่วนที่ dev Angular แตะทุกวัน และเป็นสองหมวดที่คำถามสัมภาษณ์ "เชิงเคสจริง" เยอะที่สุด: dynamic form, validate ข้ามฟิลด์, guard กันออกจากหน้าโดยไม่ save
>
> อ้างอิง Angular สมัยใหม่ (v16+): typed reactive forms (stable ตั้งแต่ v14), functional guards (class guards deprecated ตั้งแต่ v16), `withComponentInputBinding` (v16+)

## เข็มทิศก่อนอ่าน

บท 8-10 ปูพื้น component, change detection และ stream ไว้แล้ว บทนี้คือจุดที่สามอย่างนั้นมาเจอกับงานหน้างานจริงที่สุด: ฟอร์มและการนำทาง ถ้าอ่านสามบทก่อนหน้าแบบเข้าใจกลไก บทนี้จะไม่ใช่การท่อง `FormControl` หรือ route config แต่เป็นการเห็นว่าข้อมูลไหลจาก input ไป state ไป URL และกลับมา render ใหม่อย่างไร

ให้โฟกัสว่าฟอร์มกับ router ไม่ใช่เรื่อง UI ย่อย ๆ แต่เป็นตัวกำหนดโครงสร้างของแอปทั้งก้อน โดยเฉพาะเรื่อง validation, shareable state, guard และหน้าที่ของแต่ละ layer

## 11.1 Template-driven vs Reactive Forms — ต่างที่ปรัชญา ไม่ใช่ syntax

**สถานการณ์จริง:** ทีมเริ่มด้วย `[(ngModel)]` เพราะเร็วดี หกเดือนต่อมาต้องเพิ่ม "ถ้าเลือกประเภทลูกค้าเป็นนิติบุคคล ให้โผล่ฟิลด์เลขภาษี + validate แบบใหม่" — โค้ด template บวมเป็น `*ngIf` ซ้อน `ngModel` ซ้อน validate ที่เทสไม่ได้ สุดท้าย rewrite เป็น reactive forms

ความต่างเชิงปรัชญา:

- **Template-driven** — model และ validation **ผูกอยู่ใน template** ผ่าน directive (`ngModel`, `required`) Angular สร้าง `FormControl` ให้เบื้องหลังแบบ async มองไม่เห็นจากโค้ด เหมือนบ้านสำเร็จรูป: ขึ้นเร็ว แต่จะทุบผนังเพิ่มห้องทีหลังลำบาก
- **Reactive** — **model เป็น object ในโค้ด** (`FormGroup`/`FormControl`) แล้ว template แค่ bind เข้าหา source of truth อยู่ฝั่ง class เหมือนบ้านที่มีพิมพ์เขียว: แก้โครงสร้าง runtime ได้ เทสได้โดยไม่ต้อง render

| มิติ | Template-driven | Reactive |
|---|---|---|
| source of truth | template (directive สร้าง control ให้) | class (เราสร้าง control เอง) |
| unit test | ต้อง render template + รอ async | new FormGroup ในเทสตรงๆ ไม่ต้อง render |
| dynamic (เพิ่ม/ลบ field runtime) | ทำได้แต่ทรมาน | ธรรมชาติของมัน (`addControl`, `FormArray`) |
| type safety | อ่อน | typed forms เต็มรูปแบบ |
| valueChanges เป็น stream | เข้าถึงยาก | ได้ทุก control — ต่อ RxJS (บท 10) ตรงๆ |
| เหมาะกับ | form จิ๋ว เช่น search box, login ง่ายๆ | ทุกอย่างที่เหลือใน enterprise |

**แนวตอบ senior:** "ต่างกันที่ source of truth — template-driven ให้ directive สร้าง model จาก template ส่วน reactive ประกาศ model ในโค้ดแล้ว template ตามมัน enterprise เลือก reactive เพราะสามคำ: testable, dynamic, typed"

## 11.2 Typed Reactive Forms — สัญญาแบบเดียวกับ TypeScript ที่ขอบระบบ

ตั้งแต่ Angular 14 forms เป็น generic เต็มตัว — `form.value` ไม่ใช่ `any` อีกต่อไป (แนวคิดเดียวกับ "type = สัญญา" ในบท 3):

```ts
const form = new FormGroup({
  email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  age:   new FormControl<number | null>(null),
});

form.value.email; // string | undefined — undefined เพราะ control อาจถูก disable
form.controls.email.value; // string เพียวๆ
```

จุดที่ต้องอธิบายได้: **ทำไมต้องมี `nonNullable`** — เพราะ `form.reset()` จะคืนค่ากลับ "ค่าเริ่มต้น" ซึ่ง default คือ `null` ทำให้ type ของทุก control กลายเป็น `T | null` ใส่ `nonNullable: true` = reset กลับไปที่ initial value ที่ให้ไว้ type จึงเป็น `T` สะอาดๆ ทีมส่วนใหญ่ตั้ง `FormBuilder.nonNullable` เป็นดีฟอลต์ผ่าน `inject(NonNullableFormBuilder)`

## 11.3 FormArray + Dynamic Form — เพิ่ม/ลบแถว runtime

**โจทย์จริง:** หน้า "ผู้รับผลประโยชน์" ของ form ประกัน — user เพิ่มได้ไม่จำกัด ลบได้ ทุกแถว validate เอง และผลรวมเปอร์เซ็นต์ต้อง = 100

```ts
@Component({ /* ... */ })
export class BeneficiaryFormComponent {
  private fb = inject(NonNullableFormBuilder);

  form = this.fb.group({
    beneficiaries: this.fb.array([this.createRow()]), // เริ่มหนึ่งแถว
  });

  get rows() { return this.form.controls.beneficiaries; }

  private createRow() {
    return this.fb.group({
      name:    this.fb.control('', Validators.required),
      percent: this.fb.control(0, [Validators.required, Validators.min(1), Validators.max(100)]),
    });
  }

  addRow()          { this.rows.push(this.createRow()); }
  removeRow(i: number) { this.rows.removeAt(i); }
}
```

```html
<div formArrayName="beneficiaries">
  @for (row of rows.controls; track row; let i = $index) {
    <div [formGroupName]="i">
      <input formControlName="name" />
      <input type="number" formControlName="percent" />
      <button type="button" (click)="removeRow(i)">ลบ</button>
    </div>
  }
</div>
```

`FormArray` คือ list ของ control ที่ validate รวมเป็นก้อนเดียวกับ form ใหญ่ — แถวไหน invalid ทั้ง form ก็ invalid ส่วนกติกา "รวมต้องได้ 100" เป็น cross-field validation ระดับ array (หัวข้อ 11.6 ใช้เทคนิคเดียวกัน: validator ที่ parent)

## 11.4 Custom Validator (sync)

validator คือ **ฟังก์ชันเพียวๆ**: รับ control → คืน `null` (ผ่าน) หรือ error object (ไม่ผ่าน) — เพราะเป็น pure function มันจึงเทสได้เหมือน util ธรรมดา นี่คือหนึ่งใน "ทำไม reactive เทสง่าย"

```ts
export function thaiCitizenId(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const v = control.value;
    if (!v) return null;                    // ปล่อยให้ required จัดการช่องว่าง — อย่าทำงานซ้ำซ้อน
    if (!/^\d{13}$/.test(v)) return { citizenId: { reason: 'format' } };
    const sum = v.slice(0, 12).split('')
      .reduce((acc, d, i) => acc + +d * (13 - i), 0);
    return (11 - (sum % 11)) % 10 === +v[12]
      ? null
      : { citizenId: { reason: 'checksum' } };
  };
}
```

ธรรมเนียมสำคัญ: error object ใส่ข้อมูลพอให้ layer แสดงผลประกอบข้อความได้ และ validator **ไม่ควรรู้เรื่อง UI** (ไม่ยุ่ง DOM ไม่เด้ง toast) — separation แบบเดียวกับที่ domain logic ไม่รู้จัก HTTP (เล่ม backend บท 4)

## 11.5 Async Validator — เช็ค username ซ้ำแบบไม่ถล่ม server

async validator คืน `Observable<ValidationErrors | null>` และรันเมื่อ sync validators ผ่านแล้วเท่านั้น ระหว่างรอ control จะมีสถานะ `pending` (ต้องแสดง spinner ไม่งั้น user งงว่าทำไมปุ่มยังกดไม่ได้)

```ts
export function usernameAvailable(api: UserApi): AsyncValidatorFn {
  return (control) =>
    timer(400).pipe(                       // debounce ฉบับ validator — เพราะ async validator
      switchMap(() => api.check(control.value)), // ถูก "เรียกใหม่ + unsubscribe อันเก่า" ทุก keystroke
      map(taken => (taken ? { usernameTaken: true } : null)),
      catchError(() => of(null)),          // เช็คไม่ได้อย่าบล็อก user — ให้ backend ตัดสินรอบสุดท้าย
    );
}

username = new FormControl('', {
  validators: [Validators.required, Validators.minLength(4)],
  asyncValidators: [usernameAvailable(inject(UserApi))],
  updateOn: 'blur', // หรือใช้วิธีนี้: validate ตอน blur แทน debounce
});
```

เกร็ดที่คนพลาด: `debounceTime` ธรรมดาใช้ไม่ได้ตรงๆ ใน async validator — Angular unsubscribe ตัวเก่าและเรียกฟังก์ชันใหม่ทุกครั้งที่ค่าเปลี่ยน สูตรที่ work คือ `timer(400) + switchMap` (การ unsubscribe ของ Angular จะยกเลิก timer เก่า = debounce ในตัว — กลไกเดียวกับ switchMap ในบท 10) หรือเลี่ยงทั้งหมดด้วย `updateOn: 'blur'`

## 11.6 Cross-field Validation — validator วางที่ FormGroup

**หลักคิด:** validator เห็นได้เฉพาะ control ที่มันเกาะอยู่ — ถ้ากติกาพาดสองฟิลด์ (password/confirm) ต้องวาง validator ที่**บรรพบุรุษร่วมที่ใกล้ที่สุด** คือ FormGroup

```ts
const passwordsMatch: ValidatorFn = (group: AbstractControl) => {
  const pass = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return pass === confirm ? null : { passwordsMismatch: true };
};

form = this.fb.group(
  {
    password: this.fb.control('', [Validators.required, Validators.minLength(12)]),
    confirm:  this.fb.control(''),
  },
  { validators: [passwordsMatch] }   // error เกาะที่ group ไม่ใช่ที่ control ลูก
);
```

```html
<!-- จุดพลาดประจำ: error อยู่บน form ไม่ใช่บน confirm -->
@if (form.hasError('passwordsMismatch') && form.controls.confirm.touched) {
  <p class="error">รหัสผ่านไม่ตรงกัน</p>
}
```

**ใช้ผิดพังยังไง:** เขียน validator ที่ control `confirm` แล้วไปดึงค่า `password` ผ่าน `control.parent` — ดูเหมือน work แต่พังเงียบเมื่อ user แก้ `password` ทีหลัง เพราะ validator ของ `confirm` ไม่ถูก re-run (มัน re-run ตามค่าของตัวเอง) วางที่ group แล้ว Angular re-run ทุกครั้งที่ลูกตัวไหนก็ตามเปลี่ยน

## 11.7 Multi-step Form — state อยู่ไหน validate ยังไง

คำถาม design ที่เจอบ่อยในสัมภาษณ์ระดับ senior คำตอบมาตรฐาน:

- **State อยู่ที่เดียว:** สร้าง `FormGroup` ใหญ่หนึ่งก้อนใน parent (หรือ service ถ้าข้าม route) โดยแต่ละ step คือ nested group — step component รับ `FormGroup` ของตัวเองผ่าน input ไม่ได้เป็นเจ้าของ state เอง (state เดินทางไป-กลับระหว่าง step ได้โดยไม่หาย)
- **Validate ราย step:** ปุ่ม "ถัดไป" เช็ค `stepGroup.valid` ของ step ปัจจุบันเท่านั้น — ห้ามเช็ค form ทั้งก้อน (step หลังยังว่างย่อม invalid)
- **ก่อน submit จริง:** เช็ค `form.valid` ทั้งก้อนอีกรอบกันหลุด
- ถ้าต้อง survive refresh: sync ค่าลง sessionStorage หรือ URL (draft id) — หลักการ state placement เดียวกับ React (บท 7)

```ts
wizard = this.fb.group({
  account: this.fb.group({ email: ['', Validators.required] }),
  profile: this.fb.group({ name: ['', Validators.required] }),
  payment: this.fb.group({ card: ['', Validators.required] }),
});
next() {
  const step = this.wizard.get(this.steps[this.current])!;
  step.markAllAsTouched();               // บังคับโชว์ error ทุกฟิลด์ใน step
  if (step.valid) this.current++;
}
```

## 11.8 value vs getRawValue — กับดัก disabled control

กติกาที่คนโดนกันเยอะ: **control ที่ `disabled` จะหายไปจาก `form.value`** (และไม่ถูกนับใน validity ด้วย) เจตนาของ design คือ "ฟิลด์ที่ user แก้ไม่ได้ ไม่ถือเป็นส่วนของสิ่งที่ user submit"

บั๊กจริง: form แก้ไขโปรไฟล์ disable ฟิลด์ `email` (ห้ามแก้) → submit `form.value` → backend รับ `email: undefined` → เขียนทับอีเมลเป็นค่าว่าง ถ้าต้องการทุกฟิลด์รวม disabled ใช้ `form.getRawValue()` — และ typed forms ก็สะท้อนเรื่องนี้: `value` มีทุก property เป็น optional (`Partial`-ish) ส่วน `getRawValue()` ได้ type เต็ม

## 11.9 valueChanges + debounce ก่อนยิง API — ระวัง leak

เคสมาตรฐาน: auto-save draft หรือ filter ตาราง

```ts
constructor() {
  this.filterForm.valueChanges.pipe(
    debounceTime(400),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    switchMap(f => this.api.search(f).pipe(catchError(() => of([])))), // สูตรครบจากบท 10
    takeUntilDestroyed(),               // valueChanges ไม่ complete เอง — ไม่ปิด = leak
  ).subscribe(rows => this.rows.set(rows));
}
```

จำไว้ว่า `valueChanges` เป็น stream ที่**ไม่มีวัน complete** — ทุกกฎ subscription leak จากบท 10 ใช้ที่นี่เต็มๆ และถ้าใน subscribe มีการ `patchValue` กลับเข้า form เดียวกัน ให้ใส่ `{ emitEvent: false }` กัน loop อนันต์

## 11.10 Form ใหญ่แล้วช้า — แก้เป็นลำดับ

form 80 ฟิลด์พิมพ์แล้วหน่วง — สาเหตุ: ทุก keystroke ทำให้ control อัปเดต + validator ทั้ง tree ที่เกี่ยวข้องรัน + change detection (CD — บท 9) ไล่ทั้งหน้า ลำดับการแก้:

1. `updateOn: 'blur'` (ทั้ง form หรือรายฟิลด์) — ตัดงานจาก "ทุก keystroke" เหลือ "ตอนออกจากช่อง" มักจบตรงนี้
2. `ChangeDetectionStrategy.OnPush` + แตก form เป็น step/section component ย่อย — จำกัดขอบเขต CD (บท 9)
3. validator แพง (regex ยาว, loop) → ย้าย logic หนักไป async/debounce หรือ memoize
4. field เยอะเพราะ UX ยัดหน้าเดียว → แตกเป็น wizard (11.7) — แก้ที่ design ไม่ใช่โค้ด

## 11.11 Error message ที่ scale — เลิกเขียน `@if` ซ้ำทุกฟิลด์

form 30 ฟิลด์ × 3 error ต่อฟิลด์ = 90 ก้อน `@if (control.hasError(...) && control.touched)` — copy-paste จน copy ผิด control ก็มี วิธีที่ scale คือรวม logic ไว้ที่เดียว:

```ts
// ที่เดียวในแอปที่ map error key → ข้อความ
const MESSAGES: Record<string, (e: any) => string> = {
  required:  () => 'กรุณากรอกข้อมูล',
  minlength: (e) => `อย่างน้อย ${e.requiredLength} ตัวอักษร`,
  citizenId: () => 'เลขบัตรประชาชนไม่ถูกต้อง',
};

@Component({
  selector: 'field-error',
  template: `@if (message()) {<p class="error">{{ message() }}</p>}`,
})
export class FieldErrorComponent {
  control = input.required<AbstractControl>();
  message = computed/* หรือ getter */(() => {
    const c = this.control();
    if (!c.errors || (!c.touched && !c.dirty)) return null;
    const [key, val] = Object.entries(c.errors)[0];   // โชว์ทีละ error พอ
    return MESSAGES[key]?.(val) ?? 'ข้อมูลไม่ถูกต้อง';
  });
}
```

template แต่ละฟิลด์เหลือบรรทัดเดียว: `<field-error [control]="form.controls.email" />` — เปลี่ยน copy ทั้งแอปแก้ที่เดียว, บังคับ tone เดียวกัน, และเพิ่ม i18n (internationalization) ได้จากจุดเดียว บางทีมทำเป็น directive เกาะ input เพื่อให้ auto-discover control จาก `NgControl` — หลักการเดียวกัน

## 11.12 Router ทำงานยังไง — URL → route config → component tree

เมื่อ URL เปลี่ยน (คลิก `routerLink` หรือพิมพ์ตรงๆ) router เดินตามลำดับ: **URL parse → redirect → จับคู่ route config (ลึกลงตาม tree, first match wins) → รัน `CanMatch`/`CanActivate` guards → โหลด lazy module/component ถ้ามี → รัน resolvers → สร้าง component tree ตาม `router-outlet` ที่ซ้อนกัน → activate** — Single Page Application (SPA) ไม่ได้โหลดหน้าใหม่ แค่สลับ subtree ของ component ตาม config

มุมมองที่ควรพูดในสัมภาษณ์: **router คือ state machine ที่ serialize state ลง URL** — URL คือ state ที่ share ได้/bookmark ได้/กด back ได้ ฟรีๆ (ล้อกับ "URL เป็นหนึ่งในสี่บ้านของ state" — บท 7)

## 11.13 Lazy Loading — จ่าย bundle เมื่อถึงเวลาใช้

```ts
export const routes: Routes = [
  { path: 'dashboard', loadComponent: () => import('./dashboard.component').then(m => m.DashboardComponent) },
  { path: 'admin', canMatch: [adminGuard],
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES) },
];
```

`import()` แบบ dynamic ทำให้ bundler ตัดโค้ดส่วนนั้นเป็น chunk แยก — โหลดเมื่อ navigate ครั้งแรกเท่านั้น initial bundle จึงเล็กลงตรงๆ (ผลต่อ LCP — บท 13) ยุค standalone ใช้ `loadComponent` รายหน้า / `loadChildren` ชี้ไปที่ไฟล์ routes ของ feature ทั้งกลุ่ม จุดสังเกต: ใช้ `canMatch` คู่กับ lazy route จะดีกว่า `canActivate` เพราะถ้า guard ไม่ผ่าน **chunk ไม่ถูกดาวน์โหลดเลย** (canActivate ทำงานหลัง match ซึ่งโหลด chunk ไปแล้ว)

## 11.14 Guards สมัยใหม่ — functional เป็นมาตรฐาน

ตั้งแต่ v15.2/v16 **class-based guards (interface `CanActivate` ฯลฯ) ถูก deprecated** — มาตรฐานปัจจุบันคือฟังก์ชันที่ใช้ `inject()` ดึง dependency (DI — บท 8):

```ts
// auth guard — ยังไม่ login เด้งไปหน้า login พร้อมจำทางกลับ
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    // คืน UrlTree = "redirect" — สื่อเจตนาชัดกว่า router.navigate() + return false
};

// role guard แบบ factory — config ต่อ route ได้
export const roleGuard = (role: string): CanMatchFn => () =>
  inject(AuthService).hasRole(role);

// unsaved changes guard — CanDeactivateFn เช็คก่อนออกจากหน้า
export interface HasPendingChanges { hasPendingChanges(): boolean; }
export const unsavedChangesGuard: CanDeactivateFn<HasPendingChanges> = (component) =>
  !component.hasPendingChanges() || confirm('มีข้อมูลยังไม่บันทึก ออกจากหน้านี้?');

// ใช้งาน
{ path: 'admin', canMatch: [authGuard, roleGuard('admin')], loadChildren: /* ... */ },
{ path: 'editor/:id', component: EditorComponent, canDeactivate: [unsavedChangesGuard] },
```

แยกบทบาทด้วย analogy ยามสามตำแหน่ง: `CanMatch` คือยามหน้ารั้ว — ไม่ผ่านคือไม่รู้ด้วยซ้ำว่ามีตึกนี้ (ลอง route ถัดไป + ไม่โหลด lazy chunk), `CanActivate` คือยามหน้าลิฟต์ — เห็นตึกแล้วแต่ขึ้นไม่ได้, `CanDeactivate` คือยามขาออก — เช็คก่อนปล่อยออกจากหน้า (เคส form ค้างไม่ save)

**ใช้ผิดพังยังไง:** จำไว้เสมอว่า guard เป็นแค่ UX (User Experience) — มันวิ่งใน browser ปิด JavaScript หรือยิง API ตรงก็ทะลุ **authorization จริงต้องอยู่ backend** (frontend ไม่ใช่ security boundary — บท 16)

## 11.15 Route params vs Query params — state ที่อยู่ใน URL

- **Route param** (`/products/:id`) — ระบุตัวตน resource: ไม่มีค่านี้ หน้าไม่มีความหมาย
- **Query param** (`?page=2&sort=price`) — ปรับแต่ง view: filter, sort, pagination — optional และเปลี่ยนได้โดยไม่ navigate ออกจากหน้า

เปิด `withComponentInputBinding()` (v16+) แล้ว router ส่งทั้งสองอย่างเข้า component เป็น input ตรงๆ — ลด boilerplate `ActivatedRoute` ไปมาก:

```ts
provideRouter(routes, withComponentInputBinding());

export class ProductPage {
  id = input.required<string>();      // จาก /products/:id
  page = input('1');                  // จาก ?page=... (signal input — บท 9)
}
```

ประโยชน์เชิง architecture เหมือนฝั่ง React (บท 7): filter/sort ที่อยู่ใน URL ทำให้ refresh ไม่หาย แชร์ลิงก์ได้ และไม่ต้องมี state ซ้ำซ้อนในหน่วยความจำ — ถ้า reactive ต่อการเปลี่ยน param ในหน้าเดิม (เช่น `/products/1` → `/products/2` โดย component ถูก reuse) ฝั่ง observable ก็ยังใช้ `route.paramMap.pipe(switchMap(...))` — ตัวอย่างการใช้ switchMap กับ route ที่พูดถึงในบท 10

## 11.16 Resolver ยังควรใช้ไหม

`ResolveFn` โหลดข้อมูลให้เสร็จ**ก่อน** activate หน้า — ข้อดี: component เกิดมาพร้อมข้อมูล ไม่ต้องเขียน loading state ข้อเสีย (ที่ทำให้ธรรมเนียมปัจจุบันเลิกนิยม): **navigation ค้างจน resolve เสร็จ** — user คลิกแล้วไม่เกิดอะไรเลย 2 วินาที รู้สึกพังกว่าเห็นหน้า skeleton และถ้า resolver error navigation ล้มทั้งอัน

ธรรมเนียมปัจจุบัน: navigate ทันที → โชว์ skeleton → โหลดใน component (ผ่าน service/query layer — บท 12) เก็บ resolver ไว้เฉพาะข้อมูลเล็ก-เร็ว-สำคัญต่อการ render แรก (เช่น metadata ที่ตัดสิน layout) และถ้าใช้ ต้องมี timeout/fallback เสมอ

## 11.17 Preloading + Redirect หลัง login

**Preloading:** lazy loading ช่วย initial load แต่แลกกับดีเลย์ตอนเข้า route ครั้งแรก — แก้ด้วย `withPreloading(PreloadAllModules)` (โหลด chunk ที่เหลือเงียบๆ หลังแอป idle) หรือ custom strategy เลือก preload เฉพาะ route ที่ user น่าจะไปต่อ (ธง `data: { preload: true }`) — เร็วทั้งเปิดแอปและเปลี่ยนหน้า

**returnUrl pattern** (ต่อจาก authGuard ข้อ 11.14):

```ts
// login.component.ts
returnUrl = input('/', { alias: 'returnUrl' }); // withComponentInputBinding อ่าน query param ให้

onLoginSuccess() {
  // ระวัง open redirect: อนุญาตเฉพาะ path ภายใน — ห้าม URL เต็มจากภายนอก (บท 16)
  const url = this.returnUrl().startsWith('/') ? this.returnUrl() : '/';
  this.router.navigateByUrl(url);
}
```

## คำถามสัมภาษณ์ที่ต้องตอบได้

1. **ทำไม enterprise เลือก reactive forms แทน template-driven?**
→ source of truth อยู่ในโค้ดไม่ใช่ template — จึง unit test ได้โดยไม่ render, เปลี่ยนโครงสร้าง runtime ได้ (FormArray/addControl), typed เต็มรูปแบบ, และ valueChanges เป็น stream ต่อ RxJS ตรงๆ template-driven เหมาะแค่ form จิ๋ว

2. **Cross-field validation วางตรงไหน เพราะอะไร?**
→ ที่ FormGroup (บรรพบุรุษร่วมใกล้สุด) เพราะ validator ถูก re-run เมื่อลูกตัวไหนก็ตามเปลี่ยน — วางที่ control เดียวแล้วแอบดู parent จะไม่ re-run เมื่ออีกฟิลด์เปลี่ยน และ error จะเกาะที่ group ต้องอ่านจาก group ตอนแสดงผล

3. **`value` กับ `getRawValue()` ต่างกันยังไง เคยพังเพราะมันไหม?**
→ disabled control หายจาก `value` แต่อยู่ใน `getRawValue()` — บั๊กคลาสสิกคือ disable ฟิลด์ห้ามแก้แล้ว submit value ทำให้ backend รับ undefined ไปเขียนทับ

4. **functional guards ต่างจาก class guards ยังไง และ guard ป้องกันอะไรได้จริง?**
→ class guards deprecated ตั้งแต่ v16 — functional guard เป็นฟังก์ชันใช้ inject() สั้นกว่า/compose ง่ายกว่า (factory รับ config ได้) และคืน UrlTree เพื่อ redirect ได้ แต่ guard เป็นแค่ UX — authorization จริงต้องบังคับที่ backend

5. **canMatch ต่างจาก canActivate ตรงไหน สำคัญยังไงกับ lazy loading?**
→ canMatch ตัดสินก่อน route ถูกนับว่า match — ไม่ผ่านคือไปลอง route อื่นและ lazy chunk ไม่ถูกดาวน์โหลดเลย ส่วน canActivate รันหลัง match ซึ่ง chunk โหลดแล้ว — route ที่ gate ด้วย role ควรใช้ canMatch

6. **ยังใช้ resolver อยู่ไหม?**
→ ส่วนใหญ่ไม่ — resolver ทำ navigation ค้างจนข้อมูลมา UX แย่กว่า navigate ทันทีแล้วโชว์ skeleton ธรรมเนียมปัจจุบันโหลดใน component ผ่าน query layer เก็บ resolver ไว้กับข้อมูลเล็กที่จำเป็นต่อ render แรกจริงๆ

## สรุปท้ายบท

- forms และ routing เป็นสองระบบที่สะท้อนแนวคิดของ Angular ชัดที่สุด เพราะเกี่ยวทั้ง state, lifecycle, validation และ navigation
- ฟอร์มที่ดีไม่ได้แค่ submit ได้ แต่ต้อง model สถานะ, error และการ validate ข้ามฟิลด์อย่างมีระบบ
- router ที่ดีไม่ได้แค่เปลี่ยนหน้า แต่เป็นส่วนหนึ่งของ state architecture และประสบการณ์ใช้งาน
- ถ้าจัดการสองส่วนนี้เป็น คุณจะเริ่มเห็น Angular app เป็นระบบครบวงจร ไม่ใช่กอง component หลายหน้า

## ก่อนไปบทถัดไป

จากโลกเฉพาะ framework เราจะขยับไปประเด็นข้าม framework อีกครั้ง โดยเริ่มจากโจทย์ที่ทุกแอปต้องเจอเหมือนกันคือข้อมูลจาก server ซึ่งมีธรรมชาติไม่เหมือน state ที่เราเป็นเจ้าของเอง
