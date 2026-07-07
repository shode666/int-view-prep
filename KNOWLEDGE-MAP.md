# แผนที่คลังความรู้ prep-pair-prog

```
prep-pair-prog/
├ book-backend/     คู่มือ Software Design (20 บท + ภาคผนวก 21–22)
├ book-frontend/    คู่มือ Senior Frontend (18 บท)
├ src/ + tests/     สนามซ้อม pair programming (katas, async drills, Todos API)
└ solutions/        เฉลยอ้างอิง
```

## ส่วนที่เป็น General — ใช้ร่วมทั้งสองสาย (อยู่ใน book-backend/)

| บท | เรื่อง | ทำไมถึง general |
|---|---|---|
| 1 | หลักคิดก่อน pattern (DRY/KISS/YAGNI, composition) | ใช้กับ component/React hook เท่ากับ service |
| 2 | Coupling/Cohesion + DIP | หลักเดียวที่ไล่ตั้งแต่ function ยัน micro frontend |
| 3 | SOLID | props = interface, component = กล่อง S |
| 4 | Layer/boundary | container/presentational คือ layer ฉบับ FE |
| 5 | Repository/UoW (ครึ่งแรก: การแยกสัญญา) | TanStack Query cache = repository ฝั่ง FE |
| 12 | Testing architecture + test double | ปรัชญาเดียวกับ Testing Library เป๊ะ |
| 16 | Design checklist | โครงคิด review ใช้ได้สองฝั่ง |
| 17–19 | Behavioral / System design framework / Story bank | ไม่ผูกภาษาใดๆ |
| 21 (บางข้อ) | Production Q&A: cache, rate limit, deploy strategy | แนวคิดใช้ข้ามฝั่ง |

## เฉพาะทาง

- **Backend เท่านั้น**: บท 6–11 (HTTP/DB/pattern/event/failure/saga), 13 (Java/Python/Go), 20 (DevOps), 22 (JVM)
- **Frontend เท่านั้น**: book-frontend ทั้งเล่ม — บทที่ล้อกับฝั่ง backend จะอ้าง "(เล่ม backend บท N)" ในเนื้อหา

## ลำดับอ่านแนะนำ

- สาย backend: book-backend 1→20 ตาม STUDY-PLAN.md
- สาย frontend: book-backend บท 1–3 ก่อน (รากร่วม) → book-frontend 1→18
- เตรียมสัมภาษณ์ full-stack: general ทั้งหมด → เฉพาะทางตามตำแหน่ง
