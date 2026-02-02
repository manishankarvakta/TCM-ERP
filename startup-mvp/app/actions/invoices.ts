"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Prisma, VoucherType } from "@prisma/client";
import { generateVoucherNumber, generateJournalEntryNumber, findControlAccount } from "./accounting-helpers";

/**
 * Generate unique invoice number
 * Format: INV-YYYY-XXXX
 */
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: "desc",
    },
  });

  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split("-").pop() || "0");
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

/**
 * Create a new Invoice (Draft)
 */
export async function createInvoice(input: {
  orderId: string;
  items: {
    orderItemId: string;
    quantity: number;
    unitPrice: number;
    deliveryLedgerId?: string;
  }[];
  date?: Date;
  userId?: string; // Optional override for tests
}) {
  try {
    let effectiveUserId = input.userId;
    if (!effectiveUserId) {
        const session = await auth();
        effectiveUserId = session?.user?.id;
    }
    if (!effectiveUserId) return { success: false, error: "Unauthorized" };

    const { orderId, items, date = new Date() } = input;

    // 1. Validate quantity vs delivered balance
    for (const item of items) {
        const orderItem = await prisma.orderItem.findUnique({
            where: { id: item.orderItemId },
            include: { deliveries: true, invoiceItems: true }
        });

        if (!orderItem) return { success: false, error: "Order item not found" };

        const totalDelivered = orderItem.deliveries.reduce((sum, d) => sum + Number(d.quantity), 0);
        const totalInvoiced = orderItem.invoiceItems.reduce((sum, i) => sum + Number(i.quantity), 0);
        const billableQty = totalDelivered - totalInvoiced;

        if (item.quantity > billableQty) {
            return { 
                success: false, 
                error: `Billed quantity for ${orderItem.description} (${item.quantity}) exceeds delivered but not invoiced quantity (${billableQty.toFixed(2)}).`
            };
        }
    }

    const invoiceNumber = await generateInvoiceNumber();
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId,
        date,
        totalAmount: new Prisma.Decimal(totalAmount),
        status: "draft",
        items: {
          create: items.map(item => ({
            orderItemId: item.orderItemId,
            deliveryLedgerId: item.deliveryLedgerId,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            amount: new Prisma.Decimal(item.quantity * item.unitPrice)
          }))
        }
      }
    });

    return { success: true, invoiceId: invoice.id };
  } catch (error) {
    console.error("createInvoice error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create invoice" };
  }
}

/**
 * Post an Invoice (Recognition of Revenue)
 */
