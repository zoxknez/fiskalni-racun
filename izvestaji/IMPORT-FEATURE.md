# 📥 Import Podataka iz "Moj Račun" Aplikacije

## Pregled

Ova funkcionalnost omogućava korisnicima da prebace sve svoje račune i garancije iz **"Moj Račun"** mobilne aplikacije u našu novu web aplikaciju.

---

## 🎯 Za Korisnike

### Kako izvesti podatke iz "Moj Račun" aplikacije?

1. **Otvorite "Moj Račun" aplikaciju** na vašem Android telefonu
2. Idite u **Podešavanja** (Settings)
3. Pronađite opciju **"Backup & Restore"** ili **"Izvoz Baze"**
4. Kliknite na **"Izvezi Bazu Podataka"** (Export Database)
5. Aplikacija će kreirati `.db` fajl (obično se zove `MojRacun.db`)
6. Sačuvajte fajl na telefonu
7. **Prebacite fajl na računar** na jedan od sledećih načina:
   - E-mailom (pošaljite sebi)
   - Google Drive / Dropbox
   - USB kablom
   - Airdrop (iPhone → Mac)

### Kako uvesti podatke u našu aplikaciju?

1. **Otvorite našu web aplikaciju**
2. Idite na stranicu **"Uvezi Podatke"** iz glavnog menija
3. **Prevucite `.db` fajl** ili kliknite "Izaberi Fajl"
4. Sačekajte da se import završi (obično 2-5 sekundi)
5. **Gotovo!** Svi vaši računi su sada u aplikaciji 🎉

---

## 🔒 Sigurnost i Privatnost

- ✅ **Svi podaci ostaju na vašem uređaju** - import se vrši lokalno u browseru
- ✅ **Nijedan fajl se ne šalje na server**
- ✅ **Vaša baza ostaje kod vas** - možete je zadržati ili obrisati
- ✅ **Podržava StandardFile enkripciju** (ako je aktivirana u staroj aplikaciji)

---

## 📊 Šta se uvozi?

### ✅ Podržano:

- **Fiskalni računi** (15+ u test bazi)
  - Prodavac / trgovina
  - PIB
  - Datum i vreme
  - Ukupan iznos
  - PFR broj (QR kod link)
  - Kategorija

- **Garancije** (ako postoje u bazi)
  - Naziv uređaja
  - Datum kupovine
  - Trajanje garancije
  - Datum isteka

### ⚠️ Nisu podržani:

- **Slike računa** (Base64 format nije kompatibilan)
- **Stavke računa** (nisu strukturirane u staroj bazi)
- **Detalji PDV-a** (nisu dostupni)

---

## 🛠️ Tehnički Detalji (za developere)

### Arhitektura

```
┌──────────────┐
│ Korisnik     │
│ (Browser)    │
└──────┬───────┘
       │
       │ 1. Upload .db fajla
       ▼
┌──────────────────────┐
│ ImportPage.tsx       │
│ (UI komponenta)      │
└──────┬───────────────┘
       │
       │ 2. Validacija & procesiranje
       ▼
┌──────────────────────┐
│ importService.ts     │
│ - SQL.js load        │
│ - Parse tabele       │
│ - Transform data     │
└──────┬───────────────┘
       │
       │ 3. Bulk insert
       ▼
┌──────────────────────┐
│ Dexie (IndexedDB)    │
│ - receipts table     │
│ - devices table      │
└──────────────────────┘
```

### Glavne Komponente

#### 1. `importService.ts`
- **`importFromMojRacun(file: File)`** - Glavna funkcija za import
- **`validateSQLiteFile(file: File)`** - Validacija SQLite formata
- Koristi **sql.js** biblioteku za parsiranje SQLite baza u browseru

#### 2. `ImportPage.tsx`
- Drag & drop zona za upload
- Progress indicator
- Statistika importa (broj računa, ukupan iznos, itd.)
- Error handling

#### 3. Mapiranje Kategorija

```typescript
const CATEGORY_MAP = {
  'Namirnice': 'Hrana i piće',
  'Apoteka': 'Zdravlje',
  'Deca šoping': 'Ostalo',
  'Odeća': 'Odeća i obuća',
  // ...
}
```

### SQL.js Setup

