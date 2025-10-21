# 🚀 Brzi početak - Mobile Build

## Za Android (Windows/Mac/Linux)

### 1. Instaliraj Android Studio
https://developer.android.com/studio

### 2. Instaliraj Capacitor platformu
```powershell
npm install @capacitor/android
npx cap add android
```

### 3. Build i pokreni
```powershell
npm run build
npx cap sync android
npx cap open android
```

### 4. U Android Studio klikni zeleno ▶️ dugme

---

## Za iOS (samo macOS)

### 1. Instaliraj Xcode iz App Store

### 2. Instaliraj CocoaPods
```bash
sudo gem install cocoapods
```

### 3. Instaliraj Capacitor platformu
```bash
npm install @capacitor/ios
npx cap add ios
```

### 4. Build i pokreni
```bash
npm run build
npx cap sync ios
npx cap open ios
```

### 5. U Xcode klikni ▶️ dugme

---

## 💡 Korisne komande

```powershell
# Build web verzije
npm run build

# Sync sa mobilnim platformama
npx cap sync

# Otvori u Android Studio
npx cap open android

# Otvori u Xcode (samo macOS)
npx cap open ios

# Pokreni na uređaju sa live reload
npx cap run android --livereload --external
npx cap run ios --livereload --external
```

---

## 📝 Checklist

- [ ] Node.js instaliran
- [ ] Android Studio instaliran (za Android)
- [ ] Xcode instaliran (za iOS, samo macOS)
- [ ] `npm install` završen
- [ ] `npm run build` prošao uspešno
- [ ] Platforme dodate (`npx cap add android` / `ios`)
- [ ] Prvi build testiran na simulatoru/emulatoru

---

Pročitaj **MOBILE-BUILD-GUIDE.md** za detaljan vodič! 📱
