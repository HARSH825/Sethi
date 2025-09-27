-- CreateEnum
CREATE TYPE "public"."ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'IN_PROGRESS');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "dob" TIMESTAMP(3),
    "address" JSONB,
    "attributes" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schemes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "benefitAmount" INTEGER NOT NULL,
    "eligibilityCriteria" JSONB,
    "requiredDocuments" TEXT[],
    "applicationUrl" TEXT,
    "tags" TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 50,
    "deadline" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."applications" (
    "id" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "status" "public"."ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "formData" JSONB,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "public"."users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "schemes_isActive_idx" ON "public"."schemes"("isActive");

-- CreateIndex
CREATE INDEX "schemes_state_idx" ON "public"."schemes"("state");

-- CreateIndex
CREATE INDEX "schemes_priority_idx" ON "public"."schemes"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "applications_applicationNumber_key" ON "public"."applications"("applicationNumber");

-- CreateIndex
CREATE INDEX "applications_userId_idx" ON "public"."applications"("userId");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "public"."applications"("status");

-- AddForeignKey
ALTER TABLE "public"."applications" ADD CONSTRAINT "applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."applications" ADD CONSTRAINT "applications_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "public"."schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
