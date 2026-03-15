"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Shield, Key } from "lucide-react";
import type { Profile } from "@/types/database";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) {
          setProfile(data as Profile);
          setFullName(data.full_name);
        }
      }
    }
    load();
  }, [supabase]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);
      if (error) {
        setSaveError(error.message);
      } else {
        setSaved(true);
      }
    }
    setSaving(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordMsg("");

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordMsg(error.message);
    } else {
      setPasswordMsg("Password updated successfully.");
      setNewPassword("");
    }
    setPasswordSaving(false);
  }

  const roleLabel = {
    worker: "Worker — Data entry",
    manager: "Manager — Full access",
    stakeholder: "Stakeholder — View only",
  };

  if (!profile) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profile and account settings"
      />

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile
          </CardTitle>
          <CardDescription>Update your display name</CardDescription>
        </CardHeader>
        <form onSubmit={handleSaveName} className="space-y-4">
          <Input
            id="fullName"
            label="Full Name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setSaved(false);
            }}
            required
          />
          <Input
            id="email"
            label="Email"
            value={profile.email}
            disabled
          />
          {saveError && (
            <p role="alert" className="text-sm text-red-600">{saveError}</p>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Name"}
            </Button>
            {saved && (
              <span className="text-sm text-green-600">Saved!</span>
            )}
          </div>
        </form>
      </Card>

      {/* Role & Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Role & Access
          </CardTitle>
          <CardDescription>
            Your role is managed by an admin. Contact your manager to change it.
          </CardDescription>
        </CardHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-20 sm:w-24 shrink-0">Role:</span>
            <Badge variant="default">{profile.role}</Badge>
            <span className="text-xs text-muted-foreground">
              {roleLabel[profile.role] || profile.role}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-20 sm:w-24 shrink-0">Status:</span>
            <Badge variant={profile.account_status === "approved" ? "success" : "warning"}>
              {profile.account_status}
            </Badge>
          </div>
          {profile.assigned_stage && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-20 sm:w-24 shrink-0">Stage:</span>
              <Badge variant="outline">{profile.assigned_stage}</Badge>
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-20 sm:w-24 shrink-0">Joined:</span>
            <span className="text-sm">
              {new Date(profile.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Change Password
          </CardTitle>
          <CardDescription>Update your login password</CardDescription>
        </CardHeader>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            id="newPassword"
            label="New Password"
            type="password"
            placeholder="Min 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            required
          />
          {passwordMsg && (
            <p
              className={`text-sm ${
                passwordMsg.includes("success")
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {passwordMsg}
            </p>
          )}
          <Button type="submit" disabled={passwordSaving}>
            {passwordSaving ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
