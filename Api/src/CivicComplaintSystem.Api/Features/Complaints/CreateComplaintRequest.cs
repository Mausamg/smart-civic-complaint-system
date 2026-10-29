using System.ComponentModel.DataAnnotations;

namespace CivicComplaintSystem.Api.Features.Complaints;

public sealed class CreateComplaintRequest : IValidatableObject
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

    [Required(ErrorMessage = "Municipality or rural municipality is required.")]
    [StringLength(100)]
    public string? Municipality { get; init; }

    [StringLength(50)]
    public string? Ward { get; init; }

    [Range(-90.0, 90.0)]
    public double? Latitude { get; init; }

    [Range(-180.0, 180.0)]
    public double? Longitude { get; init; }


    public IEnumerable<ValidationResult> Validate(
        ValidationContext validationContext)
    {
        if (ObservedAt is { } observedAt &&
            observedAt > DateTimeOffset.UtcNow)
        {
            yield return new ValidationResult(
                "Observation date and time cannot be in the future.",
                new[] { nameof(ObservedAt) }
            );
        }

        if (Latitude is null || Longitude is null)
            yield return new ValidationResult(
                "Please select the incident location on the map.",
                new[] { nameof(Latitude), nameof(Longitude) }
            );
    }
}
