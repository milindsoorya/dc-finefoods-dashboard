"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Warehouse } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { WarehouseStock, UserRole } from "@/types/database";

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
  const [showForm, setShowForm] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("worker");
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("warehouse_stock")
      .select("*")
      .order("updated_at", { ascending: false });
    setRecords((data as WarehouseStock[]) || []);
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

    const { error } = await supabase.from("warehouse_stock").insert({
      grade: form.get("grade") as string,
      weight_kg: Number(form.get("weight_kg")),
      location: form.get("location") as string,
      best_before: (form.get("best_before") as string) || null,
      packaging_batch_id: (form.get("packaging_batch_id") as string) || null,
    });

    if (!error) {
      setShowForm(false);
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
        onAction={() => setShowForm(true)}
        canEdit={canEdit}
      />

      {/* Summary Cards */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
        ) : records.length === 0 ? (
          <EmptyState
            icon={Warehouse}
            title="No stock records yet"
            description="Add warehouse stock entries after packaging."
            action={canEdit ? <Button onClick={() => setShowForm(true)} size="sm">Add Stock</Button> : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grade</TableHead>
                <TableHead>Weight (kg)</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Best Before</TableHead>
                <TableHead>Pkg Batch</TableHead>
                <TableHead>Updated</TableHead>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Stock Entry">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select id="grade" name="grade" label="Grade" options={gradeOptions} defaultValue="WW240" />
          <Input id="weight_kg" name="weight_kg" label="Weight (kg)" type="number" min={1} required />
          <Input id="location" name="location" label="Location" placeholder="Main Warehouse - A1" defaultValue="Main Warehouse" required />
          <Input id="best_before" name="best_before" label="Best Before" type="date" />
          <Input id="packaging_batch_id" name="packaging_batch_id" label="Packaging Batch ID (optional)" placeholder="PKG-2026-001" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Save Entry</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
