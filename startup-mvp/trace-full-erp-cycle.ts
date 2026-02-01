
import { prisma } from "@/lib/prisma";
import { processPurchaseReceipt } from "./app/actions/purchase-accounting-integration";
// import { adjustInventory } from "./app/actions/adjustment-accounting-integration"; // Not using direct action for production to allow custom WIP trace

// Helper to get Account Balance
async function logBalances(stepName: string) {
    console.log(`\n📊 [${stepName}] GL BALANCES:`);
    const accounts = ["Inventory Asset", "Accounts Payable", "Bank", "Work In Progress", "Accounts Receivable", "Sales", "Cost of Goods Sold"];
    
    for (const name of accounts) {
        const account = await prisma.chartOfAccount.findFirst({
            where: { name: { contains: name } },
            include: { JournalEntryLine: true }
        });

        if (account) {
            const dr = account.JournalEntryLine.reduce((sum, line) => sum + Number(line.debitAmount), 0);
            const cr = account.JournalEntryLine.reduce((sum, line) => sum + Number(line.creditAmount), 0);
            const balance = Math.abs(dr - cr).toFixed(2);
            // Simple visual check: Dr > Cr ? Dr : Cr suffix
            const side = dr > cr ? "DR" : "CR";
            console.log(`   - ${name.padEnd(20)}: ${side} ${balance} (Dr: ${dr}, Cr: ${cr})`);
        } else {
            // console.log(`   - ${name.padEnd(20)}: Not Found`);
        }
    }
    console.log("-------------------------------------------------------");
}

