const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const targetModels = [
  'Lead', 'Client', 'Contact', 'Opportunity', 'Project', 
  'Task', 'Issue', 'Timesheet', 'Invoice', 'Order', 
  'Payroll', 'File', 'ChartOfAccount'
];

for (const model of targetModels) {
  const modelRegex = new RegExp(`(model ${model} \\{[^\\}]*)(\\n\\})`, 's');
  const match = schema.match(modelRegex);
  if (match && !match[1].includes('@@index([organizationId])')) {
    schema = schema.replace(modelRegex, `$1\n\n  @@index([organizationId])$2`);
  }
}

// Ensure settings has @@index([organization_id])
const settingsRegex = /(model settings \{[^\}]*)(\n\})/s;
const settingsMatch = schema.match(settingsRegex);
if (settingsMatch && !settingsMatch[1].includes('@@index([organization_id])')) {
  schema = schema.replace(settingsRegex, `$1\n\n  @@index([organization_id])$2`);
}

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Successfully added @@index([organizationId]) to all target models.');
