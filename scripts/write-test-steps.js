const fs = require('node:fs');
const cases = JSON.parse(fs.readFileSync('test-data/test-cases.json', 'utf8').replace(/^\uFEFF/, ''));
const issues = {
  'TC-EHP-005 W1-6': 'ขั้นตอนเป็นการแก้ไขและเปิดหน้าใหม่ แต่ Expected ระบุว่าไม่บันทึก ต้องยืนยันเกณฑ์ก่อนตัดสินผล ข้อเสนอ: ข้อมูลใหม่ต้องคงอยู่หลัง Refresh',
  'TC-IFG-001W1-8': 'Steps เลือก 16:8 แต่ Expected ระบุ 18:6 ต้องยืนยันเกณฑ์ก่อนตัดสินผล ข้อเสนอ: ต้องแสดง 16:8 ตามค่าที่เลือก',
  'TC-IFG-002W1-8': 'Data ระบุ 20:4, Steps ระบุ 18:6 และ Expected ระบุไม่บันทึก ต้องยืนยันเกณฑ์ก่อนตัดสินผล ข้อเสนอ: ทดสอบการเปลี่ยนเป็น 18:6 และ 20:4 แยกกัน',
};
function steps(value) {
  const text = String(value).trim();
  const first = text.search(/\b1\.\s*/);
  const numbered = first >= 0 ? text.slice(first) : text.replace(/^\.\s*/, '');
  return numbered.split(/(?:^|\s+)\d+\.\s*/).map(s => s.trim()).filter(Boolean)
    .map(s => s.replace(/กดบันทึ$/, 'กดบันทึก'));
}
const lines = [
  '# Test Steps — NutriJourney (74 Test Cases)',
  '',
  'เรียงลำดับตามชีตต้นฉบับใน `test-cases.json` เอกสารนี้เป็นขั้นตอนสำหรับทดสอบ ไม่ใช่ผลการรันหรือการยืนยันว่าผ่านแล้ว ปรับการขึ้นบรรทัดและลำดับเลขให้อ่านง่าย โดยคงข้อมูลทดสอบและ Expected จากชีตไว้',
  '',
  '## การเตรียมก่อนทดสอบ',
  '',
  '- เตรียม URL สภาพแวดล้อมทดสอบและบัญชี LINE สำหรับทดสอบ',
  '- แยกบัญชีใหม่/ไม่มีข้อมูลออกจากบัญชีที่มีข้อมูลเดิม และทดสอบเคสข้อมูลว่างก่อนบันทึกข้อมูล',
  '- เคสน้ำหนัก สัดส่วน และรูปภาพต้องใช้บัญชีที่ยังมีสิทธิ์บันทึกในเดือนนั้น',
  '- เคสกราฟและเปรียบเทียบรูปต้องมีข้อมูลย้อนหลังตาม Test Data ที่ระบุ',
  '- เคส XP และภารกิจต้องเตรียมภารกิจที่ยังไม่สำเร็จ พร้อมเกณฑ์ Level และรอบรีเซ็ตที่ยืนยันแล้ว',
  '- เคสแจ้งเตือน LINE ต้องตรวจข้อความที่ได้รับจริง พร้อมเวลาเริ่มและเวลาที่คาดว่าจะได้รับ',
  '- บันทึกผลจริง ภาพหลักฐาน และเวลาเมื่อรันแต่ละเคส เงื่อนไขไม่พร้อมให้ระบุ Blocked',
  '- มีข้อขัดแย้ง 3 เคสที่ทำเครื่องหมายไว้ด้านล่าง ดูเพิ่มเติมใน [review-notes.md](review-notes.md)',
  '',
  '## สารบัญ',
  '',
  '| ลำดับ | Test Case ID | ชื่อเคส |',
  '| ---: | --- | --- |',
  ...cases.map((c, i) => `| ${i + 1} | [${c.ID.trim()}](#case-${i + 1}) | ${c.Title.trim()} |`),
  '',
];
for (const [index, c] of cases.entries()) {
  const id = c.ID.trim();
  const list = steps(c.Steps);
  if (!list.length) throw new Error(`Missing steps: ${id}`);
  lines.push(`<a id="case-${index + 1}"></a>`, '', `## ${index + 1}. ${id} — ${c.Title.trim()}`, '',
    `**Module:** ${c.Module.trim()}`, '',
    `**เงื่อนไขก่อนทดสอบ:** ${c.Preconditions.trim()}`, '',
    `**ข้อมูลทดสอบ:** ${c.Data.trim() || 'ไม่ได้ระบุในชีต'}`, '',
    '**Test Steps**', '',
    ...list.map((s, i) => `${i + 1}. ${s.replace(/\s*\n\s*/g, ' ')}`), '',
    '**Expected Result (ตามชีต)**', '', c.Expected.trim(), '');
  if (issues[id]) lines.push(`> **รอยืนยันเกณฑ์:** ${issues[id]}`, '');
}
fs.writeFileSync('test-data/test-steps.md', lines.join('\n'));
console.log(`Wrote ${cases.length} cases to test-data/test-steps.md`);
