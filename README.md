# HEALTH (Help Everyone Access Local Treatment & Healthcare)

HEALTH is an AI-powered mobile healthcare navigation application designed for Naga City. It helps residents identify the appropriate level of care, locate facilities, and enroll in the YAKAP free healthcare program.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the App](#running-the-app)
- [Project Structure](#project-structure)
- [License](#license)

## Features

- **AI-Powered Navigation Assistant**: Voice and text symptom input to recommend appropriate care levels (Self-Care, Health Center, Hospital, Emergency).
- **Facility Directory**: Comprehensive list of Naga City's 29 healthcare facilities with services, hours, and YAKAP status.
- **YAKAP Enrollment Navigator**: Guided support for enrolling in the free YAKAP program.
- **Offline Functionality**: Core features work without internet.

## Tech Stack

- **Frontend**: React Native 0.81.x, Expo SDK 54, TypeScript
- **Backend**: Node.js 24.12.0, Express, Prisma
- **Database**: PostgreSQL (Aiven)
- **AI**: Google Gemini 2.5 Flash
- **Maps**: @rnmapbox/maps
- **State Management**: Redux Toolkit

## Prerequisites

- Node.js >= 24.12.0
- npm or yarn or pnpm
- Expo Go app (for testing on device) or Android/iOS Emulator

## Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd health-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Configuration

1.  Copy the example environment file:
    ```bash
    cp .env.example .env
    ```

2.  Update `.env` with your API keys and configuration:
    - `EXPO_PUBLIC_GEMINI_API_KEY`: Your Google Gemini API Key
    - `EXPO_PUBLIC_MAPBOX_TOKEN`: Your Mapbox Access Token
    - `DATABASE_URL`: PostgreSQL connection string
    - `FIREBASE_CONFIG`: Firebase configuration

## AI Integration Limits (Gemini Free Tier)

This application uses the Google Gemini 2.5 Flash API on the free tier. Please be aware of the following usage constraints:

- **Rate Limits:**
  - 15 requests per minute (RPM)
  - 1,500 requests per day (RPD)
- **Service Handling:**
  - The app implements automatic retry logic with exponential backoff for transient errors.
  - Identical queries are cached for 10 minutes to conserve quota.
  - If limits are reached, the AI assistant will pause briefly before retrying or inform the user to wait.

## Running the App

### Start the Expo development server:

```bash
npx expo start
```

- Press `a` to open in Android Emulator
- Press `i` to open in iOS Simulator
- Scan the QR code with Expo Go on your physical device

### Run Backend (if applicable locally)

```bash
cd backend
npm install
npm run dev
```

## Project Structure

The project follows a feature-based architecture under the `src/` directory:

```
src/
├── api/                # API clients (Gemini, Backend, Mapbox)
├── assets/             # Static assets
├── components/         # Reusable UI components
│   ├── common/         # Generic components (Buttons, Inputs)
│   └── features/       # Feature-specific components
├── features/           # Feature modules
│   ├── facilities/     # Facility directory logic
│   ├── navigation/     # App navigation logic
│   └── yakap/          # YAKAP enrollment logic
├── hooks/              # Custom React hooks
├── navigation/         # Navigation configuration
├── screens/            # Screen components
├── services/           # Business logic services
├── store/              # Global state (Redux)
├── tests/              # Unit tests
├── types/              # Shared TypeScript types
└── utils/              # Utility functions
```

## License

[MIT](LICENSE)
