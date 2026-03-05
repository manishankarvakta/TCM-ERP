const fs = require('fs');

const itemRegex = /^\s*(code|description|height|width|depth|unit|unitShutter|totalShutter|note):\s*.*,?\r?\n/gm;

for (let i = 1; i <= 4; i++) {
  const file = `prisma/seed-module-group-items-${i}.ts`;
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove unwanted properties everywhere
    content = content.replace(itemRegex, '');
    
    // Fix quantity: null -> quantity: parseDecimal("1")
    content = content.replace(/quantity:\s*null,/g, 'quantity: parseDecimal("1"),');
    
    // Inject itemId into object literals
    // After sl: <number>, we put itemId:
    content = content.replace(/(sl:\s*\d+,)/g, '$1\n        itemId: "cm1placeholderItem",');

    // Inject itemId into upsert update
    content = content.replace(/(sl:\s*item\.sl,)/g, '$1\n          itemId: item.itemId,');
    
    fs.writeFileSync(file, content);
    console.log(`Fixed ${file}`);
  }
}

// Fix seed-module-groups.ts
const mgFile = 'prisma/seed-module-groups.ts';
if (fs.existsSync(mgFile)) {
    let content = fs.readFileSync(mgFile, 'utf8');
    
    // In items array, add a default name
    content = content.replace(/(code:\s*".*",)/g, '$1\n        name: "Migrated Group",');
    // In upsert update
    content = content.replace(/(code:\s*group\.code,)/g, '$1\n          name: group.name,');
    
    fs.writeFileSync(mgFile, content);
    console.log(`Fixed ${mgFile}`);
}
