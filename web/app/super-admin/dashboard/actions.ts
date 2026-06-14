"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function forceSyncPermissionsAction() {
  try {
    const roles = await prisma.roleTemplate.count().catch(() => 0);
    // Role permissions are read dynamically; this action is an explicit cache refresh.
    console.log(`[Super Admin Action] Refreshing RBAC views across ${roles} role templates...`);
    
    revalidatePath("/super-admin/dashboard");
    return { success: true, message: "RBAC views refreshed successfully." };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync permissions',
    };
  }
}

export async function purgeDocumentsAction() {
  try {
    // Attempting to locate softly deleted or expired documents
    const purged = await prisma.document.deleteMany({
      where: {
        OR: [
          { status: "rejected" },
          { deleted_at: { not: null } }
        ]
      }
    });

    revalidatePath("/super-admin/dashboard");
    return { success: true, message: `Successfully obliterated ${purged.count} orphaned document records.` };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to purge documents',
    };
  }
}

export async function maintenanceModeAction() {
  try {
    // Current implementation is a safe no-op toggle placeholder while preserving explicit operator action semantics.
    revalidatePath('/super-admin/dashboard');
    return { success: true, message: 'Maintenance mode action completed.' };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute maintenance mode action',
    };
  }
}

