
import { Prisma, InventoryTransactionType } from "@prisma/client";

interface InventoryMovementParams {
  tx: Prisma.TransactionClient;
  itemId: string;
  quantity: number; // Positive for IN (Purchase), Negative for OUT (Sale)
  type: InventoryTransactionType;
  reference?: string;
  note?: string;
  userId: string;
}

/**
 * Process inventory movement: Update Item quantity and record transaction.
 * Must be called within a Prisma Transaction.
 */
export async function processInventoryMovement({
  tx,
  itemId,
  quantity,
  type,
  reference,
  note,
  userId,
}: InventoryMovementParams) {
  // 1. Create Transaction Record
  await tx.inventoryTransaction.create({
    data: {
      itemId,
      quantity: new Prisma.Decimal(quantity),
      type,
      reference,
      note,
      createdBy: userId,
    },
  });

  // 2. Update Item Stock
  // Use increment to be atomic-safe(ish) within the transaction lock
  await tx.item.update({
    where: { id: itemId },
    data: {
      quantity: {
        increment: new Prisma.Decimal(quantity),
      },
    },
  });
}
