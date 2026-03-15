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
import { Warehouse, Pencil, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useUserRole } from "@/contexts/user-role";
import type { WarehouseStock } from "@/types/database";

const PAGE_SIZE = 50;

const gradeOptions = [
  { value: "WW180", label: "WW180" },
  { value: "WW240", label: "WW240" },
  { value: "WW320", label: "WW320" },
  { value: "Roasted", label: "Roasted" },
  { value: "Custom", label: "Custom" },
];

export default function WarehousePage() {
  const [records, setRecords] = useState<WarehouseStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WarehouseStock | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const { role: userRole } = useUserRole();
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    setFetchError(null);
    const { data, error } = await supabase
      .from("warehouse_stock")
      .select("*")
      .order("updated_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      setFetchError(error.message);
    } else {
      setRecords((data as WarehouseStock[]) || []);
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

  function openEditForm(record: WarehouseStock) {
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
      grade: form.get("grade") as string,
      weight_kg: Number(form.get("weight_kg")),
      location: form.get("location") as string,
      best_before: (form.get("best_before") as string) || null,
      packaging_batch_id: (form.get("packaging_batch_id") as string) || null,
    };

    let error;
    if (editingRecord) {
      ({ error } = await supabase
        .from("warehouse_stock")
        .update(payload)
        .eq("id", editingRecord.id));
    } else {
      ({ error } = await supabase.from("warehouse_stock").insert(payload));
    }

    setSubmitting(false);
    if (error) {
      setSubmitError(error.message);
    } else {
      setShowForm(false);
      setEditingRecord(null);
      fetchData();
    }
  }

  const canEdit = userRole === "worker" || userRole === "manager";

  // Summary
  const totalStock = records.reduce((sum, r) => sum + Number(r.weight_kg), 0);
  const gradeBreakdown: Record<string, number> = {};
  records.forEach((r) => {
    gradeBreakdown[r.grade] = (gradeBreakdown[r.grade] || 0) + Number(r.weight_kg);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Stock"
        description="Current inventory levels by grade, location, and best-before dates"
        actionLabel="Add Stock Entry"
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

      {/* Summary Cards */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="text-center">
            <p className="text-sm text-muted-foreground">Total Stock</p>
            <p className="text-2xl font-bold">
              {totalStock >= 1000 ? `${(totalStock / 1000).toFixed(1)}t` : `${totalStock}kg`}
            </p>
          </Card>
          {Object.entries(gradeBreakdown).map(([grade, weight]) => (
            <Card key={grade} className="text-center">
              <p className="text-sm text-muted-foreground">{grade}</p>
              <p className="text-xl font-bold">
                {weight >= 1000 ? `${(weight / 1000).toFixed(1)}t` : `${weight}kg`}
              </p>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : records.length === 0 && page === 0 ? (
          <EmptyState
            icon={Warehouse}
            title="No stock records yet"
            description="Add warehouse stock entries after packaging."
            action={canEdit ? <Button onClick={openCreateForm} size="sm">Add Stock</Button> : undefined}
          />
        ) : (
          <>
          {/* Desktop Table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade</TableHead>
                  <TableHead>Weight (kg)</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Best Before</TableHead>
                  <TableHead>Pkg Batch</TableHead>
                  <TableHead>Updated</TableHead>
                  {canEdit && <TableHead className="w-10"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="default">{r.grade}</Badge></TableCell>
                    <TableCell className="font-medium">{Number(r.weight_kg).toLocaleString()}</TableCell>
                    <TableCell>{r.location}</TableCell>
                    <TableCell>{r.best_before ? formatDate(r.best_before) : "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{r.packaging_batch_id || "—"}</TableCell>
                    <TableCell>{formatDate(r.updated_at)}</TableCell>
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
              <div key={r.id} className="p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="default">{r.grade}</Badge>
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <Button size="sm" variant="ghost" onClick={() => openEditForm(r)} aria-label="Edit record" className="h-7 w-7 p-0">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <span className="font-medium text-sm">{Number(r.weight_kg).toLocaleString()} kg</span>
                  </div>
                </div>
                <p className="text-sm">{r.location}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Best before: {r.best_before ? formatDate(r.best_before) : "—"}</span>
                  <span>{formatDate(r.updated_at)}</span>
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
        title={editingRecord ? "Edit Stock Entry" : "Add Stock Entry"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div role="alert" className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] text-sm bg-red-50 text-red-800 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}
          <Select id="grade" name="grade" label="Grade" options={gradeOptions} defaultValue={editingRecord?.grade || "WW240"} />
          <Input id="weight_kg" name="weight_kg" label="Weight (kg)" type="number" min={1} defaultValue={editingRecord ? Number(editingRecord.weight_kg) : undefined} required />
          <Input id="location" name="location" label="Location" placeholder="Main Warehouse - A1" defaultValue={editingRecord?.location || "Main Warehouse"} required />
          <Input id="best_before" name="best_before" label="Best Before" type="date" defaultValue={editingRecord?.best_before || ""} />
          <Input id="packaging_batch_id" name="packaging_batch_id" label="Packaging Batch ID (optional)" placeholder="PKG-2026-001" defaultValue={editingRecord?.packaging_batch_id || ""} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingRecord(null); }}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : editingRecord ? "Update Entry" : "Save Entry"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
