# Repository Guidelines

## Project Structure & Module Organization

- `src/` holds the React Native app code (feature-first): `features/`, `screens/`, `components/`, `services/`, `store/`, `utils/`, `api/`, `types/`, `constants/`, `theme/`.
- `tests/` contains app-level tests; unit tests also live under `src/**/__tests__/`.
- `backend/` contains the Node/Express API (`backend/src/`), Prisma (`backend/prisma/`), scripts (`backend/scripts/`), and backend tests (`backend/tests/`).
- `assets/` is for static assets; native platform projects are under `android/`.

## Build, Test, and Development Commands

- `npm start` / `npx expo start`: run the Expo dev server.
- `npm run android` / `npm run ios` / `npm run web`: launch the app on a target platform.
- `npm test`: run frontend and backend tests in sequence.
- `npm run test:frontend` / `npm run test:backend`: run Jest for a single side.
- `npm run lint` / `npm run format`: lint with ESLint or format with Prettier.
- `cd backend && npm run dev`: start the API with nodemon.
- `cd backend && npm run build` / `npm run start`: build and run the compiled backend.
- `cd backend && npm run seed` / `npm run data:import`: seed or import facility data.

## Coding Style & Naming Conventions

- TypeScript is the default; prefer `.tsx` for React components and `.ts` for logic.
- Formatting is enforced by Prettier (single quotes, trailing commas, semicolons, 100-column width).
- ESLint uses `@typescript-eslint`; avoid unused vars and `any` unless justified.
- Naming patterns: `PascalCase` for components, `camelCase` for functions, `useX` for hooks.

## Testing Guidelines

- Jest is used for both frontend (`jest.config.js`) and backend (`backend/jest.config.js`).
- Test files follow `*.test.ts` / `*.test.tsx` naming (example: `tests/RecommendationScreen.test.tsx`).
- Run coverage with `npm run test:coverage`; no explicit threshold is configured.

## Commit & Pull Request Guidelines

- Recent history favors Conventional Commits-style prefixes like `feat:` or `feat(scope):`; follow that pattern when possible.
- Keep commits focused on a single change area and avoid mixing frontend/backend in one commit.
- Branch naming (suggested): `feat/short-topic`, `fix/short-topic`, `chore/short-topic`.
- PRs should include a clear summary, test commands run, and screenshots for UI changes.
- GitHub Actions includes Gemini review workflows; expect automated review comments on PRs.

## Security & Configuration

- Copy `.env.example` to `.env` and keep secrets local; never commit real API keys.
- Backend configuration lives in `backend/.env`; keep credentials out of source control.
