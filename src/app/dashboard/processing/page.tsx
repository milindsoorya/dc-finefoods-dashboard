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
import { Cog } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Processing, UserRole } from "@/types/database";

export default function ProcessingPage() {
  const [records, setRecords] = useState<Processing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("worker");
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("processing")
      .select("*")
      .order("date_processed", { ascending: false });
    setRecords((data as Processing[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile) setUserRole(profile.role as UserRole);
      }
    });
  }, [fetchData, supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("processing").insert({
      batch_id: form.get("batch_id") as string,
      intake_batch_id: form.get("intake_batch_id") as string,
      input_weight_kg: Number(form.get("input_weight_kg")),
      output_weight_kg: Number(form.get("output_weight_kg")),
      date_processed: form.get("date_processed") as string,
      notes: (form.get("notes") as string) || null,
      created_by: user?.id,
    });

    if (!error) {
      setShowForm(false);
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
        onAction={() => setShowForm(true)}
        canEdit={canEdit}
      />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={Cog}
            title="No processing records yet"
            description="Record your first shelling/processing batch."
            action={canEdit ? <Button onClick={() => setShowForm(true)} size="sm">Add Processing</Button> : undefined}
          />
        ) : (<>

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => {
                  const yieldPct = ((Number(r.output_weight_kg) / Number(r.input_weight_kg)) * 100).toFixed(1);
                  return (
                    <TableRow key={r.id}>
                      <TableCell><Badge variant="outline">{r.batch_id}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{r.intake_batch_id}</TableCell>
                      <TableCell>{Number(r.input_weight_kg).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{Number(r.output_weight_kg).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={Number(yieldPct) >= 25 ? "success" : "warning"}>{yieldPct}%</Badge>
                      </TableCell>
                      <TableCell>{formatDate(r.date_processed)}</TableCell>
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
                <div key={r.id} className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline">{r.batch_id}</Badge>
                    <Badge variant={Number(yieldPct) >= 25 ? "success" : "warning"}>{yieldPct}% yield</Badge>
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
        </>)}
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Record Processing Batch">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input id="batch_id" name="batch_id" label="Batch ID" placeholder="PRC-2026-005" required />
          <Input id="intake_batch_id" name="intake_batch_id" label="Intake Batch ID" placeholder="INT-2026-001" required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="input_weight_kg" name="input_weight_kg" label="Input Weight (kg)" type="number" min={1} required />
            <Input id="output_weight_kg" name="output_weight_kg" label="Output Weight (kg)" type="number" min={1} required />
          </div>
          <Input id="date_processed" name="date_processed" label="Date Processed" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
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
