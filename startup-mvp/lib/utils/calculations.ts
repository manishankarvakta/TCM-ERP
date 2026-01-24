import type { Component, QuotationItem } from '@/types/quotation';

export function calculateComponentAmount(component: Component): number {
  const baseAmount = Number(component.unitPrice) * Number(component.quantity);
  return baseAmount;
}

export function calculateItemAmount(item: QuotationItem): number {
  const total = item.components.reduce((sum, component) => {
    return sum + calculateComponentAmount(component);
  }, 0);
  return total;
}

export function calculateGrandTotal(items: QuotationItem[]): number {
  return items.reduce((sum, item) => sum + Number(item.amount), 0);
}

export function formatCurrency(amount: number): string {
  return `৳ ${new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

