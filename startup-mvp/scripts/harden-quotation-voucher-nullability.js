const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Harden Quotation.organizationId to String
const quotationRegex = /(model Quotation \{[^\}]*?organizationId\s+)String\?/s;
schema = schema.replace(quotationRegex, '$1String');

// Harden Voucher.organizationId to String
const voucherRegex = /(model Voucher \{[^\}]*?organizationId\s+)String\?/s;
schema = schema.replace(voucherRegex, '$1String');

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Successfully updated Quotation.organizationId and Voucher.organizationId to required String in schema.prisma');
