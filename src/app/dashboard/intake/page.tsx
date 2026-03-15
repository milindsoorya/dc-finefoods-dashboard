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
import { Wheat, Pencil, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useUserRole } from "@/contexts/user-role";
import type { RawIntake } from "@/types/database";

const PAGE_SIZE = 50;

export default function IntakePage() {
  const [records, setRecords] = useState<RawIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RawIntake | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const { role: userRole } = useUserRole();
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    setFetchError(null);
    const { data, error } = await supabase
      .from("raw_intake")
      .select("*")
      .order("date_received", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      setFetchError(error.message);
    } else {
      setRecords((data as RawIntake[]) || []);
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

  function openEditForm(record: RawIntake) {
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
      weight_kg: Number(form.get("weight_kg")),
      moisture_percent: Number(form.get("moisture_percent")),
      origin_farm: form.get("origin_farm") as string,
      date_received: form.get("date_received") as string,
      notes: (form.get("notes") as string) || null,
    };

    let error;
    if (editingRecord) {
      ({ error } = await supabase
        .from("raw_intake")
        .update(payload)
        .eq("id", editingRecord.id));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      ({ error } = await supabase.from("raw_intake").insert({
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
        title="Raw Cashew Intake"
        description="Record raw cashew arrivals — weight, moisture, origin farm"
        actionLabel="Add Intake"
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
            icon={Wheat}
            title="No intake records yet"
            description="Start by recording your first raw cashew arrival."
            action={canEdit ? <Button onClick={openCreateForm} size="sm">Add First Intake</Button> : undefined}
          />
        ) : (
          <>
          {/* Desktop Table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Origin Farm</TableHead>
                  <TableHead>Weight (kg)</TableHead>
                  <TableHead>Moisture %</TableHead>
                  <TableHead>Date Received</TableHead>
                  <TableHead>Notes</TableHead>
                  {canEdit && <TableHead className="w-10"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.batch_id}</Badge></TableCell>
                    <TableCell>{r.origin_farm}</TableCell>
                    <TableCell className="font-medium">{Number(r.weight_kg).toLocaleString()}</TableCell>
                    <TableCell>{Number(r.moisture_percent).toFixed(1)}%</TableCell>
                    <TableCell>{formatDate(r.date_received)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{r.notes || "—"}</TableCell>
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
                    <span className="text-xs text-muted-foreground">{formatDate(r.date_received)}</span>
                  </div>
                </div>
                <p className="text-sm font-medium">{r.origin_farm}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span><span className="text-muted-foreground">Weight:</span> {Number(r.weight_kg).toLocaleString()} kg</span>
                  <span><span className="text-muted-foreground">Moisture:</span> {Number(r.moisture_percent).toFixed(1)}%</span>
                </div>
                {r.notes && <p className="text-xs text-muted-foreground truncate">{r.notes}</p>}
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
        title={editingRecord ? "Edit Intake Record" : "Record Raw Cashew Intake"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div role="alert" className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] text-sm bg-red-50 text-red-800 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}
          <Input id="batch_id" name="batch_id" label="Batch ID" placeholder="INT-2026-006" defaultValue={editingRecord?.batch_id} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="weight_kg" name="weight_kg" label="Weight (kg)" type="number" min={1} placeholder="5000" defaultValue={editingRecord ? Number(editingRecord.weight_kg) : undefined} required />
            <Input id="moisture_percent" name="moisture_percent" label="Moisture %" type="number" step="0.1" min={0} max={100} placeholder="8.5" defaultValue={editingRecord ? Number(editingRecord.moisture_percent) : undefined} required />
          </div>
          <Input id="origin_farm" name="origin_farm" label="Origin Farm" placeholder="Binh Phuoc Farm A" defaultValue={editingRecord?.origin_farm} required />
          <Input id="date_received" name="date_received" label="Date Received" type="date" defaultValue={editingRecord?.date_received || new Date().toISOString().split("T")[0]} required />
          <Input id="notes" name="notes" label="Notes (optional)" placeholder="Any observations..." defaultValue={editingRecord?.notes || ""} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingRecord(null); }}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : editingRecord ? "Update Record" : "Save Record"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
