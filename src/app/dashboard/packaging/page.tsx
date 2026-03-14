"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Package } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Packaging, UserRole } from "@/types/database";

export default function PackagingPage() {
  const [records, setRecords] = useState<Packaging[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("worker");
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("packaging")
      .select("*")
      .order("date_packed", { ascending: false });
    setRecords((data as Packaging[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        if (profile) setUserRole(profile.role as UserRole);
      }
    });
  }, [fetchData, supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("packaging").insert({
      batch_id: form.get("batch_id") as string,
      quality_batch_id: form.get("quality_batch_id") as string,
      bags_packed: Number(form.get("bags_packed")),
      net_weight_kg: Number(form.get("net_weight_kg")),
      gross_weight_kg: Number(form.get("gross_weight_kg")),
      packaging_type: form.get("packaging_type") as string,
      date_packed: form.get("date_packed") as string,
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
        title="Packaging"
        description="Track bags packed, weights, and packaging types"
        actionLabel="Add Packaging"
        onAction={() => setShowForm(true)}
        canEdit={canEdit}
      />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No packaging records yet"
            description="Record packaging details after quality approval."
            action={canEdit ? <Button onClick={() => setShowForm(true)} size="sm">Add Packaging</Button> : undefined}
          />
        ) : (
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Record Packaging">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input id="batch_id" name="batch_id" label="Batch ID" placeholder="PKG-2026-004" required />
          <Input id="quality_batch_id" name="quality_batch_id" label="QC Batch ID" placeholder="QC-2026-001" required />
          <Input id="bags_packed" name="bags_packed" label="Bags Packed" type="number" min={1} required />
          <div className="grid grid-cols-2 gap-4">
            <Input id="net_weight_kg" name="net_weight_kg" label="Net Weight (kg)" type="number" min={1} required />
            <Input id="gross_weight_kg" name="gross_weight_kg" label="Gross Weight (kg)" type="number" min={1} required />
          </div>
          <Input id="packaging_type" name="packaging_type" label="Packaging Type" placeholder="Vacuum Sealed 25kg" defaultValue="Standard Bag 25kg" required />
          <Input id="date_packed" name="date_packed" label="Date Packed" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
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
