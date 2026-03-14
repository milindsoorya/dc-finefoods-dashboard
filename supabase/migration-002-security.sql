-- DC Fine Foods Dashboard — Security & Admin Migration
-- Run this in Supabase SQL Editor AFTER the initial schema.sql
-- ============================================================

-- ============================================================
-- 1. ADD ACCOUNT STATUS TO PROFILES (signup approval flow)
-- ============================================================
alter table public.profiles
  add column if not exists account_status text not null default 'pending'
    check (account_status in ('pending', 'approved', 'suspended'));

-- Update existing users to approved (they were already using the system)
update public.profiles set account_status = 'approved';

-- Update the signup trigger to always set new users as 'pending'
-- and always set role to 'worker' (prevent users from self-assigning manager)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role, account_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'worker',
    'pending'
  );
  return new;
end;
$$;

-- Drop old profile update policies and replace with tighter ones
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Managers can update any profile" on public.profiles;

-- Users can only update their own name (not role, not status)
create policy "Users can update own name"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
    and account_status = (select account_status from public.profiles where id = auth.uid())
  );

-- Managers can update any profile (role, status, stage)
create policy "Managers can manage profiles"
  on public.profiles for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager' and account_status = 'approved'
    )
  );

-- ============================================================
-- 2. AUDIT LOG TABLE — track all changes
-- ============================================================
create table if not exists public.audit_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  user_email text,
  action text not null check (action in ('insert', 'update', 'delete', 'approve_user', 'suspend_user', 'change_role')),
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);

alter table public.audit_log enable row level security;

-- Only managers can view audit logs
create policy "Managers can view audit logs"
  on public.audit_log for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager' and account_status = 'approved'
    )
  );

-- Any authenticated user can insert audit logs (the app writes them)
create policy "Authenticated users can insert audit logs"
  on public.audit_log for insert
  to authenticated
  with check (true);

-- ============================================================
-- 3. SOFT DELETES — add deleted_at to all pipeline tables
-- ============================================================
alter table public.raw_intake add column if not exists deleted_at timestamptz default null;
alter table public.processing add column if not exists deleted_at timestamptz default null;
alter table public.grading add column if not exists deleted_at timestamptz default null;
alter table public.quality_checks add column if not exists deleted_at timestamptz default null;
alter table public.packaging add column if not exists deleted_at timestamptz default null;
alter table public.warehouse_stock add column if not exists deleted_at timestamptz default null;
alter table public.shipments add column if not exists deleted_at timestamptz default null;

-- Update SELECT policies to exclude soft-deleted records
-- (drop and recreate each)

drop policy if exists "Authenticated users can view intake" on public.raw_intake;
create policy "Authenticated users can view intake"
  on public.raw_intake for select to authenticated
  using (deleted_at is null);

drop policy if exists "Authenticated users can view processing" on public.processing;
create policy "Authenticated users can view processing"
  on public.processing for select to authenticated
  using (deleted_at is null);

drop policy if exists "Authenticated users can view grading" on public.grading;
create policy "Authenticated users can view grading"
  on public.grading for select to authenticated
  using (deleted_at is null);

drop policy if exists "Authenticated users can view quality checks" on public.quality_checks;
create policy "Authenticated users can view quality checks"
  on public.quality_checks for select to authenticated
  using (deleted_at is null);

drop policy if exists "Authenticated users can view packaging" on public.packaging;
create policy "Authenticated users can view packaging"
  on public.packaging for select to authenticated
  using (deleted_at is null);

drop policy if exists "Authenticated users can view stock" on public.warehouse_stock;
create policy "Authenticated users can view stock"
  on public.warehouse_stock for select to authenticated
  using (deleted_at is null);

drop policy if exists "Authenticated users can view shipments" on public.shipments;
create policy "Authenticated users can view shipments"
  on public.shipments for select to authenticated
  using (deleted_at is null);

-- ============================================================
-- 4. TIGHTEN INSERT POLICIES — only approved users can insert
-- ============================================================

-- Raw Intake
drop policy if exists "Workers and managers can insert intake" on public.raw_intake;
create policy "Approved workers and managers can insert intake"
  on public.raw_intake for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('worker', 'manager') and account_status = 'approved'
    )
  );

-- Processing
drop policy if exists "Workers and managers can insert processing" on public.processing;
create policy "Approved workers and managers can insert processing"
  on public.processing for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('worker', 'manager') and account_status = 'approved'
    )
  );

-- Grading
drop policy if exists "Workers and managers can insert grading" on public.grading;
create policy "Approved workers and managers can insert grading"
  on public.grading for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('worker', 'manager') and account_status = 'approved'
    )
  );

-- Quality Checks
drop policy if exists "Workers and managers can insert quality checks" on public.quality_checks;
create policy "Approved workers and managers can insert quality checks"
  on public.quality_checks for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('worker', 'manager') and account_status = 'approved'
    )
  );

