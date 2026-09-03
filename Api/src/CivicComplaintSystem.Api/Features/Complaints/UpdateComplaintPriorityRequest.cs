using System.ComponentModel.DataAnnotations;

namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class UpdateComplaintPriorityRequest
{
    [Required]
    [EnumDataType(typeof(ComplaintPriority))]
    public ComplaintPriority? Priority { get; init; }
}