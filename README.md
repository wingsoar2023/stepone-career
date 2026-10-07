# StepOne Career

A minimalist AI career companion for international students and new graduates in the United States (F-1 / CPT / OPT / STEM OPT).

**Live:** https://steponecareer.com

## What it does

| Module | Description |
|---|---|
| **ATS Resume Intelligence** | Deterministic keyword/gap engine scoring the resume against a pasted US job description; generates JD-specific quantified impact bullets (STAR) and exports ATS-safe PDFs. |
| **H-1B LCA Sponsorship Database** | Employer-level statistics aggregated from the official US Department of Labor OFLC public disclosure data — 53,000+ unique US employers built from 1,032,735 certified LCA records (FY2026 file). Live type-ahead lookup from the JD matcher. |
| **STAR Mock-Interview Coach** | Role-customized behavioral question cards + 60-second speech pitch trainer (live WPM pace & filler-word counting, runs locally on-device). |
| **Application Tracker** | Cloud-synced Kanban pipeline (Applying / Interviewing / Offers) with 1-click recruiter follow-up drafting. |

## Tech stack

- **Frontend:** React 18 + Vite
- **Native shells:** Capacitor (iOS 16+; Android ships as a TWA of the website)
- **Backend:** Supabase (Postgres + Auth)
- **In-App Purchases:** Apple-native StoreKit via `@capgo/native-purchases` (com.steponecareer.pro.monthly, com.steponecareer.lifetime)
- **Payments (web/Android):** Stripe Checkout (live links)

## Repository layout

```
src/                     React app (components, context, lib)
  └── lib/lca.js         Live DOL LCA employer lookup (Supabase-backed)
ios/                     Capacitor iOS shell + fastlane (match, TestFlight lane)
supabase/
  └── h1b_lca_seed.sql   Supabase seed: employer-level LCA statistics (53,393 rows)
  └── supabase_schema.sql  Core app schema
scripts/
  └── build-lca-database.mjs  Downloads the official OFLC disclosure file from dol.gov
                              and aggregates employer stats → h1b_lca_seed.sql
  └── import-lca-seed.mjs     Applies the seed to the Supabase project
.github/workflows/
  ├─ deploy-pages.yml    Push to main → GitHub Pages (production)
  └─ ios-release.yml     Push to main → Build ipa → upload to TestFlight
```

## DOL LCA data pipeline

The "53,000+ employers" claim is backed entirely by official government data:

1. **Build:** `node scripts/build-lca-database.mjs`
   - Downloads `LCA_Disclosure_Data_FY2026_Q3.xlsx` (cumulative FY file) directly from dol.gov (official OFLC Performance Data page).
   - Streams `sharedStrings.xml` and `worksheets/sheet1.xml` through a chunked row splitter (the 252 MB workbook unpacks to ~1.6 GB; SheetJS OOMs and ExcelJS/jszip crashes on it, hence the streaming parser).
   - Filters to `CERTIFIED*` status and `H-1B / H-1B1 / E-3` visa classes; aggregates filings, positions, unit-aware median annual wage (hour ×2080 / week ×52 / biweekly ×26 / month ×12), and top states (USPS set).
   - Empts `supabase/h1b_lca_seed.sql` with RLS read-only policy.
2. **Import:** `node scripts/import-lca-seed.mjs` (needs `scripts/.db-url`; run once, then delete the file).

Runtime lookup live in `src/lib/lca.js` → table `h1b_lca_employers`.

## Local development

```bash
npm install
npm run dev        # vite dev server
npm run build      # production build to dist/
```

Environment variables in `.env` (see `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_MONTHLY_URL`, `VITE_STRIPE_LIFETIME_URL`.

## iOS release

```bash
npm run build && npx cap sync ios
# push to main → CI builds 1.0 (22) and uploads to TestFlight via fastlane match
```

## Legal

Operated by Clarity Clinical Solutions LLC. Sponsorship data reflects past public DOL LCA filings and is not legal or immigration advice.
