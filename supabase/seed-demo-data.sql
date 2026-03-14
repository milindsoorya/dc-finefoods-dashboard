-- DC Fine Foods — Demo Seed Data
-- Run this in Supabase SQL Editor to populate with realistic sample data
-- This is safe to run on a dev/demo database (NOT production)
-- ============================================================

-- ============================================================
-- 1. SAMPLE USERS (create auth users + profiles)
-- ============================================================
-- Note: You can't easily insert into auth.users via SQL.
-- Instead, create these users via the Supabase Auth dashboard:
--   1. Go to Authentication → Users → Add User
--   2. Create the following demo users with password "demo1234":
--      - admin@dcfinefoods.net (then set role=manager, account_status=approved below)
--      - nguyen@dcfinefoods.net (worker, approved)
--      - tran@dcfinefoods.net (worker, approved)
--      - investor@dcfinefoods.net (stakeholder, approved)
--      - newguy@dcfinefoods.net (worker, pending — to demo approval flow)

-- After creating users in Auth, update their profiles:
-- UPDATE public.profiles SET role = 'manager', account_status = 'approved', full_name = 'Admin DC' WHERE email = 'admin@dcfinefoods.net';
-- UPDATE public.profiles SET role = 'worker', account_status = 'approved', full_name = 'Nguyen Van A', assigned_stage = 'intake' WHERE email = 'nguyen@dcfinefoods.net';
-- UPDATE public.profiles SET role = 'worker', account_status = 'approved', full_name = 'Tran Thi B', assigned_stage = 'quality' WHERE email = 'tran@dcfinefoods.net';
-- UPDATE public.profiles SET role = 'stakeholder', account_status = 'approved', full_name = 'David Chen' WHERE email = 'investor@dcfinefoods.net';
-- UPDATE public.profiles SET role = 'worker', account_status = 'pending', full_name = 'Le Van C' WHERE email = 'newguy@dcfinefoods.net';

