export type RootStackParamList = {
  MainHome: undefined;
  AiChat: undefined;
  SymptomAssessment: undefined;
  Recommendations: undefined;
  FacilityDirectory: undefined;
  FacilityDetails: { facilityId: string };
  YakapEnrollment: undefined;
  Profile: undefined;
  Settings: undefined;
  PhoneLogin: undefined;
  OTPVerification: { verificationId: string; phoneNumber: string };
};
