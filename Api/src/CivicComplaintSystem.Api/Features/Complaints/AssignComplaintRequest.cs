using System.ComponentModel.DataAnnotations;

namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class AssignComplaintRequest
{
    [Required]
    public Guid? StaffUserId { get; init; }
}