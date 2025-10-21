# ❓ FAQ - Često postavljana pitanja

## Opšta pitanja

### Da li mi treba macOS za iOS aplikaciju?
**Da**, iOS build može da se pravi samo na macOS računaru zbog Apple ograničenja. Za Android build možeš koristiti Windows, Mac ili Linux.

### Koliko košta objavljivanje aplikacije?
- **Google Play Store:** $25 (jednokratna uplata)
- **Apple App Store:** $99/godišnje

### Mogu li da testiram bez plaćanja?
**Da!** Možeš da build-uješ i testiraš na svojim uređajima besplatno. Plaćanje je potrebno samo za objavu na store-ovima.

### Da li je React dobar izbor za mobilne aplikacije?
**Da!** Sa Capacitor-om tvoja React aplikacija postaje potpuno native aplikacija sa pristupom svim native API-jima (kamera, notifikacije, file system, itd.). Alternativa bi bila React Native, ali Capacitor je jednostavniji jer koristi isti kod kao web verzija.

---

## Tehnička pitanja

### Šta je Capacitor?
Capacitor je framework koji pretvara web aplikacije u native iOS i Android aplikacije.Wrapper je oko WebView-a sa pristupom native funkcionalnostima.

### Razlika između Capacitor i React Native?
- **Capacitor:** Koristi isti kod kao web aplikacija, lakši za održavanje, brži development
- **React Native:** Bolje performanse, ali zahteva poseban kod i više održavanja

Za ovu aplikaciju, Capacitor je bolji izbor jer već imaš React web aplikaciju.

### Mogu li koristiti sve React biblioteke?
**Uglavnom da**, ali neke biblioteke koje koriste browser-specific API-je mogu imati problema. Sve što si već iskoristio u projektu (Framer Motion, React Hook Form, Dexie, itd.) bi trebalo da radi bez problema.

### Kako radi OCR na mobilnom?
Tesseract.js koji već koristiš radi i na mobilnim platformama. Možeš takođe da koristiš ML Kit (Google) preko Capacitor plugin-a za bolje performanse.

---

## Build pitanja

### Koliko traje prvi build?
- **Android:** 5-15 minuta (prvi put duže zbog Gradle download-a)
- **iOS:** 5-10 minuta (prvi put duže zbog CocoaPods)

### Da li moram svaki put da radim npm run build?
**Ne za development!** Koristi live reload:
```powershell
npm run mobile:dev:android
# ili
npm run mobile:dev:ios
```

Za production build, da, moraš da build-uješ web verziju pa da sync-uješ.

### Šta je AAB vs APK?
- **APK:** Android Package - stari format, može da se instalira direktno
- **AAB:** Android App Bundle - novi format koji Google Play zahteva, manji download za korisnike

### Kako da distribiram APK bez Google Play?
Možeš da šalješ APK direktno, ali korisnici moraju da omoguće "Install from Unknown Sources". Bolja opcija je Google Play sa Internal Testing track-om.

---

## Development pitanja

### Kako da debugujem mobilnu aplikaciju?
- **Android:** Chrome DevTools - `chrome://inspect`
- **iOS:** Safari Web Inspector - Safari → Develop → [Tvoj Device]

### Kako da testiram push notifikacije?
Potreban ti je real device i backend server. Capacitor Push Notifications plugin-a već imaš u projektu.

### Kako da pristupim native API-jima?
Preko Capacitor plugin-a. Primeri:
```typescript
// Kamera
import { Camera } from '@capacitor/camera';
const image = await Camera.getPhoto({ ... });

// File System
import { Filesystem } from '@capacitor/filesystem';
await Filesystem.writeFile({ ... });

// Haptics (vibracija)
import { Haptics } from '@capacitor/haptics';
await Haptics.impact({ style: 'medium' });
```

### Mogu li da koristim native kod (Java/Kotlin/Swift)?
**Da!** Možeš da napišeš custom Capacitor plugin ako ti treba nešto što ne postoji. Ali za ovu aplikaciju, to verovatno neće biti potrebno.

---

## Store submission pitanja

### Koliko traje App Review?
- **Apple:** 1-3 dana (nekad do nedelju dana)
- **Google Play:** 1-7 dana (novi developeri imaju duže)

