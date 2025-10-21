# 📱 App Store Requirements - Fiskalni Račun

## 🍎 Apple App Store Requirements

### Obavezne informacije:

1. **App Name:** Fiskalni Račun
2. **Subtitle:** Praćenje računa i garancija
3. **Bundle ID:** com.fiskalniracun.app (već setovano u capacitor.config.ts)
4. **Primary Language:** Serbian
5. **Category:** Finance ili Utilities
6. **Age Rating:** 4+ (svi uzrasti)

### Potrebni Assets:

#### App Icon:
- 1024x1024px (bez transparency, bez alpha kanala)
- Format: PNG ili JPEG

#### Screenshots (potrebni za sve veličine):
1. **iPhone 6.7" (Pro Max):** 1290 x 2796 px (minimum 2)
2. **iPhone 6.5":** 1242 x 2688 px (minimum 2)
3. **iPhone 5.5":** 1242 x 2208 px (opciono)
4. **iPad Pro (12.9"):** 2048 x 2732 px (minimum 2, ako podržavaš iPad)

#### Opciono:
- App Preview videos (15-30 sekundi)
- Promotional text
- Keywords (100 characters max)

### Opis aplikacije (primer):

**Srpski:**
```
Fiskalni Račun - Moderna aplikacija za praćenje fiskalnih računa, garancija i analizu potrošnje.

KLJUČNE FUNKCIJE:
✨ Skeniraj QR kod sa fiskalnog računa
📸 Fotografiši račun i automatski izvuci podatke (OCR)
✍️ Dodaj račune ručno
📊 Prati mesečnu potrošnju
🛡️ Upravljaj garancijama i biraj da te obavestimo pre isteka
📈 Detaljne statistike i izveštaji
🗂️ Organizuj po kategorijama
💾 Eksportuj podatke (CSV, PDF, Excel)
🌙 Dark mode

BENEFITS:
• Nikad više ne gubi račune
• Budi obavešten pre isteka garancije
• Razumej svoje potrošačke navike
• Sve sačuvano lokalno na tvom uređaju

PRIVATNOST:
Svi podaci se čuvaju lokalno na tvom uređaju. Bez obavezne registracije.
```

### Privacy Policy URL:
Potrebno je imati Privacy Policy. Može biti hostan na:
- Tvom sajtu
- GitHub Pages
- Vercel (ako već koristiš)

Primer: `https://fiskalniracun.app/privacy` ili `https://yourname.github.io/privacy`

### Support URL:
Email ili website za support: `support@fiskalniracun.app` ili GitHub repo

---

## 🤖 Google Play Store Requirements

### Obavezne informacije:

1. **App Name:** Fiskalni Račun
2. **Short Description:** (80 characters) Praćenje računa, garancija i analiza potrošnje
3. **Full Description:** (max 4000 characters) - isti kao za App Store
4. **Package Name:** com.fiskalniracun.app
5. **Category:** Finance ili Tools
6. **Content Rating:** Everyone

### Potrebni Assets:

#### App Icon:
- 512x512px (32-bit PNG sa alpha)

#### Feature Graphic:
- 1024 x 500px (obavezan za Featured listing)

#### Screenshots:
- Minimum 2, maksimum 8
- 16:9 ili 9:16 aspect ratio
- JPEG ili 24-bit PNG (bez alpha)
- Minimum dimenzije: 320px
- Maximum dimenzije: 3840px

#### Opciono:
- Promo video (YouTube link)
- TV banner (za Android TV): 1280 x 720px
- Promo graphic: 180 x 120px

### Privacy Policy:
- Obavezna za aplikacije koje pristupaju osetljivim podacima
- URL mora biti validan i dostupan

### Target SDK:
- Minimum: Android 13 (API level 33)
- Target: Android 14 (API level 34) - Google Play zahtev

---

## 🎨 Asset Creation Tips

### Screenshot Guidelines:
1. Prikaži glavne funkcionalnosti
2. Koristi svetle, privlačne boje
3. Dodaj tekst overlay koji objašnjava feature
4. Prikaži različite ekrane (Home, Add Receipt, Statistics, Warranties)

### Predloženi screenshots:
1. **Home Screen** - Hero slika sa pregledom
2. **QR Scan** - Skeniranje QR koda u akciji
3. **Receipt Details** - Detaljan prikaz računa
4. **Statistics** - Grafovi i analiza
5. **Warranties** - Lista garancija
6. **Dark Mode** - Prikaži dark theme

### Tools za pravljenje screenshots-a:
- **Figma** - za mockups sa device frames
- **Smartmockups.com** - automatsko dodavanje device frames
- **Appure** - iOS screenshot generator
- **Devices by Facebook** - device frames

---

## 📝 Privacy Policy Template

### Minimalan Privacy Policy (možeš da koristiš):

```markdown
# Privacy Policy - Fiskalni Račun

**Last Updated:** [Datum]

## Data Collection
Fiskalni Račun ne prikuplja, ne skladišti niti deli lične podatke korisnika sa trećim stranama.

## Local Data Storage
Svi podaci (računi, garancije, podešavanja) se čuvaju lokalno na vašem uređaju koristeći lokalnu bazu podataka. Ovi podaci nisu dostupni razvojnom timu niti bilo kojoj trećoj strani.

## Camera Permission
Aplikacija zahteva pristup kameri samo za skeniranje QR kodova i fotografisanje računa. Fotografije se obrađuju lokalno i čuvaju samo na vašem uređaju.

## Analytics
Aplikacija ne koristi tracking ili analitiku trećih strana.

## Changes to This Policy
Zadržavamo pravo da ažuriramo ovu politiku. Korisnici će biti obavešteni o značajnim promenama.

## Contact
Email: [tvoj-email]
```

---

## ✅ Pre-Submission Checklist

### Tehnički:
- [ ] App se build-uje bez errora
- [ ] Testirano na fizičkim uređajima
- [ ] Sve funkcionalnosti rade
- [ ] Nema crash-ova
- [ ] Performance je dobar
- [ ] Svi linkovi u app-u rade

### Legal:
- [ ] Privacy Policy napisan i hostan
- [ ] Terms of Service (opciono ali preporučeno)
- [ ] Content je legalan i ne krši autorska prava

### Marketing:
- [ ] App icon kreiran
- [ ] Screenshots spremni
- [ ] Opis aplikacije napisan
- [ ] Keywords odabrani (za ASO - App Store Optimization)

### App Store Connect (iOS):
- [ ] Apple Developer Account ($99/year)
- [ ] Bundle ID registrovan
- [ ] Certificates i Provisioning Profiles
- [ ] TestFlight beta testing (preporučeno)

### Google Play Console (Android):
- [ ] Google Play Developer Account ($25 one-time)
- [ ] Signing key kreiran
- [ ] Internal testing track setup (preporučeno)
- [ ] Beta testing sa prijateljima/porodicom

---

## 🚀 Launch Strategy

### Faza 1: Internal Testing (1 nedelja)
- Testiraj sa 5-10 ljudi koji ti veruju
- Fiksuj bugove i poboljšaj UX

### Faza 2: Beta Testing (2-3 nedelje)
- TestFlight za iOS (do 10,000 beta testera)
- Google Play Internal/Closed Beta
- Prikupi feedback

### Faza 3: Public Launch
- Submit za App Review
- Launch na oba store-a istovremeno
- Pripremi marketing materijale
- Social media objave

---

## 📊 Post-Launch

### Praćenje:
- App Store / Play Console analytics
- User reviews i ratings
- Crash reports
- Usage statistike

### Ažuriranja:
- Bug fixes svake 2-4 nedelje
- Feature updates svaka 1-2 meseca
- Responzivan na user feedback

---

**Sve najbolje sa lansiranjem aplikacije! 🎉📱**
