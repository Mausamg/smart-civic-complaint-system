namespace CivicComplaintSystem.Api.Features.Dashboard;

public sealed class DashboardStatusResponse
{
    public string Status { get; set; } = string.Empty;

    public int Count { get; set; }
}