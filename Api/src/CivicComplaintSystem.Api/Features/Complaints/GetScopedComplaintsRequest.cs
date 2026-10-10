using System.ComponentModel.DataAnnotations;

namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class GetScopedComplaintsRequest
{
    [Range(1, int.MaxValue)]
    public int Page { get; init; } = 1;

    [Range(1, 100)]
    public int PageSize { get; init; } = 10;

    public ComplaintStatus? Status { get; init; }

    public ComplaintPriority? Priority { get; init; }

    public string? Search { get; init; }

    public string SortBy { get; init; } = "createdAt";

    public string SortDirection { get; init; } = "desc";
}