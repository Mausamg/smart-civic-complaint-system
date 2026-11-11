import { apiRequest } from './apiClient';

export interface DashboardStatsResponse {
  totalComplaints: number;
  submitted: number;
  underReview: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  highPriority: number;
  unassigned: number;
}

/**
 * Retrieve authenticated dashboard statistics.
 * Staff users receive statistics scoped to their assignments.
 */
export async function getDashboardStats(
  accessToken: string
): Promise<DashboardStatsResponse> {
  return apiRequest<DashboardStatsResponse>(
    '/api/dashboard/stats',
    {
      method: 'GET',
      token: accessToken,
    }
  );
}

/**
 * A recent complaint returned by the Dashboard API.
 */
export interface DashboardRecentComplaintResponse {
  id: string;
  title: string;
  category: string;
  location: string;
  status: string;
  priority: string;
  createdAt: string;
}

/**
 * Retrieve the five most recently submitted complaints
 * visible to the authenticated staff member.
 */
export async function getDashboardRecentComplaints(
  accessToken: string
): Promise<DashboardRecentComplaintResponse[]> {
  return apiRequest<DashboardRecentComplaintResponse[]>(
    '/api/dashboard/recent-complaints',
    {
      method: 'GET',
      token: accessToken,
    }
  );
}

/**
 * Weekly complaint submission count, grouped by week start.
 */
export interface DashboardWeeklyTrendResponse {
  weekStart: string;
  count: number;
}

/**
 * Monthly complaint submission count.
 */
export interface DashboardMonthlyTrendResponse {
  year: number;
  month: number;
  count: number;
}

/**
 * Fetch weekly counts for the authenticated user's
 * assigned complaints.
 */
export async function getDashboardWeeklyTrend(
  accessToken: string
): Promise<DashboardWeeklyTrendResponse[]> {
  return apiRequest<DashboardWeeklyTrendResponse[]>(
    '/api/dashboard/weekly-trend',
    {
      method: 'GET',
      token: accessToken,
    }
  );
}

/**
 * Fetch monthly counts for the authenticated user's
 * assigned complaints.
 */
export async function getDashboardMonthlyTrend(
  accessToken: string
): Promise<DashboardMonthlyTrendResponse[]> {
  return apiRequest<DashboardMonthlyTrendResponse[]>(
    '/api/dashboard/monthly-trend',
    {
      method: 'GET',
      token: accessToken,
    }
  );
}

/**
 * Complaint counts grouped by category.
 */
export interface DashboardCategoryResponse {
  category: string;
  count: number;
}

/**
 * Retrieve category counts for complaints visible
 * to the authenticated staff member.
 */
export async function getDashboardCategoryBreakdown(
  accessToken: string
): Promise<DashboardCategoryResponse[]> {
  return apiRequest<DashboardCategoryResponse[]>(
    '/api/dashboard/category-breakdown',
    {
      method: 'GET',
      token: accessToken,
    }
  );
}

/**
 * Complaint counts grouped by status.
 */
export interface DashboardStatusResponse {
  status: string;
  count: number;
}

export async function getDashboardStatusBreakdown(
  accessToken: string
): Promise<DashboardStatusResponse[]> {
  return apiRequest<DashboardStatusResponse[]>(
    '/api/dashboard/status-breakdown',
    {
      method: 'GET',
      token: accessToken,
    }
  );
}

/**
 * Admin-only complaint resolution metrics.
 */
export interface DashboardResolutionMetricsResponse {
  totalComplaints: number;
  resolvedComplaints: number;
  resolutionRate: number;
  averageResolutionTimeHours: number;
}

export async function getDashboardResolutionMetrics(
  accessToken: string
): Promise<DashboardResolutionMetricsResponse> {
  return apiRequest<DashboardResolutionMetricsResponse>(
    '/api/dashboard/resolution-metrics',
    {
      method: 'GET',
      token: accessToken,
    }
  );
}
