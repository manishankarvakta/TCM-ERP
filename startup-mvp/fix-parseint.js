const fs = require('fs');
const file = 'prisma/seed-module-group-items-1.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/return parseInt\(value, 10\);/g, 'return globalThis.parseInt(value, 10);');
fs.writeFileSync(file, content);
console.log('Fixed parseInt in ' + file);
