"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { History, Eye } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { AuditLogEntry } from "@/types/database";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const supabase = useMemo(() => createClient(), []);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    setLogs((data as AuditLogEntry[]) || []);
    setLoading(false);
  }, [supabase, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const actionVariant = (action: string) => {
    switch (action) {
      case "insert": return "success" as const;
      case "update": return "warning" as const;
      case "approve_user": return "success" as const;
      case "suspend_user": return "destructive" as const;
      case "change_role": return "default" as const;
      default: return "outline" as const;
    }
  };

  const actionLabel = (action: string) => {
    switch (action) {
      case "insert": return "Created";
      case "update": return "Updated";
      case "approve_user": return "Approved User";
      case "suspend_user": return "Suspended User";
      case "change_role": return "Changed Role";
      default: return action;
    }
  };

  const tableLabel = (name: string) => {
    switch (name) {
      case "raw_intake": return "Raw Intake";
      case "processing": return "Processing";
      case "grading": return "Grading";
      case "quality_checks": return "Quality Check";
      case "packaging": return "Packaging";
      case "warehouse_stock": return "Warehouse";
      case "shipments": return "Shipments";
      case "profiles": return "User Profile";
      default: return name;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Complete history of all changes made in the system"
      />

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={History}
            title="No audit records yet"
            description="All data changes will be automatically logged here."
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Who</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Record</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.user_email || "System"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={actionVariant(log.action)}>
                          {actionLabel(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {tableLabel(log.table_name)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.record_id ? log.record_id.substring(0, 8) + "..." : "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-border">
              {logs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="w-full p-3 space-y-1.5 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={actionVariant(log.action)}>
                      {actionLabel(log.action)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm">{tableLabel(log.table_name)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {log.user_email || "System"}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={logs.length < pageSize}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Change Details"
        className="sm:max-w-2xl"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">{new Date(selectedLog.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">User</p>
                <p className="font-medium">{selectedLog.user_email || "System"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Action</p>
                <Badge variant={actionVariant(selectedLog.action)}>
                  {actionLabel(selectedLog.action)}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Table</p>
                <p className="font-medium">{tableLabel(selectedLog.table_name)}</p>
              </div>
            </div>

            {selectedLog.old_data && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Previous Data</p>
                <pre className="bg-red-50 border border-red-200 rounded-[var(--radius)] p-3 text-xs overflow-x-auto max-h-48">
                  {JSON.stringify(selectedLog.old_data, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.new_data && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">New Data</p>
                <pre className="bg-green-50 border border-green-200 rounded-[var(--radius)] p-3 text-xs overflow-x-auto max-h-48">
                  {JSON.stringify(selectedLog.new_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
