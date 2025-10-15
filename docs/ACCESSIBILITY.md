# Accessibility Guidelines

Ovaj dokument opisuje accessibility standarde i najbolje prakse za Fiskalni Račun aplikaciju.

## 🎯 Ciljevi

- **WCAG 2.1 Level AA** compliance
- Potpuna keyboard navigacija
- Screen reader kompatibilnost
- Visok kontrast i čitljivost

## 🔑 Ključni Principi

### 1. Perceivable (Uočljivo)

#### Tekstualne Alternative
```tsx
// ✅ Dobro
<img src="receipt.jpg" alt="Račun iz prodavnice Maxi" />
<button aria-label="Zatvori modal">
  <X />
</button>

// ❌ Loše
<img src="receipt.jpg" />
<button><X /></button>
```

#### Kontrast Boja
- **Normalan tekst**: 4.5:1 minimum
- **Veliki tekst (18pt+)**: 3:1 minimum
- **UI komponente**: 3:1 minimum

Provera kontrasta: [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### 2. Operable (Upotrebljivo)

#### Keyboard Navigacija
```tsx
// Fokus management
import { useFocusTrap } from '@/lib/a11y/focus'

function Modal({ isOpen, onClose }) {
  const modalRef = useFocusTrap(isOpen)
  
  return (
    <div ref={modalRef} role="dialog" aria-modal="true">
      {/* Modal content */}
    </div>
  )
}
```

#### Skip Links
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

### 3. Understandable (Razumljivo)

#### Jasne Labele
```tsx
// ✅ Dobro
<label htmlFor="amount">Iznos</label>
<input id="amount" type="number" />

// ❌ Loše
<input type="number" placeholder="Iznos" />
```

#### Error Messages
```tsx
<input
  aria-invalid={hasError}
  aria-describedby={hasError ? "amount-error" : undefined}
/>
{hasError && (
  <p id="amount-error" role="alert">
    Iznos mora biti veći od 0
  </p>
)}
```

### 4. Robust (Robustan)

#### Semantički HTML
```tsx
// ✅ Dobro
<button onClick={handleClick}>Dodaj</button>
<nav><a href="/receipts">Računi</a></nav>

// ❌ Loše
<div onClick={handleClick}>Dodaj</div>
<div><span onClick={...}>Računi</span></div>
```

## 🛠️ Alati i Testiranje

### Automatsko Testiranje

```bash
# Axe-core integration (TODO: add to package.json)
npm install --save-dev @axe-core/react jest-axe

# Run accessibility tests
npm run test:a11y
```

### Manuelno Testiranje

1. **Keyboard-only navigacija**
   - Tab kroz sve elemente
   - Enter/Space za aktivaciju
   - Escape za zatvaranje modala
   - Arrow keys za navigaciju u listama

2. **Screen Reader testiranje**
   - **NVDA** (Windows) - Free
   - **JAWS** (Windows) - Commercial
   - **VoiceOver** (macOS/iOS) - Built-in
   - **TalkBack** (Android) - Built-in

3. **Browser DevTools**
   - Chrome DevTools > Lighthouse > Accessibility
   - Firefox > Accessibility Inspector
   - axe DevTools extension

### Checklist za Testiranje

- [ ] Svi interaktivni elementi su dostupni tastaturom
- [ ] Tab order je logičan
- [ ] Focus je vidljiv na svim elementima
- [ ] Screen reader čita sve važne informacije
- [ ] Slike imaju alt text
- [ ] Forme imaju labele
- [ ] Error poruke se najavljuju
- [ ] Kontrast boja je dovoljan
- [ ] Aplikacija radi bez miša
- [ ] Aplikacija radi bez boja (grayscale test)
- [ ] Tekst se može zoomirati do 200%

## 📚 Komponente

### Button
```tsx
import { Button } from '@/components/ui/button'

// Auto-includes proper ARIA attributes
<Button variant="primary" disabled={isLoading}>
  {isLoading ? 'Loading...' : 'Submit'}
</Button>
```

### Form Inputs
```tsx
import { Input, Label } from '@/components/ui'

<Label htmlFor="email">Email</Label>
<Input
  id="email"
  type="email"
  error="Invalid email"
  aria-required="true"
/>
```

### Modal/Dialog
```tsx
import { Dialog } from '@/components/common/Dialog'

<Dialog
  isOpen={isOpen}
  onClose={onClose}
  title="Potvrda brisanja"
  description="Da li ste sigurni?"
>
  {/* Content */}
</Dialog>
```

## 🎨 Design Patterns

### Live Regions (Dynamic Content)
```tsx
import { useLiveAnnouncement } from '@/lib/a11y/announcer'

function ReceiptForm() {
  const announce = useLiveAnnouncement()
  
  const handleSave = async () => {
    await saveReceipt()
    announce('Račun uspešno sačuvan', 'polite')
  }
}
```

### Roving Tab Index (Lists)
```tsx
import { useRovingTabIndex } from '@/hooks/useRovingTabIndex'

function ReceiptList({ items }) {
  const { getItemProps } = useRovingTabIndex(items.length)
  
  return (
    <ul role="list">
      {items.map((item, index) => (
        <li key={item.id} {...getItemProps(index)}>
          {item.name}
        </li>
      ))}
    </ul>
  )
}
```

## 📖 Resursi

### Zvanične Specifikacije
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

### Alati
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Accessibility Insights](https://accessibilityinsights.io/)
- [WebAIM Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Kursevi
- [Web Accessibility by Google (Udacity)](https://www.udacity.com/course/web-accessibility--ud891)
- [Digital Accessibility (W3Cx)](https://www.edx.org/course/web-accessibility-introduction)

## ⚡ Quick Wins

1. **Dodaj alt text svim slikama**
2. **Koristi semantički HTML** (`<button>`, `<nav>`, `<main>`)
3. **Labele za sve inpute**
4. **Focus states** (`:focus-visible` u CSS)
5. **ARIA labels za ikonice**
6. **Color contrast check** (Tailwind već ima dobre vrednosti)
7. **Keyboard testiranje** (10 min svaki feature)

## 🐛 Česti Problemi

### Problem: Tab focus nije vidljiv
```css
/* ✅ Rešenje */
.custom-button:focus-visible {
  @apply ring-2 ring-primary-500 ring-offset-2;
}
```

### Problem: Screen reader ne čita dinamički sadržaj
```tsx
/* ✅ Rešenje */
<div aria-live="polite" aria-atomic="true">
  {message}
</div>
```

### Problem: Modal zaključava focus
```tsx
/* ✅ Rešenje */
import { useFocusTrap } from '@/lib/a11y/focus'

const modalRef = useFocusTrap(isOpen)
```

---

**Accessibility nije feature, to je requirement!** 🚀

