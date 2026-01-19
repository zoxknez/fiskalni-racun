# 🔍 Dubinska Analiza Frontend/Backend - Fiskalni Račun

## 📋 Eksekutivni Rezime
Projekat je izuzetno dobro postavljen sa modernim stack-om (React 18.3, TypeScript, Neon, Dexie, Vite). Implementacija PWA i offline-first pristupa je zrela i robusna. Međutim, identifikovano je nekoliko ključnih oblasti koje zahtevaju pažnju radi postizanja produkcione spremnosti i skalabilnosti.

---

## 🏗️ Arhitektura Backenda

### ⚡ Vercel Serverless & Neon DB
- **Trenutno stanje:** API koristi Vercel funkcije sa `@neondatabase/serverless`. Implementiran je lazy initialization za SQL klijent u [db.ts](file:///d:/ProjektiApp/fiskalni-racun/api/db.ts), što je odlično za cold-start performanse.
- **Problem:** Logika je mestimično previše spregnuta sa SQL-om direktno u handlerima.
- **Preporuka:** Uvesti "Repository pattern" ili "Service layer" za kompleksne entitete kako bi se izbegla duplikacija SQL koda (npr. u `api/sync.ts`).

### 🔄 Sync Sistem ([api/sync.ts](file:///d:/ProjektiApp/fiskalni-racun/api/sync.ts))
- **Trenutno stanje:** Jedan "monolitni" handler obrađuje sve CRUD operacije preko velikih `switch` blokova.
- **Problem:** Teško za održavanje i testiranje. Svaki novi entitet zahteva promenu u glavnom sync fajlu.
- **Preporuka:** Delegirati logiku specifičnim "Sync Handlerima" za svaki entitet (npr. `api/sync/handlers/receipt.ts`).

### 🔐 Autentifikacija ([api/auth/](file:///d:/ProjektiApp/fiskalni-racun/api/auth/))
- **Trenutno stanje:** Započeta modularizacija (login, register, reset-password su odvojeni).
- **Problem:** Nedostaje CSRF zaštita i robusna implementacija rate limitinga za serverless okruženje.
- **Preporuka:** Implementirati distributed rate limiting koristeći Upstash Redis (trenutni `rateLimit.ts` je in-memory i resetsuje se pri svakoj instanci funkcije).

---

## 🎨 Arhitektura Frontenda

### 🧩 Komponente i Hooks
- **Trenutno stanje:** Veoma visok stepen modularnosti sa 46+ custom hook-ova. [useNeonAuth.ts](file:///d:/ProjektiApp/fiskalni-racun/src/hooks/useNeonAuth.ts) pruža čistu apstrakciju nad servisima.
- **Problem:** Neke stranice (npr. [AddReceiptPageSimplified.tsx](file:///d:/ProjektiApp/fiskalni-racun/src/pages/AddReceiptPageSimplified.tsx)) su prevelike (1000+ linija) i sadrže previše UI logike.
- **Preporuka:** Podeliti velike forme u manje funkcionalne blokove/komponente.

### 💾 State Management & Offline-First
- **Trenutno stanje:** Savršena kombinacija **Zustand** (za UI state) i **TanStack Query** (za server state) uz **Dexie** (IndexedDB) za perzistenciju.
- **Problem:** Conflict resolution strategija u [useBackgroundSync.ts](file:///d:/ProjektiApp/fiskalni-racun/src/hooks/useBackgroundSync.ts) je "basic" (last-write-wins).
- **Preporuka:** Dodati `updatedAt` proveru na nivou rekorda kako bi se izbeglo prepisivanje novijih podataka sa servera starim lokalnim promenama.

### 🌐 Internacionalizacija (i18n)
- **Problem:** Prisutan je "Hardcoded debt" – previše stringova na srpskom jeziku unutar komponenti, što otežava punu podršku za engleski/slovenski.
- **Preporuka:** Sistemsko čišćenje i migracija svih UI stringova u `locales/` JSON fajlove.

---

## 🚀 Ključne Preporuke i Prioriteti

### 🔴 VISOK (Kritično)
1. **Upstash Redis Rate Limiting:** Neophodno za produkciju radi sprečavanja brute-force napada na auth endpoints.
2. **Modularizacija api/sync.ts:** Razbijanje monolitnog SQL handlera pre dodavanja novih funkcionalnosti.
3. **i18n Cleanup:** Uklanjanje preostalih hardkodovanih stringova.

### 🟡 SREDNJI (Važno)
1. **React 19 Upgrade:** Priprema za `useOptimistic` i `useActionState` za još fluidniji UX.
2. **Form Refactoring:** Prelazak na multi-step wizard za kompleksne forme poput unosa računa.
3. **Service Worker Update UX:** Poboljšanje obaveštenja za korisnika kada je dostupna nova verzija aplikacije.

### 🟢 NIZAK (Optimizacija)
1. **View Transitions API:** Dodavanje smooth animacija između stranica.
2. **Audit Logs:** Praćenje kritičnih promena u bazi podataka.
3. **Visual Regression Tests:** Playwright testovi za UI stabilnost.

---

## 📝 Zaključak
Aplikacija je u završnoj fazi razvoja jezgra. Fokus treba prebaciti sa "feature expansion" na **"infrastructure hardening"** (security i modularity) i **"UX polishing"** (i18n i animacije).

*Analiza urađena: 19.01.2026.*
