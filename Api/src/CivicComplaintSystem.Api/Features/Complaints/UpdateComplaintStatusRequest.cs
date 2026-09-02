using System.ComponentModel.DataAnnotations;

namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class UpdateComplaintStatusRequest
{
    [Required]
    [EnumDataType(typeof(ComplaintStatus))]
    public ComplaintStatus? Status { get; init; }
}