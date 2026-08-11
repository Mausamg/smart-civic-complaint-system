using CivicComplaintSystem.Api.Features.Users;

namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class ComplaintAssignmentHistory
{
    public Guid Id { get; set; }

    public Guid ComplaintId { get; set; }

    public Complaint Complaint { get; set; }
        = null!;

    public Guid? OldAssignedToUserId { get; set; }

    public ApplicationUser? OldAssignedToUser { get; set; }

    public Guid NewAssignedToUserId { get; set; }

    public ApplicationUser NewAssignedToUser { get; set; }
        = null!;

    public Guid ChangedByUserId { get; set; }

    public ApplicationUser ChangedByUser { get; set; }
        = null!;

    public DateTime ChangedAtUtc { get; set; }

    public string? Note { get; set; }
}