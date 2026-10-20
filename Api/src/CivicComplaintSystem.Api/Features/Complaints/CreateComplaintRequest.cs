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

    [StringLength(100)]
    public string? Subcategory { get; init; }

    public DateTimeOffset? ObservedAt { get; init; }

    [StringLength(20)]
    public string? AffectedPeopleRange { get; init; }

    public bool? IsActive { get; init; }

    [StringLength(100)]
    public string? Municipality { get; init; }

    [StringLength(50)]
    public string? Ward { get; init; }

    [Range(-90.0, 90.0)]
    public double? Latitude { get; init; }

    [Range(-180.0, 180.0)]
    public double? Longitude { get; init; }
}
