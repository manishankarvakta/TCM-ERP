import { prisma } from "../lib/prisma";

async function main() {
  console.log("Generating demo sales for today...");

  // 1. Resolve Biller/User
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found!");
    return;
  }
  const billerId = user.id;

  // 2. Resolve Warehouse
  const warehouse = await prisma.warehouse.findFirst();
  if (!warehouse) {
    console.error("No warehouse found!");
    return;
  }
  const warehouseId = warehouse.id;

  // 3. Resolve Client
  const client = await prisma.client.findFirst();
  if (!client) {
    console.error("No client found!");
    return;
  }
  const clientId = client.id;

  // 4. Resolve Payment Accounts (COAs)
  const cashCOA = await prisma.chartOfAccount.findFirst({
    where: { type: "ASSET", name: { contains: "Cash", mode: "insensitive" } }
  });
  const bankCOA = await prisma.chartOfAccount.findFirst({
    where: { type: "ASSET", name: { contains: "Bank", mode: "insensitive" } }
  });
  const bkashCOA = await prisma.chartOfAccount.findFirst({
    where: { type: "ASSET", name: { contains: "bkash", mode: "insensitive" } }
  });

  const cashAccountId = cashCOA?.id || "cash-id-fallback";
  const cardAccountId = bankCOA?.id || "card-id-fallback";
  const mfsAccountId = bkashCOA?.id || "bkash-id-fallback";

  console.log(`Biller: ${user.name} (${billerId})`);
  console.log(`Warehouse: ${warehouse.name} (${warehouseId})`);
  console.log(`Client: ${client.name} (${clientId})`);
  console.log(`Cash Account: ${cashCOA?.name} (${cashAccountId})`);
  console.log(`Card Account: ${bankCOA?.name} (${cardAccountId})`);
  console.log(`MFS Account: ${bkashCOA?.name} (${mfsAccountId})`);

  // Define today in Dhaka timezone
  // Today is August 3, 2026.
  const todayStr = "2026-08-03";
  const saleDate = new Date(`${todayStr}T12:00:00.000+06:00`);

  // Demo Sale 1: Cash sale
  const sale1Num = `DEMO-SAL-${Date.now()}-1`;
  await prisma.sale.create({
    data: {
      saleNumber: sale1Num,
      clientId,
      warehouseId,
      date: saleDate,
      status: "COMPLETED",
      subTotal: 1500,
      discount: 0,
      tax: 0,
      grandTotal: 1500,
      orderType: "RETAIL",
      createdBy: billerId,
      paymentDetails: {
        cashAmount: 1500,
        cashAccountId,
        cardAmount: 0,
        cardAccountId: null,
        mfsAmount: 0,
        mfsAccountId: null
      }
    }
  });
  console.log(`Created Cash Sale: ${sale1Num} (1,500 BDT)`);

  // Demo Sale 2: Card sale
  const sale2Num = `DEMO-SAL-${Date.now()}-2`;
  await prisma.sale.create({
    data: {
      saleNumber: sale2Num,
      clientId,
      warehouseId,
      date: saleDate,
      status: "COMPLETED",
      subTotal: 2500,
      discount: 0,
      tax: 0,
      grandTotal: 2500,
      orderType: "RETAIL",
      createdBy: billerId,
      paymentDetails: {
        cashAmount: 0,
        cashAccountId: null,
        cardAmount: 2500,
        cardAccountId,
        mfsAmount: 0,
        mfsAccountId: null
      }
    }
  });
  console.log(`Created Card Sale: ${sale2Num} (2,500 BDT)`);

  // Demo Sale 3: Split payment Cash & bkash
  const sale3Num = `DEMO-SAL-${Date.now()}-3`;
  await prisma.sale.create({
    data: {
      saleNumber: sale3Num,
      clientId,
      warehouseId,
      date: saleDate,
      status: "COMPLETED",
      subTotal: 3500,
      discount: 0,
      tax: 0,
      grandTotal: 3500,
      orderType: "RETAIL",
      createdBy: billerId,
      paymentDetails: {
        cashAmount: 1000,
        cashAccountId,
        cardAmount: 0,
        cardAccountId: null,
        mfsAmount: 2500,
        mfsAccountId
      }
    }
  });
  console.log(`Created Split Sale: ${sale3Num} (1,000 Cash + 2,500 bKash BDT)`);

  // Demo Sale 4: Credit sale with partial cash payment (creates outstanding due)
  const sale4Num = `DEMO-SAL-${Date.now()}-4`;
  const sale4 = await prisma.sale.create({
    data: {
      saleNumber: sale4Num,
      clientId,
      warehouseId,
      date: saleDate,
      status: "COMPLETED",
      subTotal: 10000,
      discount: 0,
      tax: 0,
      grandTotal: 10000,
      orderType: "RETAIL",
      createdBy: billerId,
      paymentDetails: {
        cashAmount: 4000,
        cashAccountId,
        cardAmount: 0,
        cardAccountId: null,
        mfsAmount: 0,
        mfsAccountId: null,
        dueCollections: []
      }
    }
  });
  console.log(`Created Credit Sale: ${sale4Num} (Grand Total: 10,000, Cash Paid: 4,000, Due: 6,000 BDT)`);

  // Simulating a due payment collection of 6,000 BDT on this credit sale
  const collectionId = `COLL_DEMO_${Date.now()}`;
  const updatedDetails = {
    cashAmount: 4000,
    cashAccountId,
    cardAmount: 0,
    cardAccountId: null,
    mfsAmount: 0,
    mfsAccountId: null,
    dueCollections: [
      {
        id: collectionId,
        date: saleDate,
        cashAmount: 6000,
        cashAccountId,
        cardAmount: 0,
        cardAccountId: null,
        mfsAmount: 0,
        mfsAccountId: null
      }
    ]
  };

  await prisma.sale.update({
    where: { id: sale4.id },
    data: {
      paymentDetails: updatedDetails
    }
  });

  // Create standard receipt Voucher mapping this collection so the system recognizes the collection
  await prisma.voucher.create({
    data: {
      voucherNumber: `DEMO-VOU-${Date.now()}`,
      date: saleDate,
      type: "RECEIPT",
      reference: collectionId,
      description: `Due Collection Demo - ${client.name}`,
      clientId,
      warehouseId,
      status: "posted",
      createdBy: billerId,
      isLocked: true,
      VoucherLine: {
        create: [
          {
            lineNumber: 1,
            debitAmount: 6000,
            creditAmount: 0,
            description: "Dues Collection (Cash)",
            chartOfAccountId: cashAccountId
          },
          {
            lineNumber: 2,
            debitAmount: 0,
            creditAmount: 6000,
            description: "Accounts Receivable Offset",
            chartOfAccountId: cashAccountId 
          }
        ]
      }
    }
  });
  console.log(`Created Dues Collection receipt voucher for ${collectionId} (6,000 BDT)`);
  console.log("All demo data created successfully!");
}

main().catch(err => {
  console.error("Error creating demo data:", err);
});
