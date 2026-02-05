-- CreateTable
CREATE TABLE "DeliverySchedule" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryScheduleItem" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliverySchedule_orderId_idx" ON "DeliverySchedule"("orderId");

-- CreateIndex
CREATE INDEX "DeliveryScheduleItem_scheduleId_idx" ON "DeliveryScheduleItem"("scheduleId");

-- AddForeignKey
ALTER TABLE "DeliverySchedule" ADD CONSTRAINT "DeliverySchedule_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryScheduleItem" ADD CONSTRAINT "DeliveryScheduleItem_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "DeliverySchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryScheduleItem" ADD CONSTRAINT "DeliveryScheduleItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
