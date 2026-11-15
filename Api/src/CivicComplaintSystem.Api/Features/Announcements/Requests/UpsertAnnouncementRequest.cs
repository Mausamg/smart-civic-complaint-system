using System.ComponentModel.DataAnnotations;

namespace CivicComplaintSystem.Api.Features.Announcements.Requests;

public sealed class UpsertAnnouncementRequest : IValidatableObject
{
    [Required]
    [StringLength(160)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [StringLength(5000)]
    public string Body { get; set; } = string.Empty;

    [Required]
    [StringLength(30)]
    public string Category { get; set; } = "general";


    [Required]
    [StringLength(12)]
    public string LocationScope { get; set; } = "all";

    [StringLength(100)]
    public string? Country { get; set; }

    [StringLength(100)]
    public string? Province { get; set; }

    [StringLength(100)]
    public string? District { get; set; }

    [StringLength(120)]
    public string? Municipality { get; set; }

    [StringLength(100)]
    public string? Ward { get; set; }

    public bool IsFeatured { get; set; }

    public DateTime? ExpiresAtUtc { get; set; }

    public IEnumerable<ValidationResult> Validate(
        ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Title))
            yield return new ValidationResult(
                "Title cannot be blank.",
                new[] { nameof(Title) });

        if (string.IsNullOrWhiteSpace(Body))
            yield return new ValidationResult(
                "Body cannot be blank.",
                new[] { nameof(Body) });

        var allowed = new[]
        {
            "general", "emergency", "maintenance",
            "policy", "event"
        };

        if (string.IsNullOrWhiteSpace(Category) ||
            !allowed.Contains(
                Category.Trim(),
                StringComparer.OrdinalIgnoreCase))
        {
            yield return new ValidationResult(
                "Unsupported announcement category.",
                new[] { nameof(Category) });
        }


        var scope = LocationScope?.Trim().ToLowerInvariant();

        if (scope != "all" && scope != "local")
        {
            yield return new ValidationResult(
                "Location scope must be all or local.",
                new[] { nameof(LocationScope) });
        }
        else if (scope == "local")
        {
            if (string.IsNullOrWhiteSpace(Country))
                yield return new ValidationResult(
                    "Country is required for a local notice.",
                    new[] { nameof(Country) });

            if (string.IsNullOrWhiteSpace(Province))
                yield return new ValidationResult(
                    "Province or state is required.",
                    new[] { nameof(Province) });

            if (string.IsNullOrWhiteSpace(District))
                yield return new ValidationResult(
                    "District or county is required.",
                    new[] { nameof(District) });

            if (string.IsNullOrWhiteSpace(Municipality))
                yield return new ValidationResult(
                    "Municipality or city is required.",
                    new[] { nameof(Municipality) });
        }
        else if (
            !string.IsNullOrWhiteSpace(Country) ||
            !string.IsNullOrWhiteSpace(Province) ||
            !string.IsNullOrWhiteSpace(District) ||
            !string.IsNullOrWhiteSpace(Municipality) ||
            !string.IsNullOrWhiteSpace(Ward))
        {
            yield return new ValidationResult(
                "All-locations notices cannot have local area fields.",
                new[] { nameof(LocationScope) });
        }

        if (ExpiresAtUtc.HasValue &&
            ExpiresAtUtc.Value.Kind != DateTimeKind.Utc)
        {
            yield return new ValidationResult(
                "Expiration must be provided as a UTC timestamp.",
                new[] { nameof(ExpiresAtUtc) });
        }
    }
}
