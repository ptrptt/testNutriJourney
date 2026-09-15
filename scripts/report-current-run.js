const fs = require('node:fs');
const cases = JSON.parse(fs.readFileSync('test-data/test-cases.json', 'utf8').replace(/^\uFEFF/, ''));
const latest = new Map();
for (const file of process.argv.slice(2)) {
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  function visit(suite) {
    for (const spec of suite.specs || []) for (const test of spec.tests || []) {
      const result = test.results.at(-1);
      if (!result) continue;
      const annotations = [...(test.annotations || []), ...(result.annotations || [])];
      const notes = [...new Set(annotations.filter(a => ['actual', 'skip'].includes(a.type)).map(a => a.description))].join('\n');
      latest.set(spec.title.split(' | ')[0].trim(), {
        status: result.status === 'passed' ? 'Pass' : result.status === 'skipped' ? 'Blocked' : 'Fail',
        actual: notes,
        error: result.error?.message?.replace(/\u001b\[[0-9;]*m/g, '') || '',
        source: file,
        startedAt: result.startTime,
      });
    }
    for (const child of suite.suites || []) visit(child);
  }
  for (const suite of report.suites || []) visit(suite);
}
const rows = cases.map(c => ({ id: c.ID.trim(), title: c.Title.trim(), module: c.Module,
  preconditions: c.Preconditions, data: c.Data, steps: c.Steps, expected: c.Expected,
  ...(latest.get(c.ID.trim()) || { status: 'Not Run', actual: 'ไม่มีผลในรอบนี้' }) }));
const counts = rows.reduce((out, row) => (out[row.status] = (out[row.status] || 0) + 1, out), {});
fs.writeFileSync('test-data/current-run.json', JSON.stringify({ generatedAt: new Date().toISOString(), counts, cases: rows }, null, 2));
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
fs.writeFileSync('test-data/current-run.html', `<!doctype html><html lang="th"><meta charset="utf-8"><title>ผลทดสอบรอบปัจจุบัน</title><style>body{font:16px system-ui;max-width:1100px;margin:32px auto;padding:16px}summary{padding:12px;cursor:pointer;background:#eef3ef}details{margin:8px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere}.Pass{color:green}.Fail{color:#b00020}.Blocked{color:#8a5600}section{padding:16px}</style><h1>ผลทดสอบรอบปัจจุบัน — 74 เคส</h1><p>${esc(JSON.stringify(counts))}</p><p>ผลจากการรันรอบนี้และรอบตรวจซ้ำที่ระบุ ไม่รวมผลผ่านจากรอบเก่า Blocked คือยังทดสอบครบขั้นตอนไม่ได้</p>${rows.map(r => `<details><summary><b class="${r.status}">${r.status}</b> ${esc(r.id)} — ${esc(r.title)}</summary><section><h3>เงื่อนไข / ข้อมูล</h3><pre>${esc(r.preconditions)}\n${esc(r.data)}</pre><h3>ขั้นตอน</h3><pre>${esc(r.steps)}</pre><h3>ผลที่คาดหวังจากชีต</h3><pre>${esc(r.expected)}</pre><h3>ผลจริง / ข้อจำกัด</h3><pre>${esc(r.actual)}\n${esc(r.error)}</pre><p>หลักฐาน: <a href="${esc(r.source?.replace(/^test-data\//, ''))}">${esc(r.source)}</a> ${esc(r.startedAt)}</p></section></details>`).join('')}</html>`);
console.log(counts);
