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

## หมายเหตุ
STUDY-PLAN.md และ my-answers.md ตรวจแล้วผ่าน ไม่ต้องแก้ · งานทั้งหมดรักษาน้ำเสียงผู้เขียน ไม่ rewrite ยกก้อน