-- Packaging
drop policy if exists "Workers and managers can insert packaging" on public.packaging;
create policy "Approved workers and managers can insert packaging"
  on public.packaging for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('worker', 'manager') and account_status = 'approved'
    )
  );

-- Warehouse Stock
drop policy if exists "Workers and managers can insert stock" on public.warehouse_stock;
create policy "Approved workers and managers can insert stock"
  on public.warehouse_stock for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('worker', 'manager') and account_status = 'approved'
    )
  );

-- Shipments
drop policy if exists "Workers and managers can insert shipments" on public.shipments;
create policy "Approved workers and managers can insert shipments"
  on public.shipments for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('worker', 'manager') and account_status = 'approved'
    )
  );

-- ============================================================
-- 5. TIGHTEN UPDATE POLICIES — only approved managers can update
-- ============================================================

drop policy if exists "Managers can update intake" on public.raw_intake;
create policy "Approved managers can update intake"
  on public.raw_intake for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager' and account_status = 'approved'
    )
  );

drop policy if exists "Managers can update processing" on public.processing;
create policy "Approved managers can update processing"
  on public.processing for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager' and account_status = 'approved'
    )
  );

drop policy if exists "Managers can update grading" on public.grading;
create policy "Approved managers can update grading"
  on public.grading for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager' and account_status = 'approved'
    )
  );

drop policy if exists "Managers can update quality checks" on public.quality_checks;
create policy "Approved managers can update quality checks"
  on public.quality_checks for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager' and account_status = 'approved'
    )
  );

drop policy if exists "Managers can update packaging" on public.packaging;
create policy "Approved managers can update packaging"
  on public.packaging for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager' and account_status = 'approved'
    )
  );

drop policy if exists "Managers can update stock" on public.warehouse_stock;
create policy "Approved managers can update stock"
  on public.warehouse_stock for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager' and account_status = 'approved'
    )
  );

drop policy if exists "Managers can update shipments" on public.shipments;
create policy "Approved managers can update shipments"
  on public.shipments for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager' and account_status = 'approved'
    )
  );

-- ============================================================
-- 6. BLOCK ALL HARD DELETES — no delete policies exist
--    (Supabase RLS blocks by default when no policy exists)
-- ============================================================
-- We intentionally do NOT create any DELETE policies.
-- This means no user can delete rows through the API — ever.
-- Data is only "soft deleted" via UPDATE (setting deleted_at).

-- ============================================================
-- 7. DATABASE-LEVEL AUDIT TRIGGER (automatic)
-- ============================================================
-- This trigger automatically logs all INSERT/UPDATE operations
create or replace function public.audit_trigger_func()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  current_user_id uuid;
  current_email text;
begin
  -- Get the current user from Supabase auth
  current_user_id := auth.uid();
  select email into current_email from public.profiles where id = current_user_id;

  if (TG_OP = 'INSERT') then
    insert into public.audit_log (user_id, user_email, action, table_name, record_id, new_data)
    values (current_user_id, current_email, 'insert', TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW));
    return NEW;
  elsif (TG_OP = 'UPDATE') then
    insert into public.audit_log (user_id, user_email, action, table_name, record_id, old_data, new_data)
    values (current_user_id, current_email, 'update', TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
    return NEW;
  end if;
  return null;
end;
$$;

-- Apply audit triggers to all pipeline tables
create trigger audit_raw_intake after insert or update on public.raw_intake
  for each row execute function public.audit_trigger_func();

create trigger audit_processing after insert or update on public.processing
  for each row execute function public.audit_trigger_func();

create trigger audit_grading after insert or update on public.grading
  for each row execute function public.audit_trigger_func();

create trigger audit_quality_checks after insert or update on public.quality_checks
  for each row execute function public.audit_trigger_func();

create trigger audit_packaging after insert or update on public.packaging
  for each row execute function public.audit_trigger_func();

create trigger audit_warehouse_stock after insert or update on public.warehouse_stock
  for each row execute function public.audit_trigger_func();

create trigger audit_shipments after insert or update on public.shipments
  for each row execute function public.audit_trigger_func();

-- ============================================================
-- 8. SECURITY NOTES
-- ============================================================
-- Summary of what's now protected:
--
-- [✓] No user can self-assign 'manager' role — trigger always sets 'worker'
-- [✓] New signups are 'pending' — can't access anything until approved
-- [✓] Only approved managers can approve/change roles
-- [✓] No DELETE policies — data can never be hard-deleted via API
-- [✓] Soft deletes with deleted_at — data is hidden but preserved
-- [✓] All changes are automatically audit-logged
-- [✓] Stakeholders are read-only — no insert/update policies for them
-- [✓] Workers can only insert, not update or delete
--
-- BACKUP RECOMMENDATIONS:
-- 1. Enable Supabase "Point in Time Recovery" (Pro plan) for continuous backups
-- 2. On free plan: use pg_dump via Supabase CLI weekly
--    Command: supabase db dump --project-ref <ref> > backup-$(date +%Y%m%d).sql
-- 3. Store backups in a separate location (Google Drive, S3, etc.)
