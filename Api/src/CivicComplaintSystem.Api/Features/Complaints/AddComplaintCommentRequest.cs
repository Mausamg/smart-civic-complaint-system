using System.ComponentModel.DataAnnotations;

namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class AddComplaintCommentRequest
{
    [Required]
    [StringLength(1000)]
    public required string Message { get; set; }
}
