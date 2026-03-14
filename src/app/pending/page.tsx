"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, LogOut } from "lucide-react";

export default function PendingPage() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleRefresh() {
    // Check if status has changed
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_status")
        .eq("id", user.id)
        .single();

      if (profile?.account_status === "approved") {
        router.push("/dashboard");
        router.refresh();
        return;
      }
    }
    // Still pending — show message
    alert("Your account is still pending approval. Please check back later.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 text-yellow-700 mb-4">
          <Clock className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Account Pending Approval</h1>
        <p className="text-muted-foreground text-sm mb-2">
          Your account has been created but an admin needs to approve it before you can access the dashboard.
        </p>
        <p className="text-muted-foreground text-sm mb-6">
          This usually takes less than 24 hours. You&apos;ll receive an email once approved.
        </p>
        <div className="flex flex-col gap-3">
          <Button onClick={handleRefresh} className="w-full">
            Check Status
          </Button>
          <Button onClick={handleLogout} variant="outline" className="w-full">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );
}
