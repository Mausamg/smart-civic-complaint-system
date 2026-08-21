namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class PaginatedResponse<T>
{
    public int Page { get; init; }

    public int PageSize { get; init; }

    public int TotalCount { get; init; }

    public int TotalPages { get; init; }

    public required IReadOnlyCollection<T> Items { get; init; }
}