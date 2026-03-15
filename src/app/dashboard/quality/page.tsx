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
import { ShieldCheck, Pencil, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useUserRole } from "@/contexts/user-role";
import type { QualityCheck } from "@/types/database";

const PAGE_SIZE = 50;

export default function QualityPage() {
  const [records, setRecords] = useState<QualityCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<QualityCheck | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const { role: userRole } = useUserRole();
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    setFetchError(null);
    const { data, error } = await supabase
      .from("quality_checks")
      .select("*")
      .order("date_checked", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      setFetchError(error.message);
    } else {
      setRecords((data as QualityCheck[]) || []);
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

  function openEditForm(record: QualityCheck) {
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
      grading_batch_id: form.get("grading_batch_id") as string,
      aflatoxin_ppb: Number(form.get("aflatoxin_ppb")),
      moisture_percent: Number(form.get("moisture_percent")),
      broken_percent: Number(form.get("broken_percent")),
      status: form.get("status") as string,
      inspector_name: form.get("inspector_name") as string,
      date_checked: form.get("date_checked") as string,
      notes: (form.get("notes") as string) || null,
    };

    let error;
    if (editingRecord) {
      ({ error } = await supabase
        .from("quality_checks")
        .update(payload)
        .eq("id", editingRecord.id));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      ({ error } = await supabase.from("quality_checks").insert({
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

  const statusVariant = (status: string) => {
    switch (status) {
      case "approved": return "success" as const;
      case "rejected": return "destructive" as const;
      default: return "warning" as const;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality Check"
        description="Aflatoxin testing, moisture checks, broken percentage, approval status"
        actionLabel="Add QC Record"
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
            icon={ShieldCheck}
            title="No quality checks yet"
            description="Record quality control results for graded batches."
            action={canEdit ? <Button onClick={openCreateForm} size="sm">Add QC Record</Button> : undefined}
          />
        ) : (
          <>
          {/* Desktop Table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Grading Batch</TableHead>
                  <TableHead>Aflatoxin (ppb)</TableHead>
                  <TableHead>Moisture %</TableHead>
                  <TableHead>Broken %</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Date</TableHead>
                  {canEdit && <TableHead className="w-10"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.batch_id}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{r.grading_batch_id}</TableCell>
                    <TableCell>{Number(r.aflatoxin_ppb).toFixed(1)}</TableCell>
                    <TableCell>{Number(r.moisture_percent).toFixed(1)}%</TableCell>
                    <TableCell>{Number(r.broken_percent).toFixed(1)}%</TableCell>
                    <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                    <TableCell>{r.inspector_name}</TableCell>
                    <TableCell>{formatDate(r.date_checked)}</TableCell>
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
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">From: {r.grading_batch_id}</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Aflatoxin</p>
                    <p className="font-medium">{Number(r.aflatoxin_ppb).toFixed(1)} ppb</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Moisture</p>
                    <p className="font-medium">{Number(r.moisture_percent).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Broken</p>
                    <p className="font-medium">{Number(r.broken_percent).toFixed(1)}%</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{r.inspector_name}</span>
                  <span>{formatDate(r.date_checked)}</span>
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
        title={editingRecord ? "Edit Quality Check" : "Record Quality Check"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div role="alert" className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] text-sm bg-red-50 text-red-800 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}
          <Input id="batch_id" name="batch_id" label="QC Batch ID" placeholder="QC-2026-005" defaultValue={editingRecord?.batch_id} required />
          <Input id="grading_batch_id" name="grading_batch_id" label="Grading Batch ID" placeholder="GRD-2026-001" defaultValue={editingRecord?.grading_batch_id} required />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input id="aflatoxin_ppb" name="aflatoxin_ppb" label="Aflatoxin (ppb)" type="number" step="0.1" min={0} defaultValue={editingRecord ? Number(editingRecord.aflatoxin_ppb) : undefined} required />
            <Input id="moisture_percent" name="moisture_percent" label="Moisture %" type="number" step="0.1" min={0} max={100} defaultValue={editingRecord ? Number(editingRecord.moisture_percent) : undefined} required />
            <Input id="broken_percent" name="broken_percent" label="Broken %" type="number" step="0.1" min={0} max={100} defaultValue={editingRecord ? Number(editingRecord.broken_percent) : undefined} required />
          </div>
          <Select
            id="status"
            name="status"
            label="Approval Status"
            options={[
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
            defaultValue={editingRecord?.status || "pending"}
          />
          <Input id="inspector_name" name="inspector_name" label="Inspector Name" placeholder="Nguyen Van A" defaultValue={editingRecord?.inspector_name} required />
          <Input id="date_checked" name="date_checked" label="Date Checked" type="date" defaultValue={editingRecord?.date_checked || new Date().toISOString().split("T")[0]} required />
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
