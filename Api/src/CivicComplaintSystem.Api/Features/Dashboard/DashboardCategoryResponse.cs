namespace CivicComplaintSystem.Api.Features.Dashboard;

public sealed class DashboardCategoryResponse
{
    public string Category { get; set; } = string.Empty;

    public int Count { get; set; }
}