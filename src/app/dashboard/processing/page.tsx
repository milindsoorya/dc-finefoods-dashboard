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
import { TableSkeleton } from "@/components/ui/skeleton";
import { Cog, Pencil, AlertCircle, CheckCircle2, Hash } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useUserRole } from "@/contexts/user-role";
import type { Processing } from "@/types/database";

const PAGE_SIZE = 50;

export default function ProcessingPage() {
  const [records, setRecords] = useState<Processing[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Processing | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { role: userRole } = useUserRole();
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    setFetchError(null);
    const { data, error } = await supabase
      .from("processing")
      .select("*")
      .order("date_processed", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      setFetchError(error.message);
    } else {
      setRecords((data as Processing[]) || []);
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

  function openEditForm(record: Processing) {
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
      intake_batch_id: form.get("intake_batch_id") as string,
      input_weight_kg: Number(form.get("input_weight_kg")),
      output_weight_kg: Number(form.get("output_weight_kg")),
      date_processed: form.get("date_processed") as string,
      notes: (form.get("notes") as string) || null,
    };

    let error;
    if (editingRecord) {
      ({ error } = await supabase
        .from("processing")
        .update(payload)
        .eq("id", editingRecord.id));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      ({ error } = await supabase.from("processing").insert({
        ...payload,
        created_by: user?.id,
      }));
    }

    setSubmitting(false);
    if (error) {
      setSubmitError(error.message);
    } else {
      setSuccessMessage(editingRecord ? "Record updated" : "Record saved");
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowForm(false);
      setEditingRecord(null);
      fetchData();
    }
  }

  const canEdit = userRole === "worker" || userRole === "manager";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shelling & Processing"
        description="Track shelling input vs output weights and yield rates"
        actionLabel="Add Processing"
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
          <TableSkeleton rows={5} cols={6} />
        ) : records.length === 0 && page === 0 ? (
          <EmptyState
            icon={Cog}
            title="No processing records yet"
            description="Record your first shelling/processing batch."
            action={canEdit ? <Button onClick={openCreateForm} size="sm">Add Processing</Button> : undefined}
          />
        ) : (
          <>
          {/* Desktop Table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Intake Batch</TableHead>
                  <TableHead>Input (kg)</TableHead>
                  <TableHead>Output (kg)</TableHead>
                  <TableHead>Yield</TableHead>
                  <TableHead>Date</TableHead>
                  {canEdit && <TableHead className="w-10"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => {
                  const yieldPct = ((Number(r.output_weight_kg) / Number(r.input_weight_kg)) * 100).toFixed(1);
                  return (
                    <TableRow key={r.id}>
                      <TableCell><Badge variant="outline" icon={Hash}>{r.batch_id}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{r.intake_batch_id}</TableCell>
                      <TableCell>{Number(r.input_weight_kg).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{Number(r.output_weight_kg).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={Number(yieldPct) >= 25 ? "success" : "warning"}>{yieldPct}%</Badge>
                      </TableCell>
                      <TableCell>{formatDate(r.date_processed)}</TableCell>
                      {canEdit && (
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => openEditForm(r)} aria-label="Edit record">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden divide-y divide-border">
            {records.map((r) => {
              const yieldPct = ((Number(r.output_weight_kg) / Number(r.input_weight_kg)) * 100).toFixed(1);
              return (
                <div key={r.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" icon={Hash}>{r.batch_id}</Badge>
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <Button size="sm" variant="ghost" onClick={() => openEditForm(r)} aria-label="Edit record" className="h-7 w-7 p-0">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Badge variant={Number(yieldPct) >= 25 ? "success" : "warning"}>{yieldPct}% yield</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">From: {r.intake_batch_id}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span><span className="text-muted-foreground">In:</span> {Number(r.input_weight_kg).toLocaleString()} kg</span>
                    <span><span className="text-muted-foreground">Out:</span> <span className="font-medium">{Number(r.output_weight_kg).toLocaleString()} kg</span></span>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(r.date_processed)}</p>
                </div>
              );
            })}
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
        title={editingRecord ? "Edit Processing Record" : "Record Processing Batch"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div role="alert" className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] text-sm bg-red-50 text-red-800 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}
          <Input id="batch_id" name="batch_id" label="Batch ID" placeholder="PRC-2026-005" defaultValue={editingRecord?.batch_id} required />
          <Input id="intake_batch_id" name="intake_batch_id" label="Intake Batch ID" placeholder="INT-2026-001" defaultValue={editingRecord?.intake_batch_id} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="input_weight_kg" name="input_weight_kg" label="Input Weight (kg)" type="number" min={1} defaultValue={editingRecord ? Number(editingRecord.input_weight_kg) : undefined} required />
            <Input id="output_weight_kg" name="output_weight_kg" label="Output Weight (kg)" type="number" min={1} defaultValue={editingRecord ? Number(editingRecord.output_weight_kg) : undefined} required />
          </div>
          <Input id="date_processed" name="date_processed" label="Date Processed" type="date" defaultValue={editingRecord?.date_processed || new Date().toISOString().split("T")[0]} required />
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
