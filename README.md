# DC Fine Foods — Internal Dashboard

Internal operations dashboard for DC Fine Foods cashew processing pipeline. Track intake, processing, grading, quality, packaging, stock, and shipments.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Charts | Recharts |
| Icons | Lucide React |
| Hosting | Vercel |

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.local.example .env.local
# Fill in your Supabase URL and anon key

# 3. Run database setup
# Execute supabase/schema.sql in Supabase SQL Editor
# Then execute supabase/migration-002-security.sql

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production — only approved PRs merge here |
| `dev/*` | Feature/fix branches — create PRs to main |

All PRs to `main` must pass CI (lint + type check + build) before merging.

## Priority TODOs

### P0 — Critical

- [ ] **Configure custom SMTP in Supabase** — Free plan limits signup emails to 4/hour. Set up Resend, Brevo, or Postmark under Project Settings > Authentication > SMTP
- [ ] **Verify RLS policies are applied** — Run `supabase/migration-002-security.sql` in Supabase SQL Editor if not already done. Admin role/status changes require the "Managers can manage profiles" RLS policy

### P1 — High Priority

- [ ] **Mobile responsiveness audit** — Test all pages on iPhone 13+ and recent Android devices (last 5 years). Check for:
  - Layout shifts on small screens
  - Unnecessary zoom on form input focus (viewport meta tag added)
  - Table readability on narrow screens (horizontal scroll enabled)
  - Modal usability on mobile
  - Sidebar overlay behavior
- [ ] **Add automated tests** — Unit tests for utility functions, integration tests for critical flows (signup, approval, role change)
- [ ] **Set up GitHub branch protection** — Require PR reviews and passing CI before merge to `main`

### P2 — Important

- [ ] **Add error boundary** — Wrap dashboard layout with React error boundary to prevent white-screen crashes
- [ ] **Implement rate limiting** — Add rate limits on Supabase Edge Functions for auth endpoints
- [ ] **Add data export** — Allow managers to export pipeline data as CSV
- [ ] **Session timeout** — Auto-logout after extended inactivity
- [ ] **Database backups** — Enable Supabase Point in Time Recovery (Pro plan) or schedule weekly `pg_dump`

### P3 — Nice to Have

- [ ] **Dark mode** — Add theme toggle using CSS variables
- [ ] **Real-time updates** — Use Supabase Realtime for live dashboard data
- [ ] **PWA support** — Add service worker for offline access
- [ ] **Notifications** — Email/push notifications for pending approvals

## Security Model

| Protection | Status |
|---|---|
| Role-based access (worker/manager/stakeholder) | Done |
| Signup approval flow (pending → approved) | Done |
| Account suspension + reactivation | Done |
| Row-Level Security on all tables | Done |
| Soft deletes (no hard delete via API) | Done |
| Automatic audit logging | Done |
| No self-role-assignment | Done |
| CSRF protection (Supabase handles) | Done |
| Input validation (client-side) | Done |
| Server-side input validation | TODO |

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout + metadata
│   ├── login/page.tsx          # Login page
│   ├── signup/page.tsx         # Signup (request access)
│   ├── pending/page.tsx        # Awaiting approval
│   ├── suspended/page.tsx      # Account suspended
│   └── dashboard/
│       ├── layout.tsx          # Auth guard + sidebar
│       ├── page.tsx            # Overview (stats + charts)
│       ├── intake/             # Raw intake CRUD
│       ├── processing/         # Processing CRUD
│       ├── grading/            # Grading CRUD
│       ├── quality/            # Quality check CRUD
│       ├── packaging/          # Packaging CRUD
│       ├── warehouse/          # Stock management
│       ├── shipments/          # Shipment tracking
│       ├── users/              # User management (manager only)
│       ├── audit/              # Audit log (manager only)
│       └── settings/           # Profile settings
├── components/
│   ├── ui/                     # Base components (button, card, table, modal, etc.)
│   └── dashboard/              # Dashboard-specific (sidebar, stat-card, charts)
├── lib/
│   └── supabase/               # Supabase client, server, middleware helpers
└── types/
    └── database.ts             # TypeScript interfaces
```

## CI/CD

GitHub Actions runs on every push to `main` and every PR:
- ESLint
- TypeScript type checking
- Next.js production build

See `.github/workflows/ci.yml`.
