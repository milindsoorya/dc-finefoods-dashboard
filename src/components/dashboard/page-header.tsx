"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  canEdit?: boolean;
}

export function PageHeader({
  title,
  description,
  actionLabel,
  onAction,
  canEdit = true,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold truncate">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {actionLabel && canEdit && (
        <Button onClick={onAction} size="sm" className="self-start sm:self-auto shrink-0">
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
