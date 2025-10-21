# 📁 Project File Organization Guide

Ovaj dokument definiše gde koji fajlovi treba da se nalaze u projektu.

---

## 📂 Struktura Foldera

### Root Directory (/)
**Samo ključni projektni fajlovi:**
- `README.md` - Glavna dokumentacija projekta
- `LICENSE` - Licenca projekta
- `ROADMAP.md` - Razvojni plan
- `SECURITY.md` - Sigurnosne informacije
- `PROJECT-STRUCTURE.md` - Struktura projekta
- Config fajlovi: `package.json`, `vite.config.ts`, `tsconfig.json`, etc.
- Env fajlovi: `.env`, `.env.example`, `.env.local`, etc.

**❌ NE držati u root-u:**
- Izveštaje (→ `izvestaji/`)
- Tehničku dokumentaciju (→ `docs/` ili `izvestaji/`)
- Backup fajlove
- Temporary fajlove

---

## 📋 Folder Purposes

### `/izvestaji/` - Development Reports
**Svi izveštaji o razvoju, optimizacijama, bugfix-ovima:**
- Optimizacije (UNAPREDJENJA-*, BUILD-OPTIMIZACIJE-*, etc.)
- Bug fixes (BUGFIX-*, NAVIGATION-FIX, etc.)
- Analize (ANALYSIS-REPORT, I18N-AUDIT-REPORT, etc.)
- Refactoring izveštaji
- Completion reports
- Deployment status

**Pravila:**
- Svaki novi izveštaj → `izvestaji/`
- Update `izvestaji/README.md` sa novim fajlom
- Datum obavezan u README tabeli
- Kategorizuj po tipu

### `/docs/` - Technical Documentation
**Tehnička dokumentacija za API, arhitekturu:**
- OpenAPI specifikacije (`openapi.json`)
- Arhitekturne dijagrame
- API dokumentaciju
- Integration guides

**Pravila:**
- Ne mešati sa izveštajima
- Fokus na externe developere i integracije

### `/mobile-docs/` - Mobile Development
**Dokumentacija za mobilni build (Capacitor):**
- Setup vodiči
- Build procedures
- Store requirements
- Icon generation

### `/scripts/` - Utility Scripts
**Automatizacioni i build skripte:**
- Database seeders
- Analyzers
- Generators
- Development utilities

### `/src/` - Source Code
**Aplikacioni kod:**
- Components
- Pages
- Services
- Utils
- Types

### `/lib/` - Shared Libraries
**Deljene biblioteke između frontend/backend:**
- Database schema
- Shared utilities
- Common types

---

## 🔄 Migration Checklist

Pri organizaciji fajlova:

1. ✅ Identifikuj tip fajla (izveštaj, dokumentacija, config)
2. ✅ Premesti u odgovarajući folder
3. ✅ Update README u target folderu
4. ✅ Proveri da nema broken links u drugim fajlovima
5. ✅ Commit sa jasnim opisom

---

## 📝 Naming Conventions

### Reports (izvestaji/)
```
UPPERCASE-WITH-DASHES.md
Examples:
- FINALNI-IZVESTAJ.md
- BUILD-OPTIMIZACIJE-REZULTAT.md
- BUGFIX-LOGGER-RECURSION.md
```

### Documentation (docs/)
```
lowercase-with-dashes.md or kebab-case.md
Examples:
- api-reference.md
- architecture-overview.md
```

### Scripts (scripts/)
```
kebab-case.ts or camelCase.ts
Examples:
- generate-sitemap.ts
- seed-database.ts
```

---

## 🔍 Quick Reference

| Tip Fajla | Folder | Example |
|-----------|--------|---------|
| Development Report | `/izvestaji/` | FINALNI-IZVESTAJ.md |
| Optimization Report | `/izvestaji/` | UNAPREDJENJA-PERFORMANSE.md |
| Bug Fix Report | `/izvestaji/` | BUGFIX-LOGGER-RECURSION.md |
| API Docs | `/docs/` | openapi.json |
| Mobile Guide | `/mobile-docs/` | MOBILE-BUILD-GUIDE.md |
| Build Script | `/scripts/` | generate-sitemap.ts |
| Source Code | `/src/` | App.tsx |
| Shared Lib | `/lib/` | db.ts |

---

## 🆕 When Creating New Files

**Before creating a file in root, ask:**
1. Je li ovo config fajl? → Root ✅
2. Je li ovo izveštaj? → `/izvestaji/` ✅
3. Je li ovo dokumentacija? → `/docs/` ✅
4. Je li ovo za mobile? → `/mobile-docs/` ✅
5. Je li ovo skripta? → `/scripts/` ✅

**If unsure:** Default to appropriate subfolder, not root!

---

## 🧹 Cleanup Routine

**Mesečno:**
1. Proveri root za neorganizovane fajlove
2. Premesti u odgovarajuće foldere
3. Update README fajlove
4. Archive stare izveštaje (>6 meseci) u `izvestaji/archive/`

**Kvartalno:**
1. Review folder strukture
2. Merge duplicate dokumentacije
3. Archive outdated reports

---

**Last Updated:** October 21, 2025  
**Maintained by:** Development Team  
**Version:** 1.0