async function traceFullErpCycle() {
  console.log("🏭 Starting Full ERP Accounting Scenario Trace...");
  
  try {
     // ==================================================================================
     // 0. Setup
     // ==================================================================================
     const user = await prisma.user.findFirst();
     if (!user) throw new Error("No user found");

     // Create RM Item
     const rmItem = await prisma.item.create({
         data: {
             code: `RM-${Date.now()}`,
             description: "Raw Material (Steel)",
             unitPrice: 0, // Buying
             costPrice: 50,
             quantity: 0,
             unitId: (await prisma.unit.findFirst())?.id || "unit_id",
             // createdBy: user.id // REMOVED
         }
     });

     // Create FG Item
     const fgItem = await prisma.item.create({
         data: {
             code: `FG-${Date.now()}`,
             description: "Finished Good (Table)",
             unitPrice: 200, // Selling Price
             costPrice: 150, // Standard Cost (RM + Labor usually, but we simplify)
             quantity: 0,
             unitId: rmItem.unitId,
             // createdBy: user.id // REMOVED
         }
     });

     const supplier = await prisma.supplier.create({
         data: { name: `Supp-${Date.now()}`, email: `sup-${Date.now()}@test.com`, createdBy: user.id }
     });

     const client = await prisma.client.create({
         data: { name: `Cli-${Date.now()}`, email: `cli-${Date.now()}@test.com`, createdBy: user.id }
     });

     console.log(`✅ Setup: RM=${rmItem.code}, FG=${fgItem.code}, Supp=${supplier.name}`);
     await logBalances("Initial State");


     // ==================================================================================
     // 1. Purchase Raw Material (Credit)
     // ==================================================================================
     console.log("\nSTEP 1: Purchase Raw Material (10 units @ $50)...");
     const po = await prisma.purchase.create({
         data: {
             purchaseNumber: `PO-${Date.now()}`,
             supplierId: supplier.id,
             status: "DRAFT",
             grandTotal: 500,
             subTotal: 500,
             items: {
                 create: [{ itemId: rmItem.id, quantity: 10, unitPrice: 50, amount: 500, description: "Steel" }]
             },
             createdBy: user.id
         }
     });
     
     await processPurchaseReceipt(po.id, user.id); // Triggers Accounting
     await logBalances("After Purchase");


     // ==================================================================================
     // 2. Pay Supplier Partially ($200)
     // ==================================================================================
     console.log("\nSTEP 2: Partial Payment to Supplier ($200)...");
     const bankAccount = await prisma.chartOfAccount.findFirst({ where: { name: "Bank" } });
     const apAccount = await prisma.chartOfAccount.findFirst({ where: { name: "Accounts Payable" } });
     
     if(bankAccount && apAccount) {
         await prisma.voucher.create({
             data: {
                 voucherNumber: `PAY-${Date.now()}`,
                 type: "PAYMENT",
                 date: new Date(),
                 status: "posted",
                 createdBy: user.id,
                 postedById: user.id,
                 postedAt: new Date(),
                 VoucherLine: {
                     create: [
                         { lineNumber: 1, debitAmount: 200, creditAmount: 0, chartOfAccountId: apAccount.id, supplierId: supplier.id }, // DR AP
                         { lineNumber: 2, debitAmount: 0, creditAmount: 200, chartOfAccountId: bankAccount.id } // CR Bank
                     ]
                 },
                 JournalEntry: {
                     create: {
                         entryNumber: `JRN-PAY-${Date.now()}`,
                         date: new Date(),
                         status: "posted",
                         createdBy: user.id,
                         postedBy: user.id,
                         postedAt: new Date(),
                         JournalEntryLine: {
                             create: [
                                 { lineNumber: 1, debitAmount: 200, creditAmount: 0, chartOfAccountId: apAccount.id, supplierId: supplier.id },
                                 { lineNumber: 2, debitAmount: 0, creditAmount: 200, chartOfAccountId: bankAccount.id }
                             ]
                         }
                     }
                 }
             }
         });
         await logBalances("After Payment");
     }


     // ==================================================================================
     // 3. Start Production (Consume RM)
     // ==================================================================================
     console.log("\nSTEP 3: Consume RM (10 units) -> WIP...");
     
     const wipAccount = await prisma.chartOfAccount.findFirst({ where: { name: "Work In Progress" } });
     const invAssetAccount = await prisma.chartOfAccount.findFirst({ where: { name: "Inventory Asset" } });

     if (wipAccount && invAssetAccount) {
         const amount = 10 * 50; // 500
         // Decrease Stock
         await prisma.item.update({ where: { id: rmItem.id }, data: { quantity: { decrement: 10 } } });
         await prisma.inventoryTransaction.create({
             data: {
                 itemId: rmItem.id,
                 quantity: -10,
                 type: "ADJUSTMENT", 
                 reference: "PROD-START",
                 createdBy: user.id 
             }
         });

         // Post Journal: DR WIP, CR Inventory
         await prisma.voucher.create({
             data: {
                 voucherNumber: `PROD-START-${Date.now()}`,
                 type: "JOURNAL", 
                 status: "posted",
                 createdBy: user.id,
                 postedById: user.id,
                 postedAt: new Date(),
                 VoucherLine: {
                     create: [
                         { lineNumber: 1, debitAmount: amount, creditAmount: 0, chartOfAccountId: wipAccount.id }, // DR WIP
                         { lineNumber: 2, debitAmount: 0, creditAmount: amount, chartOfAccountId: invAssetAccount.id } // CR Inv
                     ]
                 },
                 JournalEntry: {
                     create: {
                         entryNumber: `J-PROD-S-${Date.now()}`,
                         status: "posted",
                         createdBy: user.id,
                         postedBy: user.id,
                         postedAt: new Date(),
                         JournalEntryLine: {
                             create: [
                                 { lineNumber: 1, debitAmount: amount, creditAmount: 0, chartOfAccountId: wipAccount.id },
                                 { lineNumber: 2, debitAmount: 0, creditAmount: amount, chartOfAccountId: invAssetAccount.id }
                             ]
                         }
                     }
                 }
             }
         });
         await logBalances("After RM Consumption");
     }

     // ==================================================================================
     // 4. Complete Production (Create FG)
     // ==================================================================================
     console.log("\nSTEP 4: Finish Production (Create 2 FG) -> Output...");
     
     if (wipAccount && invAssetAccount) {
         const amount = 500; 
         // Increase FG Stock
         await prisma.item.update({ where: { id: fgItem.id }, data: { quantity: { increment: 2 } } });
         await prisma.item.update({ where: { id: fgItem.id }, data: { costPrice: 250 } });

         await prisma.inventoryTransaction.create({
             data: {
                 itemId: fgItem.id,
                 quantity: 2,
                 type: "ADJUSTMENT",
                 reference: "PROD-FINISH",
                 createdBy: user.id
             }
         });

         // Post Journal: DR Inventory, CR WIP
         await prisma.voucher.create({
             data: {
                 voucherNumber: `PROD-END-${Date.now()}`,
                 type: "JOURNAL",
                 status: "posted",
                 createdBy: user.id,
                 postedById: user.id,
                 postedAt: new Date(),
                 VoucherLine: {
                     create: [
                         { lineNumber: 1, debitAmount: amount, creditAmount: 0, chartOfAccountId: invAssetAccount.id }, // DR Inv
                         { lineNumber: 2, debitAmount: 0, creditAmount: amount, chartOfAccountId: wipAccount.id } // CR WIP
                     ]
                 },
                 JournalEntry: {
                     create: {
                         entryNumber: `J-PROD-E-${Date.now()}`,
                         status: "posted",
                         createdBy: user.id,
                         postedBy: user.id,
                         postedAt: new Date(),
                         JournalEntryLine: {
                             create: [
                                 { lineNumber: 1, debitAmount: amount, creditAmount: 0, chartOfAccountId: invAssetAccount.id },
                                 { lineNumber: 2, debitAmount: 0, creditAmount: amount, chartOfAccountId: wipAccount.id }
                             ]
                         }
                     }
                 }
             }
         });
         await logBalances("After FG Production");
     }


     // ==================================================================================
     // 5. Sell FG (Credit)
     // ==================================================================================
     console.log("\nSTEP 5: Sell 1 FG ($400) on Credit...");
     
     const arAccount = await prisma.chartOfAccount.findFirst({ where: { name: "Accounts Receivable" } });
     const salesAccount = await prisma.chartOfAccount.findFirst({ where: { name: "Sales" } });
     const cogsAccount = await prisma.chartOfAccount.findFirst({ where: { name: "Cost of Goods Sold" } });

     if (arAccount && salesAccount && cogsAccount && invAssetAccount) {
         // Decrease Stock
          await prisma.item.update({ where: { id: fgItem.id }, data: { quantity: { decrement: 1 } } });
          await prisma.inventoryTransaction.create({
              data: {
                  itemId: fgItem.id,
                  quantity: -1,
                  type: "SALE",
                  reference: "SALE-INV",
                  createdBy: user.id
              }
          });

         // Post Sales Journal
         await prisma.voucher.create({
             data: {
                 voucherNumber: `SALE-${Date.now()}`,
                 type: "SALES",
                 status: "posted",
                 createdBy: user.id,
                 postedById: user.id,
                 postedAt: new Date(),
                 VoucherLine: {
                     create: [
                         { lineNumber: 1, debitAmount: 400, creditAmount: 0, chartOfAccountId: arAccount.id, clientId: client.id }, // DR AR
                         { lineNumber: 2, debitAmount: 0, creditAmount: 400, chartOfAccountId: salesAccount.id }, // CR Revenue
                         { lineNumber: 3, debitAmount: 250, creditAmount: 0, chartOfAccountId: cogsAccount.id }, // DR COGS
                         { lineNumber: 4, debitAmount: 0, creditAmount: 250, chartOfAccountId: invAssetAccount.id } // CR Inv
                     ]
                 },
                 JournalEntry: {
                     create: {
                         entryNumber: `J-SALE-${Date.now()}`,
                         status: "posted",
                         createdBy: user.id,
                         postedBy: user.id,
                         postedAt: new Date(),
                         JournalEntryLine: {
                             create: [
                                 { lineNumber: 1, debitAmount: 400, creditAmount: 0, chartOfAccountId: arAccount.id, clientId: client.id },
                                 { lineNumber: 2, debitAmount: 0, creditAmount: 400, chartOfAccountId: salesAccount.id },
                                 { lineNumber: 3, debitAmount: 250, creditAmount: 0, chartOfAccountId: cogsAccount.id },
                                 { lineNumber: 4, debitAmount: 0, creditAmount: 250, chartOfAccountId: invAssetAccount.id }
                             ]
                         }
                     }
                 }
             }
         });
         await logBalances("After Sale");
     }


     // ==================================================================================
     // 6. Receive Customer Payment
     // ==================================================================================
     console.log("\nSTEP 6: Receive Payment ($400)...");
     // DR Bank 400, CR AR 400
     if (bankAccount && arAccount) {
         await prisma.voucher.create({
             data: {
                 voucherNumber: `REC-${Date.now()}`,
                 type: "RECEIPT",
                 status: "posted",
                 createdBy: user.id,
                 postedById: user.id,
                 postedAt: new Date(),
                 VoucherLine: {
                     create: [
                         { lineNumber: 1, debitAmount: 400, creditAmount: 0, chartOfAccountId: bankAccount.id }, // DR Bank
                         { lineNumber: 2, debitAmount: 0, creditAmount: 400, chartOfAccountId: arAccount.id, clientId: client.id } // CR AR
                     ]
                 },
                 JournalEntry: {
                     create: {
                         entryNumber: `J-REC-${Date.now()}`,
                         status: "posted",
                         createdBy: user.id,
                         postedBy: user.id,
                         postedAt: new Date(),
                         JournalEntryLine: {
                             create: [
                                 { lineNumber: 1, debitAmount: 400, creditAmount: 0, chartOfAccountId: bankAccount.id },
                                 { lineNumber: 2, debitAmount: 0, creditAmount: 400, chartOfAccountId: arAccount.id, clientId: client.id }
                             ]
                         }
                     }
                 }
             }
         });
         await logBalances("After Receipt");
     }

  } catch (error) {
      console.error("❌ ERP Trace Failed:", error);
  } finally {
      await prisma.$disconnect();
  }
}

traceFullErpCycle();
