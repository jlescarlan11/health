-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "phone" TEXT,
    "yakap_accredited" BOOLEAN NOT NULL DEFAULT false,
    "services" TEXT[],
    "operating_hours" JSONB NOT NULL,
    "photos" TEXT[],
    "barangay" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Symptom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "keywords" TEXT[],
    "red_flags" TEXT[],
    "recommended_care" TEXT NOT NULL,
    "follow_up_questions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Symptom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEnrollment" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "enrollment_pathway" TEXT,
    "progress_step" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "documents_uploaded" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "available24x7" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Facility_latitude_longitude_idx" ON "Facility"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Facility_type_idx" ON "Facility"("type");

-- CreateIndex
CREATE INDEX "Symptom_category_idx" ON "Symptom"("category");

-- CreateIndex
CREATE UNIQUE INDEX "UserEnrollment_user_id_key" ON "UserEnrollment"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserEnrollment_phone_number_key" ON "UserEnrollment"("phone_number");

-- CreateIndex
CREATE INDEX "UserEnrollment_user_id_idx" ON "UserEnrollment"("user_id");

-- CreateIndex
CREATE INDEX "UserEnrollment_phone_number_idx" ON "UserEnrollment"("phone_number");
