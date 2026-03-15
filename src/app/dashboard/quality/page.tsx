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
import { ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useUserRole } from "@/contexts/user-role";
import type { QualityCheck } from "@/types/database";

export default function QualityPage() {
  const [records, setRecords] = useState<QualityCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { role: userRole } = useUserRole();
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("quality_checks")
      .select("*")
      .order("date_checked", { ascending: false })
      .limit(200);
    setRecords((data as QualityCheck[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("quality_checks").insert({
      batch_id: form.get("batch_id") as string,
      grading_batch_id: form.get("grading_batch_id") as string,
      aflatoxin_ppb: Number(form.get("aflatoxin_ppb")),
      moisture_percent: Number(form.get("moisture_percent")),
      broken_percent: Number(form.get("broken_percent")),
      status: form.get("status") as string,
      inspector_name: form.get("inspector_name") as string,
      date_checked: form.get("date_checked") as string,
      notes: (form.get("notes") as string) || null,
      created_by: user?.id,
    });

    if (!error) {
      setShowForm(false);
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
        onAction={() => setShowForm(true)}
        canEdit={canEdit}
      />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No quality checks yet"
            description="Record quality control results for graded batches."
            action={canEdit ? <Button onClick={() => setShowForm(true)} size="sm">Add QC Record</Button> : undefined}
          />
        ) : (<>

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
                  <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
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
        </>)}
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Record Quality Check">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input id="batch_id" name="batch_id" label="QC Batch ID" placeholder="QC-2026-005" required />
          <Input id="grading_batch_id" name="grading_batch_id" label="Grading Batch ID" placeholder="GRD-2026-001" required />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input id="aflatoxin_ppb" name="aflatoxin_ppb" label="Aflatoxin (ppb)" type="number" step="0.1" min={0} required />
            <Input id="moisture_percent" name="moisture_percent" label="Moisture %" type="number" step="0.1" min={0} max={100} required />
            <Input id="broken_percent" name="broken_percent" label="Broken %" type="number" step="0.1" min={0} max={100} required />
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
            defaultValue="pending"
          />
          <Input id="inspector_name" name="inspector_name" label="Inspector Name" placeholder="Nguyen Van A" required />
          <Input id="date_checked" name="date_checked" label="Date Checked" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
          <Input id="notes" name="notes" label="Notes (optional)" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Save Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
