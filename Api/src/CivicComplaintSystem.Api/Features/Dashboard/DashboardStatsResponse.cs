namespace CivicComplaintSystem.Api.Features.Dashboard;

public sealed class DashboardStatsResponse
{
    public int TotalComplaints { get; set; }

    public int Submitted { get; set; }

    public int UnderReview { get; set; }

    public int InProgress { get; set; }

    public int Resolved { get; set; }

    public int Rejected { get; set; }

    public int HighPriority { get; set; }

    public int Unassigned { get; set; }
}