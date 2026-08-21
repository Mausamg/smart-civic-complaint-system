using CivicComplaintSystem.Api.Features.Users;

namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class ComplaintComment
{
    public Guid Id { get; set; }

    public Guid ComplaintId { get; set; }

    public string Message { get; set; } = string.Empty;

    public Guid CreatedByUserId { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public Complaint Complaint { get; set; } = null!;

    public ApplicationUser CreatedByUser { get; set; } = null!;
}