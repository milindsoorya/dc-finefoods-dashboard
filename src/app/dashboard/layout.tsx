import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import type { UserRole } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Check account status
  if (!profile || profile.account_status === "pending") {
    redirect("/pending");
  }
  if (profile.account_status === "suspended") {
    redirect("/suspended");
  }

  const userRole: UserRole = (profile.role as UserRole) || "worker";
  const userName: string = profile.full_name || user.email || "User";

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} userName={userName} />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-3 pt-16 sm:p-4 sm:pt-16 lg:pt-6 lg:p-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
