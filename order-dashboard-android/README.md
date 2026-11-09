# Cafe POS — Android App

Native Android client for staff to take orders from a phone, talking to the
same `order-dashboard-api` backend the web app (`order-dashboard`) uses.
Kotlin + Jetpack Compose + Material 3.

## Scope (built step by step, this app stays POS-only for now)

Done so far:
- **Splash screen** — brand mark on the dark-green background, then routes
  to Login or Menu depending on whether a saved session exists.
- **Login screen** — email/password, calls `POST /api/auth/login` (same
  endpoint the web app uses), stores the JWT via DataStore so it survives
  app restarts. Rejects Super Admin accounts (that's the web console's
  job, not this app's) and flags 2FA accounts as not-yet-supported here.
- **Menu screen** (the "Coffee" reference) — categories, search, item
  list with a tap-to-add + button; items with variants/add-ons open a
  picker sheet first. Cart badge in the header.
- **New Order screen** — Dine In / Take Away / Order Online tabs, a table
  picker (Dine In only), customer name, the cart with qty +/- and
  remove, and the Subtotal/Tax/Total breakdown.
- **Settle & Save screen** — payment type grid, customer paid (with a
  change-due readout for Cash), tip, and a single "Complete Payment"
  action that creates the order (`POST /api/orders`) and settles it
  (`POST /api/billing/orders/:id/pay`) in one go.

Per-item tax (Menu Management) is authoritative, falling back to the
Settings -> GST/Tax CGST+SGST (or IGST) rate for an item left at 0% —
same rule the web app's POS cart uses.

Not yet ported from the web app (next, in rough priority order):
discounts/offers & combos, loyalty/wallet/coupons at checkout, Save/
Hold/Send-to-Kitchen (this always saves+settles in one pass right now),
an outlet picker for multi-outlet tenants (defaults to the tenant's
main outlet), and dedicated Split/Due sub-flows (both are accepted as
plain payment methods for now, same as Card/Other).

## Opening the project

1. Open Android Studio on the Mac mini -> **Open** -> select this
   `order-dashboard-android` folder (not the repo root).
2. Let Gradle sync. If it asks to create the Gradle wrapper, say yes —
   the wrapper jar isn't checked into git (binary files don't belong in
   a diff-friendly repo); `gradle/wrapper/gradle-wrapper.properties` is
   there so Android Studio knows which Gradle version (8.9) to fetch.
3. Run on an emulator or a real device over USB.

## Pointing it at your backend

`app/build.gradle.kts` sets `API_BASE_URL` in `defaultConfig`, applied to
both `debug` and `release` builds unless a build type overrides it. It's
currently `https://poscafe.getojar.com/` — the live VPS, same domain the
web app's `VITE_API_URL` points at — so logging in with a real staff
account works straight away on an emulator or a real device.

- **Testing against a local dev backend instead** (e.g. while building a
  new screen, so you're not hitting live data): uncomment the
  `buildConfigField` line in the `debug` build type and set it to
  `http://10.0.2.2:4000/` for the emulator, or your Mac's LAN IP
  (`ipconfig getifaddr en0`) for a real device over Wi-Fi, e.g.
  `http://192.168.1.23:4000/`. That needs
  `android:usesCleartextTraffic="true"` in `AndroidManifest.xml` (already
  there) since it's plain `http`, not `https`.

## Package layout

```
app/src/main/java/com/orderdashboard/pos/
  MainActivity.kt            — NavHost: Splash -> Login -> Menu -> New Order -> Settle
  CafePosApp.kt               — Application class
  navigation/Routes.kt
  ui/theme/                   — colors sampled from the reference designs
  ui/screens/                 — Splash + Login (+ its ViewModel)
  ui/screens/pos/             — Menu, New Order, Settle & Save + PosViewModel
                                 (shared cart/menu state — created once at the
                                 NavHost level so it survives navigating
                                 between those three screens) + CartLine
  data/network/                — Retrofit + kotlinx.serialization API client,
                                 one *Api.kt/*Models.kt pair per backend route
                                 group (auth, menu, tables, orders, billing,
                                 settings), AuthInterceptor + TokenHolder for
                                 attaching the JWT to every call
  data/session/                — DataStore-backed JWT/session persistence
```
