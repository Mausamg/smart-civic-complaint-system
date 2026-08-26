namespace CivicComplaintSystem.Api.Features.Dashboard;

public sealed class DashboardWeeklyTrendResponse
{
    public DateTime WeekStart { get; set; }

    public int Count { get; set; }
}