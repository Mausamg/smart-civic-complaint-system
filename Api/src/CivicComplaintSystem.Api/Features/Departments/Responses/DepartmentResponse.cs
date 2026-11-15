using CivicComplaintSystem.Api.Features.Complaints;

namespace CivicComplaintSystem.Api.Features.Departments.Responses;

public sealed class DepartmentResponse
{
    public Guid Id { get; init; }

    public string Name { get; init; } = string.Empty;

    public string? Description { get; init; }

    public bool IsActive { get; init; }

    public Guid? HeadStaffUserId { get; init; }

    public string? HeadStaffName { get; init; }

    public int ExpectedResolutionDays { get; init; }

    public ComplaintPriority DefaultPriority { get; init; }

    public IReadOnlyList<string> CategoryKeys { get; init; }
        = Array.Empty<string>();

    public int StaffCount { get; init; }

    public int ActiveComplaints { get; init; }

    public double? AverageResolutionDays { get; init; }

    public DateTime CreatedAtUtc { get; init; }

    public DateTime? UpdatedAtUtc { get; init; }
}
