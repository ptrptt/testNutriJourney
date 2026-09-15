# NutriJourney — Playwright test results

ผลทดสอบรอบล่าสุดวันที่ **16 กันยายน 2026** บน https://www.nutrijourney88.com/ ด้วยบัญชีที่ผู้ใช้ล็อกอินให้
| ชุดทดสอบ | ผ่าน | ไม่ผ่าน | Blocked |
| --- | ---: | ---: | ---: |
| 74 เคสจากชีต | 32 | 2 | 40 |
| Public smoke: 5 scenarios × desktop/mobile | 10 | 0 | 0 |

**ยังไม่ได้ทดสอบครบขั้นตอนทั้ง 74 เคส**: Blocked ไม่ใช่ Pass และบางเคสต้องใช้บัญชีอื่น ข้อมูลย้อนหลัง เกณฑ์ XP หรือเข้าถึงรอบแจ้งเตือน LINE/เซิร์ฟเวอร์

รันทั้ง 74 รายการแล้วตรวจซ้ำเคสที่ติดการเตรียมสถานะ Mood และข้อมูลเดิมในบัญชี ผลด้านบนเป็นผลรอบนี้ ไม่ยกผลผ่านเก่ามาแทนเคสที่รอบนี้ทดสอบไม่ได้ จึงมี Pass น้อยกว่าสรุปวันที่ 14 ก.ย. รูปภาพเดือนนี้บันทึกแล้ว และภารกิจ Mood ได้รางวัลไปแล้วก่อนเก็บหลักฐาน XP รอบนี้

## รายงานหลัก

- [Test Steps ครบ 74 เคสตามลำดับชีต](test-data/test-steps.md)
- [ผลเฉพาะรอบล่าสุดครบ 74 รหัส](test-data/current-run.html)
- [ผลรวมทุกเคสพร้อมหลักฐาน](test-data/report.html)
- [CSV สำหรับเปิดใน Excel](test-data/coverage.csv)
- [ข้อผิดพลาดที่ยืนยัน](test-data/defects.md)
- [ข้อขัดแย้งในชีต](test-data/review-notes.md)
- `test-data/auth-run-1` และ `auth-run-2` เก็บหลักฐาน XP ที่สคริปต์ยังอ้างอิง ส่วนผลรอบล่าสุดอยู่ในโฟลเดอร์ `*-retest-2026-09-16`; ล้างผลรอบพัฒนา `auth-run-3` ถึง `auth-run-10` แล้ว

เคส **TC-IFG-004W1-8 และ TC-IFG-005W1-8** ไม่ผ่าน: บันทึกเป้าหมาย 16:8 แล้วเป้าหมายหายเมื่อ Refresh หรือออกจากหน้าแล้วกลับมา ส่วนเซสชัน IF ที่เริ่มทำงานแล้วคงเวลาและสถานะได้

## โค้ดเทสต์

- `tests/public.spec.js`: หน้าสาธารณะ
- `tests/auth/sheet.spec.js`: ลงทะเบียน 74 รหัสจากชีต, profile, calendar, names, missions
- `tests/auth/if-handlers.js`: IF plan/start/stop/timer
- `tests/auth/extra-handlers.js`: mood, photos, comparison, chart, character display
- `tests/auth/reward-handlers.js`: XP และ mission evidence
- `tests/auth/blockers.js`: เงื่อนไขที่ยังขาดรายเคส
- `tests/auth/recheck-handlers.js`: ตรวจเงื่อนไขรูปภาพ เตรียม Mood session และเก็บ XP ก่อน/หลังจากรอบปัจจุบัน

## วิธีรัน

```powershell
npm.cmd ci
npx.cmd playwright install chromium
npm.cmd test
npm.cmd run login
```

ล็อกอิน LINE ในเบราว์เซอร์ที่เปิดด้วย `login` แล้วเปิดค้างไว้ จากอีก terminal:

```powershell
npm.cmd run test:auth
npm.cmd run coverage
npm.cmd run report:auth
```

**Authenticated suite ใช้สถานะจริงร่วมกันและเปลี่ยนข้อมูลบัญชีทดสอบ** ต้องเตรียมบัญชีและรันลำดับที่ตรงกับ preconditions; ไม่ใช่ชุดที่ reset fixture อัตโนมัติ การรันซ้ำในเดือนเดิมไม่สามารถอัปโหลดรูป/บันทึกน้ำหนักใหม่ได้ และภารกิจที่ทำแล้วจะไม่ให้ XP ซ้ำ

รายงาน Playwright HTML ของ `report:auth` แสดงเฉพาะ batch ล่าสุด; `test-data/report.html` รวม 74 เคสจากทุก batch

XP +50 ตรวจจากหลักฐานก่อน/หลังการทำ Mood mission จริงในรอบ 1–2 (200 → 250, ภารกิจ 2/4 → 3/4) และยืนยันยอดปัจจุบัน ไม่อ้างว่าได้รับ reward ใหม่ในการรันตรวจหลักฐานซ้ำ
การตรวจรูปบันทึกสำเร็จทำต่อจาก submission ในรอบ 3 โดยยืนยันชุดเดือนกันยายนในรอบ 5 เนื่องจาก UI ล็อกบันทึกซ้ำรายเดือน

Authenticated tests ใช้ desktop Chromium; public tests ใช้ desktop และ Pixel 7 emulation ไม่ใช่มือถือจริง/LINE in-app browser
กราฟตรวจค่า tooltip ที่ canvas วาดจริงเทียบกับข้อมูลบัญชี ไม่ mock response

## ข้อมูลบัญชีหลังทดสอบรอบเดิม 14 ก.ย. (เพื่ออ้างอิงประวัติ)

- ข้อมูลพื้นฐานที่แก้เพื่อทดสอบหลายช่องถูกคืนค่าเดิม
- ชื่อตัวละครเป็น “น้องไข่” ตามเคส
- บันทึกรูป PNG สังเคราะห์มีข้อความ QA TEST front/side/back จำนวน 3 รูปในเดือนกันยายน
- สร้างและจบเซสชัน IF พร้อม Mood “ดี”; มีเซสชันทดสอบแก้เวลาเริ่มเป็น 00:00 ผ่าน UI
- XP ปัจจุบัน 250/300, Level 1; ไม่ได้รับ XP จากภารกิจอดครบเป้าที่เงื่อนไขยังไม่ครบ
- ไม่ได้แก้ Google Sheet ต้นฉบับ; profile สำหรับ Login อยู่ใน `.auth/` ซึ่งถูก ignore
