using CivicComplaintSystem.Api.Features.Users;

namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class ComplaintStatusHistory
{
    public Guid Id { get; set; }

    public Guid ComplaintId { get; set; }

    public ComplaintStatus OldStatus { get; set; }

    public ComplaintStatus NewStatus { get; set; }

    public Guid ChangedByUserId { get; set; }

    public DateTime ChangedAtUtc { get; set; }

    public string? Note { get; set; }

    public Complaint Complaint { get; set; } = null!;

    public ApplicationUser ChangedByUser { get; set; } = null!;
}