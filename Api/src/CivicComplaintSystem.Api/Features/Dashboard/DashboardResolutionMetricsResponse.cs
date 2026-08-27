namespace CivicComplaintSystem.Api.Features.Dashboard;

public sealed class DashboardResolutionMetricsResponse
{
    public int TotalComplaints { get; set; }

    public int ResolvedComplaints { get; set; }

    public double ResolutionRate { get; set; }

    public double AverageResolutionTimeHours { get; set; }
}