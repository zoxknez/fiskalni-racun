# 🎨 App Icon & Splash Screen Guide

## 📱 Kreiranje App Ikona

### Što ti treba:
- **Icon:** 1024x1024px PNG sa **transparentnim pozadinom**
- **Format:** PNG (24-bit ili 32-bit sa alpha kanalom)
- **Dizajn:** Jednostavan, prepoznatljiv, čitljiv na malim veličinama

### Design Tips:
1. **Jednostavnost** - Ikona treba biti razumljiva na 40x40px veličini
2. **Kontrast** - Koristi jake boje koje se ističu
3. **Bez teksta** - Ili minimalno, veliki tekst
4. **Zaobljene ivice** - iOS i Android automatski primenjuju, ali dizajniraj za kvadrat
5. **Testiranje** - Pregledaj na različitim pozadinama (bela, crna, gradijent)

### Primer koncepta za "Fiskalni Račun":
- 📄 Stilizovan račun sa checkmark-om
- 💰 Novčanik sa QR kodom
- ✅ Fiskalni štampač sa checkmark-om
- 📊 Grafikon sa računom u pozadini

---

## 🌅 Kreiranje Splash Screen-a

### Što ti treba:
- **Size:** 2732x2732px (maksimalna veličina za najveće iPad-ove)
- **Format:** PNG
- **Safe Area:** Centriraj važan sadržaj u 1200x1200px zone

### Design Tips:
1. **Brend identitet** - Logo, boje, tipografija
2. **Jednostavno** - Ne pretrpavaj informacijama
3. **Centriran sadržaj** - Notch i bottom bar mogu prekriti ivice
4. **Konzistentna pozadina** - Slična boji glavnog ekrana aplikacije

---

## 🚀 Automatsko generisanje (preporučeno)

### Korak 1: Instaliraj Capacitor Assets plugin

```powershell
npm install @capacitor/assets --save-dev
```

### Korak 2: Kreiraj source images

Kreiraj folder `resources` u root-u projekta:

```
fiskalni-racun/
├── resources/
│   ├── icon.png       (1024x1024px)
│   ├── splash.png     (2732x2732px)
│   └── icon-foreground.png (opciono, za Android Adaptive Icons)
```

### Korak 3: Generiši sve veličine

```powershell
npx capacitor-assets generate
```

Ovo će automatski generisati:
- ✅ Sve iOS icon veličine (40x40 do 1024x1024)
- ✅ Sve Android icon veličine (mipmap-mdpi do mipmap-xxxhdpi)
- ✅ Android Adaptive Icons (ako imaš icon-foreground.png)
- ✅ Sve splash screen veličine za obe platforme

### Korak 4: Sync sa projektima

```powershell
npx cap sync
```

---

## 🎨 Kreiranje ikona ručno (opciono)

Ako ne želiš da koristiš automatski generator:

### Za iOS:

Potrebne veličine u `ios/App/App/Assets.xcassets/AppIcon.appiconset/`:

| Veličina | Namena | Fajl |
|----------|---------|------|
| 20x20 @2x | Notifikacija | icon-20@2x.png (40x40) |
| 20x20 @3x | Notifikacija | icon-20@3x.png (60x60) |
| 29x29 @2x | Settings | icon-29@2x.png (58x58) |
| 29x29 @3x | Settings | icon-29@3x.png (87x87) |
| 40x40 @2x | Spotlight | icon-40@2x.png (80x80) |
| 40x40 @3x | Spotlight | icon-40@3x.png (120x120) |
| 60x60 @2x | iPhone App | icon-60@2x.png (120x120) |
| 60x60 @3x | iPhone App | icon-60@3x.png (180x180) |
| 1024x1024 | App Store | icon-1024.png |

### Za Android:

Potrebne veličine u `android/app/src/main/res/`:

| Folder | Veličina | DPI |
|--------|----------|-----|
| mipmap-mdpi | 48x48 | 160 |
| mipmap-hdpi | 72x72 | 240 |
| mipmap-xhdpi | 96x96 | 320 |
| mipmap-xxhdpi | 144x144 | 480 |
| mipmap-xxxhdpi | 192x192 | 640 |

---

## 🎨 Design Tools

