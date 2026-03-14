-- DC Fine Foods Internal Dashboard - Database Schema
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- ============================================================
-- 1. PROFILES TABLE (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  role text not null default 'worker' check (role in ('worker', 'manager', 'stakeholder')),
  assigned_stage text default null,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Everyone can read profiles
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Managers can update any profile
create policy "Managers can update any profile"
  on public.profiles for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager'
    )
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'worker')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. RAW CASHEW INTAKE
-- ============================================================
create table public.raw_intake (
  id uuid default gen_random_uuid() primary key,
  batch_id text not null unique,
  weight_kg numeric not null check (weight_kg > 0),
  moisture_percent numeric not null check (moisture_percent >= 0 and moisture_percent <= 100),
  origin_farm text not null,
  date_received date not null default current_date,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.raw_intake enable row level security;

create policy "Authenticated users can view intake"
  on public.raw_intake for select to authenticated using (true);

create policy "Workers and managers can insert intake"
  on public.raw_intake for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('worker', 'manager')
    )
  );

create policy "Managers can update intake"
  on public.raw_intake for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager'
    )
  );

-- ============================================================
-- 3. SHELLING / PROCESSING
-- ============================================================
create table public.processing (
  id uuid default gen_random_uuid() primary key,
  batch_id text not null unique,
  intake_batch_id text references public.raw_intake(batch_id),
  input_weight_kg numeric not null check (input_weight_kg > 0),
  output_weight_kg numeric not null check (output_weight_kg > 0),
  date_processed date not null default current_date,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.processing enable row level security;

create policy "Authenticated users can view processing"
  on public.processing for select to authenticated using (true);

create policy "Workers and managers can insert processing"
  on public.processing for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('worker', 'manager')
    )
  );

create policy "Managers can update processing"
  on public.processing for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager'
    )
  );

-- ============================================================
-- 4. GRADING / SORTING
-- ============================================================
create table public.grading (
  id uuid default gen_random_uuid() primary key,
  batch_id text not null unique,
  processing_batch_id text references public.processing(batch_id),
  grade text not null check (grade in ('WW180', 'WW240', 'WW320', 'Roasted', 'Custom')),
  weight_kg numeric not null check (weight_kg > 0),
  reject_percent numeric not null default 0 check (reject_percent >= 0 and reject_percent <= 100),
  date_graded date not null default current_date,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.grading enable row level security;

create policy "Authenticated users can view grading"
  on public.grading for select to authenticated using (true);

create policy "Workers and managers can insert grading"
  on public.grading for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('worker', 'manager')
    )
  );

create policy "Managers can update grading"
  on public.grading for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager'
    )
  );

-- ============================================================
-- 5. QUALITY CHECK
-- ============================================================
create table public.quality_checks (
  id uuid default gen_random_uuid() primary key,
  batch_id text not null unique,
  grading_batch_id text references public.grading(batch_id),
  aflatoxin_ppb numeric not null default 0,
  moisture_percent numeric not null check (moisture_percent >= 0 and moisture_percent <= 100),
  broken_percent numeric not null default 0 check (broken_percent >= 0 and broken_percent <= 100),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  inspector_name text not null,
  date_checked date not null default current_date,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.quality_checks enable row level security;

create policy "Authenticated users can view quality checks"
  on public.quality_checks for select to authenticated using (true);

create policy "Workers and managers can insert quality checks"
  on public.quality_checks for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('worker', 'manager')
    )
  );

create policy "Managers can update quality checks"
  on public.quality_checks for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager'
    )
  );

-- ============================================================
-- 6. PACKAGING
-- ============================================================
create table public.packaging (
  id uuid default gen_random_uuid() primary key,
  batch_id text not null unique,
  quality_batch_id text references public.quality_checks(batch_id),
  bags_packed integer not null check (bags_packed > 0),
  net_weight_kg numeric not null check (net_weight_kg > 0),
  gross_weight_kg numeric not null check (gross_weight_kg > 0),
  packaging_type text not null default 'Standard Bag',
  date_packed date not null default current_date,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.packaging enable row level security;

create policy "Authenticated users can view packaging"
  on public.packaging for select to authenticated using (true);

create policy "Workers and managers can insert packaging"
  on public.packaging for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('worker', 'manager')
    )
  );

create policy "Managers can update packaging"
  on public.packaging for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager'
    )
  );

-- ============================================================
-- 7. WAREHOUSE STOCK
-- ============================================================
create table public.warehouse_stock (
  id uuid default gen_random_uuid() primary key,
  grade text not null check (grade in ('WW180', 'WW240', 'WW320', 'Roasted', 'Custom')),
  weight_kg numeric not null check (weight_kg >= 0),
  location text not null default 'Main Warehouse',
  best_before date,
  packaging_batch_id text references public.packaging(batch_id),
  updated_at timestamptz default now()
);

alter table public.warehouse_stock enable row level security;

create policy "Authenticated users can view stock"
  on public.warehouse_stock for select to authenticated using (true);

create policy "Workers and managers can insert stock"
  on public.warehouse_stock for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('worker', 'manager')
    )
  );

create policy "Managers can update stock"
  on public.warehouse_stock for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager'
    )
  );

