import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';

export type AssessmentData = {
  symptoms: string;
  answers: Record<string, string>;
};

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

// Define the parameters for each tab in the bottom tab navigator
export type TabParamList = {
  Home: undefined;
  Check: NavigatorScreenParams<CheckStackParamList>;
  Find: NavigatorScreenParams<FacilitiesStackParamList>;
  YAKAP: NavigatorScreenParams<YakapStackParamList>;
};

// Define the parameters for the root stack
export type RootStackParamList = {
  Main: NavigatorScreenParams<TabParamList>;
  SymptomAssessment: { initialSymptom?: string };
  Recommendation: { assessmentData: AssessmentData };
  CrisisSupport: undefined;
  FacilityDetails: { facilityId: string };
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

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

// Props for screens within the nested stack navigators
export type CheckStackScreenProps<T extends keyof CheckStackParamList> = CompositeScreenProps<
  StackScreenProps<CheckStackParamList, T>,
  TabScreenProps<keyof TabParamList>
>;

export type FacilitiesStackScreenProps<T extends keyof FacilitiesStackParamList> =
  CompositeScreenProps<
    StackScreenProps<FacilitiesStackParamList, T>,
    TabScreenProps<keyof TabParamList>
  >;

export type YakapStackScreenProps<T extends keyof YakapStackParamList> = CompositeScreenProps<
  StackScreenProps<YakapStackParamList, T>,
  TabScreenProps<keyof TabParamList>
>;
