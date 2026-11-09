# Cafe POS — Android App

Native Android client for staff to take orders from a phone, talking to the
same `order-dashboard-api` backend the web app (`order-dashboard`) uses.
Kotlin + Jetpack Compose + Material 3.

## Scope (built step by step, this app stays POS-only for now)

Done so far:
- **Splash screen** — brand mark on the dark-green background, then routes
  to Login or Home depending on whether a saved session exists.
- **Login screen** — email/password, calls `POST /api/auth/login` (same
  endpoint the web app uses), stores the JWT via DataStore so it survives
  app restarts. Rejects Super Admin accounts (that's the web console's
  job, not this app's) and flags 2FA accounts as not-yet-supported here.
- **Home screen** — placeholder that just proves the login/session flow
  works end to end. Logout button included.

Next up (not built yet): menu browsing + categories ("Coffee" screen),
New Order (Dine In / Take Away / Order Online, customer + table, cart),
and Settle & Save (payment type, customer paid, tip) — matching the
reference designs and the web app's `CafePosPage.tsx` behavior.

## Opening the project

1. Open Android Studio on the Mac mini -> **Open** -> select this
   `order-dashboard-android` folder (not the repo root).
2. Let Gradle sync. If it asks to create the Gradle wrapper, say yes —
   the wrapper jar isn't checked into git (binary files don't belong in
   a diff-friendly repo); `gradle/wrapper/gradle-wrapper.properties` is
   there so Android Studio knows which Gradle version (8.9) to fetch.
3. Run on an emulator or a real device over USB.

## Pointing it at your backend

`app/build.gradle.kts` sets `API_BASE_URL` per build type. The default,
`http://10.0.2.2:4000/`, is the Android emulator's address for your Mac's
`localhost:4000` — i.e. it expects `order-dashboard-api`'s dev server
running locally while you build out screens.

- **Testing against a real device** on the same Wi-Fi as your Mac: swap
  `10.0.2.2` for your Mac's LAN IP (`ipconfig getifaddr en0`), e.g.
  `http://192.168.1.23:4000/`.
- **Pointing at your live VPS** (for the release build): change the
  `release` build type's `API_BASE_URL` to `https://<your-api-domain>/`
  and drop `android:usesCleartextTraffic="true"` from
  `AndroidManifest.xml` (that flag only exists for the emulator's
  plain-`http` dev backend).

## Package layout

```
app/src/main/java/com/orderdashboard/pos/
  MainActivity.kt           — NavHost: Splash -> Login -> Home
  CafePosApp.kt              — Application class
  navigation/Routes.kt
  ui/theme/                  — colors sampled from the reference designs
  ui/screens/                — one file per screen (+ a ViewModel for Login)
  data/network/               — Retrofit + kotlinx.serialization API client
  data/session/               — DataStore-backed JWT/session persistence
```
