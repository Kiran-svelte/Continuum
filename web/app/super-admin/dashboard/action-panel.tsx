"use client";

import React, { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  forceSyncPermissionsAction,
  maintenanceModeAction,
  purgeDocumentsAction,
} from "./actions";

export default function SuperAdminActionPanel() {
  const [isPending, startTransition] = useTransition();

  const handleSync = () => {
    startTransition(async () => {
      const res = await forceSyncPermissionsAction();
      if (res.success) {
        toast.success('Permissions sync completed.');
      } else {
        toast.error(`Sync failed: ${res.error}`);
      }
    });
  };

  const handlePurge = () => {
    startTransition(async () => {
      const res = await purgeDocumentsAction();
      if (res.success) {
        toast.success('Document purge completed.');
      } else {
        toast.error(`Purge failed: ${res.error}`);
      }
    });
  };

  const handleMaintenance = () => {
    startTransition(async () => {
      const res = await maintenanceModeAction();
      if (res.success) {
        toast.success('Maintenance mode action completed.');
      } else {
        toast.error(`Maintenance action failed: ${res.error}`);
      }
    });
  };

  if (isPending) {
    return (
      <div className="p-4 flex flex-col items-center justify-center gap-4 py-8 bg-[var(--background)]/50 backdrop-blur-sm rounded-lg border border-[var(--border)]">
        <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
        <p className="font-bold text-sm text-[var(--muted-foreground)] animate-pulse">Executing high-level Prisma mutation pipeline...</p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      <Button type="button" variant="ghost" onClick={handleSync} className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-left hover:border-[var(--primary)] hover:shadow-[0_0_10px_rgba(37,99,235,0.1)] transition-all group relative overflow-hidden w-full h-auto flex-col items-start">
        <div className="font-semibold text-sm text-[var(--foreground)] group-hover:text-[var(--primary)] relative z-10">Force Sync Permissions</div>
        <div className="text-[11px] text-[var(--muted-foreground)] mt-1 relative z-10">Re-evaluate RBAC matrices across all active tenants immediately.</div>
      </Button>
      
      <Button type="button" variant="ghost" onClick={handlePurge} className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-left hover:border-[var(--primary)] hover:shadow-[0_0_10px_rgba(37,99,235,0.1)] transition-all group relative overflow-hidden w-full h-auto flex-col items-start">
        <div className="font-semibold text-sm text-[var(--foreground)] group-hover:text-[var(--primary)] relative z-10">Purge Orphaned Documents</div>
        <div className="text-[11px] text-[var(--muted-foreground)] mt-1 relative z-10">Clear Prisma tables of rejected/expired payload identities.</div>
      </Button>

      <Button type="button" variant="ghost" onClick={handleMaintenance} className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-left hover:border-[var(--primary)] hover:shadow-[0_0_10px_rgba(37,99,235,0.1)] transition-all group relative overflow-hidden w-full h-auto flex-col items-start">
        <div className="font-semibold text-sm text-[var(--foreground)] group-hover:text-[var(--primary)] relative z-10">Run Maintenance Mode Action</div>
        <div className="text-[11px] text-[var(--muted-foreground)] mt-1 relative z-10">Trigger a safe maintenance-mode reconciliation and dashboard refresh.</div>
      </Button>
    </div>
  );
}
