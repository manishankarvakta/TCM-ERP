const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const schema = fs.readFileSync(schemaPath, 'utf8');

const targetModels = [
  'User', 'Employee', 'Lead', 'Client', 'Contact', 
  'Opportunity', 'Project', 'Task', 'Issue', 'Timesheet', 
  'Invoice', 'Order', 'Payroll', 'File', 'Quotation', 
  'Voucher', 'ChartOfAccount', 'settings'
];

console.log('=== ACTUAL PRISMA SCHEMA NULLABILITY INSPECTION ===');
for (const model of targetModels) {
  const modelRegex = new RegExp(`model ${model} \\{([^\\}]+)\\}`, 's');
  const match = schema.match(modelRegex);
  if (match) {
    const body = match[1];
    const orgLine = body.split('\n').find(l => l.includes('organizationId') || l.includes('organization_id'));
    const indexLine = body.split('\n').find(l => l.includes('@@index([organizationId])') || l.includes('@@index([organization_id])'));
    
    if (orgLine) {
      console.log(`Model: ${model}`);
      console.log(`  Field: ${orgLine.trim()}`);
      console.log(`  Has Index: ${Boolean(indexLine)}`);
    } else {
      console.log(`Model: ${model} (Field not found in schema)`);
    }
  }
}
