const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const additions = [
  {
    target: 'model Lead {',
    insert: `model Lead {
  organizationId   String?       @default("default-org")
  Organization     Organization? @relation(fields: [organizationId], references: [id])`
  },
  {
    target: 'model Client {',
    insert: `model Client {
  organizationId   String?          @default("default-org")
  Organization     Organization?    @relation(fields: [organizationId], references: [id])`
  },
  {
    target: 'model Contact {',
    insert: `model Contact {
  organizationId   String?       @default("default-org")
  Organization     Organization? @relation(fields: [organizationId], references: [id])`
  },
  {
    target: 'model Opportunity {',
    insert: `model Opportunity {
  organizationId   String?          @default("default-org")
  Organization     Organization?    @relation(fields: [organizationId], references: [id])`
  },
  {
    target: 'model Project {',
    insert: `model Project {
  organizationId   String?            @default("default-org")
  Organization     Organization?      @relation(fields: [organizationId], references: [id])`
  },
  {
    target: 'model Task {',
    insert: `model Task {
  organizationId   String?       @default("default-org")
  Organization     Organization? @relation(fields: [organizationId], references: [id])`
  },
  {
    target: 'model Issue {',
    insert: `model Issue {
  organizationId   String?     @default("default-org")
  Organization     Organization? @relation(fields: [organizationId], references: [id])`
  },
  {
    target: 'model Timesheet {',
    insert: `model Timesheet {
  organizationId   String?   @default("default-org")
  Organization     Organization? @relation(fields: [organizationId], references: [id])`
  },
  {
    target: 'model Invoice {',
    insert: `model Invoice {
  organizationId   String?   @default("default-org")
  Organization     Organization? @relation(fields: [organizationId], references: [id])`
  },
  {
    target: 'model Order {',
    insert: `model Order {
  organizationId   String?   @default("default-org")
  Organization     Organization? @relation(fields: [organizationId], references: [id])`
  },
  {
    target: 'model Payroll {',
    insert: `model Payroll {
  organizationId   String?   @default("default-org")
  Organization     Organization? @relation(fields: [organizationId], references: [id])`
  },
  {
    target: 'model File {',
    insert: `model File {
  organizationId   String?   @default("default-org")
  Organization     Organization? @relation(fields: [organizationId], references: [id])`
  },
  {
    target: 'model settings {',
    insert: `model settings {
  organization_id String?       @default("default-org")
  Organization    Organization? @relation(fields: [organization_id], references: [id])`
  },
  {
    target: 'model ChartOfAccount {',
    insert: `model ChartOfAccount {
  organizationId String?       @default("default-org")
  Organization   Organization? @relation(fields: [organizationId], references: [id])`
  }
];

for (const add of additions) {
  if (content.includes(add.target) && !content.includes(add.insert)) {
    content = content.replace(add.target, add.insert);
  }
}

fs.writeFileSync(schemaPath, content, 'utf8');
console.log('Successfully updated schema.prisma with organizationId fields.');
