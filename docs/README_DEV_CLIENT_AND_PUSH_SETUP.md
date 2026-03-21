# Dev Client + Push Setup (Expo + Firebase)

This guide documents Android push-notification setup for this mobile app in local development.

## Why this exists

Android push notifications in Expo use Firebase Cloud Messaging (FCM).  
Because this requires native configuration, push should be tested with an EAS development build (dev client), not Expo Go.

## Required services and accounts

Register in both platforms:

- Expo (build/dev client): [https://expo.dev](https://expo.dev)
- Firebase (FCM for Android push): [https://console.firebase.google.com](https://console.firebase.google.com)

Why both:
- Expo provides EAS build and runtime tooling.
- Firebase provides Android push infrastructure consumed by `expo-notifications`.

## 1) Expo setup (EAS / dev client)

1. Install EAS CLI:
   - `npm install -g eas-cli`
2. Log in to Expo:
   - `eas login`
3. In `app.json`, ensure:
   - `expo.android.package` is `com.slozic.datermobile`
   - `expo.extra.eas.projectId` exists
   - `expo-notifications` is listed in `expo.plugins`

Reference:
- Expo dev builds: [https://docs.expo.dev/develop/development-builds/introduction/](https://docs.expo.dev/develop/development-builds/introduction/)
- EAS build overview: [https://docs.expo.dev/build/introduction/](https://docs.expo.dev/build/introduction/)

## 2) Firebase setup (Android app + config file)

1. Open Firebase Console and create/select a project.
2. Add an Android app with package name:
   - `com.slozic.datermobile`
3. Download `google-services.json`.
4. Put it in project root (same level as `app.json`):
   - `google-services.json`
5. In `app.json`, ensure:
   - `expo.android.googleServicesFile` is `./google-services.json`

Reference:
- Firebase Android setup: [https://firebase.google.com/docs/android/setup](https://firebase.google.com/docs/android/setup)
- Expo push setup: [https://docs.expo.dev/push-notifications/push-notifications-setup/](https://docs.expo.dev/push-notifications/push-notifications-setup/)

## 3) Build and install dev client

From `dater-mobile`:

1. Build APK:
   - `eas build --profile development --platform android`
2. Install APK on Android device.

Important:
- If native config changes (plugins, package id, `google-services.json`), rebuild and reinstall.

## 4) Run locally with Metro

From `dater-mobile`:

- `npx expo start --dev-client -c`

Open the installed dev client and connect to Metro.

## 5) Verify push end-to-end

1. Open mobile app.
2. Logout/login once (triggers push registration).
3. Trigger notification event (accept attendee or send chat message).
4. Check backend logs for:
   - `Updated push token ... tokenPresent=true ...`
   - `Push send attempted. status=... response=...`

## 6) Common issues

- `Default FirebaseApp is not initialized...`
  - Missing/wrong `google-services.json`, wrong package id, or stale dev build.

- `...removed from Expo Go... use development build`
  - Running in Expo Go instead of a dev client build.

- `Unable to retrieve the FCM server key for the recipient's app` (Expo response `InvalidCredentials`)
  - Expo project push credentials are not configured for Android FCM (service account / FCM v1).

- Backend still logs `tokenPresent=false`
  - Device did not obtain Expo push token; re-check setup and rebuild app.

## Notes for this project

- Managed Expo workflow is used.
- Manual Gradle edits from Firebase wizard are not required in this setup.
