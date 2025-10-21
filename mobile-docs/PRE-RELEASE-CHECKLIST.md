# ✅ Pre-Release Checklist

Koristi ovu listu pre nego što submitteš aplikaciju na App Store ili Google Play.

---

## 📱 Osnovne provere

### Verzionisanje
- [ ] `version` u `package.json` povećan (npr. 1.0.0 → 1.0.1)
- [ ] `versionCode` u `android/app/build.gradle` povećan
- [ ] `versionName` u `android/app/build.gradle` ažuriran
- [ ] iOS version u Xcode ažuriran (`CURRENT_PROJECT_VERSION` i `MARKETING_VERSION`)

### Build
- [ ] `npm install` bez errora
- [ ] `npm run build` prošao uspešno
- [ ] `npm run type-check` bez errora
- [ ] `npm run lint` bez errora
- [ ] `npx cap sync` izvršen

---

## 🧪 Testiranje

### Funkcionalno
- [ ] Sve glavne funkcije rade (QR scan, OCR, manual add)
- [ ] CRUD operacije za račune rade
- [ ] CRUD operacije za garancije rade
- [ ] Export u CSV/PDF/Excel radi
- [ ] Import podataka radi
- [ ] Search i filter funkcionišu
- [ ] Statistike se pravilno prikazuju
- [ ] Notifikacije rade (ako su omogućene)

### UI/UX
- [ ] Dark mode radi pravilno
- [ ] Light mode radi pravilno
- [ ] Animacije su smooth
- [ ] Nema layout shift-ova
- [ ] Touch targets su dovoljno veliki (minimum 44x44px)
- [ ] Loading stanja su prikazana
- [ ] Error stanja su prikazana
- [ ] Success feedback je jasan

### Performanse
- [ ] Aplikacija se učitava za < 3 sekunde
- [ ] Nema vidljivih lag-ova pri skrolovanju
- [ ] Slike se učitavaju brzo
- [ ] Animacije su 60fps
- [ ] Memory leak testiran (DevTools)

