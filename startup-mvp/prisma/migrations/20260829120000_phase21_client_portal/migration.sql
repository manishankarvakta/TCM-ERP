-- CreateTable
CREATE TABLE IF NOT EXISTS "PortalUser" (
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
CREATE TABLE IF NOT EXISTS "PortalInvitation" (
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
CREATE TABLE IF NOT EXISTS "PortalFileShare" (
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
CREATE TABLE IF NOT EXISTS "ClientAcceptance" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "PortalUser_userId_key" ON "PortalUser"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PortalUser_userId_idx" ON "PortalUser"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PortalUser_clientId_idx" ON "PortalUser"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PortalUser_organizationId_idx" ON "PortalUser"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PortalUser_status_idx" ON "PortalUser"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PortalInvitation_tokenHash_key" ON "PortalInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PortalInvitation_organizationId_idx" ON "PortalInvitation"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PortalInvitation_clientId_idx" ON "PortalInvitation"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PortalInvitation_email_idx" ON "PortalInvitation"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PortalInvitation_status_idx" ON "PortalInvitation"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PortalFileShare_organizationId_idx" ON "PortalFileShare"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PortalFileShare_fileId_idx" ON "PortalFileShare"("fileId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PortalFileShare_clientId_idx" ON "PortalFileShare"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PortalFileShare_projectId_idx" ON "PortalFileShare"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientAcceptance_organizationId_idx" ON "ClientAcceptance"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientAcceptance_clientId_idx" ON "ClientAcceptance"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientAcceptance_portalUserId_idx" ON "ClientAcceptance"("portalUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientAcceptance_artifactType_artifactId_idx" ON "ClientAcceptance"("artifactType", "artifactId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PortalUser_userId_fkey') THEN
    ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PortalUser_clientId_fkey') THEN
    ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PortalUser_organizationId_fkey') THEN
    ALTER TABLE "PortalUser" ADD CONSTRAINT "PortalUser_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PortalInvitation_clientId_fkey') THEN
    ALTER TABLE "PortalInvitation" ADD CONSTRAINT "PortalInvitation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PortalInvitation_organizationId_fkey') THEN
    ALTER TABLE "PortalInvitation" ADD CONSTRAINT "PortalInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PortalFileShare_fileId_fkey') THEN
    ALTER TABLE "PortalFileShare" ADD CONSTRAINT "PortalFileShare_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PortalFileShare_clientId_fkey') THEN
    ALTER TABLE "PortalFileShare" ADD CONSTRAINT "PortalFileShare_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PortalFileShare_projectId_fkey') THEN
    ALTER TABLE "PortalFileShare" ADD CONSTRAINT "PortalFileShare_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PortalFileShare_organizationId_fkey') THEN
    ALTER TABLE "PortalFileShare" ADD CONSTRAINT "PortalFileShare_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ClientAcceptance_organizationId_fkey') THEN
    ALTER TABLE "ClientAcceptance" ADD CONSTRAINT "ClientAcceptance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ClientAcceptance_clientId_fkey') THEN
    ALTER TABLE "ClientAcceptance" ADD CONSTRAINT "ClientAcceptance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ClientAcceptance_portalUserId_fkey') THEN
    ALTER TABLE "ClientAcceptance" ADD CONSTRAINT "ClientAcceptance_portalUserId_fkey" FOREIGN KEY ("portalUserId") REFERENCES "PortalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

