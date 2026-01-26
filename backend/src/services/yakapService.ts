export interface YakapInfo {
  program_name: string;
  description: string;
  eligibility: string[];
  requirements: string[];
  benefits: string[];
}

export const getYakapInfo = (): YakapInfo => {
  return {
    program_name: 'YAKAP (Yaman ang Kalusugan Program)',
    description:
      'A free healthcare program for Naga City residents providing medical consultation, laboratory tests, and medicines.',
    eligibility: [
      'Resident of Naga City',
      'No existing HMO or health insurance (except PhilHealth)',
    ],
    requirements: ['Valid ID', 'Proof of Residency (Barangay Certificate)'],
    benefits: ['Free medical check-ups', 'Free medicines', 'Free laboratory tests'],
  };
};
