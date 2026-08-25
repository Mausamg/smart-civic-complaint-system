namespace CivicComplaintSystem.Api.Features.Dashboard;

public sealed class DashboardPriorityResponse
{
    public string Priority { get; set; } = string.Empty;

    public int Count { get; set; }
}