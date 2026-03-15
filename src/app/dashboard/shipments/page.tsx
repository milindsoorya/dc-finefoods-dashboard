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
import { Ship } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useUserRole } from "@/contexts/user-role";
import type { Shipment } from "@/types/database";

const gradeOptions = [
  { value: "WW180", label: "WW180" },
  { value: "WW240", label: "WW240" },
  { value: "WW320", label: "WW320" },
  { value: "Roasted", label: "Roasted" },
  { value: "Custom", label: "Custom" },
];

const statusOptions = [
  { value: "preparing", label: "Preparing" },
  { value: "packed", label: "Packed" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
];

export default function ShipmentsPage() {
  const [records, setRecords] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { role: userRole } = useUserRole();
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("shipments")
      .select("*")
      .order("departure_date", { ascending: false })
      .limit(200);
    setRecords((data as Shipment[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("shipments").insert({
      customer_name: form.get("customer_name") as string,
      destination: form.get("destination") as string,
      container_number: (form.get("container_number") as string) || null,
      bill_of_lading: (form.get("bill_of_lading") as string) || null,
      departure_date: form.get("departure_date") as string,
      arrival_date: (form.get("arrival_date") as string) || null,
      status: form.get("status") as string,
      total_weight_kg: Number(form.get("total_weight_kg")),
      grade: form.get("grade") as string,
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
      case "delivered": return "success" as const;
      case "in_transit": return "warning" as const;
      case "packed": return "default" as const;
      default: return "outline" as const;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipments"
        description="Track export shipments — customers, destinations, containers, and delivery status"
        actionLabel="Add Shipment"
        onAction={() => setShowForm(true)}
        canEdit={canEdit}
      />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={Ship}
            title="No shipments yet"
            description="Create shipment records for export orders."
            action={canEdit ? <Button onClick={() => setShowForm(true)} size="sm">Add Shipment</Button> : undefined}
          />
        ) : (<>

          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Weight (kg)</TableHead>
                  <TableHead>Container</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Departure</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.customer_name}</TableCell>
                    <TableCell>{r.destination}</TableCell>
                    <TableCell><Badge variant="outline">{r.grade}</Badge></TableCell>
                    <TableCell>{Number(r.total_weight_kg).toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs">{r.container_number || "—"}</TableCell>
                    <TableCell><Badge variant={statusVariant(r.status)}>{r.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell>{formatDate(r.departure_date)}</TableCell>
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
                  <span className="font-medium text-sm truncate">{r.customer_name}</span>
                  <Badge variant={statusVariant(r.status)}>{r.status.replace("_", " ")}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{r.destination}</p>
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="outline">{r.grade}</Badge>
                  <span>{Number(r.total_weight_kg).toLocaleString()} kg</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{r.container_number || "No container"}</span>
                  <span>{formatDate(r.departure_date)}</span>
                </div>
              </div>
            ))}
          </div>
        </>)}
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Create Shipment" className="sm:max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input id="customer_name" name="customer_name" label="Customer Name" placeholder="Al Rashid Trading LLC" required />
          <Input id="destination" name="destination" label="Destination" placeholder="Dubai, UAE" required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select id="grade" name="grade" label="Grade" options={gradeOptions} defaultValue="WW240" />
            <Input id="total_weight_kg" name="total_weight_kg" label="Total Weight (kg)" type="number" min={1} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="container_number" name="container_number" label="Container #" placeholder="MSKU-7234567" />
            <Input id="bill_of_lading" name="bill_of_lading" label="Bill of Lading" placeholder="BL-2026-0042" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input id="departure_date" name="departure_date" label="Departure Date" type="date" required />
            <Input id="arrival_date" name="arrival_date" label="Est. Arrival" type="date" />
          </div>
          <Select
            id="status"
            name="status"
            label="Status"
            options={statusOptions}
            defaultValue="preparing"
          />
          <Input id="notes" name="notes" label="Notes (optional)" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit">Save Shipment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
