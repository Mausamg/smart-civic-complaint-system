namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class ComplaintAssignmentHistoryResponse
{
    public Guid Id { get; set; }

    public Guid? OldAssignedToUserId { get; set; }

    public string? OldAssignedToName { get; set; }

    public Guid NewAssignedToUserId { get; set; }

    public string NewAssignedToName { get; set; }
        = null!;

    public Guid ChangedByUserId { get; set; }

    public string ChangedByName { get; set; }
        = null!;

    public DateTime ChangedAtUtc { get; set; }

    public string? Note { get; set; }
}