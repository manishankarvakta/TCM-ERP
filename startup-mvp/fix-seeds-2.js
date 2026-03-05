const fs = require('fs');

for (let i = 1; i <= 4; i++) {
  const file = `prisma/seed-module-group-items-${i}.ts`;
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Fix quantity type issue
    // The previous script replaced "quantity: null," with "quantity: parseDecimal("1"),"
    // and items.quantity is typed as `Prisma.Decimal | null`. We'll just force it to new Prisma.Decimal
    content = content.replace(/quantity:\s*parseDecimal\("1"\)/g, 'quantity: new Prisma.Decimal("1")');
    content = content.replace(/quantity:\s*parseDecimal\((.*?)\)/g, 'quantity: new Prisma.Decimal($1)');

    // Fix console.log(`✅ Upserted item: ${item.code || item.id}`);
    content = content.replace(/\$\{item\.code \|\| item\.id\}/g, '${item.id}');
    
    fs.writeFileSync(file, content);
    console.log(`Fixed ${file}`);
  }
}