### Responsiveness
- [ ] Testirano na malim telefonima (iPhone SE, Android 5")
- [ ] Testirano na velikim telefonima (iPhone Pro Max, Android 6.7")
- [ ] Testirano na tabletima (iPad, Android tablet)
- [ ] Landscape orientation radi pravilno
- [ ] Portrait orientation radi pravilno

### Cross-platform (ako radimo obe)
- [ ] Testirano na Android 10, 11, 12, 13, 14
- [ ] Testirano na iOS 15, 16, 17
- [ ] Identično iskustvo na obe platforme

---

## 🔐 Bezbednost i privatnost

- [ ] Privacy Policy napisan i hostan
- [ ] Privacy Policy URL dodat u store listings
- [ ] Nema hardcoded API keys u kodu
- [ ] Sensitive podaci nisu logovani
- [ ] Content Security Policy postavljen
- [ ] HTTPS korišćen za sve eksterne resources

---

## 🎨 Assets

### App Icon
- [ ] 1024x1024px ikona kreirana
- [ ] Bez alpha kanala (za iOS)
- [ ] Vidljiva na svetlim pozadinama
- [ ] Vidljiva na tamnim pozadinama
- [ ] Čitljiva na malim veličinama
- [ ] Sve veličine generisane (`npx capacitor-assets generate`)
- [ ] Android adaptive icon testiran

### Splash Screen
- [ ] 2732x2732px splash screen kreiran
- [ ] Sadržaj centriran u safe zone
- [ ] Splash screen duration podešen (1-2 sekunde)
- [ ] Smooth transition sa splash na home screen

### Screenshots (za store)
- [ ] Minimum 2 screenshot-a za svaku platformu
- [ ] Screenshot-i prikazuju ključne funkcionalnosti
- [ ] Dobrog kvaliteta (ne blur, ne pixelated)
- [ ] Ispravne dimenzije za svaku platformu

---

## 📝 Store Listings

### App Store (iOS)
- [ ] App Name (maximum 30 characters)
- [ ] Subtitle (maximum 30 characters)
- [ ] Promotional Text (opciono, 170 characters)
- [ ] Description (maximum 4000 characters)
- [ ] Keywords (maximum 100 characters, comma-separated)
- [ ] Support URL
- [ ] Marketing URL (opciono)
- [ ] Privacy Policy URL
- [ ] App Category odabran
- [ ] Age Rating odabran
- [ ] Screenshots uploadovani (svih veličina)
- [ ] App Preview video (opciono)

### Google Play
- [ ] App Title (maximum 30 characters)
- [ ] Short Description (maximum 80 characters)
- [ ] Full Description (maximum 4000 characters)
- [ ] App Icon (512x512px)
- [ ] Feature Graphic (1024x500px)
- [ ] Screenshots uploadovani
- [ ] Promo video (opciono, YouTube link)
- [ ] App Category odabran
- [ ] Content Rating odabran
- [ ] Privacy Policy URL
- [ ] Contact Email
- [ ] Target audience & content
- [ ] Data safety section popunjen

---

## 🔧 Tehničke provere

### Android
- [ ] Signed APK/AAB generisan
- [ ] Keystore bezbedan i backup-ovan
- [ ] `minSdkVersion` >= 23 (Android 6.0)
- [ ] `targetSdkVersion` >= 33 (Android 13)
- [ ] `compileSdkVersion` 34 (Android 14)
- [ ] Permissions u `AndroidManifest.xml` samo što je potrebno
- [ ] ProGuard rules (ako koristiš)
- [ ] Testirano na fizičkom Android uređaju
- [ ] 64-bit support

### iOS
- [ ] Valid provisioning profile
- [ ] Distribution certificate
- [ ] Bundle ID registrovan u Apple Developer Portal
- [ ] `Deployment Target` iOS 15.0 ili noviji
- [ ] Privacy usage descriptions u `Info.plist`:
  - [ ] NSCameraUsageDescription
  - [ ] NSPhotoLibraryUsageDescription (ako koristiš)
  - [ ] NSPhotoLibraryAddUsageDescription
- [ ] Testirano na fizičkom iOS uređaju
- [ ] Testirano na iPhone i iPad (ako podržavaš)

---

## 📊 Analytics & Monitoring

- [ ] Sentry konfigurisan za error tracking
- [ ] PostHog konfigurisan za analytics (ako koristiš)
- [ ] Crash reporting testiran
- [ ] Analytics events testirane
- [ ] User opt-out za analytics dostupan

---

## 📚 Dokumentacija

- [ ] README.md ažuriran
- [ ] CHANGELOG.md ažuriran sa novim verzijama
- [ ] API dokumentacija ažurirana (ako imaš backend)
- [ ] User-facing dokumentacija/help sekcija
- [ ] Known issues dokumentovani

---

## 🚀 Pre-Deployment

### Backup
- [ ] Database schema backup-ovan
- [ ] Source code commit-ovan i push-ovan na Git
- [ ] Tag kreiran za verziju (`git tag v1.0.0`)
- [ ] Release notes napisane

### Beta Testing (preporučeno!)
- [ ] TestFlight beta test (iOS) - minimum 1 nedelja
- [ ] Google Play Internal/Closed Beta - minimum 1 nedelja
- [ ] Feedback od beta testera prikupljen
- [ ] Kritični bug-ovi fiksirani

### Final Checks
- [ ] Clean build napravljen (izbrisati cache)
- [ ] Testirano na fresh install (ne upgrade)
- [ ] Testirano bez internet konekcije
- [ ] Testirano sa sporim internetom
- [ ] Battery usage testiran (nema excessive drain)
- [ ] Storage usage razuman

---

## 🎬 Submission

### App Store
- [ ] Archive kreiran u Xcode
- [ ] Uploaded na App Store Connect
- [ ] Build selektovan u app verziji
- [ ] TestFlight testing completed
- [ ] Submit for Review kliknut
- [ ] Release options podešene (automatski/manuelno)

### Google Play
- [ ] AAB uploadovan na Internal track
- [ ] Internal testing completed (opciono)
- [ ] Promoted u Production
- [ ] Release notes napisane
- [ ] Rollout percentage odabran (100% ili staged)
- [ ] Submit for Review

---

## ⏱️ Post-Submission

### Monitoring (prvo 24h)
- [ ] Praćenje crash rate
- [ ] Praćenje reviews i ratings
- [ ] Odgovaranje na user feedback
- [ ] Monitoring performance metrics

### First Week
- [ ] Daily provera analytics
- [ ] Odgovaranje na support emails
- [ ] Praćenje store rankings
- [ ] Social media objave

---

## 🐛 Rollback Plan

U slučaju kritičnih problema:
- [ ] Staija verzija dostupna kao backup
- [ ] Hot-fix branch spreman
- [ ] Emergency contact lista (ako imaš tim)
- [ ] Communication plan za korisnike

---

## 🎯 Success Metrics

Definiši šta znači uspešan launch:
- Target broj download-a: ___________
- Target rating: ___________
- Target crash-free rate: > 99%
- Target retention (Day 7): ___________

---

## 📝 Notes

Prostor za dodatne beleške specifične za tvoj projekat:

```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

---

**Kada checkmark-uješ sve stavke, spreman si za launch! 🚀**

Good luck! 🍀
