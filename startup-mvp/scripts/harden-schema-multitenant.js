const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// Replace @default("default-org") everywhere
content = content.replace(/@default\("default-org"\)/g, '');

// Hardened model updates for tenant-owned entities (change String? to String where appropriate)
const requiredReplacements = [
  { from: 'organizationId   String?       \n  Organization     Organization?', to: 'organizationId   String        \n  Organization     Organization' },
  { from: 'organizationId   String?          \n  Organization     Organization?', to: 'organizationId   String           \n  Organization     Organization' },
  { from: 'organizationId   String?            \n  Organization     Organization?', to: 'organizationId   String             \n  Organization     Organization' },
  { from: 'organizationId   String?     \n  Organization     Organization?', to: 'organizationId   String      \n  Organization     Organization' },
  { from: 'organizationId   String?   \n  Organization     Organization?', to: 'organizationId   String    \n  Organization     Organization' },
  { from: 'organizationId                            String?           \n  OrganizationBelongsTo                     Organization?', to: 'organizationId                            String            \n  OrganizationBelongsTo                     Organization?' },
  { from: 'organizationId         String?            \n  Organization           Organization?', to: 'organizationId         String             \n  Organization           Organization?' },
];

for (const rep of requiredReplacements) {
  content = content.split(rep.from).join(rep.to);
}

fs.writeFileSync(schemaPath, content, 'utf8');
console.log('Successfully hardened schema.prisma (removed default-org defaults).');
