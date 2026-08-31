const fs = require('fs');

const data = JSON.parse(fs.readFileSync('scratch/output.json', 'utf8'));

console.log("=== 1. VOUCHERS SUMMARY ===");
data.vouchers.forEach(v => {
  console.log(`\nVoucher: ${v.voucherNumber} (ID: ${v.id})`);
  console.log(`  Type: ${v.type}, Status: ${v.status}, Date: ${v.date}`);
  console.log(`  Reference: ${v.reference}, Description: ${v.description}`);
  console.log(`  Client: ${v.Client ? v.Client.name + ' (' + v.Client.clientCode + ')' : 'None'}`);
  console.log(`  CreatedBy: ${v.User_Voucher_createdByToUser ? v.User_Voucher_createdByToUser.name : v.createdBy}`);
  console.log(`  PostedBy: ${v.User_Voucher_postedByIdToUser ? v.User_Voucher_postedByIdToUser.name : v.postedById}`);
  console.log(`  VoucherLines:`);
  v.VoucherLine.forEach(l => {
    console.log(`    Line ${l.lineNumber}: Debit=${l.debitAmount}, Credit=${l.creditAmount}, Account=[${l.ChartOfAccount.code}] ${l.ChartOfAccount.name}, Desc=${l.description}`);
  });
  console.log(`  JournalEntry:`);
  v.JournalEntry.forEach(j => {
    console.log(`    JE Number: ${j.entryNumber}, Status: ${j.status}`);
    j.JournalEntryLine.forEach(jl => {
      console.log(`      JE Line ${jl.lineNumber}: Debit=${jl.debitAmount}, Credit=${jl.creditAmount}, Account=[${jl.ChartOfAccount.code}] ${jl.ChartOfAccount.name}, Desc=${jl.description}`);
    });
  });
  console.log(`  Sales Linked: ${v.sales.map(s => s.saleNumber).join(', ')}`);
});

console.log("\n=== 2. SALE SUMMARY ===");
data.sales.forEach(s => {
  console.log(`Sale: ${s.saleNumber} (ID: ${s.id})`);
  console.log(`  Date: ${s.date}, Status: ${s.status}, OrderType: ${s.orderType}`);
  console.log(`  Warehouse: ${s.warehouse ? s.warehouse.name : s.warehouseId}`);
  console.log(`  Client: ${s.client ? s.client.name + ' (' + s.client.clientCode + ')' : s.clientId}`);
  console.log(`  Sales Assistant: ${s.salesAssistant ? s.salesAssistant.name : 'None'}`);
  console.log(`  SubTotal: ${s.subTotal}, Discount: ${s.discount}, Tax: ${s.tax}, DeliveryCharge: ${s.deliveryCharge}, GrandTotal: ${s.grandTotal}`);
  console.log(`  Payment Details:`, JSON.stringify(s.paymentDetails));
  console.log(`  VoucherId: ${s.voucherId}`);
  console.log(`  Voucher Number: ${s.voucher ? s.voucher.voucherNumber : 'None'}`);
  console.log(`  CreatedBy: ${s.createdByUser ? s.createdByUser.name : s.createdBy}`);
  console.log(`  UpdatedBy: ${s.updatedByUser ? s.updatedByUser.name : s.updatedBy}`);
  console.log(`  Created/Updated: Created=${s.createdAt}, Updated=${s.updatedAt}`);
  console.log(`  Items (${s.items.length}):`);
  let calculatedSubtotal = 0;
  s.items.forEach((item, idx) => {
    const itemTotal = Number(item.quantity) * Number(item.unitPrice) - Number(item.discount || 0);
    calculatedSubtotal += itemTotal;
    console.log(`    Item ${idx+1}: ItemName=${item.item ? item.item.name : item.itemId}, SKU=${item.variant ? item.variant.sku : 'N/A'}, Qty=${item.quantity}, Price=${item.unitPrice}, Disc=${item.discount}, Net=${itemTotal}`);
  });
  console.log(`  Calculated Items Total: ${calculatedSubtotal}`);
});

console.log("\n=== 3. STOCK LEDGERS ===");
console.log(`Count: ${data.stockLedgers.length}`);
data.stockLedgers.forEach(sl => {
  console.log(`  Type: ${sl.transactionType}, Qty: ${sl.quantity}, Rate: ${sl.rate}, RefType: ${sl.referenceType}, RefId: ${sl.referenceId}, Item: ${sl.item ? sl.item.name : sl.itemId}, Variant SKU: ${sl.variant ? sl.variant.sku : sl.variantId}`);
});

console.log("\n=== 4. RELATED VOUCHERS ===");
console.log(`Count: ${data.relatedVouchers.length}`);
data.relatedVouchers.forEach(v => {
  console.log(`  Voucher: ${v.voucherNumber}, Type: ${v.type}, Date: ${v.date}, Ref: ${v.reference}, Desc: ${v.description}, Status: ${v.status}`);
  v.VoucherLine.forEach(l => {
    console.log(`    Line ${l.lineNumber}: Debit=${l.debitAmount}, Credit=${l.creditAmount}, Account=[${l.ChartOfAccount.code}] ${l.ChartOfAccount.name}`);
  });
});

console.log("\n=== 5. CLIENT SALES ===");
if (data.clientSales) {
  console.log(`Count: ${data.clientSales.length}`);
  data.clientSales.forEach(cs => {
    console.log(`  Sale: ${cs.saleNumber}, Date: ${cs.date}, Status: ${cs.status}, GrandTotal: ${cs.grandTotal}, Voucher: ${cs.voucher ? cs.voucher.voucherNumber : 'None'}`);
  });
}
