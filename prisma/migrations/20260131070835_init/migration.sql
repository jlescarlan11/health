-- CreateEnum
CREATE TYPE "SymptomCategory" AS ENUM ('simple', 'complex', 'critical');

-- CreateEnum
CREATE TYPE "DenialConfidence" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "SystemCategory" AS ENUM ('Cardiac', 'Respiratory', 'Neurological', 'Acute Abdomen', 'Trauma');

-- CreateEnum
CREATE TYPE "SexAtBirth" AS ENUM ('male', 'female', 'other', 'preferNotToSay');

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "yakap_accredited" BOOLEAN NOT NULL DEFAULT false,
    "services" TEXT[],
    "operating_hours" JSONB NOT NULL,
    "photos" TEXT[],
    "barangay" TEXT,
    "specialized_services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_24_7" BOOLEAN NOT NULL DEFAULT false,
    "capacity" INTEGER NOT NULL DEFAULT 50,
    "live_metrics" JSONB NOT NULL DEFAULT '{}',
    "busy_patterns" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilityContact" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'phone',
    "teleconsultUrl" TEXT,
    "contactName" TEXT,
    "role" TEXT,
    "facilityId" TEXT NOT NULL,

    CONSTRAINT "FacilityContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilitySignal" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilitySignal_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "sexAtBirth" "SexAtBirth" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chronic_conditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "current_medications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "surgical_history" TEXT,
    "family_history" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalHistory" (
    "id" TEXT NOT NULL,
    "healthProfileId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentProfile" (
    "id" TEXT NOT NULL,
    "clinicalHistoryRecordId" TEXT NOT NULL,
    "age" TEXT,
    "duration" TEXT,
    "severity" TEXT,
    "progression" TEXT,
    "red_flag_denials" TEXT,
    "summary" TEXT NOT NULL,
    "triage_readiness_score" DOUBLE PRECISION,
    "ambiguity_detected" BOOLEAN,
    "internal_inconsistency_detected" BOOLEAN,
    "internal_consistency_score" DOUBLE PRECISION,
    "red_flags_resolved" BOOLEAN,
    "uncertainty_accepted" BOOLEAN,
    "clinical_friction_detected" BOOLEAN,
    "clinical_friction_details" TEXT,
    "is_complex_case" BOOLEAN,
    "is_vulnerable" BOOLEAN,
    "symptom_category" "SymptomCategory",
    "denial_confidence" "DenialConfidence",
    "turn_count" INTEGER,
    "affected_systems" "SystemCategory"[] DEFAULT ARRAY[]::"SystemCategory"[],
    "is_recent_resolved" BOOLEAN,
    "resolved_keyword" TEXT,
    "denied_symptoms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "covered_symptoms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fever_duration" TEXT,
    "fever_max_temp" TEXT,
    "fever_antipyretic_response" TEXT,
    "fever_hydration_ability" TEXT,
    "fever_functional_status" TEXT,
    "fever_red_flags_checklist" TEXT,
    "termination_reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentProfile_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "scheduled_time" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "days_of_week" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "Facility_latitude_longitude_idx" ON "Facility"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Facility_type_idx" ON "Facility"("type");

-- CreateIndex
CREATE INDEX "FacilityContact_facilityId_idx" ON "FacilityContact"("facilityId");

-- CreateIndex
CREATE INDEX "FacilitySignal_facilityId_timestamp_idx" ON "FacilitySignal"("facilityId", "timestamp");

-- CreateIndex
CREATE INDEX "Symptom_category_idx" ON "Symptom"("category");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "HealthProfile_userId_key" ON "HealthProfile"("userId");

-- CreateIndex
CREATE INDEX "ClinicalHistory_healthProfileId_idx" ON "ClinicalHistory"("healthProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentProfile_clinicalHistoryRecordId_key" ON "AssessmentProfile"("clinicalHistoryRecordId");

-- CreateIndex
CREATE INDEX "AssessmentProfile_clinicalHistoryRecordId_idx" ON "AssessmentProfile"("clinicalHistoryRecordId");

-- CreateIndex
CREATE INDEX "Medication_name_idx" ON "Medication"("name");

-- CreateIndex
CREATE INDEX "Medication_userId_idx" ON "Medication"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthFeed_externalId_key" ON "HealthFeed"("externalId");

-- CreateIndex
CREATE INDEX "HealthFeed_dateISO_idx" ON "HealthFeed"("dateISO");

-- AddForeignKey
ALTER TABLE "FacilityContact" ADD CONSTRAINT "FacilityContact_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilitySignal" ADD CONSTRAINT "FacilitySignal_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthProfile" ADD CONSTRAINT "HealthProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalHistory" ADD CONSTRAINT "ClinicalHistory_healthProfileId_fkey" FOREIGN KEY ("healthProfileId") REFERENCES "HealthProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentProfile" ADD CONSTRAINT "AssessmentProfile_clinicalHistoryRecordId_fkey" FOREIGN KEY ("clinicalHistoryRecordId") REFERENCES "ClinicalHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
