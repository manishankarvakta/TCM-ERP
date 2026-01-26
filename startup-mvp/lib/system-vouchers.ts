/**
 * Standardized System Voucher Creation Helpers
 * 
 * Provides programmatic voucher creation functions for Payment, Receipt, and Contra vouchers
 * using operation-based accounting settings with automatic account mapping.
 */

import { prisma } from "@/lib/prisma";
import { VoucherType, Prisma } from "@prisma/client";
import { createVoucher, postVoucher } from "@/app/(dashboard)/dashboard/accounts/vouchers/_actions/voucher.action";
import { getPaymentAccounts, getReceiptAccounts, getContraAccounts } from "@/lib/accounting-settings";

/**
 * Payment voucher input
 */
export interface PaymentVoucherInput {
  date: Date | string;
  amount: number;
  supplierId?: string;
  description?: string;
  reference?: string;
  autoPost?: boolean; // Default true
}

/**
 * Receipt voucher input
 */
export interface ReceiptVoucherInput {
  date: Date | string;
  amount: number;
  clientId?: string;
  description?: string;
  reference?: string;
  autoPost?: boolean; // Default true
}

/**
 * Contra voucher input
 */
export interface ContraVoucherInput {
  date: Date | string;
  amount: number;
  fromAccountId?: string; // Override default from settings
  toAccountId?: string;   // Override default from settings
  description?: string;
  reference?: string;
  autoPost?: boolean; // Default true
}

/**
 * Voucher creation result
 */
export interface VoucherCreationResult {
  success: boolean;
  voucherId?: string;
  voucherNumber?: string;
  error?: string;
}

/**
 * Create a payment voucher
 * 
 * Debit:  settings.payment.payableAccountId (LIABILITY)
 * Credit: settings.payment.cashAccountId (ASSET)
 * 
 * @param input Payment voucher details
 * @param tx Optional transaction client
 * @returns Voucher creation result
 */
export async function createPaymentVoucher(
  input: PaymentVoucherInput,
  tx?: Prisma.TransactionClient
): Promise<VoucherCreationResult> {
  try {
    // Validate amount
    if (input.amount <= 0) {
      return {
        success: false,
        error: "Payment amount must be greater than 0",
      };
    }

    // Get payment accounts from settings with validation
    let paymentAccounts;
    try {
      paymentAccounts = await getPaymentAccounts();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to retrieve payment account settings",
      };
    }

    // Create voucher lines
    const voucherLines = [
      {
        lineNumber: 1,
        debitAmount: input.amount,
        creditAmount: 0,
        description: input.description || `Payment ${input.reference || ""}`.trim(),
        chartOfAccountId: paymentAccounts.payableAccountId,
        supplierId: input.supplierId,
      },
      {
        lineNumber: 2,
        debitAmount: 0,
        creditAmount: input.amount,
        description: input.description || `Payment ${input.reference || ""}`.trim(),
        chartOfAccountId: paymentAccounts.cashAccountId,
      },
    ];

    // Create voucher
    const voucherResult = await createVoucher({
      date: input.date,
      type: VoucherType.PAYMENT,
      reference: input.reference,
      description: input.description,
      supplierId: input.supplierId,
      isSystemAction: true,
      lines: voucherLines,
    }, tx);

    if (!voucherResult.success || !voucherResult.voucher) {
      return {
        success: false,
        error: voucherResult.error || "Failed to create payment voucher",
      };
    }

    // Auto-post if requested (default true)
    const shouldAutoPost = input.autoPost !== false;
    if (shouldAutoPost) {
      const postResult = await postVoucher(voucherResult.voucher.id, tx, true);
      if (!postResult.success) {
        return {
          success: false,
          error: postResult.error || "Failed to post payment voucher",
        };
      }
    }

    return {
      success: true,
      voucherId: voucherResult.voucher.id,
      voucherNumber: voucherResult.voucher.voucherNumber,
    };
  } catch (error) {
    console.error("createPaymentVoucher error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create payment voucher",
    };
  }
}

/**
 * Create a receipt voucher
 * 
 * Debit:  settings.receipt.cashAccountId (ASSET)
 * Credit: settings.receipt.receivableAccountId (ASSET)
 * 
 * @param input Receipt voucher details
 * @param tx Optional transaction client
 * @returns Voucher creation result
 */
