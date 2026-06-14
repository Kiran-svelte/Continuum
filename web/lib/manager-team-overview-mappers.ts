type TeamOverviewEmployee = {
  id: string;
  first_name: string;
  last_name: string;
  department?: string | null;
};

export function toConflictLeaveEntry(
  employee: TeamOverviewEmployee,
  leaveId: string,
  leaveType: string
) {
  return {
    employee: {
      id: employee.id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      department: employee.department ?? null,
    },
    leave_id: leaveId,
    leave_type: leaveType,
  };
}
