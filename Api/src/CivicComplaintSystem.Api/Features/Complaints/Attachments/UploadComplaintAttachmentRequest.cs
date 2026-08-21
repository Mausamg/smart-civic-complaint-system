using Microsoft.AspNetCore.Http;

namespace CivicComplaintSystem.Api.Features.Complaints.Attachments;

public sealed class UploadComplaintAttachmentRequest
{
    public IFormFile File { get; set; } = null!;
}