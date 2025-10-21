# 📱 Mobilna dokumentacija - Fiskalni Račun

Dobrodošao u mobilnu dokumentaciju! Ovaj folder sadrži sve što ti treba da pretvoriš ovu React aplikaciju u iOS i Android aplikacije spremne za App Store i Google Play.

---

## 📚 Dokumenti

### 🚀 [QUICK-START.md](./QUICK-START.md)
**START OVDE!** Brzi vodič za prvi build. Idealno ako samo želiš da što pre testiraš aplikaciju na telefonu.

**Vreme čitanja:** 2 minuta  
**Koristi za:** Prvu instalaciju i prvi build

---

### 📖 [MOBILE-BUILD-GUIDE.md](./MOBILE-BUILD-GUIDE.md)
Kompletan, detaljan vodič sa svim koracima od instalacije do deployments na store-ove.

**Vreme čitanja:** 15-20 minuta  
**Koristi za:** 
- Potpuno razumevanje build procesa
- Troubleshooting problema
- Production deployment
- Best practices

**Sadrži:**
- ✅ Preduslovi i instalacija
- ✅ Android build korak-po-korak
- ✅ iOS build korak-po-korak
- ✅ Development workflow
- ✅ App icons & splash screens
- ✅ Google Play deployment
- ✅ App Store deployment
- ✅ Troubleshooting
- ✅ Testing checklist

---

### 🏪 [APP-STORE-REQUIREMENTS.md](./APP-STORE-REQUIREMENTS.md)
Sve što ti treba za objavljivanje na App Store i Google Play.

**Vreme čitanja:** 10 minuta  
**Koristi za:**
- Pripremu za submission
- Kreiranje screenshots-a
- Privacy Policy template
- Pre-submission checklist
- Launch strategiju

**Sadrži:**
- 📱 Apple App Store zahtevi
- 🤖 Google Play Store zahtevi
- 🎨 Asset creation tips
- 📝 Privacy Policy template
- ✅ Pre-submission checklist
- 🚀 Launch strategy
- 📊 Post-launch praćenje

---

### ❓ [FAQ.md](./FAQ.md)
Odgovori na najčešće postavljana pitanja.

**Vreme čitanja:** 5-10 minuta  
**Koristi za:**
- Brze odgovore na česta pitanja
- Troubleshooting specifičnih problema
- Razumevanje Capacitor-a
- Deployment savete

**Sekcije:**
- 💬 Opšta pitanja
- 🔧 Tehnička pitanja
- 🏗️ Build pitanja
- 💻 Development pitanja
- 🏪 Store submission pitanja
- ⚡ Performanse
- 🐛 Troubleshooting
- 🚀 Deployment
- 💰 Monetizacija

---

### 🎨 [ICONS-GUIDE.md](./ICONS-GUIDE.md)
Kompletan vodič za kreiranje app ikona i splash screen-a.

**Vreme čitanja:** 10 minuta  
**Koristi za:**
- Dizajniranje app ikone
- Kreiranje splash screen-a
- Automatsko generisanje assets-a
- Android adaptive icons
- Design best practices

---

### ✅ [PRE-RELEASE-CHECKLIST.md](./PRE-RELEASE-CHECKLIST.md)
Detaljna checklist pre submisije na store-ove.

**Vreme čitanja:** 5 minuta  
**Koristi za:**
- Osiguranje da ništa nije propušteno
- Quality assurance
- Final proveru pre submisije
- Post-launch monitoring plan

---

## 🎯 Kako da koristiš ovu dokumentaciju?

### Scenario 1: Prvi put build-ujem mobilnu app
1. Pročitaj **QUICK-START.md** (2 min)
2. Prati korake za instalaciju
3. Ako imaš problema, pogledaj **FAQ.md** ili **MOBILE-BUILD-GUIDE.md**

### Scenario 2: Spreman sam za store submission
1. Pročitaj **APP-STORE-REQUIREMENTS.md** (10 min)
2. Napravi sve potrebne assets-e
3. Prati pre-submission checklist
4. Submit! 🎉

### Scenario 3: Imam specifično pitanje
1. Pretraži **FAQ.md** prvo
2. Ako ne nađeš odgovor, detaljno pretraži **MOBILE-BUILD-GUIDE.md**
3. Još uvek problem? Pogledaj Troubleshooting sekciju

### Scenario 4: Hoću da optimizujem aplikaciju
1. Pogledaj Performance sekciju u **FAQ.md**
2. Pročitaj Best Practices u **MOBILE-BUILD-GUIDE.md**

