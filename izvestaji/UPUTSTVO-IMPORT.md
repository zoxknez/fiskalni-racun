# Uputstvo za Import Podataka iz Stare Baze

## Pregled

Ova dokumentacija opisuje proces analize i importa podataka iz stare **MojRacun.db** SQLite baze u novu Fiskalni-Račun aplikaciju koja koristi Dexie (IndexedDB).

---

## 📋 Struktura Stare Baze

### Tabele

1. **racuni** (15 redova)
   - Fiskalni računi sa osnovnim podacima
   - Kolone: idRacun, iznos, datum, pfr_broj, status, racun_data, racun_img, pibProd, nazivProd, adresaProd, gradProd

2. **prodavci** (15 redova)
   - Informacije o prodavcima/trgovinama
   - Kolone: idProd, idProdavac, pibProd, nazivProd, adresaProd, gradProd

3. **kategorije** (21 red)
   - Kategorije računa
   - Kolone: idKategorija, idKat, bojaKat, nazivKat, racunIdKat

4. **garancije** (0 redova)
   - Garancijski podaci (trenutno prazno)
   - Kolone: idGarancija, pocetakGar, krajGar, nazivGar, racunIdGar

---

## 🔧 Instalacija

Pre pokretanja skripti, instalirajte potrebne zavisnosti:

```bash
npm install --save-dev better-sqlite3 @types/better-sqlite3
```

---

## 📊 Korak 1: Analiza Baze

Prvo analizirajte strukturu i sadržaj stare baze:

```bash
npm run analyze:db
```

Ova skripta će:
- Pročitati sve tabele iz SQLite baze
- Prikazati strukturu kolona
- Pokazati primere podataka
- Generisati detaljni izveštaj u `izvestaji/ANALIZA-EKSTERNE-BAZE.md`

### Izlaz analize:

```
📊 Pronađeno 6 tabela

📊 android_metadata
   Broj redova: 1
   Kolone: locale

📊 garancije
   Broj redova: 0
   Kolone: idGarancija, pocetakGar, krajGar, nazivGar, racunIdGar

📊 kategorije
   Broj redova: 21
   Kolone: idKategorija, idKat, bojaKat, nazivKat, racunIdKat

📊 prodavci
   Broj redova: 15
   Kolone: idProd, idProdavac, pibProd, nazivProd, adresaProd, gradProd, racunIdProd

📊 racuni
   Broj redova: 15
   Kolone: idRacun, iznos, datum, pfr_broj, status, racun_data, racun_img, ...
```

---

## 📥 Korak 2: Import Podataka

Nakon analize, pokrenite import:

```bash
npm run import:db
```

### Šta se dešava tokom importa:

1. **Čitanje podataka** iz SQLite baze
2. **Mapiranje kategorija** na nove kategorije aplikacije:
   - "Namirnice" → "Hrana i piće"
   - "Apoteka" → "Zdravlje"
   - "Deca šoping" → "Ostalo"
   - itd.

3. **Transformacija računa**:
   - Konverzija cena iz formata "3290,00" → 3290.00
   - Parsiranje datuma iz Unix timestamp-a
   - Mapiranje prodavaca po PIB-u
   - Dodavanje QR linkova (PFR brojevi)

4. **Import u Dexie**:
   - Dodavanje računa u `receipts` tabelu
   - Dodavanje uređaja sa garancijom u `devices` tabelu (ako postoje)

### Primer izlaza:

```
🔄 Pokrećem import iz eksterne baze...

📖 Čitam podatke iz SQLite baze...
✅ Učitano 15 računa
✅ Učitano 15 prodavaca
✅ Učitano 21 kategorija
✅ Učitano 0 garancija

💾 Importujem podatke u aplikaciju...
📝 Importujem 15 računa...
✅ Uspešno importovano 15 računa

📊 Statistika importa:
   - Računi: 15
   - Uređaji sa garancijom: 0
   - Kategorije: 4
   - Prodavci: 5

📂 Po kategorijama:
   - Ostalo: 7
   - Odeća i obuća: 6
   - Sport i rekreacija: 2

💰 Ukupna vrednost računa: 118250.00 RSD
```

