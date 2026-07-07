# บันทึกบรรณาธิการ — คู่มือ Software Design (book-backend)

รอบตรวจ: 5 ก.ค. 2026 · ขอบเขต: บท 1–20 + ภาคผนวก 21 + บทเสริม 22 + outline/STUDY-PLAN/my-answers · โฟกัสตามที่สั่ง: **การสะกด · การนิยามตัวย่อ ณ จุดแรกที่ใช้ · ความต่อเนื่องของเนื้อหา**

## สรุปภาพรวม
รวมการแก้ **~76 จุด** ข้ามทั้งเล่ม — abbrev (นิยามตัวย่อ) เป็นสัดส่วนใหญ่สุด รองมาคือ continuity/crossref และ spelling เนื้อหาเชิงเทคนิคแข็งแรง cross-ref "(บท N)" **ทุกจุดชี้บทถูกต้อง** ไม่พบการอ้างผิดบท · code fence ปิดครบทุกไฟล์ · ตาราง markdown เรนเดอร์ครบ

## ประเด็นความต่อเนื่องที่สำคัญ (แก้แล้ว)
- **จำนวน Production Q&A ขัดกัน 3 ที่ → นับจริงได้ 36 ข้อ:** เดิม outline เขียน "35 ข้อ", H1 ไฟล์ 21 เขียน "20 คำถาม" — **ผิดทั้งคู่** นับหัวข้อ `### 1.`–`### 36.` จริงได้ 36 → แก้ให้ตรงกันทั้ง H1 ("36 คำถามสนามจริง"), หัวข้อภาคเสริม ("16 ข้อ (21–36)"), และ outline ("36 ข้อ")
- **อักขระเสียในบท 13:** "ประโยค**স**ัมภาษณ์" มีอักษรเบงกาลี (স) ปนแทน "ส" ไทย → แก้เป็น "ประโยคสัมภาษณ์" (สแกนทั้งเล่มซ้ำ ไม่เหลือ)
- ตรวจ "บทต่อไป →" ทุกบทชี้บทถัดไปถูกต้อง (8→9→…→15) และ cross-ref ข้ามบททุกจุดตรงแผนที่

## การนิยามตัวย่อ ณ จุดแรก (abbrev) — รูปแบบ "คำเต็ม (ABBR)"
เติมคำเต็มให้ตัวย่อที่ถูกใช้ลอย ๆ โดยไม่กางครั้งแรกในบท ตัวอย่างที่เติม:
- บท 1: YAGNI, VAT, PDPA · บท 2: ORM, CI · บท 4: DTO, CRUD, CI · บท 5: UoW, ACID, CQRS, DTO
- บท 6: REST, AuthN/AuthZ, mTLS, JWT, XSS, DLQ, TTL, IDOR, OWASP · บท 7: ORM, TCP
- บท 8: OCP, DI, DIP · บท 9: RPC · บท 10: DLQ, BFF · บท 11: TTL, DLQ, HA · บท 12: E2E, TDD · บท 13: POJO, NPE, GIL
- บท 15: DLQ, TTL · บท 16: IDOR, DLQ · บท 17: MTTR, RFC, ADR · บท 18: DAU, NFR, RPS, RTT, SPOF · บท 19: CV, HR, JD
- บท 20: SRE, CI, CD, K8s, HPA, PII, SLO, ECS, IDOR, ORM, TLS, OWASP · บท 21: LB, DLQ, IDOR, HMAC, TOCTOU · บท 22: JVM, JIT, AOT, GC, DTO, STW

หลายจุดยังพบตัวย่อถูก "กางครั้งแรกช้า" (กางที่ heading ทีหลัง แต่ใช้จริงก่อนหน้า เช่น DLQ/TTL) → ย้ายการกางมาที่จุดใช้จริงจุดแรก

## spelling / markdown
- บท 13: แก้อักขระเบงกาลีปน (ดูข้างบน)
- ตรวจ code fence ทุกไฟล์ปิดครบ (คู่สมดุล), fence ภาษาจริงระบุ java/sql/python/go, fence ที่เป็น ASCII/pseudo-diagram คงเปล่าถูกต้อง, ตารางมีบรรทัดว่างนำหน้าครบ

## issue ที่ปิดแล้ว (รอบเก็บตก — กางตัวย่อในกล่อง diagram/ตาราง)
วิธีแก้: กางคำเต็มใน prose/legend **ข้าง** diagram/ตาราง ไม่แตะในกล่อง จึงไม่ทำ alignment พัง
- **บท 4:** เพิ่ม legend ใต้ Layered diagram — **gRPC** (gRPC Remote Procedure Calls — RPC framework บน HTTP/2 ของ Google, ดูบท 9), **SMTP** (Simple Mail Transfer Protocol)
- **บท 22:** กาง **DMA** (Direct Memory Access — ฮาร์ดแวร์ย้าย bytes เข้า memory โดยไม่ผ่าน CPU) ในประโยคลำดับใต้ diagram
- **บท 13:** กาง **DIP** (Dependency Inversion Principle) ที่จุดแรก (บรรทัด 3) + เพิ่ม legend **EAFP** (Easier to Ask Forgiveness than Permission) ใต้ตารางเทียบภาษา

