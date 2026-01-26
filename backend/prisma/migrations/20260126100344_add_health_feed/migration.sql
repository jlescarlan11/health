-- CreateTable
CREATE TABLE "HealthFeed" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "imageUrl" TEXT,
    "dateISO" TIMESTAMP(3) NOT NULL,
    "author" TEXT NOT NULL DEFAULT 'Naga City Health',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthFeed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HealthFeed_externalId_key" ON "HealthFeed"("externalId");

-- CreateIndex
CREATE INDEX "HealthFeed_dateISO_idx" ON "HealthFeed"("dateISO");
