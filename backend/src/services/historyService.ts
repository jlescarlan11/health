import { Prisma } from '../../generated/prisma';
import prisma from '../lib/prisma';

export type AssessmentData = Prisma.JsonValue;

export interface AssessmentTransferResult {
  success: boolean;
  message: string;
  recordId?: string;
  statusCode?: number;
}

/**
 * Transfers an assessment result to a target user's clinical history.
 * Resolves the provided username to a user and ensures a HealthProfile exists before persisting.
 * If found, creates a new ClinicalHistory record linked to that profile.
 */
export const transferAssessmentResult = async (
  targetUsername: string,
  assessmentData: AssessmentData
): Promise<AssessmentTransferResult> => {
  try {
    // 1. Resolve the user by username so we can target their health profile.
    const user = await prisma.user.findUnique({
      where: { username: targetUsername },
    });

    if (!user) {
      return {
        success: false,
        message: `User "${targetUsername}" not found. Please verify the username and try again.`,
        statusCode: 404,
      };
    }

    // 2. Ensure a health profile exists before associating a clinical history record.
    let healthProfile = await prisma.healthProfile.findUnique({
      where: { userId: user.id },
    });

    if (!healthProfile) {
      healthProfile = await prisma.healthProfile.create({
        data: {
          user: {
            connect: { id: user.id },
          },
        },
      });
    }

    // 2. Prepare payload for Prisma
    const payload: Prisma.InputJsonValue = assessmentData as Prisma.InputJsonValue;

    // 3. Create ClinicalHistory record
    const record = await prisma.clinicalHistory.create({
      data: {
        healthProfileId: healthProfile.id,
        payload,
      },
    });

    return {
      success: true,
      message: 'Assessment result successfully transferred.',
      recordId: record.id,
    };
  } catch (error) {
    console.error('Failed to transfer assessment result:', error);
    const message = error instanceof Error ? error.message : 'Failed to persist assessment result';
    return {
      success: false,
      message,
      statusCode: 500,
    };
  }
};
