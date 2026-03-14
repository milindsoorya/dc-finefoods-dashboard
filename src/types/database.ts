export type UserRole = "worker" | "manager" | "stakeholder";

export type CashewGrade = "WW180" | "WW240" | "WW320" | "Roasted" | "Custom";

export type ShipmentStatus =
  | "preparing"
  | "packed"
  | "in_transit"
  | "delivered";

export type QualityStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  assigned_stage: string | null;
  created_at: string;
}

export interface RawIntake {
  id: string;
  batch_id: string;
  weight_kg: number;
  moisture_percent: number;
  origin_farm: string;
  date_received: string;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface Processing {
  id: string;
  batch_id: string;
  intake_batch_id: string;
  input_weight_kg: number;
  output_weight_kg: number;
  date_processed: string;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface Grading {
  id: string;
  batch_id: string;
  processing_batch_id: string;
  grade: CashewGrade;
  weight_kg: number;
  reject_percent: number;
  date_graded: string;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface QualityCheck {
  id: string;
  batch_id: string;
  grading_batch_id: string;
  aflatoxin_ppb: number;
  moisture_percent: number;
  broken_percent: number;
  status: QualityStatus;
  inspector_name: string;
  date_checked: string;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface Packaging {
  id: string;
  batch_id: string;
  quality_batch_id: string;
  bags_packed: number;
  net_weight_kg: number;
  gross_weight_kg: number;
  packaging_type: string;
  date_packed: string;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface WarehouseStock {
  id: string;
  grade: CashewGrade;
  weight_kg: number;
  location: string;
  best_before: string;
  packaging_batch_id: string | null;
  updated_at: string;
}

export interface Shipment {
  id: string;
  customer_name: string;
  destination: string;
  container_number: string;
  bill_of_lading: string;
  departure_date: string;
  arrival_date: string | null;
  status: ShipmentStatus;
  total_weight_kg: number;
  grade: CashewGrade;
  notes: string | null;
  created_by: string;
  created_at: string;
}
