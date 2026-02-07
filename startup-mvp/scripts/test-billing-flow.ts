
import { PrismaClient } from "@prisma/client";
import { receiveOrderAdvance } from "../app/actions/advances";
import { postDelivery } from "../app/actions/deliveries";
import { createInvoice, postInvoice, applyAdvanceToInvoice } from "../app/actions/invoices";
import { getOrderFinancialSummary } from "../app/actions/orders";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Advanced Billing Flow Test...");

  // 1. Setup User and Client
  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ["admin", "super-admin"] } }
  });

  if (!adminUser) throw new Error("No admin user found");
  const userId = adminUser.id;
  console.log(`Using Admin User: ${adminUser.email} (${userId})`);

  // Create Unit if needed
  let unit = await prisma.unit.findFirst({ where: { status: "active" } });
  if (!unit) {
      unit = await prisma.unit.create({
          data: {
              details: "Pieces",
              symbol: "pcs-" + Date.now(),
              createdBy: userId,
              status: "active"
          }
      });
  }

  const client = await prisma.client.create({
    data: {
      name: "Test Client " + Date.now(),
      company: "Test Co",
      email: `test${Date.now()}@example.com`,
      // type: "CLIENT", // Removed
      status: "active",
      createdBy: userId,
    }
  });
  console.log(`Created Client: ${client.name} (${client.id})`);

  // 2. Create Item
  const item = await prisma.item.create({
    data: {
      code: "ITEM-" + Date.now(),
      // name: "Service Item 1", // Removed, schema uses description
      description: "Service Item 1",
      // type: "SERVICE", // Removed
      // sellingPrice: 100000, // Schema: unitPrice
      unitPrice: 100000,
      unitId: unit.id,
      status: "active"
    }
  });
  console.log(`Created Item: ${item.description} (${item.id})`);

  // 3. Create Quotation with Items (Required for Order)
  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber: `QT-TEST-${Date.now()}`,
      subject: "Test Quotation",
      clientId: client.id,
      submittedById: userId,
      status: "ACCEPTED",
      grandTotal: 1000000,
      total: 1000000,
      discount: 0,
      section: {
        create: [
          {
            title: "General",
            items: {
                create: [
                    {
                        sl: 1,
                        description: "Service Item 1",
                        itemId: item.id,
                        quantity: 10,
                        unitPrice: 100000,
                        amount: 1000000,
                        unit: "pcs"
                    }
                ]
            }
          }
        ]
      }
    },
    include: {
        section: {
            include: { items: true }
        }
    }
  });
  console.log(`Created Quotation: ${quotation.quotationNumber}`);
  const quotationItem = quotation.section[0].items[0];

  // 4. Create Order
  // We need an Order with Items.
  const orderNumber = `ORD-TEST-${Date.now()}`;
  const order = await prisma.order.create({
    data: {
      orderNumber,
      client: { connect: { id: client.id } },
      quotation: { connect: { id: quotation.id } },
      totalValue: 1000000, // 1M Total Acc VAlue
      status: "PENDING",
      items: {
        create: [
          {
            id: crypto.randomUUID(),
            itemId: item.id,
            quotationItemId: quotationItem.id, // Mandatory
            description: "Service Item 1",
            quantity: 10,
            unitPrice: 100000,
            amount: 1000000
          }
        ]
      },
    },
    include: { items: true }
  });
  console.log(`Created Order: ${order.orderNumber} (${order.id})`);

  // --- STEP 1 CHECK ---
  let summary = await getOrderFinancialSummary(order.id);
  console.log("\n[Step 1] Initial Status:");
  console.log(`  Revenue (Invoiced): ${summary.summary?.invoicedValue}`);
  if (summary.summary?.invoicedValue !== 0) throw new Error("Initial Revenue should be 0");

  // --- STEP 2: Receive Advance 500k ---
  console.log("\n[Step 2] Receiving Advance 500k...");
  
  // Find a Cash/Bank Account for receipt
  const paymentAccount = await prisma.chartOfAccount.findFirst({
    where: { type: "ASSET", name: { contains: "Cash", mode: "insensitive" } }
  });
  if (!paymentAccount) throw new Error("No Cash account found");

  const receiptRes = await receiveOrderAdvance({
    orderId: order.id,
    amount: 500000,
    paymentAccountId: paymentAccount.id,
    description: "Test Advance",
    userId
  });

  if (!receiptRes.success) throw new Error(`Receive Advance Failed: ${receiptRes.error}`);
  console.log("  Advance Received.");

  summary = await getOrderFinancialSummary(order.id);
  console.log("  Status Check:");
  console.log(`  Advance Received: ${summary.summary?.advanceReceived}`);
  console.log(`  Revenue: ${summary.summary?.invoicedValue}`);
  
  if (summary.summary?.advanceReceived !== 500000) throw new Error("Advance should be 500k");
  if (summary.summary?.invoicedValue !== 0) throw new Error("Revenue should be 0");

  // --- STEP 3: Deliver 600k ---
  console.log("\n[Step 3] Delivering 600k (6 items)...");
  const orderItem = order.items[0];
  const deliveryRes = await postDelivery({
    orderId: order.id,
    orderItemId: orderItem.id,
    quantity: 6, // 6 * 100k = 600k
    description: "Partial Delivery",
    userId
  });

  if (!deliveryRes.success) throw new Error(`Delivery Failed: ${deliveryRes.error}`);
  console.log("  Delivery Posted.");

  summary = await getOrderFinancialSummary(order.id);
  console.log("  Status Check:");
  console.log(`  Delivered Value: ${summary.summary?.deliveredValue}`);
  
  if (summary.summary?.deliveredValue !== 600000) throw new Error("Delivered should be 600k");

  // --- STEP 4: Invoice 600k ---
  console.log("\n[Step 4] Invoicing 600k...");
  // Need to know DeliveryLedgerId? createInvoice matches items by orderItemId, optionally deliveryLedgerId.
  // We can just bill the quantity.
  
  const invoiceRes = await createInvoice({
    orderId: order.id,
    items: [{
      orderItemId: orderItem.id,
      quantity: 6,
      unitPrice: 100000
    }],
    userId
  });

  if (!invoiceRes.success) throw new Error(`Create Invoice Failed: ${invoiceRes.error}`);
  const invoiceId = invoiceRes.invoiceId!;
  
  const postRes = await postInvoice(invoiceId, userId);
  if (!postRes.success) throw new Error(`Post Invoice Failed: ${postRes.error}`);
  console.log("  Invoice Posted.");

  summary = await getOrderFinancialSummary(order.id);
  console.log("  Status Check:");
  console.log(`  Revenue (Invoiced): ${summary.summary?.invoicedValue}`);
  console.log(`  Outstanding Due: ${summary.summary?.outstandingDue}`); // Should be 600k

  if (summary.summary?.invoicedValue !== 600000) throw new Error("Revenue should be 600k");
  if (summary.summary?.outstandingDue !== 600000) throw new Error("Due should be 600k");

  // --- STEP 5: Apply Advance 500k ---
  console.log("\n[Step 5] Applying Advance 500k to Invoice...");
  const applyRes = await applyAdvanceToInvoice({
    invoiceId,
    amount: 500000,
    userId
  });

  if (!applyRes.success) throw new Error(`Apply Advance Failed: ${applyRes.error}`);
  console.log("  Advance Applied.");

  summary = await getOrderFinancialSummary(order.id);
  console.log("  Status Check:");
  console.log(`  Outstanding Due: ${summary.summary?.outstandingDue}`); // Should be 100k

  if (Math.abs((summary.summary?.outstandingDue || 0) - 100000) > 0.1) throw new Error(`Due should be 100k, got ${summary.summary?.outstandingDue}`);

  console.log("\nSUCCESS: All steps verified correctly.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
