# 🚀 Strategija Modernih Tehnologija - Fiskalni Račun

Ovaj dokument definiše putokaz za implementaciju najsavremenijih web tehnologija s ciljem postizanja premium korisničkog iskustva i vrhunskih performansi.

## 1. UX & Navigacija
### **View Transitions API** ⭐⭐⭐
- **Cilj:** Native "app-like" fluidnost pri prelasku sa liste računa na detalj.
- **Implementacija:** Korišćenje `document.startViewTransition()` unutar router navigacije.
- **Benefit:** Eliminiše vizuelne skokove (flashes) i omogućava shared-element animacije (npr. slika računa se fluidno širi).

## 2. Security & Infrastruktura
### **Distributed Rate Limiting (Upstash)** ⭐⭐⭐
- **Cilj:** Pouzdana zaštita u Serverless/Edge okruženju.
- **Implementacija:** Zamena `api/middleware/rateLimit.ts` (in-memory) sa Redis-backed rešenjem.
- **Benefit:** Zaštita od DDoS i brute-force napada koja funkcioniše bez obzira na broj instanci funkcija.

## 3. Forme & Interakcija (React 19)
### **useOptimistic & useActionState** ⭐⭐
- **Cilj:** Instant feedback bez "loading" stanja za uobičajene akcije.
- **Implementacija:** Refaktorisati `useNeonAuth` i `useDeals` hook-ove.
- **Benefit:** Korisnik odmah vidi rezultat svoje akcije (npr. "Like" na deal ili dodavanje taga), dok se sync dešava u pozadini.

## 4. Performance & Data Flow
### **Web Streams & Progressive Loading** ⭐
- **Cilj:** Ultra-brz prikaz velikih izveštaja i istorije.
- **Implementacija:** Korišćenje ReadableStream za export velikih CSV/JSON fajlova.
- **Benefit:** Aplikacija ostaje responzivna čak i pri obradi hiljada računa; nema čekanja da se generiše ceo fajl pre početka preuzimanja.

---

## 🛠️ Plan Implementacije (Roadmap)

| Tehnologija | Faza | Status |
| :--- | :--- | :--- |
| **React 18.3 / Vite** | Core | ✅ Implementirano |
| **PWA / Background Sync** | Core | ✅ Implementirano |
| **modularni Auth API** | Infrastructure | ✅ Implementirano |
| **Upstash Redis Security** | Infrastructure | ✅ Implementirano |
| **View Transitions** | UX | ✅ Implementirano |
| **CSRF Protection** | Security | ✅ Implementirano |
| **Error Boundaries** | UX | ✅ Implementirano |
| **Skeleton Loaders** | UX | ✅ Implementirano |
| **Form Autosave** | UX | ✅ Implementirano |
| **Rate Limit Feedback** | UX | ✅ Implementirano |
| **Sync Status Indicator** | UX | ✅ Implementirano |
| **React 19 Features** | UX | 📅 Planirano (čeka React 19 stabilnu verziju) |

---

*Poslednji update: 24.01.2026.*
