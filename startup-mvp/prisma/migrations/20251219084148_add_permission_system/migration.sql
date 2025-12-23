-- AlterTable
ALTER TABLE "User" ADD COLUMN     "designationTemplateId" TEXT,
ADD COLUMN     "permissions" JSONB;

-- CreateTable
CREATE TABLE "PermissionTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "operations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleOperation" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PermissionTemplate_name_key" ON "PermissionTemplate"("name");

-- CreateIndex
CREATE INDEX "PermissionTemplate_isActive_idx" ON "PermissionTemplate"("isActive");

-- CreateIndex
CREATE INDEX "PermissionTemplate_name_idx" ON "PermissionTemplate"("name");

-- CreateIndex
CREATE INDEX "UserPermission_userId_idx" ON "UserPermission"("userId");

-- CreateIndex
CREATE INDEX "UserPermission_module_idx" ON "UserPermission"("module");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_module_key" ON "UserPermission"("userId", "module");

-- CreateIndex
CREATE INDEX "ModuleOperation_module_idx" ON "ModuleOperation"("module");

-- CreateIndex
CREATE INDEX "ModuleOperation_isActive_idx" ON "ModuleOperation"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleOperation_module_operation_key" ON "ModuleOperation"("module", "operation");

-- CreateIndex
CREATE INDEX "User_designationTemplateId_idx" ON "User"("designationTemplateId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_designationTemplateId_fkey" FOREIGN KEY ("designationTemplateId") REFERENCES "PermissionTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
