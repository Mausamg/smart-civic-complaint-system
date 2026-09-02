using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace CivicComplaintSystem.Api.Features.Complaints.Attachments;

public sealed class UploadComplaintAttachmentRequest
{
    [Required]
    public IFormFile File { get; set; } = null!;
}
