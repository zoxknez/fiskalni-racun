# 📱 Mobile Build Guide - Fiskalni Račun

Ovaj dokument sadrži kompletan vodič za pravljenje iOS i Android verzija aplikacije.

## 📋 Preduslovi

### Za Android:
- ✅ Node.js (već instaliran)
- ✅ Android Studio (download: https://developer.android.com/studio)
- ✅ Java JDK 17+ (dolazi sa Android Studio)
- ✅ Android SDK (instalira se kroz Android Studio)

### Za iOS:
- ✅ macOS operativni sistem (obavezno za iOS build)
- ✅ Xcode 14+ (download iz App Store)
- ✅ CocoaPods (`sudo gem install cocoapods`)
- ✅ Apple Developer Account ($99/godišnje)

---

## 🚀 Korak po korak setup

### 1️⃣ Instalacija Capacitor platformi

Pokreni u terminalu:

```powershell
# Instaliraj Android i iOS platforme
npm install @capacitor/android @capacitor/ios

# Dodaj platforme u projekat
npx cap add android
npx cap add ios
```

### 2️⃣ Build web verzije

Pre nego što napraviš mobilnu verziju, moraš da build-uješ web verziju:

```powershell
npm run build
```

Ovo kreira `dist` folder koji Capacitor koristi.

### 3️⃣ Sync projekta sa mobilnim platformama

```powershell
# Kopiraj web assets i sync plugin-e
npx cap sync

# Ili pojedinačno:
npx cap sync android
npx cap sync ios
```

---

## 🤖 Android Build

### Otvaranje projekta u Android Studio:

```powershell
npx cap open android
```

### Build APK za testiranje:

1. U Android Studio: `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
2. APK će biti u: `android/app/build/outputs/apk/debug/app-debug.apk`

### Build AAB za Google Play:

1. U Android Studio: `Build` → `Generate Signed Bundle / APK`
2. Selektuj `Android App Bundle`
3. Kreiraj keystore (prvi put) ili koristi postojeći
4. AAB će biti u: `android/app/release/app-release.aab`

### Testiranje na uređaju:

```powershell
# Povezati Android telefon preko USB-a i omogući USB debugging
npx cap run android

# Ili za live reload tokom razvoja:
npm run dev
# U drugom terminalu:
npx cap run android --livereload --external
```

---

## 🍎 iOS Build

**NAPOMENA:** iOS build radi samo na macOS računaru!

### Otvaranje projekta u Xcode:

```powershell
npx cap open ios
```

### Podešavanje u Xcode:

1. Otvori `ios/App/App.xcworkspace` (NE .xcodeproj!)
2. Selektuj projekat u navigatoru
3. U sekciji "Signing & Capabilities":
   - Izaberi svoj Team (Apple Developer Account)
   - Automatski će se kreirati Bundle Identifier

### Build za testiranje na simulatoru:

1. U Xcode selektuj simulator (npr. iPhone 15 Pro)
2. Klikni ▶️ (Play) dugme ili Cmd+R

### Build za fizički iPhone:

1. Povezati iPhone preko USB-a
2. Trust računar na iPhone-u
3. U Xcode selektuj svoj uređaj
4. Klikni ▶️ ili Cmd+R

### Build za App Store:

1. U Xcode: `Product` → `Archive`
2. Kada se završi, otvoriće se Organizer
3. Klikni `Distribute App`
4. Prati wizard za upload na App Store Connect

---

## 🔄 Development Workflow

### Standardni workflow:

```powershell
# 1. Napravi izmene u React kodu
# 2. Build web verziju
npm run build

# 3. Sync sa mobilnim platformama
npx cap sync

# 4. Pokreni na Android/iOS
npx cap open android
npx cap open ios
```

### Live Reload Workflow (BRŽI):

```powershell
# Terminal 1: Pokreni dev server
npm run dev

# Terminal 2: Pokreni na mobilnom sa live reload
npx cap run android --livereload --external
# ili
npx cap run ios --livereload --external
```

---

## 📦 NPM Scripts (dodaj u package.json)

Dodaj ove korisne skripte:

```json
"scripts": {
  "cap:sync": "npx cap sync",
  "cap:android": "npx cap open android",
  "cap:ios": "npx cap open ios",
  "cap:run:android": "npm run build && npx cap sync android && npx cap run android",
  "cap:run:ios": "npm run build && npx cap sync ios && npx cap run ios",
  "mobile:dev:android": "npx cap run android --livereload --external",
  "mobile:dev:ios": "npx cap run ios --livereload --external",
  "mobile:build": "npm run build && npx cap sync"
}
```

---

## 🎨 App Icons & Splash Screen

### Generisanje ikona:

1. Kreiraj icon od 1024x1024px kao `icon.png` u `public` folderu
2. Kreiraj splash screen 2732x2732px kao `splash.png` u `public` folderu
3. Instaliraj Capacitor Assets plugin:

```powershell
npm install @capacitor/assets --save-dev
npx capacitor-assets generate
```

---

## 🔐 Google Play Deployment

### Kreiranje Keystore (samo prvi put):

```powershell
keytool -genkey -v -keystore fiskalni-racun.keystore -alias fiskalni-racun -keyalg RSA -keysize 2048 -validity 10000
```

### Upload na Google Play Console:

1. Idi na https://play.google.com/console
2. Kreiraj novu aplikaciju
3. Popuni sve obavezne informacije (opis, screenshots, itd.)
4. Upload AAB fajl u Production, Beta ili Internal testing track
5. Submituj za pregled

---

## 🍎 App Store Deployment

### Priprema u App Store Connect:

1. Idi na https://appstoreconnect.apple.com
2. Klikni "My Apps" → "+" → "New App"
3. Popuni informacije o aplikaciji
4. Upload screenshots (potrebni za različite veličine uređaja)
5. Napiši opis aplikacije

### Upload build-a:

1. U Xcode napravi Archive (`Product` → `Archive`)
2. Distributer App → App Store Connect
3. Aplikacija će biti dostupna u App Store Connect posle par minuta
4. Selektuj build u "App Store" sekciji
5. Submituj za App Review

---

## 🛠️ Troubleshooting

### Android Issues:

**Problem:** `ANDROID_HOME nije setovan`
```powershell
# Dodaj u System Environment Variables:
ANDROID_HOME = C:\Users\[USERNAME]\AppData\Local\Android\Sdk
```

**Problem:** Gradle build failed
```powershell
# U android folderu:
cd android
./gradlew clean
cd ..
npx cap sync android
```

### iOS Issues:

**Problem:** CocoaPods error
```bash
cd ios/App
pod install --repo-update
cd ../..
```

**Problem:** Signing error
- Proveri da li imaš važeći Apple Developer Account
- Proveri Bundle Identifier u Xcode

---

## 📱 Testing Best Practices

### Pre release:
- ✅ Testiraj na fizičkim uređajima (ne samo simulatorima)
- ✅ Testiraj na različitim verzijama OS-a
- ✅ Testiraj sve Capacitor plugin-e (kamera, notifikacije, itd.)
- ✅ Testiraj offline funkcionalnost
- ✅ Proveri responsive design na različitim veličinama ekrana
- ✅ Testiraj deep links (ako imaš)

---

## 🎯 Sledeći koraci

1. **Instaliraj potrebne alate** (Android Studio / Xcode)
2. **Dodaj platforme** (`npx cap add android ios`)
3. **Build web verziju** (`npm run build`)
4. **Sync sa platformama** (`npx cap sync`)
5. **Otvori u native IDE** (`npx cap open android/ios`)
6. **Build i testiraj!**

---

## 📚 Dodatni resursi

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Android Publishing Guide](https://developer.android.com/studio/publish)
- [iOS Publishing Guide](https://developer.apple.com/app-store/submissions/)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)

---

**Srećno sa mobilnim aplikacijama! 🚀📱**
