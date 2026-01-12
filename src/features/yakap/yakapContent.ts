export interface YakapBenefit {
  id: string;
  category: string;
  description: string;
  items: string[];
  icon: string;
}

export interface EnrollmentPathway {
  id: string;
  name: string;
  description: string;
  estimatedDuration: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  requirements: string[];
  steps: string[];
  recommended?: boolean;
}

export interface YakapFAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export const YAKAP_BENEFITS: YakapBenefit[] = [
  {
    id: 'consultation',
    category: 'Primary Care Consultations',
    description: 'Unlimited free primary care consultations with doctors at your registered YAKAP provider.',
    items: [
      'General health check-ups',
      'Health profiling',
      'Management of chronic conditions',
      'Health education and counseling'
    ],
    icon: 'doctor'
  },
  {
    id: 'lab_tests',
    category: 'Laboratory Tests',
    description: 'Free laboratory tests and diagnostic services as recommended by your primary care provider.',
    items: [
      'Complete Blood Count (CBC)',
      'Urinalysis',
      'Fecalysis',
      'Chest X-ray',
      'Sputum Microscopy',
      'Fasting Blood Sugar',
      'Lipid Profile'
    ],
    icon: 'flask'
  },
  {
    id: 'medicines',
    category: 'Essential Medicines',
    description: 'Free essential medicines tailored to your specific medical condition and needs.',
    items: [
      'Hypertension medications',
      'Diabetes medications',
      'Antibiotics (as prescribed)',
      'Vitamins and supplements for nutritional deficiencies',
      'Asthma medications'
    ],
    icon: 'pill'
  },
  {
    id: 'screenings',
    category: 'Cancer Screenings',
    description: 'Early detection cancer screenings available for eligible patients.',
    items: [
      'Mammography (Breast Cancer)',
      'Colonoscopy (Colorectal Cancer)',
      'CT Scans (as indicated)',
      'Cervical Cancer Screening (Pap smear / VIA)'
    ],
    icon: 'radiology-box'
  }
];

export const ENROLLMENT_PATHWAYS: EnrollmentPathway[] = [
  {
    id: 'egovph',
    name: 'eGovPH Mobile App',
    description: 'The most convenient way to register using the official government super app.',
    estimatedDuration: '10-15 minutes',
    difficulty: 'Easy',
    requirements: [
      'Smartphone with internet connection',
      'Valid Government ID',
      'Mobile number'
    ],
    steps: [
      'Download the eGovPH app from Google Play Store or Apple App Store.',
      'Create an account and verify your identity using a valid ID.',
      'Navigate to the "Health" section in the app menu.',
      'Select "PhilHealth" and look for the Konsulta/YAKAP registration option.',
      'Choose your preferred accredited provider near you and confirm registration.'
    ],
    recommended: true
  },
  {
    id: 'philhealth_portal',
    name: 'PhilHealth Member Portal',
    description: 'Register online through the official PhilHealth website.',
    estimatedDuration: '15-20 minutes',
    difficulty: 'Medium',
    requirements: [
      'Computer or smartphone with internet',
      'PhilHealth Identification Number (PIN)',
      'Password for Member Portal'
    ],
    steps: [
      'Visit the PhilHealth website (philhealth.gov.ph) and log in to the Member Portal.',
      'If you don\'t have an account, register using your PIN.',
      'Once logged in, look for the "Konsulta Registration" module.',
      'Search for and select your preferred accredited Konsulta/YAKAP provider.',
      'Confirm your selection to generate your Authorization Transaction Code (ATC).'
    ],
    recommended: false
  },
  {
    id: 'clinic_walkin',
    name: 'Direct Clinic Registration',
    description: 'Register in person at any accredited YAKAP/Konsulta provider.',
    estimatedDuration: '30-60 minutes',
    difficulty: 'Easy',
    requirements: [
      'Valid Government ID',
      'PhilHealth ID / Member Data Record (MDR)'
    ],
    steps: [
      'Visit your chosen accredited YAKAP/Konsulta health center or clinic.',
      'Proceed to the PhilHealth/Admitting desk.',
      'Request for YAKAP/Konsulta registration assistance.',
      'Fill out the registration form provided by the staff.',
      'Wait for the staff to encode your registration in the system.'
    ],
    recommended: false
  },
  {
    id: 'philhealth_office',
    name: 'PhilHealth Local Office',
    description: 'Visit the nearest PhilHealth Local Health Insurance Office (LHIO).',
    estimatedDuration: '1-2 hours',
    difficulty: 'Medium',
    requirements: [
      'Valid Government ID',
      'Filled out PhilHealth Member Registration Form (PMRF)'
    ],
    steps: [
      'Go to the nearest PhilHealth LHIO (e.g., in Naga City).',
      'Get a queue number for "Member Services".',
      'Submit your PhilHealth Member Registration Form (PMRF) indicating your chosen provider.',
      'Wait for the officer to process your registration and update your records.',
      'Receive your updated Member Data Record (MDR) reflecting your provider.'
    ],
    recommended: false
  }
];

