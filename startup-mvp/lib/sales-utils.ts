import { Prisma } from "@prisma/client";

export function computeSalePaymentStatus(sale: {
  grandTotal: number | Prisma.Decimal;
  status: string;
  paymentDetails?: any;
}): "PAID" | "PARTIAL" | "DUE" {
  const grandTotal = Number(sale.grandTotal || 0);
  const paymentDetails = sale.paymentDetails as any;

  let initialPaid = 0;
  let dueCollectionsPaid = 0;

  if (paymentDetails) {
    initialPaid =
      Number(paymentDetails.cashAmount || 0) +
      Number(paymentDetails.cardAmount || 0) +
      Number(paymentDetails.mfsAmount || 0) -
      Number(paymentDetails.changeAmount || 0);
    if (Array.isArray(paymentDetails.dueCollections)) {
      for (const col of paymentDetails.dueCollections) {
        dueCollectionsPaid +=
          Number(col.cashAmount || 0) +
          Number(col.cardAmount || 0) +
          Number(col.mfsAmount || 0);
      }
    }
  } else {
    initialPaid = sale.status === "COMPLETED" ? grandTotal : 0;
  }

  const netPaid = initialPaid + dueCollectionsPaid;
  const remainingDue = Number((grandTotal - netPaid).toFixed(2));

  if (remainingDue <= 0.01 || netPaid >= grandTotal - 0.01) {
    return "PAID";
  } else if (netPaid <= 0.01 || initialPaid <= 0) {
    return "DUE";
  } else {
    return "PARTIAL";
  }
}

export function computeSaleDueAmount(sale: {
  grandTotal: number | Prisma.Decimal;
  status: string;
  paymentDetails?: any;
}): number {
  const grandTotal = Number(sale.grandTotal || 0);
  const paymentDetails = sale.paymentDetails as any;

  let initialPaid = 0;
  let dueCollectionsPaid = 0;

  if (paymentDetails) {
    initialPaid =
      Number(paymentDetails.cashAmount || 0) +
      Number(paymentDetails.cardAmount || 0) +
      Number(paymentDetails.mfsAmount || 0) -
      Number(paymentDetails.changeAmount || 0);
    if (Array.isArray(paymentDetails.dueCollections)) {
      for (const col of paymentDetails.dueCollections) {
        dueCollectionsPaid +=
          Number(col.cashAmount || 0) +
          Number(col.cardAmount || 0) +
          Number(col.mfsAmount || 0);
      }
    }
  } else {
    initialPaid = sale.status === "COMPLETED" ? grandTotal : 0;
  }

  const netPaid = initialPaid + dueCollectionsPaid;
  const remainingDue = Number((grandTotal - netPaid).toFixed(2));

  return remainingDue > 0.01 ? remainingDue : 0;
}

export function computeSalePaidAmount(sale: {
  grandTotal: number | Prisma.Decimal;
  status: string;
  paymentDetails?: any;
}): number {
  const grandTotal = Number(sale.grandTotal || 0);
  const paymentDetails = sale.paymentDetails as any;

  let initialPaid = 0;
  let dueCollectionsPaid = 0;

  if (paymentDetails) {
    initialPaid =
      Number(paymentDetails.cashAmount || 0) +
      Number(paymentDetails.cardAmount || 0) +
      Number(paymentDetails.mfsAmount || 0) -
      Number(paymentDetails.changeAmount || 0);
    if (Array.isArray(paymentDetails.dueCollections)) {
      for (const col of paymentDetails.dueCollections) {
        dueCollectionsPaid +=
          Number(col.cashAmount || 0) +
          Number(col.cardAmount || 0) +
          Number(col.mfsAmount || 0);
      }
    }
  } else {
    initialPaid = sale.status === "COMPLETED" ? grandTotal : 0;
  }

  const netPaid = initialPaid + dueCollectionsPaid;
  return Math.min(grandTotal, Math.max(0, Number(netPaid.toFixed(2))));
}