export async function postInvoice(invoiceId: string, userId?: string) {
  try {
    let effectiveUserId = userId;
    if (!effectiveUserId) {
        const session = await auth();
        effectiveUserId = session?.user?.id;
    }
    if (!effectiveUserId) return { success: false, error: "Unauthorized" };

    // 1. Fetch invoice and linked order/client
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { 
        items: true,
        order: { select: { clientId: true, orderNumber: true } }
      }
    });

    if (!invoice) return { success: false, error: "Invoice not found" };
    if (invoice.status === "posted") return { success: false, error: "Invoice already posted" };

    // 2. Find accounting targets
    const arAccountId = await findControlAccount("Accounts Receivable");
    const salesAccountId = await findControlAccount("Sales");

    if (!arAccountId || !salesAccountId) {
        return { success: false, error: "Accounting configuration missing (AR or Sales account not found)" };
    }

    const amount = Number(invoice.totalAmount);

    // 3. Prepare Voucher Lines
    const voucherLines = [
      {
        lineNumber: 1,
        debitAmount: amount,
        creditAmount: 0,
        description: `Invoice ${invoice.invoiceNumber} for Order ${invoice.order.orderNumber}`,
        chartOfAccountId: arAccountId,
        clientId: invoice.order.clientId,
      },
      {
        lineNumber: 2,
        debitAmount: 0,
        creditAmount: amount,
        description: `Revenue recognition for ${invoice.invoiceNumber}`,
        chartOfAccountId: salesAccountId,
      }
    ];

    // 4. Create and Post Voucher in Transaction
    const voucherNumber = await generateVoucherNumber();
    const entryNumber = await generateJournalEntryNumber();

    const result = await prisma.$transaction(async (tx) => {
      // Create Voucher
      const voucher = await tx.voucher.create({
        data: {
          id: crypto.randomUUID(),
          voucherNumber,
          date: invoice.date,
          type: VoucherType.SALES,
          reference: invoice.invoiceNumber,
          description: `Sales Invoice: ${invoice.invoiceNumber}`,
          status: "posted",
          createdBy: effectiveUserId,
          clientId: invoice.order.clientId,
          orderId: invoice.orderId,
          postedById: effectiveUserId,
          postedAt: new Date(),
          updatedAt: new Date(),
          VoucherLine: {
            create: voucherLines.map(line => ({
              id: crypto.randomUUID(),
              lineNumber: line.lineNumber,
              debitAmount: new Prisma.Decimal(line.debitAmount),
              creditAmount: new Prisma.Decimal(line.creditAmount),
              description: line.description,
              chartOfAccountId: line.chartOfAccountId as string,
              clientId: line.clientId,
              updatedAt: new Date()
            }))
          }
        }
      });

      // Create Journal Entry
      await tx.journalEntry.create({
        data: {
          id: crypto.randomUUID(),
          entryNumber,
          date: voucher.date,
          voucherId: voucher.id,
          description: voucher.description,
          status: "posted",
          createdBy: effectiveUserId,
          postedBy: effectiveUserId,
          postedAt: new Date(),
          JournalEntryLine: {
            create: voucherLines.map(line => ({
              id: crypto.randomUUID(),
              lineNumber: line.lineNumber,
              debitAmount: new Prisma.Decimal(line.debitAmount),
              creditAmount: new Prisma.Decimal(line.creditAmount),
              description: line.description,
              chartOfAccountId: line.chartOfAccountId as string,
              clientId: line.clientId
            }))
          }
        }
      });

      // Link Invoice to Voucher and mark as Posted
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "posted",
          voucherId: voucher.id
        }
      });

      return voucher.id;
    });

    return { success: true, voucherId: result };
  } catch (error) {
    console.error("postInvoice error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to post invoice" };
  }
}

/**
 * Apply a customer advance to an invoice
 * 
 * Logic:
 * - Calculate available advance for the order
 * - DR Customer Advance, CR Accounts Receivable
 * - Link to both Order and Invoice
 */
