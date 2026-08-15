using CivicComplaintSystem.Api.Features.Complaints.Attachments;
using CivicComplaintSystem.Api.Features.Users;

namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class Complaint
{
    public Guid Id { get; set; }

    public required string Title { get; set; }

    public required string Description { get; set; }

    public ComplaintStatus Status { get; set; }
        = ComplaintStatus.Submitted;

    public ComplaintPriority Priority { get; set; }
        = ComplaintPriority.Medium;

    public required string Category { get; set; }

    public required string Location { get; set; }

    public DateTime CreatedAt { get; set; }
        = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public Guid SubmittedByUserId { get; set; }

    public ApplicationUser SubmittedByUser { get; set; } = null!;

    public Guid? AssignedToUserId { get; set; }

    public ApplicationUser? AssignedToUser { get; set; }

    public ICollection<ComplaintStatusHistory> StatusHistory { get; set; }
        = new List<ComplaintStatusHistory>();

    public ICollection<ComplaintAssignmentHistory> AssignmentHistory { get; set; }
        = new List<ComplaintAssignmentHistory>();

    public ICollection<ComplaintComment> Comments { get; set; }
        = new List<ComplaintComment>();

    public ICollection<ComplaintAttachment> Attachments { get; set; }
        = new List<ComplaintAttachment>();
}