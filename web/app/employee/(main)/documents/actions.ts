"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getAuthEmployee, requireCompanyContext } from "@/lib/auth-guard";

export async function submitDocumentRecord(fileName: string, fileType: string) {
  try {
    void fileName;
    void fileType;
    return {
      success: false,
      error: 'Legacy upload action is disabled. Use /api/documents/upload with multipart/form-data.',
    };
  } catch (error: unknown) {
    console.error("NeonDB Upload Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit document record',
    };
  }
}

export async function deleteDocumentRecord(id: string) {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);

    const existing = await prisma.document.findFirst({
      where: {
        id,
        company_id: employee.org_id,
        deleted_at: null,
      },
      select: { emp_id: true },
    });

    if (!existing) {
      return { success: false, error: 'Document not found' };
    }

    const isPrivileged = ['admin', 'hr', 'director'].includes(employee.primary_role);
    if (!isPrivileged && existing.emp_id !== employee.id) {
      return { success: false, error: 'You can only delete your own documents' };
    }

    await prisma.document.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    revalidatePath("/employee/documents");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete document record',
    };
  }
}

export async function getLiveDocuments() {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);

    const isPrivileged = ['admin', 'hr', 'director'].includes(employee.primary_role);

    const docs = await prisma.document.findMany({
      where: {
        company_id: employee.org_id,
        deleted_at: null,
        ...(isPrivileged ? {} : {
          emp_id: employee.id,
        }),
      },
      orderBy: { created_at: 'desc' },
      take: 20
    });
    return { success: true, data: docs };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch documents',
      data: [],
    };
  }
}
