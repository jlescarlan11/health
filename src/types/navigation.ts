export type RootStackParamList = {
  MainHome: undefined;
  AiChat: undefined;
  SymptomAssessment: { initialSymptom: string };
  Recommendations: { assessmentData: any }; // Replace 'any' with proper type later
  FacilityDirectory: undefined;
  FacilityDetails: { facilityId: string };
  YakapEnrollment: undefined;
  Profile: undefined;
  Settings: undefined;
  PhoneLogin: undefined;
  OTPVerification: { verificationId: string; phoneNumber: string };
};
