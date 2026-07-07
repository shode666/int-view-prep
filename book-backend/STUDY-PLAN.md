# แผนเตรียมสัมภาษณ์ 4 วัน

> หลัก: อ่านทฤษฎีช่วงแรก → ลงมือช่วงหลัง → ปิดวันด้วยการเล่าออกเสียง 5 นาที (สิ่งที่เรียนวันนี้) เพราะสัมภาษณ์คือการ "เล่า" ไม่ใช่การ "รู้"

## วันที่ 1 — หลักคิด (Foundation)

**อ่าน**: บท 1–5 (หลักคิด → Coupling/Cohesion → SOLID → Architecture → Repository/UoW)
**ลงมือ**: katas ใน `src/katas/` — แก้บั๊ก twoSum ที่ค้างอยู่, ทำ groupAnagrams + lruCache ให้เขียว (`pnpm test:katas`)
**เช็คก่อนนอน**: อธิบาย "ข้างในแน่น ข้างนอกหลวม" + "interface อยู่บ้านผู้ใช้" ได้โดยไม่เปิดหนังสือ

## วันที่ 2 — Backend Foundation + Patterns

**อ่าน**: บท 6–9 (Core Backend → Database/Transaction → Patterns → Event-driven)
**ลงมือ**: async drills — `withTimeout`, `retry`, `mapLimit`, streams (`pnpm test:async`)
**เช็คก่อนนอน**: ตอบ 401 vs 403, lost update กันยังไง (optimistic vs pessimistic), event vs command

## วันที่ 3 — Distributed + Quality (หมวดที่หนักสุด)

**อ่าน**: บท 10–14 (Failure Handling → Saga/Outbox/Idempotency → Testing → 3 ภาษา → Anti-patterns)
**ลงมือ**: สร้าง Todos API ใน `src/api/app.ts` ให้ 14 เทสต์เขียว (`pnpm test:api`) — ระหว่างเขียนคิดออกเสียงเหมือน pair จริง
**เช็คก่อนนอน**: ตอบ 5 คำถามคลาสสิกท้ายบท 11 ได้ครบ (C ล่ม / payment ซ้ำ / dual-write / event ซ้ำ / cascade)

## วันที่ 4 — สนามจริง (Interview Playbook)

**อ่าน**: บท 15–16 (Case Study Order + Checklist) แล้วลองวาดระบบ order เองบนกระดาษใน 15 นาที
**เตรียมตัว**: บท 17–19 — **เติม story bank ด้วยเรื่องจริงของตัวเอง 6–8 เรื่อง** (สำคัญสุดของวันนี้), ซ้อม pitch 90 วิ, เตรียมคำถามย้อนถาม
**อ่านเร็ว**: บท 20 (DevOps/Security) — เน้นตาราง Q&A ท้ายบท
**ซ้อมใหญ่**: mock interview — system design 45 นาที (บท 18 เป็นสคริปต์) + pair programming ใน repo นี้

## เช้าวันสัมภาษณ์ (30 นาที)

ทวน 3 อย่างพอ: บท 16 (checklist + คำถามปราบเซียน), 5 คำถามท้ายบท 11, pitch 90 วิ — แล้วหยุด อย่ายัดของใหม่

## กันชน

- วันไหนไม่ทัน: ตัด "ลงมือ" ก่อน อย่าตัด "เล่าออกเสียง"
- บทที่ข้ามได้ถ้าเวลาบีบ: 13 (ถ้าสมัครตำแหน่ง Node.js ล้วน), 20 (อ่านแค่ Q&A)
- บทที่ห้ามข้าม: 2, 3, 11, 17