-- ============================================================
-- 8. SHIPMENTS
-- ============================================================
create table public.shipments (
  id uuid default gen_random_uuid() primary key,
  customer_name text not null,
  destination text not null,
  container_number text,
  bill_of_lading text,
  departure_date date not null,
  arrival_date date,
  status text not null default 'preparing' check (status in ('preparing', 'packed', 'in_transit', 'delivered')),
  total_weight_kg numeric not null check (total_weight_kg > 0),
  grade text not null check (grade in ('WW180', 'WW240', 'WW320', 'Roasted', 'Custom')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.shipments enable row level security;

create policy "Authenticated users can view shipments"
  on public.shipments for select to authenticated using (true);

create policy "Workers and managers can insert shipments"
  on public.shipments for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('worker', 'manager')
    )
  );

create policy "Managers can update shipments"
  on public.shipments for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager'
    )
  );

-- ============================================================
-- 9. SEED DATA (optional - for demo purposes)
-- ============================================================
-- You can run this section to populate the dashboard with sample data

-- Sample intake records
insert into public.raw_intake (batch_id, weight_kg, moisture_percent, origin_farm, date_received, notes) values
  ('INT-2026-001', 5000, 8.5, 'Binh Phuoc Farm A', '2026-01-15', 'First batch of season'),
  ('INT-2026-002', 3200, 9.1, 'Dong Nai Farm B', '2026-01-22', null),
  ('INT-2026-003', 4500, 7.8, 'Binh Phuoc Farm C', '2026-02-01', 'Premium grade raw'),
  ('INT-2026-004', 6000, 8.2, 'Gia Lai Farm D', '2026-02-10', null),
  ('INT-2026-005', 3800, 9.5, 'Dak Lak Farm E', '2026-02-20', 'Slight higher moisture');

-- Sample processing records
insert into public.processing (batch_id, intake_batch_id, input_weight_kg, output_weight_kg, date_processed, notes) values
  ('PRC-2026-001', 'INT-2026-001', 5000, 1250, '2026-01-20', 'Standard yield'),
  ('PRC-2026-002', 'INT-2026-002', 3200, 832, '2026-01-28', null),
  ('PRC-2026-003', 'INT-2026-003', 4500, 1170, '2026-02-06', 'Good yield'),
  ('PRC-2026-004', 'INT-2026-004', 6000, 1440, '2026-02-15', null);

-- Sample grading records
insert into public.grading (batch_id, processing_batch_id, grade, weight_kg, reject_percent, date_graded) values
  ('GRD-2026-001', 'PRC-2026-001', 'WW240', 1100, 12.0, '2026-01-22'),
  ('GRD-2026-002', 'PRC-2026-002', 'WW320', 750, 9.8, '2026-01-30'),
  ('GRD-2026-003', 'PRC-2026-003', 'WW180', 1050, 10.2, '2026-02-08'),
  ('GRD-2026-004', 'PRC-2026-004', 'Roasted', 1300, 10.8, '2026-02-17');

-- Sample quality checks
insert into public.quality_checks (batch_id, grading_batch_id, aflatoxin_ppb, moisture_percent, broken_percent, status, inspector_name, date_checked) values
  ('QC-2026-001', 'GRD-2026-001', 2.1, 4.5, 3.2, 'approved', 'Nguyen Van A', '2026-01-23'),
  ('QC-2026-002', 'GRD-2026-002', 1.8, 5.0, 2.8, 'approved', 'Tran Thi B', '2026-01-31'),
  ('QC-2026-003', 'GRD-2026-003', 3.5, 4.2, 4.1, 'approved', 'Nguyen Van A', '2026-02-09'),
  ('QC-2026-004', 'GRD-2026-004', 1.2, 3.8, 2.0, 'pending', 'Tran Thi B', '2026-02-18');

-- Sample packaging
insert into public.packaging (batch_id, quality_batch_id, bags_packed, net_weight_kg, gross_weight_kg, packaging_type, date_packed) values
  ('PKG-2026-001', 'QC-2026-001', 44, 1100, 1144, 'Vacuum Sealed 25kg', '2026-01-25'),
  ('PKG-2026-002', 'QC-2026-002', 30, 750, 780, 'Standard Bag 25kg', '2026-02-02'),
  ('PKG-2026-003', 'QC-2026-003', 42, 1050, 1092, 'Vacuum Sealed 25kg', '2026-02-11');

-- Sample warehouse stock
insert into public.warehouse_stock (grade, weight_kg, location, best_before, packaging_batch_id) values
  ('WW240', 500, 'Main Warehouse - A1', '2027-01-25', 'PKG-2026-001'),
  ('WW320', 750, 'Main Warehouse - B2', '2027-02-02', 'PKG-2026-002'),
  ('WW180', 1050, 'Main Warehouse - A3', '2027-02-11', 'PKG-2026-003'),
  ('Roasted', 200, 'Main Warehouse - C1', '2026-08-15', null);

-- Sample shipments
insert into public.shipments (customer_name, destination, container_number, bill_of_lading, departure_date, arrival_date, status, total_weight_kg, grade) values
  ('Al Rashid Trading LLC', 'Dubai, UAE', 'MSKU-7234567', 'BL-2026-0042', '2026-01-28', '2026-02-15', 'delivered', 600, 'WW240'),
  ('Euro Nuts GmbH', 'Hamburg, Germany', 'CMAU-8345678', 'BL-2026-0058', '2026-02-18', null, 'in_transit', 500, 'WW180'),
  ('Snack Corp Asia', 'Singapore', null, null, '2026-03-01', null, 'preparing', 750, 'WW320');