## issue คงไว้ (เจตนา ตัดสินแล้ว)
- **"20 ข้อแรก/หลัก"** (ไฟล์ 21 บรรทัด 248, 398): เป็นการอ้างกลุ่ม 20 ข้อหลักตามเจตนาผู้เขียน (ก่อนภาคเสริม 16 ข้อ) ไม่ใช่ error คงไว้

## รอบ Careful Deep Pass (อ่านลึกทีละ section) — 7 ก.ค. 2026

รอบ self-contained แรกเร็วไป (แก้ 6 จุด) เจ้าของขอให้ค่อย ๆ อ่านลึกอีกรอบ — รอบนี้เจอเพิ่ม **~14 จุด** (ศัพท์ load-bearing ไม่นิยาม + บอกชื่อกลไกไม่บอกวิธี — backend ย่อกว่าจริง):
- บท 5: นิยาม Testcontainers
- บท 6: กลไก JWT (เซ็น/verify ทำไม stateless), cache stampede (`SET NX`), token bucket (ถัง N + refill r แยกคุม burst/ค่าเฉลี่ย)
- บท 7: นิยาม fsync + กลไก WAL replay, gap lock (non-repeatable vs phantom), ทำไม connection pool ใหญ่ไม่ช่วย
- บท 9: read amplification, backpressure + prefetch limit
- บท 11: นิยาม load shedding (ที่คำตอบ senior อ้าง แต่นิยามจริงอยู่บท 21 ทีหลัง)
- บท 12: กาง MSW เต็ม
- บท 19: story bank เพิ่ม checkbox หมวดที่ 8 (ให้ครบตรงตาราง)
- บท 21: กาง APM, WAL ณ จุดแรก
- บท 22: กาง JMH, JFR, TLAB, IHOP ณ จุดแรก

## รอบ Self-contained ("จบในเอกสาร") — 7 ก.ค. 2026

เจ้าของกำหนดว่า **ทุกหัวข้อต้องให้คำตอบจบในตัว ไม่ปัดให้คนอ่านไปหา/คิดต่อเอง** โดยเฉพาะ "บอกชื่อ pattern แต่ไม่ให้กลไก" และ checklist ที่ให้แค่คำถามไม่ให้คำตอบ

รีวิวทีละบทครบ 22 บท (แบ่ง 3 ชุดขนาน) — **แก้ 6 จุด ที่เหลือจบในตัวดีอยู่แล้ว**:
- **บท 5** — dual-write: เดิมบอกแค่ "คำตอบคือ Outbox (บท 11)" (ชื่อ pattern ลอย) → เติมกลไก Outbox (เขียน event ลงตารางใน tx เดียวกับ business data → commit พร้อมกัน → relay poll ส่งทีหลัง = แปลง dual-write เป็น single-write)
- **บท 7** — Serializable: เดิมบอกแค่ "ต้อง retry" → เติมกลไก serialization failure (DB ยกเลิกด้วย SQLSTATE 40001 → app ต้องดักแล้วรันใหม่เอง DB ไม่ retry ให้)
- **บท 8** — Builder: เติม after ที่จับต้องได้ (`Report.builder().format("pdf")...build()`) ; Command: เติมกลไก undo (เก็บ state ก่อนทำ / จับคู่ command ตรงข้าม)
- **บท 14** — Circular dependency: เดิมโยนศัพท์ "shared kernel"/"concept ที่สาม" ลอย → เติมตัวอย่างรูปธรรม (A,B พึ่ง `Money`/`CustomerId` → ย้ายไป module C วงขาด) + ขยาย DIP resolution
- **บท 16** — Section E (คำถามปราบเซียน): เดิมให้แค่ "คำถาม + ทำไมสำคัญ" 5 ข้อ → เติม **คำตอบที่ดี vs ธงแดง** ครบทั้ง 5 ข้อ
- บทอื่น (9/10/11/12/13/15/17/18/19/20/21/22): ตรวจแล้วผ่าน — pattern มากับกลไก, trade-off สองฝั่ง, Q&A/checklist มีแนวตอบครบในตัว (บท 11/21/22 เนื้อแน่นที่สุด)

## หมายเหตุ
STUDY-PLAN.md และ my-answers.md ตรวจแล้วผ่าน ไม่ต้องแก้ · งานทั้งหมดรักษาน้ำเสียงผู้เขียน ไม่ rewrite ยกก้อน
