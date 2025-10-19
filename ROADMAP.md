# 🗺️ Fiskalni Račun - Roadmap & Future Features

**Last Updated:** 2025-10-19  
**Current Version:** v1.0.0  
**Status:** ✅ Phase 1-6 Complete (Testing Foundation + Component Tests)

---

## 📊 **COMPLETED MILESTONES**

### ✅ Phase 1-4: AddReceiptPage Refactoring
- **19 modula** organizovanih u logičke celine
- **1,911 linija koda** (vs 1,064 original)
- **60% redukcija** glavne komponente (424 linija)
- **TypeScript strict mode** compliance
- **100+ dark mode klasa** implementirano
- **Biome + ESLint** bez grešaka

### ✅ Phase 5: Analytics & Receipts Reorganization
- **Total Summary Card** - Kombinovani prikaz fiskalnih i household računa
- **Jasno razdvojene sekcije**: 📄 Fiskalni računi vs 🏠 Domaćinstvo
- **FAB dugme** za dodavanje računa na ReceiptsPage
- **Visual separation** sa color-coded borders (primary/purple)
- **0 TypeScript errors, 0 Biome warnings**

### ✅ Phase 6: Testing Foundation (Day 1-2 Complete)
**Day 1: Unit Tests** (118 tests) ✅
- **validators.ts**: 71 tests covering PIB, amount, date validation
- **formatters.ts**: 47 tests covering sanitization, date/time formatting
- **100% coverage** of validation logic
- **All edge cases** covered (empty strings, invalid formats, boundary values)

**Day 2: Component Tests** (122 tests) ✅
- **FiscalReceiptForm**: 41 tests (rendering, interactions, validation, accessibility)
- **HouseholdBillForm**: 43 tests (full form coverage, optional fields)
- **ModeSelector**: 20 tests (QR/Photo/Manual mode switching)
- **ManualTypeSelector**: 18 tests (Fiscal/Household type switching)
- **Comprehensive coverage**: User interactions, validation errors, loading states, edge cases

**Test Infrastructure** ✅
- **Vitest 3.2.4** with jsdom environment
- **@testing-library/react** + userEvent for component testing
- **fake-indexeddb** for Dexie/IndexedDB tests
- **Playwright E2E** tests excluded from Vitest (separate runner)
- **298 total passing tests** with 100% success rate

**Bug Fixes Along The Way** ✅
- Fixed `exportUtils` case normalization (.PDF → .pdf)
- Fixed `useOCR` hook act() warnings with waitFor()
- Added IndexedDB polyfill for database tests
- Separated Playwright and Vitest test suites

---

## 🚧 **CURRENT WORK: Day 3 - Error Boundaries & Notifications** (In Progress)

### Objectives:
1. **Error Boundary Component** - Catch React errors globally ✅
2. **Toast Notification System** - User feedback for success/error states ✅
3. **Loading States** - Skeleton screens for async operations ✅
4. **Error Recovery Flows** - Graceful degradation with retry mechanisms ⏳

### Completed Tasks:
- [x] Create `ErrorBoundary` component with fallback UI
- [x] Implement `ErrorFallback` component with retry button
- [x] Add error logging service integration (logger.ts)
- [x] Create toast notification hook (`useToast`) with types
- [x] Implement notification variants (success, error, warning, info, loading)
- [x] Add auto-dismiss functionality with configurable duration
- [x] Create skeleton loader components (Card, List, Table, Chart, Stats)
- [x] Write tests for ErrorBoundary (11 tests passing)
- [x] Wrap main App with ErrorBoundary in main.tsx
- [x] Integrate useToast in AddReceiptPage (replacing direct toast calls)
- [ ] Add Suspense boundaries for code-splitting
- [ ] Update other pages to use error boundaries
- [ ] Add skeleton loaders to ReceiptsPage and AnalyticsPage
- [ ] Document error handling patterns

### Components Created:
**Error Handling:**
- `ErrorBoundary.tsx` - React error boundary with fallback UI
- `ErrorFallback.tsx` - Custom error display with retry/home buttons
- `ErrorBoundary.test.tsx` - 11 tests covering error catching, reset, custom fallback

