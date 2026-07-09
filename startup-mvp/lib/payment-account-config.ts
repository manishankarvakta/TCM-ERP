// Payment Account Configuration
// Patterns for identifying cash, bank, and digital wallet accounts from Chart of Accounts

export const PAYMENT_ACCOUNT_PATTERNS = {
  cash: {
    codePrefixes: ['1010', 'CASH-', '101-', 'CA-'],
    nameKeywords: ['cash', 'petty cash', 'cash on hand', 'cash in hand', 'petty'],
  },
  bank: {
    codePrefixes: ['1020', 'BANK-', '102-', 'BK-'],
    nameKeywords: ['bank', 'checking', 'savings', 'current account', 'deposit'],
  },
  digitalWallet: {
    codePrefixes: ['1030', 'DW-', 'MOB-', 'MFS-', 'DIG-'],
    nameKeywords: ['bkash', 'nagad', 'rocket', 'upay', 'wallet', 'mobile banking', 'stripe', 'paypal', 'digital'],
  },
} as const;

export type PaymentAccountType = 'CASH' | 'BANK' | 'DIGITAL_WALLET';

export interface PaymentAccountOption {
  id: string;
  code: string;
  name: string;
  type: PaymentAccountType;
  description?: string | null;
}

/**
 * Determine the type of payment account based on various criteria
 * Returns null if the account does not match any known payment account type
 */
export function determineAccountType(account: {
  code: string;
  name: string;
  CashBankAccount?: { type: string } | null;
}): PaymentAccountType | null {
  const code = account.code.toUpperCase();
  const name = account.name.toLowerCase();

  // 1. Check name keywords first for DIGITAL_WALLET (overriding wrong DB classifications like bKash/Nagad set as CASH)
  const isWallet = name.includes("bkash") || name.includes("nagad") || name.includes("rocket") || name.includes("upay") || name.includes("wallet");
  if (isWallet || (account.CashBankAccount && (account.CashBankAccount.type === 'MFS' || account.CashBankAccount.type === 'DIGITAL_WALLET'))) {
    return 'DIGITAL_WALLET';
  }

  // 2. Check if CashBankAccount relation exists
  if (account.CashBankAccount) {
    if (account.CashBankAccount.type === 'CASH') {
      return 'CASH';
    }
    if (account.CashBankAccount.type === 'BANK') {
      return 'BANK';
    }
  }

  // 3. Fallback to code prefixes/name keywords matching
  if (PAYMENT_ACCOUNT_PATTERNS.cash.codePrefixes.some((prefix) => code.startsWith(prefix))) {
    return 'CASH';
  }

  // 3. Check code prefixes for BANK
  if (PAYMENT_ACCOUNT_PATTERNS.bank.codePrefixes.some((prefix) => code.startsWith(prefix))) {
    return 'BANK';
  }

  // 4. Check code prefixes for DIGITAL WALLET
  if (PAYMENT_ACCOUNT_PATTERNS.digitalWallet.codePrefixes.some((prefix) => code.startsWith(prefix))) {
    return 'DIGITAL_WALLET';
  }

  // 5. Check name keywords for CASH
  if (PAYMENT_ACCOUNT_PATTERNS.cash.nameKeywords.some((keyword) => name.includes(keyword))) {
    return 'CASH';
  }

  // 6. Check name keywords for BANK
  if (PAYMENT_ACCOUNT_PATTERNS.bank.nameKeywords.some((keyword) => name.includes(keyword))) {
    return 'BANK';
  }

  // 7. Check name keywords for DIGITAL WALLET
  if (PAYMENT_ACCOUNT_PATTERNS.digitalWallet.nameKeywords.some((keyword) => name.includes(keyword))) {
    return 'DIGITAL_WALLET';
  }

  // 8. No match
  return null;
}
