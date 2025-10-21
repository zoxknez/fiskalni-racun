# 🚀 Brze Komande - Mobilni Development

Koristi ovaj fajl kao cheat sheet za svakodnevni development.

---

## 🔨 Build & Sync

```powershell
# Production build web aplikacije
npm run build

# Sync sa svim platformama
npm run cap:sync

# Sync samo sa Android-om
npx cap sync android

# Sync samo sa iOS-om
npx cap sync ios

# Full build + sync
npm run mobile:build
```

---

## 📱 Otvaranje Native IDE

```powershell
# Otvori Android Studio
npm run cap:android
# ili
npx cap open android

# Otvori Xcode (macOS)
npm run cap:ios
# ili
npx cap open ios
```

---

## 🔥 Live Reload Development

```powershell
# Android sa live reload
npm run mobile:dev:android

# iOS sa live reload (macOS)
npm run mobile:dev:ios

# Alternativno (2 terminala):
# Terminal 1:
npm run dev

# Terminal 2:
npx cap run android --livereload --external
# ili
npx cap run ios --livereload --external
```

---

## 🏃 Run na uređaju

```powershell
# Full build i run na Android
npm run cap:run:android

# Full build i run na iOS (macOS)
npm run cap:run:ios

# Ili manuelno:
npm run build
npx cap sync
npx cap run android
# ili
npx cap run ios
```

---

## 🧹 Cleanup & Rebuild

```powershell
# Clean Android build
cd android
./gradlew clean
cd ..
npm run build
npx cap sync android

# Clean iOS build (macOS)
cd ios/App
pod deintegrate
pod install
cd ../..
npm run build
npx cap sync ios
```

---

## 📦 Update Dependencies

```powershell
# Update npm packages
npm update

# Update Capacitor
npm install @capacitor/cli@latest @capacitor/core@latest
npm install @capacitor/android@latest @capacitor/ios@latest

# Update all Capacitor plugins
npm install @capacitor/app@latest
npm install @capacitor/camera@latest
npm install @capacitor/filesystem@latest
npm install @capacitor/haptics@latest
npm install @capacitor/push-notifications@latest
npm install @capacitor/share@latest
npm install @capacitor/splash-screen@latest
npm install @capacitor/status-bar@latest

# Sync after updates
npx cap sync
```

---

## 🎨 Assets Generation

```powershell
# Install assets plugin
npm install @capacitor/assets --save-dev

# Generate all icon sizes
npx capacitor-assets generate

# Generate with custom background color
npx capacitor-assets generate --iconBackgroundColor '#2563eb'

# Sync assets
npx cap sync
```

---

## 🔍 Debugging

```powershell
# Check Capacitor setup
npx cap doctor

# List installed plugins
npx cap ls

# Android logcat (u drugom terminalu)
adb logcat | grep -i "capacitor"

# Clear Android cache
adb shell pm clear com.fiskalniracun.app

# iOS logs (macOS)
xcrun simctl spawn booted log stream --predicate 'processImagePath endswith "App"'
```

---

## 📱 Device Management

```powershell
# List connected Android devices
adb devices

# Install APK na uređaj
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Uninstall app sa uređaja
adb uninstall com.fiskalniracun.app

# iOS devices (macOS)
xcrun xctrace list devices
```

---

## 🏗️ Build APK/AAB (Android)

```powershell
# Debug APK (u Android Studio):
# Build → Build Bundle(s) / APK(s) → Build APK(s)
# Lokacija: android/app/build/outputs/apk/debug/app-debug.apk

# Release AAB (u Android Studio):
# Build → Generate Signed Bundle / APK
# Selektuj: Android App Bundle
# Lokacija: android/app/release/app-release.aab

# Ili Gradle komandom:
cd android
./gradlew assembleDebug          # Debug APK
./gradlew bundleRelease          # Release AAB
cd ..
```

---

## 🍎 Build iOS Archive (macOS)

