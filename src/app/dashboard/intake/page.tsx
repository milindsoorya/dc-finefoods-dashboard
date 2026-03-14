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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Wheat } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { RawIntake, UserRole } from "@/types/database";

export default function IntakePage() {
  const [records, setRecords] = useState<RawIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("worker");
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("raw_intake")
      .select("*")
      .order("date_received", { ascending: false });
    setRecords((data as RawIntake[]) || []);
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

    const { error } = await supabase.from("raw_intake").insert({
      batch_id: form.get("batch_id") as string,
      weight_kg: Number(form.get("weight_kg")),
      moisture_percent: Number(form.get("moisture_percent")),
      origin_farm: form.get("origin_farm") as string,
      date_received: form.get("date_received") as string,
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
        title="Raw Cashew Intake"
        description="Record raw cashew arrivals — weight, moisture, origin farm"
        actionLabel="Add Intake"
        onAction={() => setShowForm(true)}
        canEdit={canEdit}
      />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={Wheat}
            title="No intake records yet"
            description="Start by recording your first raw cashew arrival."
            action={
              canEdit ? (
                <Button onClick={() => setShowForm(true)} size="sm">
                  Add First Intake
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch ID</TableHead>
                <TableHead>Origin Farm</TableHead>
                <TableHead>Weight (kg)</TableHead>
                <TableHead>Moisture %</TableHead>
                <TableHead>Date Received</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Badge variant="outline">{r.batch_id}</Badge>
                  </TableCell>
                  <TableCell>{r.origin_farm}</TableCell>
                  <TableCell className="font-medium">
                    {Number(r.weight_kg).toLocaleString()}
                  </TableCell>
                  <TableCell>{Number(r.moisture_percent).toFixed(1)}%</TableCell>
                  <TableCell>{formatDate(r.date_received)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                    {r.notes || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add Intake Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Record Raw Cashew Intake">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="batch_id"
            name="batch_id"
            label="Batch ID"
            placeholder="INT-2026-006"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="weight_kg"
              name="weight_kg"
              label="Weight (kg)"
              type="number"
              min={1}
              placeholder="5000"
              required
            />
            <Input
              id="moisture_percent"
              name="moisture_percent"
              label="Moisture %"
              type="number"
              step="0.1"
              min={0}
              max={100}
              placeholder="8.5"
              required
            />
          </div>
          <Input
            id="origin_farm"
            name="origin_farm"
            label="Origin Farm"
            placeholder="Binh Phuoc Farm A"
            required
          />
          <Input
            id="date_received"
            name="date_received"
            label="Date Received"
            type="date"
            defaultValue={new Date().toISOString().split("T")[0]}
            required
          />
          <Input id="notes" name="notes" label="Notes (optional)" placeholder="Any observations..." />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
