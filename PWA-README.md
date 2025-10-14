# 📱 Fiskalni Račun - PWA Features

## 🚀 Progressive Web App Capabilities

Ova aplikacija je sada potpuna **Progressive Web App (PWA)** sa svim modernim mogućnostima!

---

## ✨ Features

### 1. **Install Prompt** 📥
- Automatski install prompt nakon 10 sekundi
- "Add to Home Screen" funkcionalnost
- Ikonica aplikacije na početnom ekranu
- Pokreće se kao native aplikacija

**Kako instalirati:**
1. Otvori aplikaciju u browser-u
2. Sačekaj install prompt (10s)
3. Klikni "Instaliraj"
4. Aplikacija se dodaje na Home Screen

**Ili ručno:**
- **Chrome (Android/Desktop):** Menu → Install app
- **Safari (iOS):** Share → Add to Home Screen
- **Edge:** Settings → Apps → Install

---

### 2. **Offline Mode** 🌐
Aplikacija radi **potpuno offline** zahvaljujući Service Worker-u!

**Šta radi offline:**
✅ Pregledanje računa (IndexedDB lokalno)
✅ Pregledanje uređaja pod garancijom
✅ Dodavanje novih računa
✅ Dodavanje novih uređaja
✅ QR skeniranje
✅ OCR skeniranje
✅ Filtriranje i pretraga
✅ Sve UI funkcionalnosti

**Automatski sync:**
- Promene se čuvaju lokalno u `syncQueue`
- Kada se povežeš na internet, automatski se sinhronizuje
- Nema potrebe za ručnom intervencijom

---

### 3. **Background Sync** 🔄
Automatska sinhronizacija podataka kada:
- Korisnik dođe online (offline → online)
- Aplikacija postane aktivna (switch tab)
- Aplikacija se pokrene (ako je online)

**Implementacija:**
```typescript
// src/hooks/useBackgroundSync.ts
- Koristi Dexie syncQueue
- Automatski poziva processSyncQueue()
- Console logs za debugging
```

---

### 4. **Update Notifications** 🎉
Aplikacija automatski detektuje nove verzije!

**Kada ima update:**
- Prikazuje se notifikacija dole desno
- "Ažuriraj sada" ili "Kasnije" opcije
- Automatski reload nakon ažuriranja

---

### 5. **Offline Indicator** 📶
Vizuelni indikator statusa konekcije:

**Offline:**
- 🟡 Žuta traka na vrhu ekrana
- "Offline režim - Promene će biti sinhronizovane..."

**Ponovo online:**
- 🟢 Zelena notifikacija "Ponovo online! ✓"
- Auto-dismiss nakon 3 sekunde

---

### 6. **Cache Strategije** ⚡

**Network First** (API calls):
- Prvo pokušaj network
- Fallback na cache ako nema neta
- 24h expiration

**Cache First** (Images):
- Instant loading iz cache-a
- 30 dana expiration
- 100 max entries

**Cache First** (Google Fonts):
- 1 godina expiration
- Offline font support

---

## 🛠️ Tehničke Specifikacije

### **Stack:**
- Vite PWA Plugin (`vite-plugin-pwa`)
- Workbox (Service Worker library)
- Dexie (IndexedDB)
- React Hooks (useRegisterSW, useBackgroundSync)

### **Service Worker:**
```typescript
// Auto-generisan od Vite PWA
- Glob patterns: **/*.{js,css,html,ico,png,svg,woff2}
- Runtime caching: API, images, fonts
- Navigation fallback: /index.html
- Dev mode enabled
```

### **Manifest:**
```json
{
  "name": "Fiskalni Račun",
  "short_name": "Fiskalni",
  "display": "standalone",
  "theme_color": "#0ea5e9",
  "start_url": "/"
}
```

---

## 📱 Mobile Experience

### **iOS (Safari):**
✅ Add to Home Screen
✅ Standalone mode (bez browser UI)
✅ Status bar customization
✅ Splash screen
✅ Offline mode

### **Android (Chrome):**
✅ Install prompt
✅ Full-screen mode
✅ App icon
✅ Push notifications (ready)
✅ Background sync
✅ Offline mode

### **Desktop (Chrome/Edge):**
✅ Install as app
✅ Window chrome
✅ Standalone window
✅ Keyboard shortcuts
✅ Offline mode

---

## 🔧 Development

### **Test PWA locally:**
```bash
npm run build
npm run preview
```

### **Test offline:**
1. Open DevTools
2. Application tab
3. Service Workers → Offline checkbox
4. Or: Network tab → Throttling → Offline

### **Update Service Worker:**
```bash
# Service Worker se auto-regeneriše pri build-u
npm run build
```

### **Debug:**
```
chrome://serviceworker-internals/
chrome://inspect/#service-workers
```

---

## 📊 PWA Score

Run Lighthouse audit:
```bash
npm run build
npm run preview
# Open DevTools → Lighthouse → Generate report
```

**Expected scores:**
- ⚡ Performance: 90+
- ♿ Accessibility: 95+
- ✅ Best Practices: 95+
- 📱 PWA: 100 ✓

---

## 🎯 Best Practices

### **1. Always use HTTPS** 🔒
Service Workers require HTTPS (except localhost)

### **2. Test offline scenarios** 🌐
- Add data offline
- Come back online
- Verify sync

### **3. Handle network errors** ⚠️
```typescript
try {
  await addReceipt(data)
} catch (error) {
  // Auto-saves to syncQueue
  toast.success('Sačuvano lokalno')
}
```

### **4. Monitor sync queue** 📊
```typescript
import { db } from '@/lib/db'
const pending = await db.syncQueue.count()
console.log(`${pending} pending syncs`)
```

---

## 🚀 Deployment

### **Production checklist:**
- [ ] HTTPS enabled
- [ ] Manifest.json configured
- [ ] Icons generated (multiple sizes)
- [ ] Service Worker registered
- [ ] Cache strategies configured
- [ ] Background sync tested
- [ ] Update notifications tested
- [ ] Offline mode tested
- [ ] Lighthouse audit passed

### **Deploy:**
```bash
npm run build
# Upload dist/ to hosting (Vercel, Netlify, etc.)
```

---

## 📚 Resources

- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

## 🎉 Result

Aplikacija je sada **potpuna PWA** sa:
✅ Offline mode
✅ Install prompt
✅ Background sync
✅ Update notifications
✅ Cache strategije
✅ Native-like experience

**Users can:**
- Install app on any device
- Use completely offline
- Get automatic updates
- Sync data when online
- Fast loading (cache)
- Native app feel

---

**Napravljeno sa ❤️ koristeći najnovije web tehnologije!**
