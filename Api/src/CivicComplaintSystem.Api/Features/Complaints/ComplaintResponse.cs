namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class ComplaintResponse
{
    public Guid Id { get; init; }

    public string Title { get; init; } = string.Empty;

    public string Description { get; init; } = string.Empty;

    public string Category { get; init; } = string.Empty;

    public string Location { get; init; } = string.Empty;

    public string Status { get; init; } = string.Empty;

    public DateTime CreatedAt { get; init; }

    public DateTime? UpdatedAt { get; init; }

    public Guid SubmittedByUserId { get; init; }

    public Guid? AssignedToUserId { get; init; }

    public UserSummaryResponse? SubmittedBy { get; init; }

    public UserSummaryResponse? AssignedTo { get; init; }
}