using System.ComponentModel.DataAnnotations;

namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class CreateComplaintRequest
{
    [Required]
    [StringLength(150)]
    public required string Title { get; init; }

    [Required]
    [StringLength(2000)]
    public required string Description { get; init; }

    [Required]
    [StringLength(100)]
    public required string Category { get; init; }

    [Required]
    [StringLength(200)]
    public required string Location { get; init; }
}