**Loading States:**
- `Skeleton.tsx` - Base skeleton with 7 variants:
  - `SkeletonCard` - General card loading
  - `SkeletonReceiptCard` - Receipt-specific loading
  - `SkeletonTable` - Table with rows
  - `SkeletonList` - List items
  - `SkeletonChart` - Graph/chart loading
  - `SkeletonStatsGrid` - Statistics cards

**Notifications:**
- `useToast.ts` - Toast hook with 6 methods (success, error, loading, info, warning, promise)
- `toastService` - Standalone toast functions for non-hook usage

### Progress: 80% Complete
- ✅ Error boundaries implemented and tested (11/11 tests passing)
- ✅ Root-level error boundary integrated in main.tsx
- ✅ Skeleton loaders ready for integration (7 variants)
- ✅ Toast notification system integrated in AddReceiptPage
- ✅ useToast hook replacing direct toast calls
- ⏳ Skeleton loaders integration with pages pending
- ⏳ Suspense boundaries for lazy routes pending

### Next Steps:
1. ✅ ~~Wrap main App with ErrorBoundary~~ (Done in main.tsx)
2. ✅ ~~Integrate useToast in AddReceiptPage~~ (Done - c6355aac)
3. Add Suspense boundaries for lazy-loaded routes
4. Add skeleton loaders to ReceiptsPage (loading state)
5. Add skeleton loaders to AnalyticsPage (chart loading)
6. Test complete error recovery flows
7. Document error handling patterns for future development

### Success Criteria:
- ✅ All React errors caught and displayed gracefully
- ⏳ Toast notifications working in all CRUD flows (pending integration)
- ⏳ Loading skeletons visible during data fetching (pending integration)
- ✅ Users can retry failed operations
- ✅ Error states tested and documented (11 tests passing)
- ⏳ Zero unhandled promise rejections in console (pending integration)

---

## 🎯 **PRIORITY MATRIX**

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Export/Import (CSV/Excel) | 🔥 High | ⚡ Medium | **P0** |
| Loading States & Skeletons | 🔥 High | ⚡ Low | **P0** |
| Household Bill Notifications | 🔥 High | ⚡ Medium | **P1** |
| Unit Tests (Validators) | 🔶 Medium | ⚡ Medium | **P1** |
| Supabase Auth & Sync | 🔥 High | 🔨 High | **P2** |
| PWA Offline Enhancement | 🔶 Medium | ⚡ Medium | **P2** |
| Advanced Analytics (ML) | 🔶 Medium | 🔨 High | **P3** |
| Onboarding Flow | 🔵 Low | ⚡ Low | **P3** |

**Legend:**
- 🔥 High Impact = Game changer for users
- 🔶 Medium Impact = Nice improvement
- 🔵 Low Impact = Polish & nice-to-have
- ⚡ Low Effort = 1-3 days
- ⚡ Medium Effort = 4-7 days
- 🔨 High Effort = 2+ weeks

---

## 🚀 **FEATURE ROADMAP**

### **🎯 Milestone 6: Data Export & Import** (P0)

**Cilj:** Omogućiti korisnicima da izvoz i uvoz podataka

**Features:**
- ✅ Export u CSV format
  - Fiskalni računi export
  - Household bills export
  - Kombinovani export (all data)
  - Date range filter
  - Category filter

- ✅ Export u Excel format (.xlsx)
  - Multiple sheets (Fiscal, Household, Summary)
  - Formatted cells (currency, dates)
  - Charts & graphs
  - Pivot tables support

- ✅ Import wizard
  - CSV/Excel file upload
  - Column mapping UI
  - Data validation & preview
  - Duplicate detection
  - Error handling & reporting

**Technical Stack:**
- `papaparse` - CSV parsing
- `xlsx` / `exceljs` - Excel generation
- `react-dropzone` - File upload
- Validation layer - Custom validators

**Estimated Effort:** 5-7 days
**Priority:** **P0** (HIGH)

