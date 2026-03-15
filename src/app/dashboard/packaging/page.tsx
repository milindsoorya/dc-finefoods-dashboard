"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Package, Pencil, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useUserRole } from "@/contexts/user-role";
import type { Packaging } from "@/types/database";

const PAGE_SIZE = 50;

export default function PackagingPage() {
  const [records, setRecords] = useState<Packaging[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Packaging | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const { role: userRole } = useUserRole();
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    setFetchError(null);
    const { data, error } = await supabase
      .from("packaging")
      .select("*")
      .order("date_packed", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      setFetchError(error.message);
    } else {
      setRecords((data as Packaging[]) || []);
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

  function openEditForm(record: Packaging) {
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
      batch_id: form.get("batch_id") as string,
      quality_batch_id: form.get("quality_batch_id") as string,
      bags_packed: Number(form.get("bags_packed")),
      net_weight_kg: Number(form.get("net_weight_kg")),
      gross_weight_kg: Number(form.get("gross_weight_kg")),
      packaging_type: form.get("packaging_type") as string,
      date_packed: form.get("date_packed") as string,
      notes: (form.get("notes") as string) || null,
    };

    let error;
    if (editingRecord) {
      ({ error } = await supabase
        .from("packaging")
        .update(payload)
        .eq("id", editingRecord.id));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      ({ error } = await supabase.from("packaging").insert({
        ...payload,
        created_by: user?.id,
      }));
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Packaging"
        description="Track bags packed, weights, and packaging types"
        actionLabel="Add Packaging"
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

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : records.length === 0 && page === 0 ? (
          <EmptyState
            icon={Package}
            title="No packaging records yet"
            description="Record packaging details after quality approval."
            action={canEdit ? <Button onClick={openCreateForm} size="sm">Add Packaging</Button> : undefined}
          />
        ) : (
          <>
          {/* Desktop Table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>QC Batch</TableHead>
                  <TableHead>Bags</TableHead>
                  <TableHead>Net (kg)</TableHead>
                  <TableHead>Gross (kg)</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  {canEdit && <TableHead className="w-10"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.batch_id}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{r.quality_batch_id}</TableCell>
                    <TableCell className="font-medium">{r.bags_packed}</TableCell>
                    <TableCell>{Number(r.net_weight_kg).toLocaleString()}</TableCell>
                    <TableCell>{Number(r.gross_weight_kg).toLocaleString()}</TableCell>
                    <TableCell>{r.packaging_type}</TableCell>
                    <TableCell>{formatDate(r.date_packed)}</TableCell>
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
                  <Badge variant="outline">{r.batch_id}</Badge>
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <Button size="sm" variant="ghost" onClick={() => openEditForm(r)} aria-label="Edit record" className="h-7 w-7 p-0">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <span className="text-xs text-muted-foreground">{formatDate(r.date_packed)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">QC: {r.quality_batch_id}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span><span className="text-muted-foreground">Bags:</span> <span className="font-medium">{r.bags_packed}</span></span>
                  <span><span className="text-muted-foreground">Net:</span> {Number(r.net_weight_kg).toLocaleString()} kg</span>
                  <span><span className="text-muted-foreground">Gross:</span> {Number(r.gross_weight_kg).toLocaleString()} kg</span>
                </div>
                <p className="text-xs text-muted-foreground">{r.packaging_type}</p>
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
        title={editingRecord ? "Edit Packaging Record" : "Record Packaging"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div role="alert" className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] text-sm bg-red-50 text-red-800 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}
          <Input id="batch_id" name="batch_id" label="Batch ID" placeholder="PKG-2026-004" defaultValue={editingRecord?.batch_id} required />
          <Input id="quality_batch_id" name="quality_batch_id" label="QC Batch ID" placeholder="QC-2026-001" defaultValue={editingRecord?.quality_batch_id} required />
          <Input id="bags_packed" name="bags_packed" label="Bags Packed" type="number" min={1} defaultValue={editingRecord ? Number(editingRecord.bags_packed) : undefined} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="net_weight_kg" name="net_weight_kg" label="Net Weight (kg)" type="number" min={1} defaultValue={editingRecord ? Number(editingRecord.net_weight_kg) : undefined} required />
            <Input id="gross_weight_kg" name="gross_weight_kg" label="Gross Weight (kg)" type="number" min={1} defaultValue={editingRecord ? Number(editingRecord.gross_weight_kg) : undefined} required />
          </div>
          <Input id="packaging_type" name="packaging_type" label="Packaging Type" placeholder="Vacuum Sealed 25kg" defaultValue={editingRecord?.packaging_type || "Standard Bag 25kg"} required />
          <Input id="date_packed" name="date_packed" label="Date Packed" type="date" defaultValue={editingRecord?.date_packed || new Date().toISOString().split("T")[0]} required />
          <Input id="notes" name="notes" label="Notes (optional)" defaultValue={editingRecord?.notes || ""} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingRecord(null); }}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : editingRecord ? "Update Record" : "Save Record"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
