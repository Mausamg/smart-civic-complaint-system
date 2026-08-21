using CivicComplaintSystem.Api.Features.Users;

namespace CivicComplaintSystem.Api.Features.Complaints.Attachments;

public sealed class ComplaintAttachment
{
    public Guid Id { get; set; }

    public Guid ComplaintId { get; set; }

    public string FileName { get; set; } = string.Empty;

    public string StoredFileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;

    public long FileSize { get; set; }

    public Guid UploadedByUserId { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public Complaint Complaint { get; set; } = null!;

    public ApplicationUser UploadedByUser { get; set; } = null!;
}