# Dev vs Production Environment Setup

## Recommended: Two Supabase Projects

Create two separate Supabase projects to keep dev data completely isolated from production.

### 1. Create Projects

| Environment | Supabase Project Name | Purpose |
|---|---|---|
| **Production** | `dc-finefoods-prod` | Live dashboard at `dashboard.dcfinefoods.net` |
| **Development** | `dc-finefoods-dev` | Local dev + Vercel preview deployments |

### 2. Run Schema on Both

Run both SQL files on each project:
1. `supabase/schema.sql` — creates tables
2. `supabase/migration-002-security.sql` — adds security features

On the **dev** project, also run the seed data section to have demo data.

### 3. Vercel Environment Variables

In Vercel → Project Settings → Environment Variables:

**Production** (applied to Production deployments):
```
NEXT_PUBLIC_SUPABASE_URL = https://your-PROD-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = your-PROD-anon-key
NEXT_PUBLIC_APP_ENV = production
```

**Preview + Development** (applied to Preview/Development):
```
NEXT_PUBLIC_SUPABASE_URL = https://your-DEV-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = your-DEV-anon-key
NEXT_PUBLIC_APP_ENV = development
```

### 4. Git Workflow

```
main branch ──→ Vercel Production (dashboard.dcfinefoods.net)
                  └── Uses PROD Supabase

feature branches ──→ Vercel Preview (random-url.vercel.app)
                       └── Uses DEV Supabase

local dev ──→ localhost:3000
               └── Uses DEV Supabase (.env.local)
```

### 5. Local Development

Your `.env.local` should point to the DEV Supabase project:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-DEV-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-DEV-anon-key
NEXT_PUBLIC_APP_ENV=development
```

A yellow "DEVELOPMENT" badge will appear in the bottom-right corner when not in production, so you always know which environment you're in.

## Backup Strategy

### Free Plan
Run weekly manual backups:
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Dump production database
supabase db dump --project-ref <your-prod-ref> > backups/backup-$(date +%Y%m%d).sql
```

Store backups in Google Drive, Dropbox, or a private GitHub repo.

### Pro Plan ($25/month)
Enable **Point in Time Recovery (PITR)** for continuous backups:
- Supabase Dashboard → Project Settings → Database → Enable PITR
- Allows restoring to any point in the last 7 days
- Recommended for production use
