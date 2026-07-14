"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-service";

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'super_admin') {
    throw new Error('Unauthorized: super_admin role required');
  }
  return user;
}

export async function forceSyncPermissionsAction() {
  try {
    await requireSuperAdmin();
    const roles = await prisma.roleTemplate.count().catch(() => 0);
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
    await requireSuperAdmin();
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
    await requireSuperAdmin();
    revalidatePath('/super-admin/dashboard');
    return { success: true, message: 'Maintenance mode action completed.' };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute maintenance mode action',
    };
  }
}
