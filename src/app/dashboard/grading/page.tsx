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
import { BarChart3 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Grading, UserRole } from "@/types/database";

const gradeOptions = [
  { value: "WW180", label: "WW180 (Premium)" },
  { value: "WW240", label: "WW240 (Standard)" },
  { value: "WW320", label: "WW320 (Small)" },
  { value: "Roasted", label: "Roasted" },
  { value: "Custom", label: "Custom" },
];

export default function GradingPage() {
  const [records, setRecords] = useState<Grading[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("worker");
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("grading")
      .select("*")
      .order("date_graded", { ascending: false });
    setRecords((data as Grading[]) || []);
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

    const { error } = await supabase.from("grading").insert({
      batch_id: form.get("batch_id") as string,
      processing_batch_id: form.get("processing_batch_id") as string,
      grade: form.get("grade") as string,
      weight_kg: Number(form.get("weight_kg")),
      reject_percent: Number(form.get("reject_percent")),
      date_graded: form.get("date_graded") as string,
      notes: (form.get("notes") as string) || null,
      created_by: user?.id,
    });

    if (!error) {
      setShowForm(false);
      fetchData();
    }
  }

  const canEdit = userRole === "worker" || userRole === "manager";

  const gradeColor = (grade: string) => {
    switch (grade) {
      case "WW180": return "default" as const;
      case "WW240": return "success" as const;
      case "WW320": return "warning" as const;
      case "Roasted": return "destructive" as const;
      default: return "outline" as const;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grading & Sorting"
        description="Classify processed cashews by grade — WW180, WW240, WW320, Roasted"
        actionLabel="Add Grading"
        onAction={() => setShowForm(true)}
        canEdit={canEdit}
      />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No grading records yet"
            description="Grade and sort your processed cashews."
            action={canEdit ? <Button onClick={() => setShowForm(true)} size="sm">Add Grading</Button> : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch ID</TableHead>
                <TableHead>Processing Batch</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Weight (kg)</TableHead>
                <TableHead>Reject %</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><Badge variant="outline">{r.batch_id}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.processing_batch_id}</TableCell>
                  <TableCell><Badge variant={gradeColor(r.grade)}>{r.grade}</Badge></TableCell>
                  <TableCell className="font-medium">{Number(r.weight_kg).toLocaleString()}</TableCell>
                  <TableCell>{Number(r.reject_percent).toFixed(1)}%</TableCell>
                  <TableCell>{formatDate(r.date_graded)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Record Grading">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input id="batch_id" name="batch_id" label="Batch ID" placeholder="GRD-2026-005" required />
          <Input id="processing_batch_id" name="processing_batch_id" label="Processing Batch ID" placeholder="PRC-2026-001" required />
          <Select id="grade" name="grade" label="Grade" options={gradeOptions} defaultValue="WW240" />
          <div className="grid grid-cols-2 gap-4">
            <Input id="weight_kg" name="weight_kg" label="Weight (kg)" type="number" min={1} required />
            <Input id="reject_percent" name="reject_percent" label="Reject %" type="number" step="0.1" min={0} max={100} defaultValue="0" required />
          </div>
          <Input id="date_graded" name="date_graded" label="Date Graded" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
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