export async function createReceiptVoucher(
  input: ReceiptVoucherInput,
  tx?: Prisma.TransactionClient
): Promise<VoucherCreationResult> {
  try {
    // Validate amount
    if (input.amount <= 0) {
      return {
        success: false,
        error: "Receipt amount must be greater than 0",
      };
    }

    // Get receipt accounts from settings with validation
    let receiptAccounts;
    try {
      receiptAccounts = await getReceiptAccounts();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to retrieve receipt account settings",
      };
    }

    // Create voucher lines
    const voucherLines = [
      {
        lineNumber: 1,
        debitAmount: input.amount,
        creditAmount: 0,
        description: input.description || `Receipt ${input.reference || ""}`.trim(),
        chartOfAccountId: receiptAccounts.cashAccountId,
      },
      {
        lineNumber: 2,
        debitAmount: 0,
        creditAmount: input.amount,
        description: input.description || `Receipt ${input.reference || ""}`.trim(),
        chartOfAccountId: receiptAccounts.receivableAccountId,
        clientId: input.clientId,
      },
    ];

    // Create voucher
    const voucherResult = await createVoucher({
      date: input.date,
      type: VoucherType.RECEIPT,
      reference: input.reference,
      description: input.description,
      clientId: input.clientId,
      isSystemAction: true,
      lines: voucherLines,
    }, tx);

    if (!voucherResult.success || !voucherResult.voucher) {
      return {
        success: false,
        error: voucherResult.error || "Failed to create receipt voucher",
      };
    }

    // Auto-post if requested (default true)
    const shouldAutoPost = input.autoPost !== false;
    if (shouldAutoPost) {
      const postResult = await postVoucher(voucherResult.voucher.id, tx, true);
      if (!postResult.success) {
        return {
          success: false,
          error: postResult.error || "Failed to post receipt voucher",
        };
      }
    }

    return {
      success: true,
      voucherId: voucherResult.voucher.id,
      voucherNumber: voucherResult.voucher.voucherNumber,
    };
  } catch (error) {
    console.error("createReceiptVoucher error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create receipt voucher",
    };
  }
}

/**
 * Create a contra voucher (transfer between accounts)
 * 
 * Debit:  settings.contra.toAccountId (ASSET) or override
 * Credit: settings.contra.fromAccountId (ASSET) or override
 * 
 * @param input Contra voucher details
 * @param tx Optional transaction client
 * @returns Voucher creation result
 */
export async function createContraVoucher(
  input: ContraVoucherInput,
  tx?: Prisma.TransactionClient
): Promise<VoucherCreationResult> {
  try {
    // Validate amount
    if (input.amount <= 0) {
      return {
        success: false,
        error: "Contra amount must be greater than 0",
      };
    }

    // Get contra accounts from settings (or use overrides)
    let fromAccountId: string;
    let toAccountId: string;

    if (input.fromAccountId && input.toAccountId) {
      // Use overrides
      fromAccountId = input.fromAccountId;
      toAccountId = input.toAccountId;

      // Validate override accounts exist
      const accounts = await prisma.chartOfAccount.findMany({
        where: {
          id: { in: [fromAccountId, toAccountId] },
          status: "active",
        },
      });

      if (accounts.length !== 2) {
        return {
          success: false,
          error: "One or both override accounts not found or inactive",
        };
      }
    } else {
      // Use settings
      let contraAccounts;
      try {
        contraAccounts = await getContraAccounts();
        fromAccountId = contraAccounts.fromAccountId;
        toAccountId = contraAccounts.toAccountId;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to retrieve contra account settings",
        };
      }
    }

    // Create voucher lines
    const voucherLines = [
      {
        lineNumber: 1,
        debitAmount: input.amount,
        creditAmount: 0,
        description: input.description || `Contra transfer ${input.reference || ""}`.trim(),
        chartOfAccountId: toAccountId,
      },
      {
        lineNumber: 2,
        debitAmount: 0,
        creditAmount: input.amount,
        description: input.description || `Contra transfer ${input.reference || ""}`.trim(),
        chartOfAccountId: fromAccountId,
      },
    ];

    // Create voucher
    const voucherResult = await createVoucher({
      date: input.date,
      type: VoucherType.CONTRA,
      reference: input.reference,
      description: input.description,
      isSystemAction: true,
      lines: voucherLines,
    }, tx);

    if (!voucherResult.success || !voucherResult.voucher) {
      return {
        success: false,
        error: voucherResult.error || "Failed to create contra voucher",
      };
    }

    // Auto-post if requested (default true)
    const shouldAutoPost = input.autoPost !== false;
    if (shouldAutoPost) {
      const postResult = await postVoucher(voucherResult.voucher.id, tx, true);
      if (!postResult.success) {
        return {
          success: false,
          error: postResult.error || "Failed to post contra voucher",
        };
      }
    }

    return {
      success: true,
      voucherId: voucherResult.voucher.id,
      voucherNumber: voucherResult.voucher.voucherNumber,
    };
  } catch (error) {
    console.error("createContraVoucher error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create contra voucher",
    };
  }
}
