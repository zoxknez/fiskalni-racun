# ADR 0001: Use Dexie.js for Offline Storage

**Date:** 2024-01-15  
**Status:** ✅ Accepted  
**Author:** @zoxknez

## Context

Aplikacija zahteva offline-first funkcionalnost. Korisnici treba da mogu da dodaju račune čak i bez internet konekcije, a podaci treba da se sinhronizuju kada je konekcija dostupna.

### Razmatrane opcije:

1. **IndexedDB raw API**
   - Najperformantnije
   - Puna kontrola
   - Ali: Previše boilerplate koda
   
2. **Dexie.js**
   - IndexedDB wrapper sa reactive queries
   - Odličan TypeScript support
   - Observable for change tracking
   
3. **LocalForage**
   - Jednostavan API
   - Ali: Limitirane mogućnosti (key-value store)
   
4. **PouchDB**
   - Built-in CouchDB sync
   - Ali: 145KB gzipped (preteško)

## Decision

Koristićemo **Dexie.js** iz sledećih razloga:

### ✅ Prednosti

- Odličan TypeScript support
- Reactive queries (`useLiveQuery`)
- Observable for change tracking (potrebno za sync)
- Compound indexes za complex queries
- Aktivno održavan projekat
- 15KB gzipped (prihvatljiva veličina)
- Dobra dokumentacija i community

### ❌ Mane

- Dodatna zavisnost
- Learning curve za tim
- Nema built-in cloud sync (gradimo custom)

## Consequences

### Pozitivne

- Type-safe database operacije
- Automatski UI updates (reactive)
- Lak migration sistem
- Dobro error handling
- Compound indexes za brze upite

### Negativne

- Dependency na eksternu biblioteku
- Moramo sami implementirati Supabase sync layer
- Moramo implementirati conflict resolution

## Implementation Plan

### Phase 1: Local Storage ✅
- Implementirati Dexie schema
- Kreirati CRUD helper funkcije
- Dodati hooks za reactive queries

### Phase 2: Cloud Sync ✅
- Kreirati Supabase sync layer
- Implementirati sync queue
- Background sync kada je online

### Phase 3: Conflict Resolution 🔄
- Last-write-wins strategija
- Timestamp-based resolution
- User notification za konflikte

## Alternatives Considered

### Raw IndexedDB
**Pro:** Nema dependencies, maksimalna kontrola  
**Con:** Previše boilerplate-a, nema reactivity

### PouchDB
**Pro:** Built-in CouchDB sync  
**Con:** 145KB (preteško), overkill za naše potrebe

## References

- [Dexie.js Documentation](https://dexie.org/)
- [IndexedDB Best Practices](https://web.dev/indexeddb-best-practices/)
- [Comparison of IndexedDB Wrappers](https://github.com/pubkey/client-side-databases)

## Metrics

- **Bundle size impact:** +15KB gzipped
- **Performance:** <10ms za većinu upita
- **Type safety:** 100% (full TypeScript support)
- **Developer experience:** ⭐⭐⭐⭐⭐

---

**Next ADR:** [0002-use-zustand-for-state-management.md](./0002-use-zustand-for-state-management.md)