---

## 🛠️ Brze komande (posle instalacije)

```powershell
# Build web verzije
npm run build

# Sync sa mobilnim platformama
npm run cap:sync

# Otvori u Android Studio
npm run cap:android

# Otvori u Xcode (samo macOS)
npm run cap:ios

# Pokreni na Android sa live reload
npm run mobile:dev:android

# Pokreni na iOS sa live reload (samo macOS)
npm run mobile:dev:ios

# Full build i run na Android
npm run cap:run:android

# Full build i run na iOS (samo macOS)
npm run cap:run:ios
```

---

## 📦 Šta je već spremno?

Tvoj projekat već ima:

✅ **Capacitor konfigurisan** (`capacitor.config.ts`)  
✅ **Capacitor plugin-i instalirani:**
- @capacitor/app
- @capacitor/camera
- @capacitor/filesystem
- @capacitor/haptics
- @capacitor/push-notifications
- @capacitor/share
- @capacitor/splash-screen
- @capacitor/status-bar

✅ **PWA podešavanja** (`manifest.json`, `sw-custom.js`)  
✅ **Mobile-optimized UI** (Framer Motion animacije, touch gestures)  
✅ **Lokalna baza** (Dexie - radi offline)  
✅ **OCR funkcionalnost** (Tesseract.js)  
✅ **QR scanning** (@zxing/library)

---

## 🚀 Sledeći koraci

### Što pre da probam (za Android):
1. Instaliraj [Android Studio](https://developer.android.com/studio)
2. Pokreni: `npm install @capacitor/android`
3. Dodaj platformu: `npx cap add android`
4. Build: `npm run build`
5. Sync: `npx cap sync android`
6. Otvori: `npx cap open android`
7. Klikni ▶️ u Android Studio

**Vreme:** ~30 minuta (sa downloadom Android Studio)

### Za iOS (samo macOS):
1. Instaliraj Xcode iz App Store
2. Instaliraj CocoaPods: `sudo gem install cocoapods`
3. Pokreni: `npm install @capacitor/ios`
4. Dodaj platformu: `npx cap add ios`
5. Build: `npm run build`
6. Sync: `npx cap sync ios`
7. Otvori: `npx cap open ios`
8. Klikni ▶️ u Xcode

**Vreme:** ~30 minuta (sa downloadom Xcode)

---

## 💡 Pro tips

1. **Koristi live reload za development** - mnogo brže od rebuild-ovanja svaki put
2. **Testiraj na fizičkim uređajima** - emulatori/simulatori nisu dovoljni
3. **Kreiraj beta testing grupu** - TestFlight (iOS) i Internal Testing (Android)
4. **Prati analytics** - Sentry i PostHog su već u projektu
5. **Version kontrola** - Povećaj version u `package.json` i Capacitor config-u za svaki release

---

## 📱 Očekivani rezultat

Nakon pravljenja build-a, imaćeš:

### Android:
- **Debug APK** - Za testiranje na uređajima
- **Release AAB** - Za Google Play Store
- Native Android app sa svim funkcionalnostima

### iOS:
- **Development build** - Za testiranje na tvojim uređajima
- **TestFlight build** - Za beta testing
- **Production build** - Za App Store
- Native iOS app sa svim funkcionalnostima

---

## 🆘 Potrebna pomoć?

1. **Dokumentacija:** Pročitaj sve fajlove u ovom folderu
2. **FAQ:** Verovatno već ima odgovor na tvoje pitanje
3. **Capacitor Docs:** https://capacitorjs.com/docs
4. **Community:**
   - [Capacitor Discord](https://discord.com/invite/UPYYRhtyzp)
   - [Stack Overflow](https://stackoverflow.com/questions/tagged/capacitor)
   - [Ionic Forum](https://forum.ionicframework.com)

---

## 📊 Status projekta

- [x] Capacitor instaliran
- [x] Web app razvijen
- [x] Mobile plugin-i instalirani
- [ ] Android platforma dodata
- [ ] iOS platforma dodata
- [ ] Prvi Android build
- [ ] Prvi iOS build
- [ ] Beta testing
- [ ] Google Play submission
- [ ] App Store submission
- [ ] Production launch 🚀

---

**Srećno sa mobilnim aplikacijama! Biće to sjajno iskustvo! 🎉📱**

Ako imaš bilo kakvih pitanja ili problema, slobodno pitaj!
