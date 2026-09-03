using System.ComponentModel.DataAnnotations;

namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class UpdateComplaintRequest
{
    [StringLength(150)]
    public string? Title { get; init; }

    [StringLength(2000)]
    public string? Description { get; init; }

    [StringLength(100)]
    public string? Category { get; init; }

    [StringLength(200)]
    public string? Location { get; init; }
}
