"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Users, CheckCircle, XCircle, Clock, Shield } from "lucide-react";
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
  const [tab, setTab] = useState<"all" | "pending">("pending");
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

  async function approveUser(userId: string) {
    const { error } = await supabase
      .from("profiles")
      .update({ account_status: "approved" })
      .eq("id", userId);

    if (!error) {
      // Log the approval
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_log").insert({
        user_id: user?.id,
        user_email: user?.email,
        action: "approve_user",
        table_name: "profiles",
        record_id: userId,
        new_data: { account_status: "approved" },
      });
      fetchData();
    }
  }

  async function suspendUser(userId: string) {
    if (!confirm("Are you sure you want to suspend this user? They will lose access immediately.")) return;

    const { error } = await supabase
      .from("profiles")
      .update({ account_status: "suspended" })
      .eq("id", userId);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_log").insert({
        user_id: user?.id,
        user_email: user?.email,
        action: "suspend_user",
        table_name: "profiles",
        record_id: userId,
        new_data: { account_status: "suspended" },
      });
      fetchData();
    }
  }

  async function updateRole(userId: string, newRole: string) {
    const oldUser = users.find((u) => u.id === userId);
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_log").insert({
        user_id: user?.id,
        user_email: user?.email,
        action: "change_role",
        table_name: "profiles",
        record_id: userId,
        old_data: { role: oldUser?.role },
        new_data: { role: newRole },
      });
      fetchData();
      setEditingId(null);
    }
  }

  async function updateStage(userId: string, stage: string) {
    await supabase
      .from("profiles")
      .update({ assigned_stage: stage || null })
      .eq("id", userId);
    fetchData();
  }

  const pendingUsers = users.filter((u) => u.account_status === "pending");
  const displayUsers = tab === "pending" ? pendingUsers : users;

  const statusVariant = (status: string) => {
    switch (status) {
      case "approved": return "success" as const;
      case "suspended": return "destructive" as const;
      default: return "warning" as const;
    }
  };

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
        description="Approve signups, manage roles, and monitor team access"
      />

      {/* Pending Alert */}
      {pendingUsers.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-700" />
            <div>
              <p className="font-medium text-yellow-900">
                {pendingUsers.length} pending signup{pendingUsers.length > 1 ? "s" : ""} awaiting approval
              </p>
              <p className="text-sm text-yellow-700">
                New users cannot access the dashboard until you approve them.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={tab === "pending" ? "default" : "outline"}
          onClick={() => setTab("pending")}
        >
          <Clock className="h-4 w-4" />
          Pending ({pendingUsers.length})
        </Button>
        <Button
          size="sm"
          variant={tab === "all" ? "default" : "outline"}
          onClick={() => setTab("all")}
        >
          <Users className="h-4 w-4" />
          All Users ({users.length})
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : displayUsers.length === 0 ? (
          <EmptyState
            icon={tab === "pending" ? CheckCircle : Users}
            title={tab === "pending" ? "No pending requests" : "No users yet"}
            description={
              tab === "pending"
                ? "All signup requests have been reviewed."
                : "Users will appear here after they sign up."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                {tab === "all" && <TableHead>Stage</TableHead>}
                <TableHead>Signed Up</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(u.account_status)}>
                      {u.account_status}
                    </Badge>
                  </TableCell>
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
                  {tab === "all" && (
                    <TableCell>
                      <Select
                        options={stageOptions}
                        defaultValue={u.assigned_stage || ""}
                        onChange={(e) => updateStage(u.id, e.target.value)}
                        className="w-36"
                      />
                    </TableCell>
                  )}
                  <TableCell>{formatDate(u.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {u.account_status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => approveUser(u.id)}
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => suspendUser(u.id)}
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {u.account_status === "approved" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setEditingId(editingId === u.id ? null : u.id)
                            }
                          >
                            {editingId === u.id ? "Done" : "Edit Role"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => suspendUser(u.id)}
                            title="Suspend"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {u.account_status === "suspended" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveUser(u.id)}
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
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
