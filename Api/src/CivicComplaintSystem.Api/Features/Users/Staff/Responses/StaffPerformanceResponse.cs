namespace CivicComplaintSystem.Api.Features.Users.Staff.Responses;

public sealed class StaffPerformanceResponse
{
    public Guid StaffId { get; init; }

    public int CurrentlyAssigned { get; init; }

    public int LifetimeAssigned { get; init; }

    public int ResolvedByStaff { get; init; }

    public double? AverageFirstActionMinutes { get; init; }

    public double? AverageResolutionMinutes { get; init; }

    public List<StaffAssignmentActivityResponse> Assignments
        { get; init; } = new();
}

public sealed class StaffAssignmentActivityResponse
{
    public Guid AssignmentId { get; init; }

    public Guid ComplaintId { get; init; }

    public string ComplaintTitle { get; init; }
        = string.Empty;

    public string CurrentStatus { get; init; }
        = string.Empty;

    public DateTime AssignedAtUtc { get; init; }

    public DateTime? ReassignedAtUtc { get; init; }

    public DateTime? FirstActionAtUtc { get; init; }

    public DateTime? ResolvedAtUtc { get; init; }

    public double? FirstActionMinutes { get; init; }

    public double? ResolutionMinutes { get; init; }

    public bool ResolvedByStaff { get; init; }

    public bool IsCurrentlyAssigned { get; init; }
}