export const YAKAP_FAQS: YakapFAQ[] = [
  {
    id: 'what_is_yakap',
    question: 'What is the YAKAP Program?',
    answer: 'YAKAP (Yaman, Kalinga, at Pag-aaruga) is a government healthcare program designed to provide every Filipino with access to free primary care services, medicines, and laboratory tests through PhilHealth Konsulta.',
    category: 'Basics'
  },
  {
    id: 'who_eligible',
    question: 'Who is eligible to join?',
    answer: 'Every Filipino citizen registered with PhilHealth is eligible. This includes all membership categories: employed, self-employed, OFWs, senior citizens, and indigents.',
    category: 'Eligibility'
  },
  {
    id: 'cost',
    question: 'Is there any cost to join?',
    answer: 'No. Registration and availment of services under the YAKAP Program are free for eligible PhilHealth members at accredited government providers.',
    category: 'Cost'
  },
  {
    id: 'no_philhealth',
    question: 'What if I don\'t have a PhilHealth ID yet?',
    answer: 'You need to register with PhilHealth first. You can do this at any PhilHealth office or through the eGovPH app. Once you have your PIN, you can register for YAKAP.',
    category: 'Registration'
  },
  {
    id: 'dependents',
    question: 'Are my children covered?',
    answer: 'Yes, qualified dependents declared in your PhilHealth record are covered. However, they must also be registered to a provider (can be the same or different from the principal) to avail of benefits.',
    category: 'Coverage'
  },
  {
    id: 'medicines_covered',
    question: 'What medicines can I get?',
    answer: 'The program covers essential medicines for common conditions such as hypertension, diabetes, asthma, and infections, as prescribed by your YAKAP doctor.',
    category: 'Services'
  },
  {
    id: 'where_use',
    question: 'Can I use my YAKAP benefits anywhere?',
    answer: 'No. You must avail of the services at the specific accredited provider where you are registered. If you need to transfer, you can change your provider after a certain period.',
    category: 'Usage'
  },
  {
    id: 'how_often',
    question: 'How often can I get a check-up?',
    answer: 'You are entitled to unlimited consultations throughout the year as needed by your medical condition.',
    category: 'Usage'
  },
  {
    id: 'cancer_screening',
    question: 'How do I avail of cancer screening?',
    answer: 'Consult with your YAKAP primary care doctor first. If you meet the criteria for screening (based on age, risk factors, etc.), they will refer you for the specific test (e.g., mammogram).',
    category: 'Services'
  },
  {
    id: 'check_status',
    question: 'How do I know if I am already registered?',
    answer: 'You can check your status via the PhilHealth Member Portal, the eGovPH app, or by checking your Member Data Record (MDR) which should list your assigned Konsulta provider.',
    category: 'Registration'
  }
];

export const OFFICIAL_CONTACTS = {
  philhealth_website: 'https://www.philhealth.gov.ph',
  egovph_website: 'https://e.gov.ph',
  philhealth_hotline: '(02) 8441-7442',
  philhealth_email: 'actioncenter@philhealth.gov.ph',
  yakap_info_url: 'https://www.philhealth.gov.ph/konsulta/' 
};
