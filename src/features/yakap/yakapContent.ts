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
    description: 'Free essential medicines (up to ₱20,000/year) for conditions as prescribed by your doctor.',
    items: [
      'Hypertension and Diabetes medications',
      'Antibiotics and Asthma medications',
      '75 specific molecules in the GAMOT list',
      'Prescribed for up to 3 months'
    ],
    icon: 'pill'
  },
  {
    id: 'screenings',
    category: 'Cancer Screenings',
    description: 'Early detection cancer screenings with referral from your YAKAP Clinic.',
    items: [
      'Mammogram and Breast ultrasound',
      'Low-dose chest CT scan',
      'Alpha fetoprotein and Liver ultrasound',
      'Colonoscopy'
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
    question: 'What is PhilHealth YAKAP?',
    answer: 'PhilHealth YAKAP is a government program designed to keep Filipinos healthy through primary care. YAKAP clinics monitor member health for early disease detection and provide necessary medicines to prevent conditions from worsening and requiring hospitalization.',
    category: 'Basics'
  },
  {
    id: 'yakap_vs_konsulta',
    question: 'How is it different from PhilHealth Konsulta?',
    answer: 'YAKAP is the expanded and improved version of the PhilHealth Konsulta program, aiming to provide members with more comprehensive and complete healthcare coverage.',
    category: 'Basics'
  },
  {
    id: 'who_is_it_for',
    question: 'Who can avail of PhilHealth YAKAP?',
    answer: 'The program is available to every Filipino. To access free benefits and services, you simply need to register at your chosen PhilHealth-accredited YAKAP Clinic.',
    category: 'Eligibility'
  },
  {
    id: 'benefits',
    question: 'What are the benefits of the program?',
    answer: 'Members receive free medical check-ups, laboratory tests, cancer screenings, and essential medicines from accredited pharmacies, all provided based on a doctor\'s assessment and recommendation.',
    category: 'Benefits'
  },
  {
    id: 'where_to_avail',
    question: 'Where can I access these services?',
    answer: 'Services are provided by accredited YAKAP Clinics. You can choose your preferred clinic for registration. Your dependents should also be registered, either at the same clinic or another one that is more convenient for them.',
    category: 'Usage'
  },
  {
    id: 'how_to_register',
    question: 'How do I register for YAKAP?',
    answer: 'If you have a PhilHealth Identification Number (PIN), you can register through the eGovPH app, PhilHealth Member Portal, any PhilHealth office, or directly at a YAKAP Clinic.',
    category: 'Registration'
  },
  {
    id: 'fees',
    question: 'Are there any fees or payments required?',
    answer: 'Benefits and services are free at accredited public YAKAP Clinics. However, if you register at a private YAKAP Clinic, they may charge a maximum fee of Php 900 per patient for the entire year.',
    category: 'Cost'
  },
  {
    id: 'cancer_tests',
    question: 'Which cancer screening tests are covered?',
    answer: 'Covered screenings include Mammogram, Breast ultrasound, Low-dose chest CT scan, Alpha fetoprotein, Liver ultrasound, and Colonoscopy. These require a referral from your YAKAP Clinic doctor.',
    category: 'Benefits'
  },
  {
    id: 'medicine_limit',
    question: 'Is there a limit to the free medicines?',
    answer: 'Yes, there is a Php 20,000 annual limit for free medicines per member. Qualified dependents have their own separate Php 20,000 annual limit. Any cost exceeding this limit will be covered by the member.',
    category: 'Benefits'
  },
  {
    id: 'representative',
    question: 'Can someone else pick up my medicines?',
    answer: 'Yes. A representative can pick up your prescribed medicines by presenting an authorization letter, your valid ID, and their own valid government-issued ID.',
    category: 'Usage'
  }
];

export const OFFICIAL_CONTACTS = {
  philhealth_website: 'https://www.philhealth.gov.ph',
  egovph_website: 'https://e.gov.ph',
  philhealth_hotline: '(02) 866-225-88',
  philhealth_sms_smart: '0998-857-2957',
  philhealth_sms_globe: '0917-127-5987',
  philhealth_email: 'actioncenter@philhealth.gov.ph',
  yakap_info_url: 'https://www.philhealth.gov.ph/konsulta/' 
};
