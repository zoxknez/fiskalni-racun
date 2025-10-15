# Contributing to Fiskalni Račun

Hvala što želite da doprinesete projektu! 🎉 Vaš doprinos je veoma cenjen.

## 📋 Sadržaj

- [Code of Conduct](#code-of-conduct)
- [Kako doprineti](#kako-doprineti)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)

## 🤝 Code of Conduct

Poštovanje je osnova naše zajednice. Molimo:

- Budite ljubazni i profesionalni
- Poštujte različita mišljenja
- Prihvatajte konstruktivnu kritiku
- Fokusirajte se na ono što je najbolje za zajednicu

## 🚀 Kako doprineti

### Prijavite Bug

1. Proverite da bug već nije prijavljen u [Issues](https://github.com/zoxknez/fiskalni-racun/issues)
2. Otvorite novi issue sa oznakom `bug`
3. Uključite:
   - Jasan naslov i opis
   - Korake za reprodukciju
   - Očekivano vs. stvarno ponašanje
   - Screenshots (ako je relevantno)
   - Verzija browser-a/OS-a/app-a

### Predložite Feature

1. Otvorite issue sa oznakom `enhancement`
2. Objasnite:
   - Problem koji feature rešava
   - Predloženo rešenje
   - Alternative koje ste razmatrali
   - Moguće implementacije

### Doprinos kodu

1. **Fork** repository
2. **Klonirajte** fork na lokalni računar
3. **Kreirajte** feature branch (`git checkout -b feature/amazing-feature`)
4. **Napravite** promene
5. **Testirajte** promene lokalno
6. **Commit** (`git commit -m 'feat: add amazing feature'`)
7. **Push** (`git push origin feature/amazing-feature`)
8. **Otvorite** Pull Request

## 💻 Development Setup

### Preduslovi

```bash
Node.js >= 20.0.0
npm >= 10.0.0
```

### Instalacija

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/fiskalni-racun.git
cd fiskalni-racun

# Add upstream remote
git remote add upstream https://github.com/zoxknez/fiskalni-racun.git

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Popunite .env sa svojim credentials

# Start dev server
npm run dev
```

### Komande

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)

# Building
npm run build            # Production build
npm run preview          # Preview production build

# Code quality
npm run lint             # Check code with Biome
npm run lint:fix         # Auto-fix issues
npm run format           # Format code
npm run type-check       # TypeScript type checking

# Testing
npm test                 # Run unit tests
npm run test:coverage    # Run tests with coverage
npm run test:e2e         # Run E2E tests
npm run test:ui          # Open Vitest UI

# Other
npm run sitemap          # Generate sitemap.xml
npm run size             # Check bundle size
npm run analyze          # Analyze bundle
```

## 📝 Coding Standards

### TypeScript

- ✅ Koristite strict mode
- ✅ Избегавајте `any` - koristite `unknown` ili type guard
- ✅ Preferujte `interface` za object shapes
- ✅ Koristite `type` za unions/intersections
- ✅ Dodajte JSDoc komentare za javne API-je

```typescript
// ✅ Good
interface User {
  id: string
  name: string
  email: string
}

/**
 * Fetch user by ID
 * 
 * @param id - User ID
 * @returns User object or null if not found
 */
async function getUser(id: string): Promise<User | null> {
  // Implementation
}

// ❌ Bad
function getUser(id: any): any {
  // Implementation
}
```

### React

- ✅ Functional components + hooks
- ✅ Named exports (ne default exports)
- ✅ JSDoc za complex komponente
- ✅ Memorizacija expensive operations

```typescript
// ✅ Good
interface ButtonProps {
  /** Button label */
  label: string
  /** Click handler */
  onClick: () => void
  /** Loading state */
  loading?: boolean
}

export function Button({ label, onClick, loading }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={loading}>
      {loading ? 'Loading...' : label}
    </button>
  )
}

// ❌ Bad
export default function (props: any) {
  return <button>{props.label}</button>
}
```

### CSS / Tailwind

- ✅ Koristite utility classes
- ✅ `cn()` helper za conditional styles
- ✅ Pridržavajte se design tokens
- ✅ Mobile-first pristup

```tsx
// ✅ Good
<div
  className={cn(
    'px-4 py-2 rounded-lg transition-colors',
    isActive && 'bg-primary-500 text-white',
    !isActive && 'bg-gray-100 text-gray-900'
  )}
/>

// ❌ Bad
<div style={{ padding: '8px 16px' }} />
```

### File Structure

```
src/
├── components/       # React components
│   ├── ui/          # Reusable UI components
│   ├── common/      # Common components
│   └── [feature]/   # Feature-specific components
├── hooks/           # Custom hooks
├── lib/             # Utilities
├── pages/           # Page components
├── store/           # State management
└── types/           # TypeScript types
```

## 📦 Commit Convention

Koristimo [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - Nova funkcionalnost
- `fix` - Bug fix
- `docs` - Dokumentacija
- `style` - Formatiranje koda
- `refactor` - Refactoring
- `test` - Testovi
- `chore` - Održavanje
- `perf` - Performance improvements
- `ci` - CI/CD promene

### Examples

```bash
feat(receipts): add QR code scanner
fix(auth): resolve infinite loop on logout
docs(readme): update installation steps
style(button): apply consistent spacing
refactor(api): simplify error handling
test(utils): add tests for formatCurrency
chore(deps): update react to 18.3.1
perf(list): implement virtual scrolling
ci(github): add lighthouse workflow
```

### Breaking Changes

```bash
feat(api)!: change authentication flow

BREAKING CHANGE: Auth now requires OAuth 2.0
Users must re-authenticate after upgrade.

Migration guide: See docs/migration/v2.md
```

## 🔍 Pull Request Process

### Pre-Submit Checklist

- [ ] Kod se build-uje bez grešaka
- [ ] Svi testovi prolaze (`npm test`)
- [ ] Linter prolazi (`npm run lint`)
- [ ] Type check prolazi (`npm run type-check`)
- [ ] Dodati testovi za nove feature-e
- [ ] Dokumentacija ažurirana
- [ ] Nema `console.log()` u kodu
- [ ] Commit messages prate konvenciju

### PR Template

```markdown
## Šta menja ovaj PR?

Kratak opis promene...

## Kako testirati?

1. Korak 1
2. Korak 2
3. Očekivani rezultat

## Screenshots (za UI promene)

Before | After
--- | ---
[img] | [img]

## Related Issues

Closes #123

## Checklist

- [ ] Tests added/updated
- [ ] Docs updated
- [ ] Breaking changes documented
- [ ] Changelog updated
```

### Review Process

1. Najmanje 1 approval pre merge
2. CI mora biti zeleno (svi checks passed)
3. Conflicts resolved
4. Squash commits pre merge (maintainer će uraditi)

## 🧪 Testing Guidelines

### Unit Tests

```typescript
// ✅ Good test
describe('formatCurrency', () => {
  it('should format Serbian currency correctly', () => {
    expect(formatCurrency(1234.56)).toBe('1.234,56 RSD')
  })
  
  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('0,00 RSD')
  })
  
  it('should handle negative numbers', () => {
    expect(formatCurrency(-100)).toBe('-100,00 RSD')
  })
})

// ❌ Bad test
test('it works', () => {
  expect(true).toBe(true)
})
```

### Component Tests

```typescript
describe('Button', () => {
  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await userEvent.click(screen.getByText('Click me'))
    
    expect(handleClick).toHaveBeenCalledOnce()
  })
})
```

### Integration Tests

```typescript
describe('Receipt Flow', () => {
  it('should add receipt via form', async () => {
    // Test complete flow
  })
})
```

## 📖 Documentation

- Dokumentujte sve javne API-je
- Koristite JSDoc za funkcije i komponente
- Dodajte README u nove module
- Ažurirajte CHANGELOG.md

```typescript
/**
 * Calculate warranty expiry date
 * 
 * @param purchaseDate - Date when item was purchased
 * @param months - Warranty duration in months
 * @returns Warranty expiry date
 * 
 * @example
 * ```ts
 * const expiry = calculateExpiry(new Date('2024-01-01'), 24)
 * // Returns: Date('2026-01-01')
 * ```
 */
export function calculateExpiry(purchaseDate: Date, months: number): Date {
  // ...
}
```

## 🎯 Priority Labels

- `P0` - **Critical** (security, data loss)
- `P1` - **High** (major features, important bugs)
- `P2` - **Medium** (nice-to-have features)
- `P3` - **Low** (polish, minor improvements)

## 🏷️ Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `question` - Further information requested

## ❓ Questions?

- Open a [Discussion](https://github.com/zoxknez/fiskalni-racun/discussions)
- Email: zoxknez@hotmail.com

---

**Hvala na doprinosu!** 🙏

Svaki doprinos, bez obzira na veličinu, pomaže u razvoju aplikacije.

