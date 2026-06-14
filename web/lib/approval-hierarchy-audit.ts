export function resolveApprovalHierarchyAuditEntityId(
  normalizedId: string | undefined,
  rawId: string | undefined,
  empId: string
): string {
  return normalizedId ?? rawId ?? empId;
}
