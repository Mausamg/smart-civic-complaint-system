namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class GetComplaintsRequest
{
    public ComplaintStatus? Status { get; init; }

    public string? Category { get; init; }

    public string? Location { get; init; }

    public int Page { get; init; } = 1;

    public int PageSize { get; init; } = 10;
}