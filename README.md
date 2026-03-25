# Dater Mobile (`dater-mobile`)

Expo/React Native client for the Dater project.

## Stack

- Expo Router
- React Native
- TypeScript
- SecureStore for auth token persistence
- `expo-notifications` for push integration

## Core capabilities

- Auth (login/register/logout) + refresh-token based backend session handling
- Dates list with optional location radius filtering
- Date details flow:
  - request/cancel join
  - owner request management (accept/reject)
  - owner edit/delete date
  - image upload/delete
- Date chat screen for owner and accepted attendee
- Profile + public profile screens
- Notification settings toggles (per notification type)
- Push deep-link navigation to chat or date details based on notification type

## Local setup

1. Install dependencies:
   - `npm install`
2. Set API URL for production-like runs:
   - `EXPO_PUBLIC_API_URL=https://your-backend-host`
   - This is mandatory for non-development builds.
3. Start Expo:
   - `npx expo start`

## Run modes

- **Development build (recommended for push testing)**:
  - `npx expo start --dev-client -c`
- **Expo Go**:
  - Useful for quick UI iteration.
  - Remote push behavior is limited/not fully supported for this app workflow.
- **Web**:
  - `localhost:8081` runs the mobile app in web mode (not the separate `dater-frontend` repo).

## Lint

- Run:
  - `npm run lint`

## Tests

- Run unit tests:
  - `npm test`
- Watch mode during development:
  - `npm run test:watch`
- CI-style run (single process + coverage):
  - `npm run test:ci`
- Current coverage focus:
  - API auth/error handling regressions (`lib/__tests__/api.test.ts`)
  - Auth provider token/push flow (`lib/__tests__/auth.test.tsx`)

## Project docs

- Dev client + Firebase push setup:
  - `docs/README_DEV_CLIENT_AND_PUSH_SETUP.md`
- Mobile change history archive:
  - `docs/history.md`

## Notes

- Context persistence for Cursor is maintained in `.mdc` files:
  - `.cursor/rules/project-context.mdc`
