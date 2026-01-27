import { Prisma } from '../../generated/prisma';
import prisma from '../lib/prisma';

export type AssessmentData = Prisma.JsonValue;

export type AssessmentTransferResult =
  | { success: true; recordId: string }
  | { success: false; message: string; statusCode?: number };

export const transferAssessmentResult = async (
  targetUsername: string,
  assessmentData: AssessmentData
): Promise<AssessmentTransferResult> => {
  try {
    const userEnrollment = await prisma.userEnrollment.findUnique({
      where: { username: targetUsername },
    });

    if (!userEnrollment) {
      return {
        success: false,
        message: `User "${targetUsername}" not found`,
        statusCode: 404,
      };
    }

    const payload:
      | Prisma.InputJsonValue
      | Prisma.JsonNullValueInput =
      assessmentData == null
        ? Prisma.JsonNull
        : (assessmentData as Prisma.InputJsonValue);

    const record = await prisma.clinicalHistory.create({
      data: {
        userEnrollmentId: userEnrollment.id,
        payload,
      },
    });

    return { success: true, recordId: record.id };
  } catch (error) {
    console.error('Failed to transfer assessment result:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to persist assessment result';
    return {
      success: false,
      message,
      statusCode: 500,
    };
  }
};