---

### **✨ Milestone 7: UX Polish & Loading States** (P0)

**Cilj:** Drastično poboljšati user experience sa smooth loading states

**Features:**
- ✅ Skeleton Screens
  - Receipt list skeleton
  - Analytics charts skeleton
  - Form loading skeleton
  - Card placeholder animations

- ✅ Optimistic UI Updates
  - Instant feedback na user akcije
  - Rollback na greške
  - Toast notifications

- ✅ Error Boundaries
  - Graceful error handling
  - Fallback UI komponente
  - Error reporting (Sentry integration?)

- ✅ Loading Indicators
  - Progress bars za duge operacije
  - Percentage indicators
  - Cancel actions support

**Technical Stack:**
- `react-content-loader` - Skeleton screens
- `react-hot-toast` - Toast notifications
- Custom error boundaries
- Framer Motion - Animations

**Estimated Effort:** 3-4 days
**Priority:** **P0** (HIGH)

---

### **🔔 Milestone 8: Smart Notifications** (P1)

**Cilj:** Reminder sistem za neplaćene račune i due dates

**Features:**
- ✅ Browser Push Notifications
  - Permission request flow
  - Service Worker integration
  - Notification scheduling

- ✅ In-App Notifications
  - Notification center/dropdown
  - Unread badges
  - Mark as read/dismiss
  - Notification history

- ✅ Email Reminders (Optional)
  - Supabase Edge Functions
  - Email templates
  - Frequency settings (daily/weekly)
  - Opt-in/opt-out

- ✅ Smart Reminders
  - 7 days before due date
  - 3 days before due date
  - Day of due date
  - Overdue notifications
  - Custom reminder rules

**Technical Stack:**
- Web Push API
- Service Worker
- Supabase Edge Functions (Email)
- Notification scheduling library

**Estimated Effort:** 5-6 days
**Priority:** **P1** (MEDIUM-HIGH)

---

### **🧪 Milestone 9: Testing Infrastructure** (P1)

**Cilj:** Stabilnost i confidence kroz automated testing

**Features:**
- ✅ Unit Tests
  - Validator functions (`validators.ts`)
  - Utility functions (`utils.ts`, `formatters.ts`)
  - Custom hooks testing
  - Pure function tests

- ✅ Integration Tests
  - Form submission flows
  - Database CRUD operations
  - API call mocking
  - Component integration

- ✅ E2E Tests (Playwright)
  - Receipt creation flow
  - QR code scanning
  - Analytics viewing
  - Filter & search
  - Critical user paths

- ✅ Visual Regression
  - Component screenshot tests
  - Dark mode coverage
  - Responsive breakpoints
  - Storybook integration?

**Technical Stack:**
- `vitest` - Unit tests (already setup!)
- `@testing-library/react` - Component tests
- `Playwright` - E2E tests (already setup!)
- `@storybook/react` - Component stories (optional)

**Estimated Effort:** 7-10 days
**Priority:** **P1** (MEDIUM-HIGH)

---

### **☁️ Milestone 10: Supabase Auth & Multi-User** (P2)

**Cilj:** Cloud sync i multi-device support

**Features:**
- ✅ Supabase Authentication
  - Email/Password login
  - Magic link login
  - Social OAuth (Google, GitHub)
  - Session management

- ✅ Real-Time Sync
  - Automatic sync across devices
  - Conflict resolution
  - Offline queue
  - Sync status indicators

- ✅ Multi-User Support
  - Shared household accounts
  - Invite members
  - Permission levels (admin/member/viewer)
  - Activity log

- ✅ Cloud Backup
  - Automatic backups
  - Manual backup/restore
  - Export all data
  - Data retention policies

**Technical Stack:**
- Supabase Auth
- Supabase Realtime
- Row Level Security (RLS)
- Supabase Storage (receipts images)

**Estimated Effort:** 10-14 days
**Priority:** **P2** (MEDIUM)

---

### **📱 Milestone 11: PWA & Mobile Optimization** (P2)

