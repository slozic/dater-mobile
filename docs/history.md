# Dater Mobile History

This file is the mobile-only historical log for `dater-mobile`.
It consolidates:

- Imported mobile history that had previously been tracked in `dater/docs/history.md`.
- Mobile changes implemented directly in this repository.
- Remaining useful follow-up items for future iterations.

## Source migration note

- On 2026-03-23, mobile-related history entries were migrated from backend `dater/docs/history.md` into this file so backend and mobile histories can evolve independently.

## Imported mobile history (from backend archive)

### Foundation and core app flows

- Created Expo app at `C:\Users\sly-x\projects\spring\dater-mobile`.
- Added API helper with SecureStore token storage and mobile endpoint integration.
- Implemented login, dates list, date details, date creation, and profile edit flows.
- Added tab UX refinements:
  - hide tab bar when logged out,
  - My Dates tab,
  - exclusion of own/requested entries from main list.
- Added location/radius filtering with opt-in location usage and empty-state hints.
- Added reusable auth context to keep login/logout state synchronized across screens.

### Forms and profile usability

- Added required-field validation on create-date form (title/location/description/date-time).
- Added registration validation for required fields, including birthday/gender.
- Added login validation for missing credentials and generic auth failure handling.
- Added profile settings section with logout and token cleanup.
- Replaced deprecated SafeAreaView usage with `react-native-safe-area-context`.
- Added mobile registration screen and login->register navigation.
- Profile refreshes on focus to show active user data.
- Profile order/UX improvements:
  - photos first, details second, settings last,
  - full-name display,
  - birthday/gender visible and read-only in edit mode.

### Date details, attendees, and images

- Date details shows owner-only image uploads; attendee waitlist request can be canceled.
- Added auth-expiry handling and token clearing for expired auth flow.
- Added automatic refresh-token flow with retry-once logic.
- Added single-flight refresh behavior so concurrent auth failures share one refresh request.
- Reduced duplicate list requests via focus-driven loading and in-flight guards.
- Date details request list improvements:
  - hidden behind `View requests` toggle by default,
  - card-style rows,
  - accepted/waitlist distinction,
  - owner/self exclusion from request count,
  - profile navigation via `View profile`.
- Added owner options grouping (`Edit`, `Delete`, `Upload images`) in options menu.
- Added My Dates options menu views (`Created`, `Requested`, `Accepted`, `Past`).

### Chat feature and chat UX

- Added date chat UI:
  - chat route `app/date/chat/[id].tsx`,
  - open-chat action in date details for owner/accepted attendee flow,
  - chat API helpers in `lib/api.ts`.
- Chat refinements:
  - opens at latest messages,
  - stabilized Android keyboard/composer behavior,
  - date context in header,
  - reduced duplicate labeling.
- Added web-compatible attendee accept/reject confirmation path for Expo web (`confirm(...)` on web).

### Notifications and push integration

- Added profile notification preference toggles:
  - new messages,
  - new requests on owned dates,
  - request accepted.
- Removed stale notification inbox/read-all modal flow from mobile.
- Added push-token registration/upload integration with resilient retry on app foreground.
- Added deep-link routing by push payload type:
  - `CHAT_MESSAGE` -> `/date/chat/[id]`,
  - other date-related types -> `/date/[id]`.
- Added Expo Go guards/lazy-loading around notification setup for unsupported runtime paths.
- Added mobile push/dev-client setup documentation:
  - `docs/README_DEV_CLIENT_AND_PUSH_SETUP.md`.

### Shared UI components and polish

- Added reusable UI primitives:
  - `components/ui/ActionPillButton.tsx`,
  - `components/ui/OptionsPopover.tsx`,
  - `components/ui/OptionsMenuItem.tsx`.
- Migrated options menus to modal-popover approach for improved Android touch reliability.
- Added outside-tap dismiss behavior while preserving menu-item click reliability.
- Header/layout polish:
  - explicit stack screen titles,
  - white header style,
  - chat header/date chip alignment improvements,
  - date details top meta row (chip + options),
  - public profile spacing and field order alignment.

## 2026-03-23 Mobile review follow-up execution

This section tracks the strict review follow-up implementation done directly in `dater-mobile`.

### Implemented now

- `C1` (already landed before this pass): 403 responses no longer force logout in API auth handling.
- `H1` (already landed before this pass): backend error detail propagation in API client.
- `H2` Added mobile test infrastructure and scripts:
  - `jest.config.js`, `jest.setup.ts`,
  - scripts in `package.json` (`test`, `test:watch`, `test:ci`).
- `H2` Added regression tests:
  - `lib/__tests__/api.test.ts` (401/refresh, 403/no logout, error extraction fallback),
  - `lib/__tests__/auth.test.tsx` (token load and push-token sync behavior).
- `M1` Extracted shared date/time helpers to `lib/date-utils.ts`.
- `M2` Extracted shared image-picker helper to `lib/image-picker.ts`.
- `M3` Added in-flight action guards in `app/date/[id].tsx` for:
  - request join/cancel,
  - attendee accept/reject.
- `M4` (partial) Centralized common color/limits constants in `constants/app.ts` and adopted in updated screens/components.
- `M5` Removed unused scaffold/template files and modal route.
- `M6` Strengthened registration validation in `app/auth/register.tsx`:
  - trimmed payload,
  - email format validation,
  - minimum password length.
- `M7` Hardened API configuration in `lib/config.ts`:
  - normalized `EXPO_PUBLIC_API_URL`,
  - require explicit URL in non-development builds,
  - keep development fallback.
- `L1` Added accessibility labels/hints for key controls in login, profile, date details, and chat screens.
- `L2` Reduced noisy production warnings in `lib/auth.tsx` by routing push registration warnings through a dev-only logger helper.
- `L3` Normalized safe-area edge usage across key route screens.
- `L4` Replaced chat message length literal with shared constant (`ChatLimits.messageMaxLength`).
- `L5` (partial) Reduced repeated constants and utility duplication; full cross-screen style-system extraction still pending.

### Verification

- `npm run lint` -> pass.
- `npm test -- --runInBand` -> pass (`2` suites, `6` tests).

## Remaining useful follow-ups

These are intentionally deferred and can be resumed later:

- `L6` Split `app/date/[id].tsx` into smaller focused components/modules.
- Complete full style-token and shared-style extraction beyond currently touched screens.
- Extend accessibility coverage to all interactive controls/screens, not only the critical ones touched in this pass.
- Add broader UI/component tests beyond auth/API baseline tests.
- Product backlog:
  - report/block users,
  - final full UI polish pass across remaining screens.

