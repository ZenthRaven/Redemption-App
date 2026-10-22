# Redemption

A gamified life operating system: finances, liabilities, habits, quests, calendar, learning, time, projects, health and life goals — one game you play to win.

Portrait Android app (Capacitor 6), developed as a web app with a phone-shaped live preview.

## Develop

```bash
npm install
npm run dev
```

Open http://localhost:5173. On desktop the app renders inside a phone frame with device presets (and a **Test panel** for the game engine); on a phone it fills the screen.

## Android APK

Requirements: JDK 17 and the Android SDK (platform 34, build-tools 34). `android/local.properties` points Gradle at the SDK.

```bash
npm run build
npx cap sync android
cd android
gradlew.bat assembleRelease
```

The signed APK lands in `android/app/build/outputs/apk/release/app-release.apk`.

Release signing reads `android/keystore.properties` and `android/redemption-release.jks`. Both are git-ignored — **back them up**: Android only installs an update over an existing install when it is signed with the same key.

See [ROADMAP.md](ROADMAP.md) for the step-by-step build plan.
