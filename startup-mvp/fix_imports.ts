import fs from 'fs';

const files = [
  {
    path: 'app/(dashboard)/dashboard/procurements/purchases/_components/purchaseForm.tsx',
    replacements: [
      { from: '"../../master/items/_actions/item.action"', to: '"../../../master/items/_actions/item.action"' },
      { from: '"../../inventory/stock/_actions/stock.action"', to: '"../../../inventory/stock/_actions/stock.action"' },
    ]
  },
  {
    path: 'app/(dashboard)/dashboard/procurements/purchases/_components/supplierDialog.tsx',
    replacements: [
      { from: '"../../suppliers/_actions/supplier.action"', to: '"../../../suppliers/_actions/supplier.action"' }
    ]
  },
  {
    path: 'app/(dashboard)/dashboard/procurements/rtv/new/page.tsx',
    replacements: [
      { from: '"../../inventory/stock/_actions/stock.action"', to: '"../../../inventory/stock/_actions/stock.action"' }
    ]
  },
  {
    path: 'app/(dashboard)/dashboard/procurements/tpn/_components/tpn-form.tsx',
    replacements: [
      { from: '"../../stock/_actions/stock.action"', to: '"../../../inventory/stock/_actions/stock.action"' }
    ]
  }
];

for (const f of files) {
  let content = fs.readFileSync(f.path, 'utf8');
  for (const r of f.replacements) {
    content = content.replace(r.from, r.to);
  }
  fs.writeFileSync(f.path, content);
  console.log(`Updated ${f.path}`);
}
