namespace CivicComplaintSystem.Api.Features.Complaints.Attachments;

public sealed class AttachmentUploadResult
{
    public ComplaintAttachment? Attachment { get; set; }

    public string? Error { get; set; }
}