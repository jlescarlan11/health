# HEALTH Application: Master Functional Specification & Workflow Architecture

**Version:** 1.0.0 (Production-Ready)  
**Project:** HEALTH (Help Everyone Access Local Treatment & Healthcare)  
**Target Region:** Naga City, Philippines  
**Deployment:** Expo SDK 54 (iOS/Android)

---

## 1. Feature Architecture Overview

### A. AI Symptom Assessment

- **Gemini 2.5 Flash Engine:** Multi-phase clinical conversation (Plan -> Extract -> Triage).
- **Triage Arbiter:** deterministic gatekeeper enforcing clinical turn floors and saturation checks.
- **Dynamic Refinement:** Assessment plan pivots if symptoms escalate mid-chat.

### B. Safety & Emergency

- **Bicolano Keyword Detector:** Scans for local dialect emergency terms.
- **System Lock:** Verification modal for 10/10 risk scenarios.
- **Hospital Floor:** Enforced referral for recently resolved high-risk symptoms.

### C. Facility Directory

- **Haversine Proximity:** GPS-based sorting of 29+ facilities.
- **Offline SQLite Sync:** Master records accessible without internet.
- **Busyness Monitoring:** Privacy-preserving proximity signals.

---

## 2. Visual Workflows (Mermaid.js)

### Workflow A: The Symptom Assessment Journey (AI Chat)

_Visualizes the complex logic from initial symptom to care recommendation._

```mermaid
graph TD
    Start[User enters symptom] --> LocalScan{Local Emergency Scan}
    LocalScan -- High Risk Match --> EmerModal[Emergency Verification Modal]
    LocalScan -- Safe --> PlanGen[Gemini: Generate 3-Tier Assessment Plan]

    PlanGen --> ChatLoop[Chat Turn: Question & User Answer]
    ChatLoop --> Extraction[AI extracts clinical slots: Age, Duration, etc.]
    Extraction --> Arbiter{Triage Arbiter Check}

    Arbiter -- Escalation Detected --> Refine[AI Pivots Plan & Updates Questions]
    Refine --> ChatLoop

    Arbiter -- Data Missing / Below Floor --> ChatLoop

    Arbiter -- Ready / Saturated --> SOAP[Gemini: Synthesize SOAP Note & Level]
    SOAP --> RecScreen[Display Care Level & Recommended Facilities]
```

### Workflow B: The "Safety Lock" Intervention

_Visualizes how the app interrupts the user to ensure immediate safety._

```mermaid
graph TD
    Msg[User sends chat message] --> Detector[Keyword Detector: Bicolano/English]
    Detector --> Score{Score > 7?}

    Score -- No --> Standard[Standard AI Processing]

    Score -- Yes --> Modal[Safety Recheck Modal Pops Up]
    Modal --> Choice{User Status}

    Choice -- "Happening Now" --> ForceEmer[Force EMERGENCY Care Level]
    Choice -- "Just Stopped" --> HospFloor[Enforce HOSPITAL referral protocol]
    Choice -- "I am Safe" --> Suppress[Suppress Keyword & Resume Chat]
```

### Workflow C: Zero-Signal Offline Triage

_Visualizes the deterministic decision tree for users with no internet._

```mermaid
graph TD
    NoNet[Internet Connection Lost] --> StartTree[q_emergency_signs: Airway/Breathing?]

    StartTree -- Yes --> ER[OUTCOME: Emergency Room]
    StartTree -- No --> Cardiac[q_cardiac_stroke: Pain/Weakness?]

    Cardiac -- Yes --> Transport[OUTCOME: Immediate Transport]
    Cardiac -- No --> Tropical[q_tropical_check: Flood Exposure?]

    Tropical -- Yes --> Dengue[OUTCOME: Dengue/Tropical Protocol]
    Tropical -- No --> Moderate[q_moderate: Cough > 2 weeks?]

    Moderate -- Yes --> HealthCenter[OUTCOME: Health Center]
    Moderate -- No --> SelfCare[OUTCOME: Self-Care at Home]
```

### Workflow D: Intelligent Facility Navigation

_Visualizes how the directory provides real-time guidance._

```mermaid
graph TD
    OpenApp[App Start] --> Sync[Background Sync: Diff API vs SQLite]
    Sync --> GPS[Fetch User Coordinates]
    GPS --> List[Sort Facilities by Proximity & Status]

    List --> Filter{User applies filter}
    Filter -- "YAKAP" --> ShowAccredited[Show Accredited Clinics]
    Filter -- "Specialized" --> ShowDialysis[Show Dialysis/Bite Centers]

    ShowAccredited --> Detail[View Facility Hours & Busyness]
    Detail --> Navigate[One-tap Map Deep-link: Google/Apple]
```

### Workflow E: YAKAP Enrollment Process

_Visualizes the stateless informational guide for free healthcare._

```mermaid
graph TD
    StartGuide[Enter YAKAP Guide] --> Check1[Check Residency: Naga Resident?]
    Check1 -- No --> Stop1[Inform Ineligibility]
    Check1 -- Yes --> Check2[Check PhilHealth: Have PIN?]

    Check2 -- No --> Portal[Deep-link to PhilHealth Online Portal]
    Check2 -- Yes --> Pathway[Choose Enrollment Method]

    Pathway -- "eGovPH App" --> StepA[App Store Download Instructions]
    Pathway -- "Clinic" --> StepB[List of Nearest Accredited Clinics]
    Pathway -- "Office" --> StepC[Directions to Local PhilHealth LHIO]

    StepA & StepB & StepC --> Complete[Completion Card: Benefit Summary]
```

### Workflow F: Clinical Handover (The SOAP Continuity)

_Visualizes how data moves from chat to the doctor’s clipboard._

```mermaid
graph TD
    FinalRec[Final AI Triage Recommendation] --> Storage[Save SOAP Note to Redux/OfflineSlice]
    Storage --> TTL[Set 24-Hour Expiry Timer]
    Storage --> Home[Home Hero: 'Your Report is Ready' Link]

    Home --> Report[View Structured Report: Subjective/Objective/Assessment/Plan]
    Report --> Share[Copy to Clipboard for Messaging/Doctor]

    TTL -- Timer Ends --> Purge[Wipe Clinical Data for Privacy]
```

---

## 3. Implementation Matrix (Gap-Free Reference)

| System         | Feature                | Logic Implementation                                                    |
| :------------- | :--------------------- | :---------------------------------------------------------------------- |
| **Logic**      | **Hedging Correction** | Corrects "I don't think I have chest pain" to a safety-first verify.    |
| **Logic**      | **Saturation**         | Stops questioning if slots (Age/Duration) remain identical for 2 turns. |
| **Safety**     | **Bicolano Support**   | `nagkukumbulsion` (seizing) triggers 10/10 neuro system lock.           |
| **Privacy**    | **Proximity Hashing**  | SHA-256 daily rotating hash ensures zero user tracking.                 |
| **Navigation** | **Haversine**          | Battery-efficient math for Naga City grid coordinates.                  |
