import { Prisma } from "@prisma/client";

/**
 * Emit a domain event transactionally.
 * Writes the event to the DomainOutboxEvent table and registers a queue job in the SAME transaction.
 */
export async function emitDomainEvent(
  tx: Prisma.TransactionClient,
  aggregateType: string,
  aggregateId: string,
  eventType: string,
  payload: Prisma.InputJsonValue,
  organizationId: string
): Promise<unknown> {
  // Create outbox event
  const outboxEvent = await tx.domainOutboxEvent.create({
    data: {
      organizationId,
      aggregateType,
      aggregateId,
      eventType,
      payload: payload ?? {},
    },
  });
  
  // Register the publishing job in the same transaction
  await tx.queueJob.create({
    data: {
      organizationId,
      type: "OUTBOX_PUBLISH",
      referenceId: outboxEvent.id,
      payload: { eventId: outboxEvent.id },
      status: "PENDING",
      maxAttempts: 5,
      availableAt: new Date(),
    },
  });
  
  return outboxEvent;
}