### Besplatni tools:
1. **Figma** (https://figma.com) - Professional UI dizajn
2. **Canva** (https://canva.com) - Templates za app ikone
3. **GIMP** (https://gimp.org) - Open-source Photoshop alternativa
4. **Inkscape** (https://inkscape.org) - Vektorski editor

### Online generators:
1. **App Icon Generator** (https://appicon.co)
2. **MakeAppIcon** (https://makeappicon.com)
3. **Ape Tools** (https://apetools.webprofusion.com)

### Premium tools:
1. **Adobe Photoshop**
2. **Adobe Illustrator**
3. **Sketch** (macOS)

---

## 🔍 Android Adaptive Icons

Android 8.0+ koristi "adaptive icons" koji se mogu prilagoditi različitim oblicima.

### Struktura:

```
icon-foreground.png (1024x1024)  # Glavni sadržaj (logo)
icon-background.png (1024x1024)  # Pozadina (boja ili pattern)
```

### Safe Zone:
- Centriraj glavni logo u 768x768px zoni
- Spoljna 128px margina može biti odsečena zavisno od oblika

### Ako koristiš Capacitor Assets:

```
resources/
├── icon.png              # Standardna ikona
├── icon-foreground.png   # Za adaptive icon (foreground layer)
└── icon-background.png   # Opciono (ako ne, koristi se solid boja)
```

---

## 🌈 Splash Screen Customization

### Podešavanje u `capacitor.config.ts`:

```typescript
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.fiskalniracun.app',
  appName: 'Fiskalni račun',
  webDir: 'dist',
  
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,           // Koliko dugo se prikazuje (ms)
      launchAutoHide: true,                // Automatski sakrij
      backgroundColor: '#ffffff',          // Pozadina boja
      androidSplashResourceName: 'splash', // Android resource name
      androidScaleType: 'CENTER_CROP',     // Kako se slika skalira
      showSpinner: false,                  // Loading spinner
      androidSpinnerStyle: 'large',        // Stil spinnera (ako je true)
      iosSpinnerStyle: 'small',           // iOS spinner stil
      spinnerColor: '#2563eb',            // Boja spinnera
      splashFullScreen: true,              // Fullscreen
      splashImmersive: true,              // Immersive mode (Android)
    },
  },
}

export default config
```

### Programski kontrolisaj splash screen (u `main.tsx`):

```typescript
import { SplashScreen } from '@capacitor/splash-screen'

// Prikaži splash screen
await SplashScreen.show({
  showDuration: 2000,
  autoHide: true,
})

// Sakrij splash screen ručno
await SplashScreen.hide()
```

---

## 📋 Checklist

Pređ nego što submituješ aplikaciju:

### iOS:
- [ ] App icon 1024x1024 (bez alpha kanala, bez transparency)
- [ ] Svi icon setovi generisani
- [ ] Splash screen images
- [ ] Pregledano u Xcode Asset Catalog
- [ ] Testirano na različitim uređajima (simulator i fizički)

### Android:
- [ ] Adaptive icon foreground i background
- [ ] Sve mipmap veličine generisane
- [ ] Splash screen images
- [ ] Pregledano na različitim device veličinama
- [ ] Testirano na različitim Android verzijama

### Oba:
- [ ] Icon je vidljiv na svetlim i tamnim pozadinama
- [ ] Icon je čitljiv na malim veličinama
- [ ] Splash screen se brzo učitava
- [ ] Nema copyright problema sa slikama/fontovima

---

## 🎨 Primer - Fiskalni Račun Icon Concept

### Opcija 1: Minimalistička
```
┌─────────────┐
│   ┌─────┐   │
│   │ ✓   │   │  <- Štampani račun sa checkmark
│   │     │   │
│   │═════│   │
│   └─────┘   │
└─────────────┘
Boje: #2563EB (primary blue), white background
```

### Opcija 2: Modern
```
┌─────────────┐
│   📊        │
│      💳     │  <- Grafikon + račun
│             │
│   QR code   │
└─────────────┘
Gradient: Blue → Purple
```

### Opcija 3: Realistic
```
┌─────────────┐
│   Fiskalni  │
│    Račun    │  <- Tekst sa stilizovanim računom
│   ────────  │
│   ✓ Ready   │
└─────────────┘
```

---

## 🔧 Troubleshooting

### iOS icon ne prikazuje se:
1. Proveri da nema alpha kanala u 1024x1024 ikoni
2. U Xcode: Product → Clean Build Folder
3. Izbriši aplikaciju sa uređaja i reinstaliraj

### Android icon je pikselizovan:
1. Proveri da imaš sve mipmap veličine
2. Proveri kvalitet source image-a (1024x1024)
3. Rebuild aplikaciju

### Splash screen ne prikazuje se:
1. Proveri `SplashScreen` plugin u `capacitor.config.ts`
2. Proveri da su slike na pravom mestu
3. `npx cap sync` ponovo
4. Rebuild aplikacije

---

## 💡 Pro Tips

1. **Vector Icons** - Kreiraj u SVG formatu pa eksportuj u PNG za najbolji kvalitet
2. **A/B Testing** - Napravi 2-3 verzije i pitaj prijatelje
3. **Seasonal Updates** - Možeš ažurirati ikonu za praznike (Halloween, Božić, itd.)
4. **Consistency** - Koristi iste boje kao u aplikaciji
5. **Store Optimization** - Ikona je prvo što korisnici vide - investiraj vreme!

---

## 🎬 Next Steps

1. Dizajniraj ili naruči ikonu
2. Kreiraj splash screen
3. Koristi `npx capacitor-assets generate`
4. Sync sa projektima: `npx cap sync`
5. Build i testiraj!

**Srećno sa dizajnom! 🎨📱**
