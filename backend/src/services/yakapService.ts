import prisma from '../lib/prisma';

export const getYakapInfo = () => {
  return {
    program_name: "YAKAP (Yaman ang Kalusugan Program)",
    description: "A free healthcare program for Naga City residents providing medical consultation, laboratory tests, and medicines.",
    eligibility: [
      "Resident of Naga City",
      "No existing HMO or health insurance (except PhilHealth)",
    ],
    requirements: [
      "Valid ID",
      "Proof of Residency (Barangay Certificate)",
    ],
    benefits: [
      "Free medical check-ups",
      "Free medicines",
      "Free laboratory tests",
    ]
  };
};

export const enrollUser = async (userId: string, phoneNumber: string) => {
  return await prisma.userEnrollment.create({
    data: {
      user_id: userId,
      phone_number: phoneNumber,
      progress_step: 1, // Start at step 1
    },
  });
};

export const getEnrollmentStatus = async (userId: string) => {
  return await prisma.userEnrollment.findUnique({
    where: { user_id: userId },
  });
};

export const updateEnrollmentStep = async (
  userId: string,
  step: number,
  pathway?: string,
  documents?: object
) => {
  const data: any = {
    progress_step: step,
  };

  if (pathway) {
    data.enrollment_pathway = pathway;
  }

  if (documents) {
    // We need to merge or replace documents. 
    // Assuming replace or user sends full object for now, or we can fetch and merge.
    // For simplicity, let's update it.
    data.documents_uploaded = documents;
  }

  return await prisma.userEnrollment.update({
    where: { user_id: userId },
    data,
  });
};

export const completeEnrollment = async (userId: string) => {
  return await prisma.userEnrollment.update({
    where: { user_id: userId },
    data: {
      completed: true,
      progress_step: 4, // Assuming 4 is completion or just mark completed
    },
  });
};
