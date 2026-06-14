// Dashboard Types
export interface DashboardKPI {
  value: number;
  label: string;
  trend: 'positive' | 'negative' | 'neutral' | 'warning';
  breakdown?: any[];
  details?: any;
}

export interface DashboardKPIs {
  leaveBalance: DashboardKPI;
  upcomingLeaves: DashboardKPI;
  pendingRequests: DashboardKPI;
  monthlyUsage: DashboardKPI;
}

export interface DashboardNotification {
  id: string;
  type: 'pending_request' | 'leave_reminder' | 'low_balance' | 'holiday' | 'status_update';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  data?: any;
}

export interface CalendarEvent {
  id: string;
  type: 'leave' | 'holiday';
  title: string;
  status?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  isHalfDay?: boolean;
  leaveType?: string;
  totalDays?: number;
}

export interface CalendarDate {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  events: CalendarEvent[];
  hasEvents: boolean;
  hasLeave: boolean;
  hasHoliday: boolean;
  hasPendingLeave: boolean;
}

export interface LeaveRequestBrief {
  id: string;
  leave_type: string;
  leave_type_name?: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  created_at: string;
  reason?: string;
}