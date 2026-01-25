/**
 * Voucher Form Helper Utilities
 * 
 * Shared utility functions for voucher entry forms.
 * These are pure UI helpers and do not affect accounting logic.
 */

/**
 * Convert a number to words (in English)
 * Example: 1234.50 => "One Thousand Two Hundred Thirty Four and Fifty Paisa Only"
 */
export function amountToWords(amount: number): string {
  if (amount === 0) return "Zero Only";
  if (amount < 0) return "Invalid Amount";
  
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  
  function convertLessThanThousand(num: number): string {
    if (num === 0) return "";
    
    let result = "";
    
    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + " Hundred ";
      num %= 100;
    }
    
    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + " ";
      num %= 10;
    } else if (num >= 10) {
      result += teens[num - 10] + " ";
      return result.trim();
    }
    
    if (num > 0) {
      result += ones[num] + " ";
    }
    
    return result.trim();
  }
  
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);
  
  let result = "";
  
  // Handle crores (10,000,000)
  if (integerPart >= 10000000) {
    const crores = Math.floor(integerPart / 10000000);
    result += convertLessThanThousand(crores) + " Crore ";
  }
  
  // Handle lakhs (100,000)
  const remainingAfterCrores = integerPart % 10000000;
  if (remainingAfterCrores >= 100000) {
    const lakhs = Math.floor(remainingAfterCrores / 100000);
    result += convertLessThanThousand(lakhs) + " Lakh ";
  }
  
  // Handle thousands
  const remainingAfterLakhs = remainingAfterCrores % 100000;
  if (remainingAfterLakhs >= 1000) {
    const thousands = Math.floor(remainingAfterLakhs / 1000);
    result += convertLessThanThousand(thousands) + " Thousand ";
  }
  
  // Handle hundreds, tens, ones
  const remainingAfterThousands = remainingAfterLakhs % 1000;
  if (remainingAfterThousands > 0) {
    result += convertLessThanThousand(remainingAfterThousands) + " ";
  }
  
  result = result.trim();
  
  if (result === "") {
    result = "Zero";
  }
  
  result += " Taka";
  
  // Add paisa/cents if present
  if (decimalPart > 0) {
    result += " and " + convertLessThanThousand(decimalPart) + " Paisa";
  }
  
  return result + " Only";
}

/**
 * Format currency with Bangladeshi Taka symbol
 */
export function formatCurrency(amount: number, showSymbol = true): string {
  const formatted = amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return showSymbol ? `৳${formatted}` : formatted;
}

/**
 * Format amount for display (with commas and 2 decimal places)
 */
export function formatAmount(amount: number): string {
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  warning?: string;
  error?: string;
}

/**
 * Validate amount for unusual values
 */
export function validateAmount(
  amount: number,
  options: {
    min?: number;
    max?: number;
    warnThreshold?: number;
  } = {}
): ValidationResult {
  const { min = 0.01, max = 10000000, warnThreshold = 100000 } = options;
  
  if (amount <= 0) {
    return {
      valid: false,
      error: "Amount must be greater than zero",
    };
  }
  
  if (amount < min) {
    return {
      valid: false,
      error: `Amount must be at least ${formatCurrency(min)}`,
    };
  }
  
  if (amount > max) {
    return {
      valid: false,
      error: `Amount cannot exceed ${formatCurrency(max)}`,
    };
  }
  
  if (amount >= warnThreshold) {
    return {
      valid: true,
      warning: `Large amount: ${formatCurrency(amount)}. Please verify.`,
    };
  }
  
  return { valid: true };
}

/**
 * Keyboard shortcut map
 */
export interface ShortcutAction {
  key: string;
  description: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

/**
 * Get keyboard shortcuts for voucher forms
 */
export function getKeyboardShortcuts(): ShortcutAction[] {
  return [
    {
      key: "Enter",
      ctrl: true,
      description: "Submit form",
    },
    {
      key: "Escape",
      description: "Cancel/Go back",
    },
    {
      key: "Tab",
      description: "Navigate to next field",
    },
    {
      key: "Tab",
      shift: true,
      description: "Navigate to previous field",
    },
    {
      key: "N",
      ctrl: true,
      description: "Add new line (Journal)",
    },
    {
      key: "D",
      ctrl: true,
      description: "Duplicate line (Journal)",
    },
  ];
}

/**
 * Check if keyboard event matches shortcut
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: ShortcutAction
): boolean {
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }
  
  if (shortcut.ctrl && !event.ctrlKey && !event.metaKey) return false;
  if (!shortcut.ctrl && (event.ctrlKey || event.metaKey)) return false;
  
  if (shortcut.shift && !event.shiftKey) return false;
  if (!shortcut.shift && event.shiftKey) return false;
  
  if (shortcut.alt && !event.altKey) return false;
  if (!shortcut.alt && event.altKey) return false;
  
  return true;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Get relative time (e.g., "2 days ago")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay > 30) {
    return formatDate(d);
  } else if (diffDay > 0) {
    return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  } else if (diffHour > 0) {
    return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  } else if (diffMin > 0) {
    return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}

/**
 * Generate preview voucher number
 */
export function generatePreviewVoucherNumber(type: string): string {
  const year = new Date().getFullYear();
  const types: Record<string, string> = {
    PAYMENT: "PAY",
    RECEIPT: "REC",
    CONTRA: "CON",
    JOURNAL: "JOU",
  };
  
  const prefix = types[type] || "VCH";
  return `${prefix}-${year}-XXXX`;
}
