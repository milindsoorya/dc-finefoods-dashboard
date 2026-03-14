import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
  Package,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function DashboardHome() {
  const supabase = await createClient();

  // Fetch counts for overview
  const [intakeRes, processingRes, stockRes, shipmentRes, recentShipments, recentIntake] =
    await Promise.all([
      supabase.from("raw_intake").select("weight_kg"),
      supabase.from("processing").select("output_weight_kg"),
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

  // Stock by grade
  const stockByGrade: Record<string, number> = {};
  (stockRes.data || []).forEach((s) => {
    stockByGrade[s.grade] = (stockByGrade[s.grade] || 0) + Number(s.weight_kg);
  });

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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Raw Intake"
          value={`${(totalIntake / 1000).toFixed(1)}t`}
          subtitle="All time"
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
          subtitle="In progress"
          icon={Ship}
        />
      </div>

      {/* Stock by Grade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Stock by Grade
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(stockByGrade).map(([grade, weight]) => (
            <div
              key={grade}
              className="flex flex-col items-center p-4 rounded-[var(--radius)] bg-muted/50"
            >
              <span className="text-xs font-medium text-muted-foreground">
                {grade}
              </span>
              <span className="text-xl font-bold">
                {weight >= 1000
                  ? `${(weight / 1000).toFixed(1)}t`
                  : `${weight}kg`}
              </span>
            </div>
          ))}
          {Object.keys(stockByGrade).length === 0 && (
            <p className="col-span-4 text-center text-muted-foreground text-sm py-4">
              No stock data yet
            </p>
          )}
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
