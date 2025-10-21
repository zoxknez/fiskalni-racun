# Refaktorisanje Add Receipt stranice

## ✅ Završeno

Refaktorisana je `/add` stranica (http://localhost:3000/add) prema sledećoj viziji:

### Promena paradigme:
**Umesto 3 režima (QR / Photo / Manual):**
- ❌ QR skeniranje sa auto-popunjavanjem
- ❌ OCR obrada fotografije sa AI analizom
- ❌ Manuelni unos sa svim poljima

**Sada imamo 2 glavna tipa:**
1. ✅ **Dodaj fiskalni račun** (pojednostavljen)
2. ✅ **Dodaj račun (domaćinstvo)** (kompletan)

---

## Fisckal račun - pojednostavljen unos

### Polja:
- **Ime prodavnice** (obavezno) - npr. "Maxi", "Idea", "Tehnomanija"
- **Iznos** (obavezno) - numerički unos
- **Datum** - default danas
- **Fotografija računa** (opciono) - samo attachment, bez OCR analize
- **QR skeniranje** (opciono) - samo čuva link u napomeni

### Šta je UKLONJENO iz fiskalne forme:
- ❌ PIB polje (sada ne treba)
- ❌ Vreme (samo datum)
- ❌ Kategorija manuelna (auto klasifikacija)
- ❌ OCR automatska analiza (preskačemo kompleksnost)
- ❌ QR auto-popunjavanje polja (samo sačuva link)

---

## Household račun - kompletan unos

Zadržana je kompleksna forma sa svim poljima:
- Vrsta troška (struja, voda, gas...)
- Dobavljač
- Broj računa
- Iznos
- Obračunski period (start/end)
- Rok plaćanja
- Datum plaćanja
- Status
- Potrošnja
- Napomene

---

## UX Flow

1. **Korisnik otvara `/add`**
   - Vidi 2 kartice za izbor tipa

2. **Izbor "Fiskalni račun"**
   - Jednostavna forma sa 5 polja
   - 2 obavezna (prodavnica, iznos)
   - 3 opciona (datum default, slika, QR)

3. **Izbor "Račun (domaćinstvo)"**
   - Kompleksna forma sa svim poljima
   - Obračunski period, status, potrošnja...

---

## Implementacija

### Fajlovi:
- ✅ `src/pages/AddReceiptPageSimplified.tsx` - Nova stranica
- ✅ `src/i18n/translations.ts` - Dodati novi ključevi
- ✅ `src/App.tsx` - Promenjen routing

### Routing:
```tsx
// src/App.tsx
const AddReceiptPage = lazy(() => import('./pages/AddReceiptPageSimplified'))
```

### Type selection screen:
```
/add → Type selection
  ↓ click "Fiskalni račun"
/add?type=fiscal → Simplified form
  ↓ click "Račun (domaćinstvo)"
/add?type=household → Full form
```

---

## Translation Keys

Dodati ključevi u `src/i18n/translations.ts`:

```typescript
addReceipt: {
  typeSelectTitle: 'Izaberi vrstu računa',
  fiscalReceipt: 'Fiskalni račun',
  householdBill: 'Račun (domaćinstvo)',
  fiscalDescription: 'Račun iz prodavnice - brzo i jednostavno',
  householdDescription: 'Struja, voda, gas, telefon...',
  storeName: 'Ime prodavnice',
  storeNamePlaceholder: 'Maxi, Idea, Tehnomanija...',
  amount: 'Iznos',
  amountPlaceholder: '0.00',
  addPhoto: 'Dodaj fotografiju računa',
  scanQROptional: 'Skeniraj QR kod (opciono)',
  qrLinkSaved: 'QR link sačuvan',
  // ... + engleski prevodi
}

household: {
  billingPeriodStart: 'Početak perioda',
  billingPeriodEnd: 'Kraj perioda',
  pending: 'Na čekanju',
  // ... + engleski prevodi
}
```

---

## Testing Checklist

- [ ] Navigacija na `/add` pokazuje type selection screen
- [ ] Klik na "Fiskalni račun" vodi na pojednostavljenu formu
- [ ] Klik na "Račun (domaćinstvo)" vodi na household formu
- [ ] Fiskalna forma: submit sa samo prodavnicom i iznosom uspešan
- [ ] Fiskalna forma: dodavanje slike radi
- [ ] Fiskalna forma: QR skeniranje čuva link u napomenu
- [ ] Household forma: sva polja funkcionišu
- [ ] Back button vraća na type selection
- [ ] URL parametar `?type=fiscal` direktno otvara fiscal formu
- [ ] URL parametar `?type=household` direktno otvara household formu

---

## Benefiti refaktorisanja

### Za korisnika:
✅ Brži unos fiskalnog računa (2 polja umesto 7+)
✅ Jasna separacija tipova računa
✅ Manje konfuzije oko OCR/QR funkcionalnosti
✅ Jednostavniji workflow

### Za developera:
✅ Cleaner code - jasna separacija logike
✅ Lakše održavanje - manje edge case-eva
✅ Uklonjena OCR kompleksnost iz fiscal flow-a
✅ Modularnost - može se lako dodati novi tip računa

---

## Stara vs Nova verzija

### Stara verzija (`AddReceiptPage.tsx`):
- 1155 linija koda
- 3 režima (QR/Photo/Manual)
- OCR integracija
- Auto-popunjavanje iz QR-a
- Kompleksna forma sa svim poljima

### Nova verzija (`AddReceiptPageSimplified.tsx`):
- ~900 linija koda
- 2 tipa (Fiscal/Household)
- Bez OCR-a za fiscal
- QR samo čuva link
- Fiscal forma pojednostavljena

---

## Sledeći koraci

1. **Multi-currency podrška**
   - Dodati prikaz valute u fiscal formi
   - Koristiti `formatCurrency()` sa user settings

2. **Testiranje**
   - Kreirati test podatke
   - Validirati sve scenarije

3. **Dokumentacija**
   - Ažurirati README sa novim flow-om
   - Snimiti demo video

4. **Analytics**
   - Dodati tracking za `receipt_type_selected`
   - Pratiti koji tip korisnici više koriste

---

## Tehnički detalji

### Fiscal Receipt Data Structure:
```typescript
{
  merchantName: string // Obavezno
  pib: '' // Prazno u simplified verziji
  date: Date // Default danas
  time: '' // Prazno
  totalAmount: number // Obavezno
  category: string // Auto klasifikacija
  fiscalNumber: '' // Prazno
  notes: string // Može sadržati QR link
  items: [] // Prazno
  imageUrl?: string // Opciona slika
}
```

### Household Bill Data Structure:
```typescript
{
  type: HouseholdBillType // electricity, water, gas...
  provider: string
  accountNumber: string
  amount: number
  billingPeriod: { start: Date, end: Date }
  dueDate: Date
  paymentDate?: Date
  status: HouseholdBillStatus // pending, paid, overdue
  consumption?: { value: number, unit: string }
  notes: string
}
```

---

**Kreirao:** GitHub Copilot  
**Datum:** 21. oktobar 2025.  
**Verzija:** 1.0
