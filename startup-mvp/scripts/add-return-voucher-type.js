const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const target = `enum VoucherType {
  PAYMENT
  RECEIPT
  JOURNAL
  CONTRA
  SALES
  PURCHASE
  ADJUSTMENT
}`;

const replacement = `enum VoucherType {
  PAYMENT
  RECEIPT
  JOURNAL
  CONTRA
  SALES
  PURCHASE
  ADJUSTMENT
  RETURN
}`;

if (schema.includes(target)) {
  schema = schema.replace(target, replacement);
  fs.writeFileSync(schemaPath, schema, 'utf8');
  console.log('Successfully added RETURN to VoucherType enum in schema.prisma');
} else {
  console.log('Target enum VoucherType pattern not found or already updated');
}
