"use server";

import prisma from "@/lib/prisma";
import { getAuthEmployee, requireCompanyContext } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { requirePermissionGuard } from '@/lib/auth-guard';

type SystemConfigPayload = {
  name?: string;
  region?: string;
  workStart?: string;
  workEnd?: string;
};

// Deeply Implement fetching real org data
export async function fetchLiveCompanyState() {
  try {
    const employee = await getAuthEmployee();
    const scoped = requireCompanyContext(employee);
    requirePermissionGuard(scoped, 'company.edit_settings');

    const company = await prisma.company.findUnique({
      where: { id: scoped.org_id },
    });

    if (!company) {
      throw new Error('Company not found for current session');
    }

    return { success: true, data: company };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch company state',
    };
  }
}

// Ensure the form actually commits real updates to Postgres
export async function updateSystemConfig(payload: SystemConfigPayload) {
  try {
    const employee = await getAuthEmployee();
    const scoped = requireCompanyContext(employee);
    requirePermissionGuard(scoped, 'company.edit_settings');

    const company = await prisma.company.findUnique({
      where: { id: scoped.org_id },
    });

    if (!company) throw new Error("Company not found for current session.");

    await prisma.company.update({
      where: { id: company.id },
      data: {
        name: payload.name || company.name,
        country_code: payload.region || company.country_code,
        work_start: payload.workStart || company.work_start,
        work_end: payload.workEnd || company.work_end,
      }
    });

    // Also touch the distinct settings model if it exists
    await prisma.companySettings.upsert({
      where: { company_id: company.id },
      create: {
        id: randomUUID(),
        company_id: company.id,
        custom_holidays: {},
        updated_at: new Date(),
      },
      update: { updated_at: new Date() }
    });

    revalidatePath("/admin/company-settings");
    return { success: true, message: "Settings saved successfully." };
  } catch (error: unknown) {
    console.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update company settings',
    };
  }
}
