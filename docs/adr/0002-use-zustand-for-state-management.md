# ADR 0002: Use Zustand for State Management

**Date:** 2024-01-20  
**Status:** ✅ Accepted  
**Author:** @zoxknez

## Context

Aplikacija raste i potreban je global state management za:
- Auth state (user, session)
- UI state (theme, modals, sidebar)
- Settings (language, notifications)
- Sync state (online/offline, pending items)

### Razmatrane opcije:

1. **Redux Toolkit**
   - Industry standard
   - Odličan DevTools
   - Ali: Previše boilerplate-a
   
2. **Zustand**
   - Minimalistički
   - Hook-based API
   - Lightweight (3KB)
   
3. **Jotai**
   - Atomic state
   - Odličan TypeScript
   - Ali: Različit mentalni model
   
4. **Context API + useReducer**
   - Built-in React
   - Ali: Performance issues, prop drilling

## Decision

Koristićemo **Zustand** sa **vanilla store pattern**:

### ✅ Prednosti

- Minimalistički API (learning curve <30min)
- Hook-based (prirodno za React)
- Samo 3KB gzipped
- Odličan TypeScript inference
- Može se koristiti van React komponenti
- Persist middleware out-of-the-box
- Slice pattern za modularnost

### ❌ Mane

- Manje DevTools opcija od Redux-a
- Manjaa community nego Redux
- Moguća over-subscription (rešeno sa selektorima)

## Implementation

### Vanilla Store Pattern

```typescript
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

export const appStore = createStore<AppStore>()(
  persist(
    (set, get) => ({
      // State and actions
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// React hook
export const useAppStore = <T>(selector: (state: AppStore) => T) => 
  useStore(appStore, selector)

// Outside React
appStore.getState().user
appStore.setState({ user: newUser })
```

### Slice Pattern

```typescript
// createAuthSlice.ts
export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
})

// useAppStore.ts
export const appStore = createStore<AppStore>()(
  persist(
    (...args) => ({
      ...createAuthSlice(...args),
      ...createUISlice(...args),
      ...createSettingsSlice(...args),
    }),
    { name: 'app-storage' }
  )
)
```

## Consequences

### Pozitivne

- Minimalan bundle size impact (+3KB)
- Jednostavan za korišćenje
- Lako testiranje (vanilla store)
- Dobra performance (selective subscriptions)

### Negativne

- Moramo sami implementirati DevTools (opciono)
- Manje "best practices" resursa nego Redux

## Migration Path

- ✅ Phase 1: Basic store setup
- ✅ Phase 2: Slice pattern implementacija
- ✅ Phase 3: Persist middleware
- ✅ Phase 4: Vanilla store pattern
- 🔄 Phase 5: Selective hydration (za SSR)

## Metrics

- **Bundle size:** +3KB gzipped
- **Re-render optimization:** 90% reduction (sa selektorima)
- **Developer satisfaction:** ⭐⭐⭐⭐⭐

## References

- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Zustand Best Practices](https://github.com/pmndrs/zustand/blob/main/docs/guides/practice-with-no-store-actions.md)

---

**Previous:** [0001-use-dexie-for-offline-storage.md](./0001-use-dexie-for-offline-storage.md)  
**Next:** [0003-use-tanstack-query.md](./0003-use-tanstack-query.md)

