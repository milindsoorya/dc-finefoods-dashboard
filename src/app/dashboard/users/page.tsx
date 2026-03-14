"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Users } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Profile } from "@/types/database";

const roleOptions = [
  { value: "worker", label: "Worker" },
  { value: "manager", label: "Manager" },
  { value: "stakeholder", label: "Stakeholder" },
];

const stageOptions = [
  { value: "", label: "All Stages" },
  { value: "intake", label: "Raw Intake" },
  { value: "processing", label: "Processing" },
  { value: "grading", label: "Grading" },
  { value: "quality", label: "Quality Check" },
  { value: "packaging", label: "Packaging" },
  { value: "warehouse", label: "Warehouse" },
  { value: "shipments", label: "Shipments" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers((data as Profile[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function updateRole(userId: string, newRole: string) {
    await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);
    fetchData();
    setEditingId(null);
  }

  async function updateStage(userId: string, stage: string) {
    await supabase
      .from("profiles")
      .update({ assigned_stage: stage || null })
      .eq("id", userId);
    fetchData();
  }

  const roleVariant = (role: string) => {
    switch (role) {
      case "manager": return "default" as const;
      case "stakeholder": return "warning" as const;
      default: return "outline" as const;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage team members, roles, and stage assignments"
      />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users yet"
            description="Users will appear here after they sign up."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned Stage</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    {editingId === u.id ? (
                      <Select
                        options={roleOptions}
                        defaultValue={u.role}
                        onChange={(e) => updateRole(u.id, e.target.value)}
                        className="w-32"
                      />
                    ) : (
                      <Badge variant={roleVariant(u.role)}>{u.role}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      options={stageOptions}
                      defaultValue={u.assigned_stage || ""}
                      onChange={(e) => updateStage(u.id, e.target.value)}
                      className="w-36"
                    />
                  </TableCell>
                  <TableCell>{formatDate(u.created_at)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setEditingId(editingId === u.id ? null : u.id)
                      }
                    >
                      {editingId === u.id ? "Done" : "Edit Role"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
