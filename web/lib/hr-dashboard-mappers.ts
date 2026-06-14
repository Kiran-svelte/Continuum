type RecentActivityEmployee = {
  first_name: string;
  last_name: string;
  department: string | null;
};

type RecentActivityItem = {
  leave_type: string;
  status: string;
  total_days: number;
  created_at: Date;
  start_date: Date;
  employee: RecentActivityEmployee;
};

export function mapHrRecentActivity(items: RecentActivityItem[]) {
  return items.slice(0, 10).map((activity) => ({
    employee_name: `${activity.employee.first_name} ${activity.employee.last_name}`,
    department: activity.employee.department,
    leave_type: activity.leave_type,
    status: activity.status,
    days: activity.total_days,
    created_at: activity.created_at,
    start_date: activity.start_date,
  }));
}
