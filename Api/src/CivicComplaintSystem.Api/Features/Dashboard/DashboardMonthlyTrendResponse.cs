namespace CivicComplaintSystem.Api.Features.Dashboard;

public sealed class DashboardMonthlyTrendResponse
{
    public int Year { get; set; }

    public int Month { get; set; }

    public int Count { get; set; }
}