-- ============================================================
-- 2. PIPELINE DATA (if not already seeded from schema.sql)
-- ============================================================
-- Check if data already exists before inserting
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.raw_intake WHERE batch_id = 'INT-2026-001') THEN

    -- Raw Intake
    INSERT INTO public.raw_intake (batch_id, weight_kg, moisture_percent, origin_farm, date_received, notes) VALUES
      ('INT-2026-001', 5000, 8.5, 'Binh Phuoc Farm A', '2026-01-15', 'First batch of season'),
      ('INT-2026-002', 3200, 9.1, 'Dong Nai Farm B', '2026-01-22', NULL),
      ('INT-2026-003', 4500, 7.8, 'Binh Phuoc Farm C', '2026-02-01', 'Premium grade raw'),
      ('INT-2026-004', 6000, 8.2, 'Gia Lai Farm D', '2026-02-10', NULL),
      ('INT-2026-005', 3800, 9.5, 'Dak Lak Farm E', '2026-02-20', 'Slightly higher moisture'),
      ('INT-2026-006', 4200, 8.0, 'Binh Phuoc Farm A', '2026-03-01', 'Second delivery from Farm A'),
      ('INT-2026-007', 5500, 7.5, 'Lam Dong Farm F', '2026-03-05', 'Excellent quality'),
      ('INT-2026-008', 2800, 10.2, 'Dak Nong Farm G', '2026-03-10', 'Needs extra drying');

    -- Processing
    INSERT INTO public.processing (batch_id, intake_batch_id, input_weight_kg, output_weight_kg, date_processed, notes) VALUES
      ('PRC-2026-001', 'INT-2026-001', 5000, 1250, '2026-01-20', 'Standard yield'),
      ('PRC-2026-002', 'INT-2026-002', 3200, 832, '2026-01-28', NULL),
      ('PRC-2026-003', 'INT-2026-003', 4500, 1170, '2026-02-06', 'Good yield'),
      ('PRC-2026-004', 'INT-2026-004', 6000, 1440, '2026-02-15', NULL),
      ('PRC-2026-005', 'INT-2026-005', 3800, 912, '2026-02-25', 'Lower yield due to moisture'),
      ('PRC-2026-006', 'INT-2026-006', 4200, 1092, '2026-03-05', NULL),
      ('PRC-2026-007', 'INT-2026-007', 5500, 1485, '2026-03-10', 'Best yield this quarter');

    -- Grading
    INSERT INTO public.grading (batch_id, processing_batch_id, grade, weight_kg, reject_percent, date_graded) VALUES
      ('GRD-2026-001', 'PRC-2026-001', 'WW240', 1100, 12.0, '2026-01-22'),
      ('GRD-2026-002', 'PRC-2026-002', 'WW320', 750, 9.8, '2026-01-30'),
      ('GRD-2026-003', 'PRC-2026-003', 'WW180', 1050, 10.2, '2026-02-08'),
      ('GRD-2026-004', 'PRC-2026-004', 'Roasted', 1300, 10.8, '2026-02-17'),
      ('GRD-2026-005', 'PRC-2026-005', 'WW320', 820, 10.1, '2026-02-27'),
      ('GRD-2026-006', 'PRC-2026-006', 'WW240', 985, 9.8, '2026-03-07'),
      ('GRD-2026-007', 'PRC-2026-007', 'WW180', 1340, 9.7, '2026-03-12');

    -- Quality Checks
    INSERT INTO public.quality_checks (batch_id, grading_batch_id, aflatoxin_ppb, moisture_percent, broken_percent, status, inspector_name, date_checked) VALUES
      ('QC-2026-001', 'GRD-2026-001', 2.1, 4.5, 3.2, 'approved', 'Nguyen Van A', '2026-01-23'),
      ('QC-2026-002', 'GRD-2026-002', 1.8, 5.0, 2.8, 'approved', 'Tran Thi B', '2026-01-31'),
      ('QC-2026-003', 'GRD-2026-003', 3.5, 4.2, 4.1, 'approved', 'Nguyen Van A', '2026-02-09'),
      ('QC-2026-004', 'GRD-2026-004', 1.2, 3.8, 2.0, 'approved', 'Tran Thi B', '2026-02-18'),
      ('QC-2026-005', 'GRD-2026-005', 4.2, 5.3, 3.5, 'rejected', 'Nguyen Van A', '2026-02-28'),
      ('QC-2026-006', 'GRD-2026-006', 1.9, 4.1, 2.5, 'approved', 'Tran Thi B', '2026-03-08'),
      ('QC-2026-007', 'GRD-2026-007', 2.3, 3.9, 2.1, 'pending', 'Nguyen Van A', '2026-03-13');

    -- Packaging
    INSERT INTO public.packaging (batch_id, quality_batch_id, bags_packed, net_weight_kg, gross_weight_kg, packaging_type, date_packed) VALUES
      ('PKG-2026-001', 'QC-2026-001', 44, 1100, 1144, 'Vacuum Sealed 25kg', '2026-01-25'),
      ('PKG-2026-002', 'QC-2026-002', 30, 750, 780, 'Standard Bag 25kg', '2026-02-02'),
      ('PKG-2026-003', 'QC-2026-003', 42, 1050, 1092, 'Vacuum Sealed 25kg', '2026-02-11'),
      ('PKG-2026-004', 'QC-2026-004', 52, 1300, 1352, 'Vacuum Sealed 25kg', '2026-02-20'),
      ('PKG-2026-005', 'QC-2026-006', 40, 985, 1025, 'Standard Bag 25kg', '2026-03-10');

    -- Warehouse Stock
    INSERT INTO public.warehouse_stock (grade, weight_kg, location, best_before, packaging_batch_id) VALUES
      ('WW240', 500, 'Main Warehouse - A1', '2027-01-25', 'PKG-2026-001'),
      ('WW320', 750, 'Main Warehouse - B2', '2027-02-02', 'PKG-2026-002'),
      ('WW180', 1050, 'Main Warehouse - A3', '2027-02-11', 'PKG-2026-003'),
      ('Roasted', 800, 'Main Warehouse - C1', '2026-08-15', 'PKG-2026-004'),
      ('WW240', 985, 'Main Warehouse - A4', '2027-03-10', 'PKG-2026-005'),
      ('WW180', 350, 'Cold Storage - D1', '2027-01-15', NULL),
      ('Roasted', 200, 'Main Warehouse - C2', '2026-09-01', NULL);

    -- Shipments
    INSERT INTO public.shipments (customer_name, destination, container_number, bill_of_lading, departure_date, arrival_date, status, total_weight_kg, grade, notes) VALUES
      ('Al Rashid Trading LLC', 'Dubai, UAE', 'MSKU-7234567', 'BL-2026-0042', '2026-01-28', '2026-02-15', 'delivered', 600, 'WW240', 'Repeat customer — 3rd order'),
      ('Euro Nuts GmbH', 'Hamburg, Germany', 'CMAU-8345678', 'BL-2026-0058', '2026-02-18', '2026-03-08', 'delivered', 500, 'WW180', NULL),
      ('Snack Corp Asia', 'Singapore', 'HLCU-9456789', 'BL-2026-0071', '2026-03-01', NULL, 'in_transit', 750, 'WW320', 'ETA March 15'),
      ('Dubai Dry Fruits Co', 'Dubai, UAE', NULL, NULL, '2026-03-20', NULL, 'preparing', 800, 'Roasted', 'New customer'),
      ('London Nuts Ltd', 'London, UK', NULL, NULL, '2026-04-01', NULL, 'preparing', 1000, 'WW180', 'First order — samples approved');

  END IF;
