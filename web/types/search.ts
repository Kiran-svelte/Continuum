// Enterprise Global Search System TypeScript Types
// Advanced search functionality with RBAC and multi-entity support

export interface SearchFilters {
  entity?: 'employees' | 'leaves' | 'approvals' | 'all';
  department?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  leaveType?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchMeta {
  query: string;
  entity?: string;
  total_results: number;
  returned_results: number;
  limit: number;
  offset: number;
  has_more: boolean;
  search_time_ms: number;
  user_role: string;
  filters_applied: {
    department?: string;
    status?: string;
    date_range?: {
      from: string;
      to: string;
    } | null;
    leave_type?: string;
  };
}

export interface EmployeeSearchResult {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department: string;
  primary_role: string;
  hire_date: Date;
  status: string;
  updated_at: Date;
  relevance_score: number;
  entityType: 'employee';
}

export interface LeaveRequestSearchResult {
  id: string;
  emp_id: string;
  leave_type: string;
  start_date: Date;
  end_date: Date;
  total_days: number;
  status: string;
  reason?: string;
  created_at: Date;
  updated_at: Date;
  employee: {
    first_name: string;
    last_name: string;
    employee_id: string;
    department: string;
  };
  relevance_score: number;
  entityType: 'leave';
}

export interface ApprovalSearchResult {
  id: string;
  emp_id: string;
  leave_type: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  approval_type: string;
  approval_date: Date;
  employee: {
    first_name: string;
    last_name: string;
    employee_id: string;
    department: string;
  };
  relevance_score: number;
  entityType: 'approval';
}

export type SearchResult = EmployeeSearchResult | LeaveRequestSearchResult | ApprovalSearchResult;

export interface SearchSummary {
  employees: number;
  leave_requests: number;
  approvals: number;
}

export interface SearchInsights {
  total_matches: number;
  best_match_entity: 'employees' | 'leaves' | 'approvals';
  search_coverage: number;
  departments_found: string[];
  date_range: {
    earliest: Date | null;
    latest: Date | null;
  };
}

export interface SearchResponse {
  meta: SearchMeta;
  results: SearchResult[];
  summary: SearchSummary;
  insights: SearchInsights;
  suggestions: string[];
}

// Advanced Search Builder Types
export interface SearchCriteria {
  field: string;
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'between' | 'in';
  value: string | string[] | { from: string; to: string };
  boost?: number; // Relevance boost factor
}

export interface AdvancedSearchQuery {
  criteria: SearchCriteria[];
  logic: 'AND' | 'OR';
  entity_types: string[];
  filters: SearchFilters;
}

// Saved Searches Types
export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  query: string;
  filters: SearchFilters;
  created_at: Date;
  updated_at: Date;
  last_used_at?: Date;
  use_count: number;
  is_public: boolean;
}

export interface SearchHistory {
  id: string;
  user_id: string;
  query: string;
  entity: string;
  result_count: number;
  search_time_ms: number;
  created_at: Date;
}

// Search Analytics Types
export interface SearchAnalytics {
  popular_searches: Array<{
    query: string;
    count: number;
    avg_results: number;
  }>;
  search_trends: Array<{
    date: string;
    search_count: number;
    avg_response_time: number;
  }>;
  entity_preferences: {
    employees: number;
    leaves: number;
    approvals: number;
  };
  department_searches: Array<{
    department: string;
    search_count: number;
  }>;
}

// Real-time Search Suggestions
export interface SearchSuggestion {
  text: string;
  type: 'query' | 'filter' | 'entity';
  category: string;
  frequency: number;
}

export interface SearchAutocomplete {
  suggestions: SearchSuggestion[];
  recent_searches: string[];
  popular_filters: SearchFilters[];
}

// Search Performance Monitoring
export interface SearchPerformanceMetrics {
  avg_response_time_ms: number;
  total_searches: number;
  successful_searches: number;
  error_rate: number;
  cache_hit_rate: number;
  popular_query_types: string[];
}

// Search Configuration
export interface SearchConfig {
  max_results_per_entity: number;
  default_page_size: number;
  max_query_length: number;
  rate_limit_per_minute: number;
  enable_fuzzy_search: boolean;
  relevance_boost_factors: {
    exact_match: number;
    starts_with: number;
    contains: number;
  };
}

// Error Types
export interface SearchError {
  code: string;
  message: string;
  query?: string;
  filters?: SearchFilters;
  timestamp: string;
  user_context: {
    user_id: string;
    user_role: string;
    permissions: string[];
  };
}

// Export Options for Search Results
export interface SearchExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  include_metadata: boolean;
  fields: string[];
  max_records: number;
}

// Search Widget Configuration
export interface SearchWidgetConfig {
  placeholder: string;
  auto_suggest: boolean;
  show_filters: boolean;
  default_entity: string;
  max_suggestions: number;
  debounce_ms: number;
}

// Faceted Search Types
export interface SearchFacet {
  field: string;
  label: string;
  type: 'terms' | 'range' | 'date';
  values: Array<{
    value: string;
    count: number;
    selected: boolean;
  }>;
}

export interface FacetedSearchResponse extends SearchResponse {
  facets: SearchFacet[];
}

// Search Index Types (for optimization)
export interface SearchIndex {
  entity_type: string;
  field: string;
  index_type: 'text' | 'keyword' | 'date' | 'number';
  boost_factor: number;
  is_searchable: boolean;
  is_filterable: boolean;
}

// Search Query Builder UI Types
export interface QueryBuilderRule {
  id: string;
  field: string;
  operator: string;
  value: any;
  type: 'text' | 'number' | 'date' | 'select';
}

export interface QueryBuilderGroup {
  id: string;
  logic: 'AND' | 'OR';
  rules: QueryBuilderRule[];
  groups: QueryBuilderGroup[];
}

export default SearchResponse;