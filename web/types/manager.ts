// Manager Dashboard Types
export interface TeamMemberStatus {
  id: string;
  first_name: string;
  last_name: string;
  designation: string | null;
  department: string | null;
  email: string;
  status: 'available' | 'on_leave' | 'offline';
  profile_picture_url: string | null;
  created_at: Date;
  leave_balances: LeaveBalanceInfo[];
  total_remaining_leave: number;
  current_leave?: CurrentLeaveInfo | null;
}

export interface LeaveBalanceInfo {
  leave_type: string;
  annual_entitlement: number;
  used_days: number;
  pending_days: number;
  remaining: number;
}

export interface CurrentLeaveInfo {
  id: string;
  leave_type: string;
  start_date: Date;
  end_date: Date;
  total_days: number;
  reason?: string;
}

export interface TeamOverviewMetrics {
  total_team_size: number;
  currently_on_leave: number;
  available_members: number;
  coverage_percentage: number;
}

export interface UpcomingLeave {
  id: string;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
  };
  leave_type: string;
  start_date: Date;
  end_date: Date;
  total_days: number;
  reason?: string;
}

export interface SchedulingConflict {
  date: string;
  conflicting_leaves: {
    employee: {
      id: string;
      first_name: string;
      last_name: string;
    };
    leave_id: string;
    leave_type: string;
  }[];
  impact_level: 'high' | 'medium' | 'low';
}

export interface WorkloadMetrics {
  high_utilization_members: number;
  low_balance_members: number;
  available_capacity: number;
}

export interface TeamOverviewResponse {
  team_overview: TeamOverviewMetrics;
  team_members: TeamMemberStatus[];
  upcoming_leaves: UpcomingLeave[];
  scheduling_conflicts: SchedulingConflict[];
  workload_metrics: WorkloadMetrics;
  generated_at: string;
}

// Manager Approval Types
export interface ApprovalQueueItem {
  id: string;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    department: string | null;
  };
  leave_type: string;
  start_date: Date;
  end_date: Date;
  total_days: number;
  reason?: string;
  status: string;
  created_at: Date;
  sla_deadline?: Date;
  priority: 'high' | 'medium' | 'low';
  ai_recommendation?: 'approve' | 'review' | 'reject';
  confidence_score?: number;
  constraint_violations: string[];
}

export interface BulkApprovalAction {
  request_ids: string[];
  action: 'approve' | 'reject';
  reason?: string;
}

export interface BulkApprovalResponse {
  successful: string[];
  failed: {
    id: string;
    error: string;
  }[];
  summary: {
    total_processed: number;
    successful_count: number;
    failed_count: number;
  };
}

// Manager Analytics Types
export interface TeamAnalytics {
  leave_patterns: {
    month: string;
    total_requests: number;
    approved_requests: number;
    total_days: number;
    most_common_type: string;
  }[];
  utilization_metrics: {
    employee_id: string;
    employee_name: string;
    total_entitlement: number;
    used_days: number;
    utilization_percentage: number;
    last_leave_date: Date | null;
  }[];
  coverage_analysis: {
    date: string;
    available_members: number;
    coverage_percentage: number;
    risk_level: 'high' | 'medium' | 'low';
  }[];
}

// Team Calendar Types
export interface TeamCalendarEvent {
  id: string;
  employee: {
    id: string;
    name: string;
  };
  title: string;
  start_date: Date;
  end_date: Date;
  type: 'leave' | 'holiday' | 'meeting';
  status: 'approved' | 'pending' | 'rejected';
  leave_type?: string;
}

export interface TeamCalendarResponse {
  events: TeamCalendarEvent[];
  holidays: {
    id: string;
    name: string;
    date: Date;
    is_custom: boolean;
  }[];
  month_summary: {
    total_leave_days: number;
    affected_members: number;
    coverage_percentage: number;
  };
}