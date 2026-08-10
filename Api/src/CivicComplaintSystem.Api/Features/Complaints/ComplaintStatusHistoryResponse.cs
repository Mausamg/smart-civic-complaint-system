namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class ComplaintStatusHistoryResponse
{
    public Guid Id { get; init; }

    public string OldStatus { get; init; } = string.Empty;

    public string NewStatus { get; init; } = string.Empty;

    public Guid ChangedByUserId { get; init; }

    public string ChangedByName { get; init; } = string.Empty;

    public DateTime ChangedAtUtc { get; init; }

    public string? Note { get; init; }
}