```bash
# U Xcode:
# Product → Archive
# Window → Organizer → Distribute App

# Ili komandom:
cd ios/App
xcodebuild -workspace App.xcworkspace \
           -scheme App \
           -configuration Release \
           -archivePath build/App.xcarchive \
           archive
cd ../..
```

---

## 🧪 Testing

```powershell
# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Type check
npm run type-check

# Lint
npm run lint

# Lint + auto-fix
npm run lint:fix
```

---

## 📊 Performance & Analytics

```powershell
# Bundle size analysis
npm run build:analyze

# Size limit check
npm run size

# Check bundle
npm run bundle:check

# Generate stats
npm run build
# Stats fajl: dist/stats.html
```

---

## 🔐 Environment Variables

```powershell
# Development
cp env.template .env.local
# Edit .env.local

# Production
cp env.template .env.production
# Edit .env.production

# Build sa production env
npm run build
```

---

## 📝 Version Bump

```powershell
# Bump version u package.json
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.1 → 1.1.0
npm version major   # 1.1.0 → 2.0.0

# Ažuriraj version u Capacitor config (ručno):
# capacitor.config.ts - version field

# Android versionCode (ručno):
# android/app/build.gradle
# versionCode i versionName

# iOS version (ručno u Xcode):
# ios/App/App.xcodeproj
# CURRENT_PROJECT_VERSION i MARKETING_VERSION
```

---

## 🚨 Common Issues & Fixes

### Android: "SDK location not found"
```powershell
# Kreiraj local.properties u android/
echo "sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk" > android/local.properties
```

### Android: Gradle build failed
```powershell
cd android
./gradlew clean
cd ..
npm run build
npx cap sync android
```

### iOS: CocoaPods error
```bash
cd ios/App
pod deintegrate
pod install --repo-update
cd ../..
```

### Live reload ne radi
```powershell
# Proveri firewall
# Omogući incoming connections za Node.js

# Proveri IP adresu
ipconfig
# Koristi IP iz WiFi adaptera

# Proveri da su računar i telefon na istoj mreži
```

### Plugin not found
```powershell
# Reinstaliraj plugin
npm install @capacitor/camera@latest

# Sync
npx cap sync
```

---

## 📚 Helpful Commands

```powershell
# Otvori dokumentaciju
explorer mobile-docs

# Otvori Android projekat u file explorer
explorer android

# Otvori iOS projekat u file explorer
explorer ios

# Otvori build output
explorer dist

# Check npm outdated
npm outdated

# Audit security
npm audit
```

---

## 🎯 Quick Workflows

### Daily Development:
```powershell
npm run dev              # Start dev server
npm run mobile:dev:android  # Start na telefonu
# Radi izmene, automatski se refresh-uje!
```

### Before Commit:
```powershell
npm run type-check       # Check TypeScript
npm run lint:fix         # Fix linting
npm run test             # Run tests
```

### Weekly Testing:
```powershell
npm run build            # Production build
npm run cap:sync         # Sync sa platformama
# Test u Android Studio / Xcode
```

### Before Release:
```powershell
# 1. Update version
npm version minor

# 2. Full build
npm run build

# 3. Sync
npm run cap:sync

# 4. Test na uređajima

# 5. Create signed builds
# Android: Android Studio → Generate Signed Bundle
# iOS: Xcode → Product → Archive

# 6. Submit na stores
```

---

## 💡 Pro Tips

```powershell
# Use aliases in PowerShell profile
Set-Alias cap npx cap
Set-Alias capb "npm run mobile:build"
Set-Alias capa "npm run cap:android"
Set-Alias capi "npm run cap:ios"

# Clear terminal
cls  # or clear

# Check port usage
netstat -ano | findstr :5173

# Kill process on port
taskkill /PID <PID> /F

# Quick git status
git status -sb
```

---

**Sacuvaj ovaj fajl za brzi pristup komandata! 🚀**
