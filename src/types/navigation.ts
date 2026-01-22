import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';

import { AssessmentData } from './triage';

// Define the parameters for each screen in the stack navigators
export type CheckStackParamList = {
  NavigatorHome: undefined;
};

export type FacilitiesStackParamList = {
  FacilityDirectory: { filter?: 'yakap' };
};

export type YakapStackParamList = {
  YakapHome: undefined;
};

// Define the parameters for the root stack
export type RootStackParamList = {
  Home: undefined;
  Check: NavigatorScreenParams<CheckStackParamList>;
  Find: NavigatorScreenParams<FacilitiesStackParamList>;
  YAKAP: NavigatorScreenParams<YakapStackParamList>;
  SymptomAssessment: { initialSymptom?: string };
  Recommendation: {
    assessmentData: AssessmentData;
    isRecentResolved?: boolean;
    resolvedKeyword?: string;
  };
  ClinicalNote: undefined;
  FacilityDetails: { facilityId: string };
  CrisisSupport: undefined;
  YakapFaq: undefined;
  EligibilityChecker: undefined;
  EnrollmentPathway: undefined;
  EnrollmentGuide: { pathwayId: string };
  EnrollmentCompletion: undefined;
  NotFound: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
};

// Define the props for each screen in the navigators
export type RootStackScreenProps<T extends keyof RootStackParamList> = StackScreenProps<
  RootStackParamList,
  T
>;

// Props for screens within the nested stack navigators
export type CheckStackScreenProps<T extends keyof CheckStackParamList> = CompositeScreenProps<
  StackScreenProps<CheckStackParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

export type FacilitiesStackScreenProps<T extends keyof FacilitiesStackParamList> =
  CompositeScreenProps<
    StackScreenProps<FacilitiesStackParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

export type YakapStackScreenProps<T extends keyof YakapStackParamList> = CompositeScreenProps<
  StackScreenProps<YakapStackParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;