END $$;

-- ============================================================
-- 3. MOCK AUDIT LOGS
-- ============================================================
-- These simulate realistic activity history
INSERT INTO public.audit_log (user_email, action, table_name, record_id, old_data, new_data, created_at) VALUES
  ('admin@dcfinefoods.net', 'insert', 'raw_intake', 'INT-2026-001', NULL, '{"batch_id": "INT-2026-001", "weight_kg": 5000, "origin_farm": "Binh Phuoc Farm A"}', '2026-01-15 08:30:00+07'),
  ('nguyen@dcfinefoods.net', 'insert', 'raw_intake', 'INT-2026-002', NULL, '{"batch_id": "INT-2026-002", "weight_kg": 3200, "origin_farm": "Dong Nai Farm B"}', '2026-01-22 09:15:00+07'),
  ('admin@dcfinefoods.net', 'insert', 'processing', 'PRC-2026-001', NULL, '{"batch_id": "PRC-2026-001", "input_weight_kg": 5000, "output_weight_kg": 1250}', '2026-01-20 14:00:00+07'),
  ('nguyen@dcfinefoods.net', 'insert', 'processing', 'PRC-2026-002', NULL, '{"batch_id": "PRC-2026-002", "input_weight_kg": 3200, "output_weight_kg": 832}', '2026-01-28 10:30:00+07'),
  ('tran@dcfinefoods.net', 'insert', 'quality_checks', 'QC-2026-001', NULL, '{"batch_id": "QC-2026-001", "aflatoxin_ppb": 2.1, "status": "pending"}', '2026-01-23 11:00:00+07'),
  ('admin@dcfinefoods.net', 'update', 'quality_checks', 'QC-2026-001', '{"status": "pending"}', '{"status": "approved"}', '2026-01-23 14:30:00+07'),
  ('tran@dcfinefoods.net', 'insert', 'quality_checks', 'QC-2026-002', NULL, '{"batch_id": "QC-2026-002", "aflatoxin_ppb": 1.8, "status": "pending"}', '2026-01-31 09:00:00+07'),
  ('admin@dcfinefoods.net', 'update', 'quality_checks', 'QC-2026-002', '{"status": "pending"}', '{"status": "approved"}', '2026-01-31 11:00:00+07'),
  ('admin@dcfinefoods.net', 'approve_user', 'profiles', 'nguyen-user-id', NULL, '{"email": "nguyen@dcfinefoods.net", "account_status": "approved"}', '2026-01-10 08:00:00+07'),
  ('admin@dcfinefoods.net', 'approve_user', 'profiles', 'tran-user-id', NULL, '{"email": "tran@dcfinefoods.net", "account_status": "approved"}', '2026-01-10 08:05:00+07'),
  ('admin@dcfinefoods.net', 'change_role', 'profiles', 'tran-user-id', '{"role": "worker"}', '{"role": "worker", "assigned_stage": "quality"}', '2026-01-12 09:00:00+07'),
  ('admin@dcfinefoods.net', 'approve_user', 'profiles', 'investor-user-id', NULL, '{"email": "investor@dcfinefoods.net", "account_status": "approved", "role": "stakeholder"}', '2026-01-15 10:00:00+07'),
  ('admin@dcfinefoods.net', 'change_role', 'profiles', 'investor-user-id', '{"role": "worker"}', '{"role": "stakeholder"}', '2026-01-15 10:05:00+07'),
  ('nguyen@dcfinefoods.net', 'insert', 'raw_intake', 'INT-2026-003', NULL, '{"batch_id": "INT-2026-003", "weight_kg": 4500, "origin_farm": "Binh Phuoc Farm C"}', '2026-02-01 07:45:00+07'),
  ('admin@dcfinefoods.net', 'insert', 'grading', 'GRD-2026-001', NULL, '{"batch_id": "GRD-2026-001", "grade": "WW240", "weight_kg": 1100}', '2026-01-22 15:00:00+07'),
  ('admin@dcfinefoods.net', 'insert', 'packaging', 'PKG-2026-001', NULL, '{"batch_id": "PKG-2026-001", "bags_packed": 44, "net_weight_kg": 1100}', '2026-01-25 16:00:00+07'),
  ('admin@dcfinefoods.net', 'insert', 'shipments', 'shipment-dubai-01', NULL, '{"customer_name": "Al Rashid Trading LLC", "destination": "Dubai, UAE", "total_weight_kg": 600}', '2026-01-26 09:00:00+07'),
  ('admin@dcfinefoods.net', 'update', 'shipments', 'shipment-dubai-01', '{"status": "preparing"}', '{"status": "packed"}', '2026-01-27 14:00:00+07'),
  ('admin@dcfinefoods.net', 'update', 'shipments', 'shipment-dubai-01', '{"status": "packed"}', '{"status": "in_transit"}', '2026-01-28 08:00:00+07'),
  ('admin@dcfinefoods.net', 'update', 'shipments', 'shipment-dubai-01', '{"status": "in_transit"}', '{"status": "delivered"}', '2026-02-15 16:00:00+07'),
  ('tran@dcfinefoods.net', 'insert', 'quality_checks', 'QC-2026-005', NULL, '{"batch_id": "QC-2026-005", "aflatoxin_ppb": 4.2, "status": "pending"}', '2026-02-28 10:00:00+07'),
  ('admin@dcfinefoods.net', 'update', 'quality_checks', 'QC-2026-005', '{"status": "pending"}', '{"status": "rejected", "notes": "Aflatoxin too high — reroute for re-processing"}', '2026-02-28 14:00:00+07'),
  ('nguyen@dcfinefoods.net', 'insert', 'raw_intake', 'INT-2026-007', NULL, '{"batch_id": "INT-2026-007", "weight_kg": 5500, "origin_farm": "Lam Dong Farm F"}', '2026-03-05 08:00:00+07'),
  ('nguyen@dcfinefoods.net', 'insert', 'raw_intake', 'INT-2026-008', NULL, '{"batch_id": "INT-2026-008", "weight_kg": 2800, "origin_farm": "Dak Nong Farm G", "notes": "Needs extra drying"}', '2026-03-10 07:30:00+07'),
  ('admin@dcfinefoods.net', 'insert', 'shipments', 'shipment-london-01', NULL, '{"customer_name": "London Nuts Ltd", "destination": "London, UK", "total_weight_kg": 1000, "notes": "First order"}', '2026-03-12 09:00:00+07');