**Cilj:** Native-like mobile experience

**Features:**
- ✅ Enhanced Offline Mode
  - Full offline functionality
  - Background sync
  - Offline indicators
  - Cached analytics

- ✅ Install Prompt
  - Custom install UI
  - Platform detection (iOS/Android)
  - Install instructions
  - Dismiss tracking

- ✅ Mobile Gestures
  - Swipe to delete
  - Pull to refresh
  - Swipe navigation
  - Long press actions

- ✅ Camera Optimization
  - Better photo capture UI
  - Multi-photo support
  - Image cropping/rotation
  - Compression before upload

- ✅ Haptic Feedback
  - Button press feedback
  - Success/Error vibrations
  - Navigation feedback

**Technical Stack:**
- Vite PWA plugin (already setup!)
- Service Worker API
- Touch event handlers
- Vibration API
- Media Capture API

**Estimated Effort:** 6-8 days
**Priority:** **P2** (MEDIUM)

---

### **📈 Milestone 12: Advanced Analytics** (P3)

**Cilj:** Predictive insights i budget tracking

**Features:**
- ✅ Spending Predictions
  - ML-based forecasting
  - Trend analysis
  - Anomaly detection
  - Monthly budget suggestions

- ✅ Budget Tracking
  - Category budgets
  - Monthly/yearly limits
  - Budget vs actual
  - Overspending alerts

- ✅ Comparative Analysis
  - Month-over-month comparison
  - Year-over-year trends
  - Category breakdown changes
  - Merchant spending patterns

- ✅ Custom Reports
  - Report builder UI
  - PDF export
  - Email scheduled reports
  - Custom date ranges
  - Multiple chart types

**Technical Stack:**
- `ml5.js` or `TensorFlow.js` - ML predictions
- `react-pdf` - PDF generation
- `recharts` - Custom charts
- Chart.js / D3.js - Advanced visualizations

**Estimated Effort:** 10-15 days
**Priority:** **P3** (LOW-MEDIUM)

---

### **🎓 Milestone 13: Onboarding & Tutorial** (P3)

**Cilj:** Bolja first impression za nove korisnike

**Features:**
- ✅ Welcome Screen
  - Feature highlights
  - Quick setup wizard
  - Sample data option
  - Skip tutorial option

- ✅ Interactive Tutorial
  - Step-by-step guide
  - Tooltips & highlights
  - Progress tracking
  - "Try it yourself" actions

- ✅ Help Center
  - FAQ section
  - Video tutorials
  - Feature documentation
  - Search functionality

- ✅ Contextual Tips
  - First-time hints
  - Feature discovery
  - Keyboard shortcuts
  - Best practices

**Technical Stack:**
- `react-joyride` - Tour library
- `intro.js` - Step-by-step guide
- Custom tooltip system
- Video hosting (YouTube/Vimeo)

**Estimated Effort:** 4-5 days
**Priority:** **P3** (LOW)

---

## 🔮 **FUTURE IDEAS** (Backlog)

### **Integration Ideas:**
- 📧 Email parsing (extract receipts from Gmail)
- 🏦 Bank API integration (automatic import)
- 📲 WhatsApp/Telegram bot
- 🗣️ Voice commands (Web Speech API)
- 🤖 AI receipt categorization
- 💳 Payment gateway integration
- 📊 Google Sheets/Excel sync
- 🔗 Zapier/IFTTT webhooks

### **Advanced Features:**
- 🏷️ Tag system for receipts
- 📝 Custom fields & metadata
- 🔍 Full-text search (Algolia?)
- 📊 Business expense tracking
- 💼 Multi-business support
- 📈 Tax report generation
- 🌍 Multi-currency support
- 🌐 i18n expansion (more languages)

### **Community Features:**
- 👥 Shared expenses (Splitwise-like)
- 💬 Comments on receipts
- ⭐ Receipt templates
- 🏆 Community challenges
- 📊 Public spending benchmarks

---

## 🛠️ **TECHNICAL DEBT & REFACTORING**

