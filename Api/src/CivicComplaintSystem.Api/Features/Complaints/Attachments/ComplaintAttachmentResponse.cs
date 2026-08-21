namespace CivicComplaintSystem.Api.Features.Complaints.Attachments;

public sealed class ComplaintAttachmentResponse
{
    public Guid Id { get; set; }

    public Guid ComplaintId { get; set; }

    public string FileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;

    public long FileSize { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}