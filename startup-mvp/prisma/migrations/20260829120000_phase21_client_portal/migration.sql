-- CreateTable
CREATE TABLE "PortalUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "permissions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalFileShare" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "projectId" TEXT,
    "visibleToPortal" BOOLEAN NOT NULL DEFAULT true,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sharedById" TEXT NOT NULL,

    CONSTRAINT "PortalFileShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAcceptance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "portalUserId" TEXT NOT NULL,
    "artifactType" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,

    CONSTRAINT "ClientAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortalUser_userId_key" ON "PortalUser"("userId");

-- CreateIndex
CREATE INDEX "PortalUser_userId_idx" ON "PortalUser"("userId");

-- CreateIndex
CREATE INDEX "PortalUser_clientId_idx" ON "PortalUser"("clientId");

-- CreateIndex
CREATE INDEX "PortalUser_organizationId_idx" ON "PortalUser"("organizationId");

-- CreateIndex
CREATE INDEX "PortalUser_status_idx" ON "PortalUser"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PortalInvitation_tokenHash_key" ON "PortalInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "PortalInvitation_organizationId_idx" ON "PortalInvitation"("organizationId");

-- CreateIndex
CREATE INDEX "PortalInvitation_clientId_idx" ON "PortalInvitation"("clientId");

-- CreateIndex
CREATE INDEX "PortalInvitation_email_idx" ON "PortalInvitation"("email");

-- CreateIndex
CREATE INDEX "PortalInvitation_status_idx" ON "PortalInvitation"("status");

-- CreateIndex
CREATE INDEX "PortalFileShare_organizationId_idx" ON "PortalFileShare"("organizationId");

-- CreateIndex
CREATE INDEX "PortalFileShare_fileId_idx" ON "PortalFileShare"("fileId");

-- CreateIndex
CREATE INDEX "PortalFileShare_clientId_idx" ON "PortalFileShare"("clientId");

-- CreateIndex
CREATE INDEX "PortalFileShare_projectId_idx" ON "PortalFileShare"("projectId");

-- CreateIndex
CREATE INDEX "ClientAcceptance_organizationId_idx" ON "ClientAcceptance"("organizationId");

-- CreateIndex
CREATE INDEX "ClientAcceptance_clientId_idx" ON "ClientAcceptance"("clientId");

-- CreateIndex
CREATE INDEX "ClientAcceptance_portalUserId_idx" ON "ClientAcceptance"("portalUserId");

-- CreateIndex
CREATE INDEX "ClientAcceptance_artifactType_artifactId_idx" ON "ClientAcceptance"("artifactType", "artifactId");

-- AddForeignKey
ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalInvitation" ADD CONSTRAINT "PortalInvitation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalInvitation" ADD CONSTRAINT "PortalInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalFileShare" ADD CONSTRAINT "PortalFileShare_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalFileShare" ADD CONSTRAINT "PortalFileShare_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalFileShare" ADD CONSTRAINT "PortalFileShare_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalFileShare" ADD CONSTRAINT "PortalFileShare_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAcceptance" ADD CONSTRAINT "ClientAcceptance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAcceptance" ADD CONSTRAINT "ClientAcceptance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAcceptance" ADD CONSTRAINT "ClientAcceptance_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
