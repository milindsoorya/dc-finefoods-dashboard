"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Ship, Pencil, AlertCircle, CheckCircle2, Truck, Package, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useUserRole } from "@/contexts/user-role";
import type { Shipment } from "@/types/database";

const PAGE_SIZE = 50;

const gradeOptions = [
  { value: "WW180", label: "WW180" },
  { value: "WW240", label: "WW240" },
  { value: "WW320", label: "WW320" },
  { value: "Roasted", label: "Roasted" },
  { value: "Custom", label: "Custom" },
];

const statusOptions = [
  { value: "preparing", label: "Preparing" },
  { value: "packed", label: "Packed" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
];

export default function ShipmentsPage() {
  const [records, setRecords] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Shipment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { role: userRole } = useUserRole();
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    setFetchError(null);
    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .order("departure_date", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      setFetchError(error.message);
    } else {
      setRecords((data as Shipment[]) || []);
    }
    setLoading(false);
  }, [supabase, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreateForm() {
    setEditingRecord(null);
    setSubmitError(null);
    setShowForm(true);
  }

  function openEditForm(record: Shipment) {
    setEditingRecord(record);
    setSubmitError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      customer_name: form.get("customer_name") as string,
      destination: form.get("destination") as string,
      container_number: (form.get("container_number") as string) || null,
      bill_of_lading: (form.get("bill_of_lading") as string) || null,
      departure_date: form.get("departure_date") as string,
      arrival_date: (form.get("arrival_date") as string) || null,
      status: form.get("status") as string,
      total_weight_kg: Number(form.get("total_weight_kg")),
      grade: form.get("grade") as string,
      notes: (form.get("notes") as string) || null,
    };

    let error;
    if (editingRecord) {
      ({ error } = await supabase
        .from("shipments")
        .update(payload)
        .eq("id", editingRecord.id));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      ({ error } = await supabase.from("shipments").insert({
        ...payload,
        created_by: user?.id,
      }));
    }

    setSubmitting(false);
    if (error) {
      setSubmitError(error.message);
    } else {
      setSuccessMessage(editingRecord ? "Shipment updated" : "Shipment saved");
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowForm(false);
      setEditingRecord(null);
      fetchData();
    }
  }

  const canEdit = userRole === "worker" || userRole === "manager";

  const statusVariant = (status: string) => {
    switch (status) {
      case "delivered": return "success" as const;
      case "in_transit": return "warning" as const;
      case "packed": return "default" as const;
      default: return "outline" as const;
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "delivered": return CheckCircle2;
      case "in_transit": return Truck;
      case "packed": return Package;
      default: return Clock;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipments"
        description="Track export shipments — customers, destinations, containers, and delivery status"
        actionLabel="Add Shipment"
        onAction={openCreateForm}
        canEdit={canEdit}
      />

      {fetchError && (
        <div role="alert" className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius)] text-sm font-medium bg-red-50 text-red-800 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load data: {fetchError}
          <Button size="sm" variant="outline" className="ml-auto" onClick={fetchData}>Retry</Button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius)] text-sm font-medium bg-green-50 text-green-800 border border-green-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : records.length === 0 && page === 0 ? (
          <EmptyState
            icon={Ship}
            title="No shipments yet"
            description="Create shipment records for export orders."
            action={canEdit ? <Button onClick={openCreateForm} size="sm">Add Shipment</Button> : undefined}
          />
        ) : (
          <>
          {/* Desktop Table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Weight (kg)</TableHead>
                  <TableHead>Container</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Departure</TableHead>
                  {canEdit && <TableHead className="w-10"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.customer_name}</TableCell>
                    <TableCell>{r.destination}</TableCell>
                    <TableCell><Badge variant="outline">{r.grade}</Badge></TableCell>
                    <TableCell>{Number(r.total_weight_kg).toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs">{r.container_number || "—"}</TableCell>
                    <TableCell><Badge variant={statusVariant(r.status)} icon={statusIcon(r.status)}>{r.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>{formatDate(r.departure_date)}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => openEditForm(r)} aria-label="Edit record">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden divide-y divide-border">
            {records.map((r) => (
              <div key={r.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{r.customer_name}</span>
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <Button size="sm" variant="ghost" onClick={() => openEditForm(r)} aria-label="Edit record" className="h-7 w-7 p-0">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Badge variant={statusVariant(r.status)} icon={statusIcon(r.status)}>{r.status.replace("_", " ")}</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{r.destination}</p>
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="outline">{r.grade}</Badge>
                  <span>{Number(r.total_weight_kg).toLocaleString()} kg</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{r.container_number || "No container"}</span>
                  <span>{formatDate(r.departure_date)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-t border-border">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page + 1}</span>
            <Button size="sm" variant="outline" disabled={records.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
          </>
        )}
      </Card>

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingRecord(null); }}
        title={editingRecord ? "Edit Shipment" : "Create Shipment"}
        className="sm:max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div role="alert" className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] text-sm bg-red-50 text-red-800 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}
          <Input id="customer_name" name="customer_name" label="Customer Name" placeholder="Al Rashid Trading LLC" defaultValue={editingRecord?.customer_name} required />
          <Input id="destination" name="destination" label="Destination" placeholder="Dubai, UAE" defaultValue={editingRecord?.destination} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select id="grade" name="grade" label="Grade" options={gradeOptions} defaultValue={editingRecord?.grade || "WW240"} />
            <Input id="total_weight_kg" name="total_weight_kg" label="Total Weight (kg)" type="number" min={1} defaultValue={editingRecord ? Number(editingRecord.total_weight_kg) : undefined} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="container_number" name="container_number" label="Container #" placeholder="MSKU-7234567" defaultValue={editingRecord?.container_number || ""} />
            <Input id="bill_of_lading" name="bill_of_lading" label="Bill of Lading" placeholder="BL-2026-0042" defaultValue={editingRecord?.bill_of_lading || ""} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="departure_date" name="departure_date" label="Departure Date" type="date" defaultValue={editingRecord?.departure_date} required />
            <Input id="arrival_date" name="arrival_date" label="Est. Arrival" type="date" defaultValue={editingRecord?.arrival_date || ""} />
          </div>
          <Select
            id="status"
            name="status"
            label="Status"
            options={statusOptions}
            defaultValue={editingRecord?.status || "preparing"}
          />
          <Input id="notes" name="notes" label="Notes (optional)" defaultValue={editingRecord?.notes || ""} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingRecord(null); }}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : editingRecord ? "Update Shipment" : "Save Shipment"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
