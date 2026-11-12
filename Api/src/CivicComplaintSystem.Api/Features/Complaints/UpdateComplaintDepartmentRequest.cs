using System.ComponentModel.DataAnnotations;

namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class UpdateComplaintDepartmentRequest
{
    [Required]
    public Guid? DepartmentId { get; init; }
}