---

## 🗂️ Mapiranje Podataka

### Kategorije

| Stara Kategorija | Nova Kategorija |
|-----------------|-----------------|
| Namirnice       | Hrana i piće    |
| Apoteka         | Zdravlje        |
| Deca šoping     | Ostalo          |
| Odeća           | Odeća i obuća   |
| Obuća           | Odeća i obuća   |
| Sport           | Sport i rekreacija |
| Elektronika     | Elektronika     |
| Namještaj       | Dom i bašta     |

### Polja Računa (Receipt)

| Staro Polje | Novo Polje | Transformacija |
|------------|-----------|----------------|
| iznos | totalAmount | "3290,00" → 3290.00 |
| datum | date | Unix timestamp → Date objekt |
| pfr_broj | qrLink | Direktno |
| nazivProd | merchantName | Direktno |
| pibProd | pib | Direktno |
| racun_data | notes | Formatirano sa PIB/PFR |
| racun_img | imageUrl | Base64 (ne importuje se direktno) |

---

## ⚠️ Napomene

### Podaci koji se NE importuju:

1. **Base64 slike** (`racun_img`) - format nije kompatibilan sa aplikacijom
2. **Sirovi tekst računa** (`racun_data`) - sačuvan u notes polju
3. **Android metadata** - nisu relevantni

### Limitacije:

- **Stavke računa** nisu dostupne u strukturiranom formatu u staroj bazi
- **PDV iznosi** se ne mogu precizno ekstraktovati
- **Garancije** ne postoje u staroj bazi (tabela prazna)

---

## 🔍 Verifikacija Importa

Nakon importa, proverite podatke u aplikaciji:

1. Otvorite aplikaciju u browser-u
2. Proverite listu računa
3. Proverite kategorije
4. Proverite prodavce/trgovine

### Provera iz Developer Tools:

```javascript
// Otvorite Browser Console (F12)

// Proveri broj računa
const receiptCount = await db.receipts.count()
console.log('Broj računa:', receiptCount)

// Proveri sve račune
const receipts = await db.receipts.toArray()
console.table(receipts)

// Proveri po kategorijama
const byCategory = await db.receipts.toArray().then(receipts => 
  receipts.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1
    return acc
  }, {})
)
console.table(byCategory)
```

---

## 🐛 Troubleshooting

### Problem: "Cannot find module 'better-sqlite3'"

**Rešenje:**
```bash
npm install --save-dev better-sqlite3 @types/better-sqlite3
```

### Problem: "ENOENT: no such file or directory"

**Rešenje:** Proverite putanju do baze u skriptama:
```typescript
const DB_PATH = 'D:\\ProjektiApp\\stambena\\baza\\MojRacun.db'
```

### Problem: "Transaction failed"

**Rešenje:** 
- Proverite da aplikacija nije pokrenuta (zatvara Dexie vezu)
- Obrišite IndexedDB iz DevTools i pokrenite ponovo

### Problem: "Duplicate key error"

**Rešenje:** Import skripta već je pokrenuta. Obrišite postojeće podatke:
```javascript
// U Browser Console
await db.receipts.clear()
await db.devices.clear()
```

---

## 📝 Dodatne Napomene

- Svi datumi su konvertovani iz Unix timestamp formata
- Svi iznosi su konvertovani iz srpskog formata (sa zarezom) u decimalni format
- Sync status je postavljen na "pending" za sve importovane stavke
- PIB brojevi su sačuvani za buduće sinhronizacije

---

## 🎯 Sledeći Koraci

Nakon uspešnog importa:

1. **Testiranje** - Proverite sve importovane podatke
2. **Backup** - Napravite backup nove baze
3. **Čišćenje** - Obrišite staru bazu ako je sve u redu
4. **Dokumentacija** - Ažurirajte korisničku dokumentaciju

---

## 📞 Podrška

Za dodatnu pomoć ili prijavljivanje problema, kontaktirajte development tim ili kreirajte issue u projektu.
