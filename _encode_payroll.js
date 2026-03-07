
const fs = require('fs');

const content = ;

const b64 = Buffer.from(content).toString('base64');
fs.writeFileSync('d:/Continuum/_payroll_b64.txt', b64);
console.log('Encoded ' + content.length + ' chars');