export async function applyAdvanceToInvoice(input: {
  invoiceId: string;
  amount: number;
  userId?: string;
}) {
  try {
    let effectiveUserId = input.userId;
    if (!effectiveUserId) {
        const session = await auth();
        effectiveUserId = session?.user?.id;
    }
    if (!effectiveUserId) return { success: false, error: "Unauthorized" };

    const { invoiceId, amount } = input;

    // 1. Fetch Invoice, Order, and Client
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { 
        order: {
          select: { 
            id: true, 
            clientId: true, 
            orderNumber: true,
            vouchers: {
              include: { VoucherLine: true }
            }
          }
        },
        vouchers: { // Previous applications
          include: { VoucherLine: true }
        }
      }
    });

    if (!invoice) return { success: false, error: "Invoice not found" };
    if (invoice.status !== "posted") return { success: false, error: "Can only apply advance to posted invoices" };

    // 2. Find Accounts
    const advanceAccountId = await findControlAccount("Customer Advance");
    const arAccountId = await findControlAccount("Accounts Receivable");

    if (!advanceAccountId || !arAccountId) {
        return { success: false, error: "Accounting configuration missing (Advance or AR account not found)" };
    }

    // 3. Calculate Available Advance for Order
    // Sum of CR (Receipts) - Sum of DR (Previous Applications/Refunds)
    let totalAdvance = 0;
    let totalAppliedToOrder = 0;

    invoice.order.vouchers.forEach(v => {
      v.VoucherLine.forEach(line => {
        if (line.chartOfAccountId === advanceAccountId) {
          totalAdvance += Number(line.creditAmount);
          totalAppliedToOrder += Number(line.debitAmount);
        }
      });
    });

    const availableAdvance = totalAdvance - totalAppliedToOrder;

    // 4. Calculate Invoice Outstanding
    // Initial AR (from Sales Voucher) - Previous Applications
    const initialAR = Number(invoice.totalAmount);
    let previousAppliedToInvoice = 0;
    
    invoice.vouchers.forEach(v => {
        v.VoucherLine.forEach(line => {
            if (line.chartOfAccountId === arAccountId) {
                previousAppliedToInvoice += Number(line.creditAmount);
            }
        });
    });

    const invoiceOutstanding = initialAR - previousAppliedToInvoice;

    // 5. Validations
    if (amount > availableAdvance) {
        return { 
            success: false, 
            error: `Validation Failed: Requested amount (${amount}) exceeds available advance (${availableAdvance.toFixed(2)}).` 
        };
    }

    if (amount > invoiceOutstanding) {
        return { 
            success: false, 
            error: `Validation Failed: Requested amount (${amount}) exceeds invoice outstanding balance (${invoiceOutstanding.toFixed(2)}).` 
        };
    }

    // 6. Create Application Voucher (JOURNAL)
    const voucherNumber = await generateVoucherNumber();
    const entryNumber = await generateJournalEntryNumber();

    const result = await prisma.$transaction(async (tx) => {
        const voucher = await tx.voucher.create({
            data: {
                id: crypto.randomUUID(),
                voucherNumber,
                date: new Date(),
                type: VoucherType.JOURNAL,
                reference: invoice.invoiceNumber,
                description: `Advance application to Invoice ${invoice.invoiceNumber}`,
                status: "posted",
                createdBy: effectiveUserId,
                clientId: invoice.order.clientId,
                orderId: invoice.order.id,
                invoiceId: invoice.id,
                postedById: effectiveUserId,
                postedAt: new Date(),
                VoucherLine: {
                    create: [
                        {
                            id: crypto.randomUUID(),
                            lineNumber: 1,
                            debitAmount: new Prisma.Decimal(amount),
                            creditAmount: new Prisma.Decimal(0),
                            chartOfAccountId: advanceAccountId,
                            clientId: invoice.order.clientId,
                            description: `Utilize advance for ${invoice.invoiceNumber}`,
                            updatedAt: new Date()
                        },
                        {
                            id: crypto.randomUUID(),
                            lineNumber: 2,
                            debitAmount: new Prisma.Decimal(0),
                            creditAmount: new Prisma.Decimal(amount),
                            chartOfAccountId: arAccountId,
                            clientId: invoice.order.clientId,
                            description: `Payment via advance: ${invoice.invoiceNumber}`,
                            updatedAt: new Date()
                        }
                    ]
                }
            }
        });

        await tx.journalEntry.create({
            data: {
                id: crypto.randomUUID(),
                entryNumber,
                date: voucher.date,
                voucherId: voucher.id,
                description: voucher.description,
                status: "posted",
                createdBy: effectiveUserId,
                postedBy: effectiveUserId,
                postedAt: new Date(),
                JournalEntryLine: {
                    create: [
                        {
                            id: crypto.randomUUID(),
                            lineNumber: 1,
                            debitAmount: new Prisma.Decimal(amount),
                            creditAmount: new Prisma.Decimal(0),
                            chartOfAccountId: advanceAccountId,
                            clientId: invoice.order.clientId,
                            description: voucher.description
                        },
                        {
                            id: crypto.randomUUID(),
                            lineNumber: 2,
                            debitAmount: new Prisma.Decimal(0),
                            creditAmount: new Prisma.Decimal(amount),
                            chartOfAccountId: arAccountId,
                            clientId: invoice.order.clientId,
                            description: voucher.description
                        }
                    ]
                }
            }
        });

        return voucher.id;
    });

    // 7. Update Order Status
    const { updateOrderStatus } = await import("./orders");
    await updateOrderStatus(invoice.orderId);

    return { success: true, voucherId: result };

  } catch (error) {
    console.error("applyAdvanceToInvoice error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to apply advance" };
  }
}

/**
 * Get paginated invoices
 */
export async function getInvoices(
  page: number = 1,
  limit: number = 10,
  search: string = "",
  status: string = "all"
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const skip = (page - 1) * limit;
    const where: any = {};

    // Status filter
    if (status && status !== "all") {
      where.status = status;
    }

    // Search filter
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { order: { orderNumber: { contains: search, mode: "insensitive" } } },
        { order: { client: { name: { contains: search, mode: "insensitive" } } } },
        { order: { client: { company: { contains: search, mode: "insensitive" } } } }
      ];
    }

    const [total, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "desc" },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              client: {
                select: {
                  id: true,
                  name: true,
                  company: true,
                }
              }
            }
          }
        }
      })
    ]);

    return {
      success: true,
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    };

  } catch (error) {
    console.error("getInvoices error:", error);
    return { success: false, error: "Failed to fetch invoices" };
  }
}


