# **HEALTH App \- Project Brief**

## Team CTRL+H | Naga City Mayoral Hackathon | December 2025

## **Project Summary**

HEALTH (Help Everyone Access Local Treatment & Healthcare) is a mobile healthcare navigation application designed to solve Naga City's critical facility overcrowding problem. While the city’s hospitals, especially the **Naga City General Hospital**, face severe overcrowding and long wait times, primary care resources such as barangay health centers remain underutilized. Additionally, many eligible residents have not enrolled in the free **YAKAP** healthcare program.

## HEALTH addresses this concern by introducing an **AI-powered mobile app assistant** that helps residents identify the appropriate level of care, a **comprehensive facility directory**, and a **guided YAKAP enrollment navigator**. The application improves healthcare access and aligns with Naga City’s goals for equitable primary care usage, reduced hospital strain, and increased community health outcomes.

## **Problem Statement**

Despite digital transformation efforts, Naga City residents lack smart navigation to appropriate healthcare facilities, resulting in:

- Severe hospital overcrowding \- NCGH overwhelmed with non-emergency cases
- Underutilized primary care \- 27 barangay health centers at \<50% capacity
- Long wait times \- 2-4 hours for non-emergency cases at NCGH
- Missed healthcare benefits \- Despite eligibility, only 39% of Naga City’s residents (approximately 80,809 individuals) are currently enrolled in the YAKAP free healthcare program, leaving an estimated 126,380 residents without access to free primary care benefits.

The underlying cause is an **information gap** in healthcare navigation, which leads people to default to hospitals even for basic care that could be provided locally.

---

## **Solution Overview**

### **What HEALTH Does ✅**

- Guides residents to appropriate facility types based on their needs
- Shows comprehensive facility services and locations
- Enables YAKAP enrollment for free healthcare access
- Detects medical emergencies and mental health crises

### **What HEALTH Does NOT Do ❌**

- Diagnose medical conditions
- Prescribe medications
- Replace healthcare professionals

---

## **Core Features**

### **1\. AI-Powered Healthcare Navigation Assistant**

**Purpose:** Help residents understand which TYPE of facility is appropriate for their situation.

**Key Capabilities:**

- Voice and text symptom input (English)
- Intelligent clarifying questions (2-4 follow-ups)
- Recommends one of four facility levels: Self-Care, Barangay Health Center, Hospital, or Emergency Services
- Shows 3 nearest appropriate facilities with distance, phone, YAKAP status

**Critical Safety Features:**

- Red flag detection for emergencies (chest pain, breathing difficulty, severe bleeding, etc.)
- Mental health crisis detection with 24/7 hotlines
- Conservative approach \- when in doubt, recommends higher level of care
- Three-touchpoint disclaimer system

**Scope:** 20 common situations (fever, cough, injuries, headaches, chronic disease follow-ups, prenatal care, immunizations, wellness checks)

### **2\. Comprehensive Facility Directory**

**Coverage:** All 29 healthcare facilities in Naga (27 health centers \+ NCGH \+ Bicol Medical Center)

**Information Provided:**

- Services offered (consultations, maternal health, immunizations, dental, labs, pharmacy)
- Operating hours and contact information
- Address with distance/travel time
- YAKAP accreditation status
- Photos

**Views:** Map view (color-coded pins) and list view (sorted by distance)

**Accessibility:** Screen reader support, high contrast mode, adjustable fonts, WCAG 2.1 Level AA compliant  
**Offline Functionality:** Works without internet for facility directory, YAKAP info, and emergency hotlines

### **3\. YAKAP Enrollment Navigator**

**Purpose:** Help the estimated 126,380 currently unenrolled residents of Naga City enroll in and access free YAKAP primary healthcare benefits.

**YAKAP Benefits:**

- Free unlimited consultations at registered clinic
- 13 lab tests free annually (CBC, urinalysis, blood sugar, ECG, X-ray, etc.)
- ₱20,000 worth of medicines annually (21 essential medicines)
- Cancer screenings (mammography, colonoscopy, CT scans)

**Registration Support:** Step-by-step guidance for 4 enrollment pathways (eGovPH app, PhilHealth portal, clinic visit, PhilHealth office)

**Expected Impact:** Enroll 10,000 new residents in YAKAP during Year 1, increasing Naga City's enrollment rate from 39% to approximately 44%. HEALTH will unlock **up to ₱200 million annually in free medicines** for newly enrolled residents, with each enrollee eligible for ₱20,000 worth of essential medicines annually, plus unlimited consultations, 13 free laboratory tests, and cancer screenings.

---

## **TECH STACK**

### **Core Framework**

- **React Native**: 0.81.x (stable with Expo SDK 54\)
- **Expo SDK**: 54 (latest stable, released Sept 2025\)
- **Node.js**: 24.12.0 LTS (latest LTS)
- **TypeScript**: 5.7.x (latest)

**Note**: React Native 0.83 with Expo SDK 55 releases in January 2026\. For December 2025, use RN 0.81 \+ Expo SDK 54\.

### **Backend & Database**

- **Backend**: Node.js 24.12.0 \+ Express 4.21.x
- **ORM**: Prisma 7.2.0 (latest, Dec 17, 2025\)
- **Database**: Aiven PostgreSQL (Free tier: 50MB storage, 5 concurrent connections)

### **AI & Maps**

- **AI API**: Google Gemini 2.5 Flash (Free tier: 15 RPM, 1M TPM, 1500 RPD)
- **Maps**: @rnmapbox/maps 10.2.9 (latest)
- **Mapbox SDK**: v11.x (Free tier: 50K requests/month)

### **Authentication & Storage**

- **Auth**: Firebase Phone Auth (Free: 50K MAU, SMS costs $0.01-$0.02/message in Philippines)
- **Offline Storage**: Expo SQLite (local cache)
- **Backend Storage**: PostgreSQL (source of truth)
- **State Management**: Redux Toolkit 2.x

### **Additional Libraries**

- **Navigation**: React Navigation 6.x
- **Voice Input**: Expo Speech
- **Geolocation**: Expo Location
- **Forms**: React Hook Form 7.x
- **HTTP Client**: Axios 1.x