```typescript
const SQL = await initSqlJs({
  locateFile: (file) => `https://sql.js.org/dist/${file}`,
})

const db = new SQL.Database(fileData)
const results = db.exec('SELECT * FROM racuni')
```

### Parsing Logika

```typescript
// 1. Parse SQL rezultata u objekte
const racuni = parseTableResult(sqlResult)

// 2. Mapa prodavaca (PIB → naziv)
const prodavciMap = new Map()

// 3. Transformacija u Dexie format
const receipts = racuni.map(racun => ({
  merchantName: racun.nazivProd,
  pib: racun.pibProd,
  date: new Date(racun.datum),
  totalAmount: parseCena(racun.iznos),
  // ...
}))

// 4. Bulk insert
await db.receipts.bulkAdd(receipts)
```

---

## 🧪 Testiranje

### Manual Testing

1. Kopiraj test bazu: `D:\ProjektiApp\stambena\baza\MojRacun.db`
2. Otvori aplikaciju
3. Idi na `/import`
4. Upload fajl
5. Verifikuj da su računi importovani

### Automated Testing (TODO)

```typescript
describe('Import Service', () => {
  it('should import valid SQLite database', async () => {
    const file = new File([dbBuffer], 'test.db')
    const stats = await importFromMojRacun(file)
    expect(stats.receiptsImported).toBeGreaterThan(0)
  })

  it('should reject invalid files', async () => {
    const file = new File(['invalid'], 'test.txt')
    await expect(validateSQLiteFile(file)).resolves.toBe(false)
  })
})
```

---

## 📝 Known Issues & Limitations

### Issue #1: Base64 Images
**Problem:** Stara aplikacija čuva slike kao Base64 stringove direktno u bazi  
**Rešenje:** Ne importujemo slike, samo tekstualne podatke  
**Future:** Dodati konverziju Base64 → Blob storage

### Issue #2: Nested Items
**Problem:** Stavke računa nisu strukturirane  
**Rešenje:** Parsiramo sirovi tekst (najbolji effort)  
**Future:** Regex parser za ekstrakciju stavki

### Issue #3: Large Databases
**Problem:** Velike baze (>50MB) mogu usporiti browser  
**Rešenje:** Limit na 50MB + progresivni import  
**Future:** Web Worker za background processing

---

## 🚀 Future Improvements

- [ ] **Web Worker** za async processing velikih baza
- [ ] **Progresni import** sa progress barom
- [ ] **Parsiranje stavki** iz `racun_data` tekstualnog polja
- [ ] **Image konverzija** Base64 → Blob storage
- [ ] **Deduplikacija** - detektuj već postojeće račune
- [ ] **Merge konflikt** - omogući korisniku da reši duplikate
- [ ] **Export u drugi format** - npr. CSV, JSON
- [ ] **Import iz drugih aplikacija** (ne samo "Moj Račun")

---

## 📚 Resources

- [SQL.js Documentation](https://sql.js.org/)
- [Dexie.js Guide](https://dexie.org/)
- [File API](https://developer.mozilla.org/en-US/docs/Web/API/File)
- [IndexedDB Guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

---

## 🐛 Troubleshooting

### "Fajl nije validna SQLite baza"
**Uzrok:** Fajl je korumpiran ili nije SQLite format  
**Rešenje:** Pokušaj ponovo da izvezete bazu iz mobilne aplikacije

### "Import traje predugo"
**Uzrok:** Baza je velika ili sporijinter internet  
**Rešenje:** sql.js se učitava sa CDN-a, proverite internet vezu

### "Nijedan račun nije importovan"
**Uzrok:** Tabele u bazi imaju drugačiju strukturu  
**Rešenje:** Kontaktirajte podršku sa verzijom "Moj Račun" aplikacije

---

## 💡 Tips & Tricks

- **Backup pre importa**: Izvezite svoju trenutnu bazu pre importa nove
- **Test import**: Prvo testiraј sa malom bazom (1-2 računa)
- **Proveri datum**: Uvek proverite da li su datumi pravilno konvertovani
- **Kategorije**: Ručno pregledajte kategorije nakon importa

---

**Poslednja izmena:** 19. Oktobar 2025.  
**Autor:** Fiskalni-Račun Team
