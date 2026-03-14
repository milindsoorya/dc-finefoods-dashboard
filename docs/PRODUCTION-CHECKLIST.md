# Production Readiness Checklist

## Before Going Live

### 1. Create Separate Production Supabase Project
- [ ] Create a new Supabase project (e.g., `dc-finefoods-prod`)
- [ ] Run `supabase/schema.sql` on the prod database
- [ ] Run `supabase/migration-002-security.sql` on the prod database
- [ ] Do NOT run `supabase/seed-demo-data.sql` on production
- [ ] Create your admin account and manually promote it:
  ```sql
  UPDATE public.profiles
  SET role = 'manager', account_status = 'approved'
  WHERE email = 'your-admin@dcfinefoods.net';
  ```

### 2. Vercel Environment Variables
- [ ] Set **Production** env vars to point to the PROD Supabase project
- [ ] Set **Preview/Development** env vars to point to the DEV Supabase project
- [ ] Set `NEXT_PUBLIC_APP_ENV=production` for Production only

### 3. Supabase Auth Settings (Production Project)
- [ ] Go to Authentication → Settings
- [ ] Set **Site URL** to `https://dashboard.dcfinefoods.net`
- [ ] Add **Redirect URLs**: `https://dashboard.dcfinefoods.net/auth/callback`
- [ ] Enable **Confirm email** (requires users to verify email)
- [ ] Set **Minimum password length** to 8+
- [ ] Disable **Allow new users to sign up** if you want invite-only

### 4. Supabase Email Templates (Production Project)
- [ ] Go to Authentication → Email Templates
- [ ] Customize the **Confirm signup** email with your branding
- [ ] Customize the **Reset password** email
- [ ] Set **From email** to `noreply@dcfinefoods.net` (requires custom SMTP)

### 5. Custom SMTP (Recommended)
Supabase's default email sender has rate limits (4 emails/hour on free plan).
- [ ] Go to Project Settings → Authentication → SMTP Settings
- [ ] Configure a real SMTP provider (e.g., Resend, Postmark, SendGrid)
- [ ] This is needed for reliable signup confirmation + password reset emails

### 6. Subdomain & SSL
- [ ] Add CNAME record in Cloudflare: `dashboard` → `cname.vercel-dns.com` (DNS only)
- [ ] Add `dashboard.dcfinefoods.net` as domain in Vercel project settings
- [ ] Verify SSL is working (Vercel auto-provisions it)

### 7. Supabase Security Hardening
- [ ] Go to Database → Extensions → Disable any unused extensions
- [ ] Go to API Settings → Confirm "Row Level Security" is enforced on all tables
- [ ] Verify no DELETE policies exist (check via SQL Editor):
  ```sql
  SELECT tablename, policyname FROM pg_policies
  WHERE cmd = 'DELETE' AND schemaname = 'public';
  ```
  This should return 0 rows.

### 8. Backup Strategy
- [ ] **Free plan**: Set up weekly manual backup script
  ```bash
  supabase db dump --project-ref <ref> > backup-$(date +%Y%m%d).sql
  ```
- [ ] **Pro plan** ($25/mo): Enable Point in Time Recovery (PITR)
- [ ] Store backups in a separate location (Google Drive, S3, private repo)

### 9. Monitoring
- [ ] Set up Vercel Analytics (free tier available)
- [ ] Enable Supabase Dashboard → Reports for database monitoring
- [ ] Set up error alerting (Vercel integrations or Sentry free tier)

## After Going Live

### Regular Maintenance
- [ ] Review pending user signups weekly
- [ ] Check audit logs for unusual activity monthly
- [ ] Run database backups on schedule
- [ ] Review Supabase usage/limits in dashboard

### If Something Goes Wrong
1. **Accidental data change**: Check audit log to see who/what/when, then fix
2. **Need to restore data**: Soft-deleted records are still in the database (deleted_at is set). A manager can write a SQL query to recover them.
3. **Database corruption**: Restore from backup (PITR on Pro, or manual SQL dump)
4. **Compromised account**: Suspend the user from Users page immediately. All their actions are in the audit log.