### Šta ako mi aplikacija bude odbijena?
Dobijaš detaljno objašnjenje zašto. Najčešći razlozi:
- Nedostaje Privacy Policy
- Crash-uje aplikacija
- Ne ispunjava design guidelines
- Nedostaju screenshot-i ili informacije

Možeš da ispraviš i ponovo submituješ.

### Mogu li da ažuriram aplikaciju?
**Da!** Builduješ novu verziju sa povećanim version number-om i submituješ kao update. Korisnici dobijaju automatsko ažuriranje.

### Koliko često mogu da ažuriram?
**Koliko god hoćeš**, ali preporučeno je:
- Bug fixes: odmah
- Minor updates: svake 2-4 nedelje
- Major updates: svaka 1-3 meseca

---

## Performanse

### Koliko je aplikacija velika?
Otprilike:
- **Android:** 10-30 MB (zavisi od bundled assets-a)
- **iOS:** 15-40 MB

Možeš da smanjišš velikost:
- Tree-shaking (automatski sa Vite)
- Lazy loading routes
- Optimizovane slike
- Code splitting

### Kako da ubrzam aplikaciju?
1. **React optimizacije:** `React.memo`, `useMemo`, `useCallback`
2. **Virtual scrolling** (već imaš react-virtuoso)
3. **Image optimization** - WebP format, lazy loading
4. **Database indexing** (Dexie)
5. **Native caching**

### Hoće li raditi offline?
**Da!** Dexie je lokalna baza, tako da sve radi offline. Eventualno moraš da dodaš Service Worker za caching static assets-a.

---

## Troubleshooting

### Android build ne radi
```powershell
# Clean i rebuild
cd android
./gradlew clean
cd ..
npm run build
npx cap sync android
```

### iOS build ne radi
```bash
# Clean CocoaPods
cd ios/App
pod deintegrate
pod install
cd ../..
npm run build
npx cap sync ios
```

### Live reload ne radi
Proveri da li su računar i telefon na istoj WiFi mreži. Proveri firewall.

### "Cannot find module" error
```powershell
# Reinstaliraj node_modules
rm -rf node_modules
npm install
```

---

## Deployment

### Kako da pravim beta verziju?
- **iOS:** TestFlight (built-in u App Store Connect)
- **Android:** Internal/Closed Testing track u Google Play Console

### Mogu li da skidam aplikaciju sa store-a?
**Da**, ali:
- Korisnici koji su već instalirali će i dalje imati pristup
- Ne možeš da ponovo objavljuješ sa istim Bundle ID/Package Name

### Kako da prikupljam analytics?
Možeš da koristiš:
- Firebase Analytics (besplatno)
- Sentry (već imaš u projektu) - za error tracking
- PostHog (već imaš u projektu) - za product analytics

---

## Monetizacija (opciono)

### Mogu li da stavim reklame?
**Da**, preko:
- Google AdMob (Capacitor AdMob plugin)
- Facebook Audience Network

### Mogu li da stavim in-app purchases?
**Da**, preko:
- Capacitor In-App Purchase plugin
- Revenuecat (preporučeno, lakše za implementaciju)

### Mogu li da stavim subscription model?
**Da**, preko:
- Apple In-App Purchase
- Google Play Billing
- RevenueCat (jednostavnije rešenje)

---

## Dodatna pomoć

### Gde da nađem više informacija?
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [React Documentation](https://react.dev)
- [Android Developer Docs](https://developer.android.com)
- [iOS Developer Docs](https://developer.apple.com)

### Gde da pitam za pomoć?
- [Capacitor Discord](https://discord.com/invite/UPYYRhtyzp)
- [Stack Overflow - Capacitor tag](https://stackoverflow.com/questions/tagged/capacitor)
- [Ionic Forum](https://forum.ionicframework.com)

### Imam custom zahtev, šta da radim?
Možeš da napišeš custom Capacitor plugin ili da koristiš postojeće community plugin-e sa:
- [Capacitor Community](https://github.com/capacitor-community)
- [Awesome Capacitor](https://github.com/riderx/awesome-capacitor)

---

**Srećno! 🚀 Ako imaš još pitanja, slobodno pitaj!**
