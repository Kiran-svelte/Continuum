const data = JSON.parse(require('fs').readFileSync('C:/Users/kiran/.claude/projects/d--Continuum/e9e38950-f87b-430c-a22d-21c8004cc117/tool-results/toolu_bdrk_01DXJt5ZAuSvcozHysFGkKZ6.json','utf8'));
const text = Array.isArray(data) ? data[0].text : data.text;
const diags = JSON.parse(text);
const errors = [];
const warnings = [];
diags.forEach(function(f) {
  var fp = f.filePath.replace(/.*?web[\\/]/, '');
  (f.diagnostics || []).forEach(function(d) {
    var line = d.range && d.range.start ? d.range.start.line + 1 : 0;
    var entry = fp + ':' + line + ' [' + (d.source || '') + '] ' + d.message;
    if (d.severity === 'error') errors.push(entry);
    else if (d.severity === 'warning') warnings.push(entry);
  });
});
console.log('=== ERRORS (' + errors.length + ') ===');
errors.forEach(function(e) { console.log(e); });
console.log('\n=== WARNINGS (' + warnings.length + ') ===');
warnings.forEach(function(w) { console.log(w); });
