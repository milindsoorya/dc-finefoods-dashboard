import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Wheat,
  Cog,
  Warehouse,
  Ship,
  TrendingUp,
  ShieldCheck,
  Users,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { StockPieChart, IntakeBarChart } from "@/components/dashboard/charts";

export default async function DashboardHome() {
  const supabase = await createClient();

  const [intakeRes, processingRes, stockRes, shipmentRes, recentShipments, recentIntake, qualityRes, pendingUsersRes] =
    await Promise.all([
      supabase.from("raw_intake").select("weight_kg, date_received"),
      supabase.from("processing").select("output_weight_kg, input_weight_kg"),
      supabase.from("warehouse_stock").select("weight_kg, grade"),
      supabase.from("shipments").select("*"),
      supabase
        .from("shipments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("raw_intake")
        .select("*")
        .order("date_received", { ascending: false })
        .limit(5),
      supabase.from("quality_checks").select("status"),
      supabase.from("profiles").select("id").eq("account_status", "pending"),
    ]);

  const totalIntake = (intakeRes.data || []).reduce(
    (sum, r) => sum + Number(r.weight_kg),
    0
  );
  const totalProcessed = (processingRes.data || []).reduce(
    (sum, r) => sum + Number(r.output_weight_kg),
    0
  );
  const totalStock = (stockRes.data || []).reduce(
    (sum, r) => sum + Number(r.weight_kg),
    0
  );
  const activeShipments = (shipmentRes.data || []).filter(
    (s) => s.status !== "delivered"
  ).length;
  const yieldRate =
    totalIntake > 0 ? ((totalProcessed / totalIntake) * 100).toFixed(1) : "0";
  const qcApproved = (qualityRes.data || []).filter(
    (q) => q.status === "approved"
  ).length;
  const qcTotal = (qualityRes.data || []).length;
  const pendingUsers = (pendingUsersRes.data || []).length;

  // Stock by grade for pie chart
  const stockByGrade: Record<string, number> = {};
  (stockRes.data || []).forEach((s) => {
    stockByGrade[s.grade] = (stockByGrade[s.grade] || 0) + Number(s.weight_kg);
  });
  const stockChartData = Object.entries(stockByGrade).map(([grade, weight]) => ({
    grade,
    weight,
  }));

  // Intake by month for bar chart
  const intakeByMonth: Record<string, number> = {};
  (intakeRes.data || []).forEach((r) => {
    const month = new Date(r.date_received).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    intakeByMonth[month] = (intakeByMonth[month] || 0) + Number(r.weight_kg);
  });
  const intakeChartData = Object.entries(intakeByMonth).map(
    ([month, weight]) => ({ month, weight })
  );

  const statusVariant = (status: string) => {
    switch (status) {
      case "delivered":
        return "success" as const;
      case "in_transit":
        return "warning" as const;
      case "preparing":
      case "packed":
        return "outline" as const;
      default:
        return "default" as const;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground text-sm">
          Cashew processing pipeline at a glance
        </p>
      </div>

      {/* Pending users alert */}
      {pendingUsers > 0 && (
        <Card className="border-yellow-300 bg-yellow-50 flex items-center gap-3">
          <Users className="h-5 w-5 text-yellow-700" />
          <p className="text-sm text-yellow-900">
            <strong>{pendingUsers}</strong> user{pendingUsers > 1 ? "s" : ""} awaiting approval —{" "}
            <a href="/dashboard/users" className="underline font-medium">
              Review now
            </a>
          </p>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Raw Intake"
          value={`${(totalIntake / 1000).toFixed(1)}t`}
          subtitle={`${(intakeRes.data || []).length} batches`}
          icon={Wheat}
        />
        <StatCard
          title="Processed Output"
          value={`${(totalProcessed / 1000).toFixed(1)}t`}
          subtitle={`Yield: ${yieldRate}%`}
          icon={Cog}
        />
        <StatCard
          title="Warehouse Stock"
          value={`${(totalStock / 1000).toFixed(1)}t`}
          subtitle={`${Object.keys(stockByGrade).length} grades`}
          icon={Warehouse}
        />
        <StatCard
          title="Active Shipments"
          value={activeShipments}
          subtitle={`QC pass rate: ${qcTotal > 0 ? ((qcApproved / qcTotal) * 100).toFixed(0) : 0}%`}
          icon={Ship}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-primary" />
              Stock by Grade
            </CardTitle>
            <CardDescription>Current warehouse inventory distribution</CardDescription>
          </CardHeader>
          <StockPieChart data={stockChartData} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wheat className="h-5 w-5 text-primary" />
              Monthly Intake
            </CardTitle>
            <CardDescription>Raw cashew arrivals by month</CardDescription>
          </CardHeader>
          <IntakeBarChart data={intakeChartData} />
        </Card>
      </div>

      {/* Pipeline Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Pipeline Summary
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Intake", value: (intakeRes.data || []).length },
            { label: "Processed", value: (processingRes.data || []).length },
            { label: "Graded", value: "—" },
            { label: "QC Passed", value: qcApproved },
            { label: "Packaged", value: "—" },
            { label: "In Stock", value: (stockRes.data || []).length },
            { label: "Shipped", value: (shipmentRes.data || []).filter((s) => s.status === "delivered").length },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center p-3 rounded-[var(--radius)] bg-muted/50"
            >
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-lg font-bold">{item.value}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Intake */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wheat className="h-5 w-5 text-primary" />
              Recent Intake
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Farm</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(recentIntake.data || []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">
                    {row.batch_id}
                  </TableCell>
                  <TableCell>{row.origin_farm}</TableCell>
                  <TableCell>{Number(row.weight_kg).toLocaleString()}kg</TableCell>
                  <TableCell>{formatDate(row.date_received)}</TableCell>
                </TableRow>
              ))}
              {(recentIntake.data || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No intake records yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Recent Shipments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recent Shipments
            </CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Weight</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(recentShipments.data || []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.customer_name}</TableCell>
                  <TableCell>{row.destination}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>
                      {row.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {Number(row.total_weight_kg).toLocaleString()}kg
                  </TableCell>
                </TableRow>
              ))}
              {(recentShipments.data || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No shipments yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