### **Performance Optimizations:**
- [ ] Code splitting with React.lazy()
- [ ] Route-based lazy loading
- [ ] Image optimization (WebP, lazy loading)
- [ ] Bundle size analysis & reduction
- [ ] Memo-ization audit
- [ ] Virtual scrolling for large lists
- [ ] IndexedDB query optimization

### **Code Quality:**
- [ ] ESLint rules tightening
- [ ] Prettier configuration
- [ ] Consistent error handling patterns
- [ ] Logging strategy (structured logs)
- [ ] TypeScript strictness improvements
- [ ] Remove unused dependencies
- [ ] Update outdated packages

### **Accessibility:**
- [ ] ARIA labels audit
- [ ] Keyboard navigation testing
- [ ] Screen reader testing
- [ ] Color contrast audit (WCAG AA)
- [ ] Focus management
- [ ] Skip navigation links
- [ ] Alt text for images

### **Security:**
- [ ] Content Security Policy (CSP)
- [ ] Input sanitization review
- [ ] XSS protection audit
- [ ] SQL injection prevention (Supabase)
- [ ] Dependency security audit
- [ ] Environment variables security
- [ ] Rate limiting implementation

---

## 📋 **DECISION LOG**

### **Technology Choices:**
- **Why Vite?** - Fastest dev experience, great DX
- **Why React?** - Ecosystem, team familiarity
- **Why TypeScript?** - Type safety, better DX
- **Why Dexie?** - Best IndexedDB wrapper, reactive
- **Why Biome?** - Faster than ESLint+Prettier combined
- **Why Framer Motion?** - Best animation library for React
- **Why Tailwind?** - Utility-first, fast prototyping

### **Architecture Decisions:**
- **Component Organization:** Feature-based folders
- **State Management:** React Context + Hooks (no Redux)
- **Data Layer:** IndexedDB (local-first) + Supabase (sync)
- **Routing:** React Router v6
- **Forms:** Controlled components (no form library)
- **Testing:** Vitest + Playwright (pragmatic coverage)

---

## 🎯 **NEXT STEPS - YOUR CHOICE!**

### **Quick Wins** (1-3 days each):
1. **Export CSV** - Immediate value for users
2. **Loading Skeletons** - Visual polish
3. **Toast Notifications** - Better feedback
4. **Onboarding Welcome Screen** - First impression

### **High Impact** (1 week each):
1. **Household Notifications** - Game changer
2. **Unit Tests** - Confidence & stability
3. **PWA Install Prompt** - Mobile experience

### **Big Bets** (2+ weeks each):
1. **Supabase Auth & Sync** - Multi-device
2. **Advanced Analytics (ML)** - Predictive insights
3. **Multi-User Support** - Shared accounts

---

## 📝 **DECISION FRAMEWORK**

When choosing next feature, consider:

1. **User Value** - Does it solve a real pain point?
2. **Technical Debt** - Will it create maintenance burden?
3. **Dependencies** - Does it block other features?
4. **Market Differentiation** - Does it make us unique?
5. **Resource Availability** - Do we have time/skill?

**Questions to ask:**
- Will users immediately notice this?
- Does it increase retention/engagement?
- Can we validate quickly (MVP approach)?
- Is it aligned with long-term vision?

---

## 🎨 **DESIGN PRINCIPLES**

1. **Local-First** - App works offline, sync is enhancement
2. **Zero Config** - Works out of the box, no setup needed
3. **Progressive Enhancement** - Core features work everywhere
4. **Privacy Focused** - User data stays on device by default
5. **Fast & Responsive** - <100ms interactions, instant feedback
6. **Accessible** - WCAG AA compliance, keyboard friendly
7. **Beautiful** - Delight users with animations & polish

---

## 📞 **CONTACT & FEEDBACK**

**GitHub:** [github.com/zoxknez/fiskalni-racun](https://github.com/zoxknez/fiskalni-racun)  
**Issues:** Report bugs & feature requests  
**Discussions:** Community ideas & feedback

---

**Let's build something amazing! 🚀**

*Last updated: 2025-10-19*
