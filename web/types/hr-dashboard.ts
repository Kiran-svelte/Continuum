// HR Dashboard TypeScript Types
// Enterprise-grade type definitions for HR analytics and dashboard data

export interface HRDashboardMeta {
  generated_at: string;
  generated_by: string;
  company_id: string;
  data_period: {
    start: string;
    end: string;
  };
  user_role: string;
}

export interface HROverviewMetrics {
  total_employees: number;
  active_employees: number;
  total_leave_requests: number;
  total_leave_days: number;
  approval_rate: number;
  avg_approval_time_hours: number;
  sla_breach_count: number;
  estimated_leave_cost: number;
  policy_violations: number;
}

export interface DepartmentSummary {
  department: string;
  employee_count: number;
}

export interface EmployeeAnalytics {
  by_status: Record<string, number>;
  by_department: Record<string, Record<string, number>>;
  department_summary: DepartmentSummary[];
}

export interface LeaveVolumeData {
  status: string;
  count: number;
  total_days: number;
  avg_days: number;
}

export interface LeaveTypeData {
  leave_type: string;
  requests: number;
  total_days: number;
  avg_days: number;
}

export interface MonthlyTrend {
  month: Date;
  month_name: string;
  requests: number;
  days: number;
  approved: number;
  approval_rate: number;
}

export interface LeaveAnalytics {
  volume_by_status: LeaveVolumeData[];
  by_type: LeaveTypeData[];
  monthly_trends: MonthlyTrend[];
}

export interface DepartmentUtilization {
  department: string;
  leave_requests: number;
  total_leave_days: number;
  employees_taking_leave: number;
  total_employees: number;
  utilization_percentage: number;
}

export interface TopLeaveTaker {
  employee_id: string;
  name: string;
  department: string;
  hire_date?: Date | null;
  total_requests: number;
  total_days: number;
  avg_days_per_request: number;
}

export interface SLABreach {
  employee_name: string;
  department: string;
  request_id: string;
  created_at: Date;
  days_overdue: number;
}

export interface PerformanceMetrics {
  department_utilization: DepartmentUtilization[];
  top_leave_takers: TopLeaveTaker[];
  sla_breaches: SLABreach[];
}

export interface HRInsights {
  most_utilized_department: string;
  highest_volume_leave_type: string;
  peak_request_month: string;
  recommendations: string[];
}

export interface RecentActivity {
  employee_name: string;
  department: string;
  leave_type: string;
  status: string;
  days: number;
  created_at: Date;
  start_date: Date;
}

export interface HRDashboardData {
  meta: HRDashboardMeta;
  overview: HROverviewMetrics;
  employees: EmployeeAnalytics;
  leave_analytics: LeaveAnalytics;
  performance_metrics: PerformanceMetrics;
  insights: HRInsights;
  recent_activity: RecentActivity[];
}

// API Response wrapper
export interface HRDashboardResponse {
  data?: HRDashboardData;
  error?: string;
  code?: string;
  timestamp?: string;
}

// Chart data structures for visualization
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface HRDashboardChartData {
  employee_status_pie: ChartDataPoint[];
  department_bar: ChartDataPoint[];
  leave_volume_line: TimeSeriesDataPoint[];
  approval_rate_trend: TimeSeriesDataPoint[];
  utilization_heatmap: {
    department: string;
    utilization: number;
    color_intensity: number;
  }[];
}

// Filter interfaces for dashboard customization
export interface HRDashboardFilters {
  date_range?: {
    start: string;
    end: string;
  };
  departments?: string[];
  employee_status?: string[];
  leave_types?: string[];
  include_terminated?: boolean;
}

// Export options for HR reports
export interface HRExportOptions {
  format: 'csv' | 'pdf' | 'excel';
  sections: {
    overview: boolean;
    employee_analytics: boolean;
    leave_trends: boolean;
    performance_metrics: boolean;
    detailed_data: boolean;
  };
  filters: HRDashboardFilters;
}

// Permission and security context
export interface HRDashboardContext {
  user_id: string;
  user_role: string;
  company_id: string;
  permissions: string[];
  access_level: 'full' | 'limited' | 'view_only';
}

// Real-time update interfaces
export interface HRDashboardUpdate {
  type: 'new_request' | 'approval' | 'rejection' | 'sla_breach' | 'employee_change';
  data: Partial<HRDashboardData>;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
}

// Error types for better error handling
export interface HRDashboardError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  user_context: HRDashboardContext;
}

export default HRDashboardData;