using System.ComponentModel.DataAnnotations;
using CivicComplaintSystem.Api.Features.Complaints;

namespace CivicComplaintSystem.Api.Features.Departments.Requests;

public sealed class CreateDepartmentRequest : IValidatableObject
{
    [Required]
    [StringLength(120, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }

    public Guid? HeadStaffUserId { get; set; }

    [Range(1, 365)]
    public int ExpectedResolutionDays { get; set; } = 7;

    public ComplaintPriority DefaultPriority { get; set; }
        = ComplaintPriority.Medium;

    public List<string> CategoryKeys { get; set; } = new();

    public IEnumerable<ValidationResult> Validate(
        ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Name))
        {
            yield return new ValidationResult(
                "Department name cannot be blank.",
                new[] { nameof(Name) });
        }

        if (HeadStaffUserId == Guid.Empty)
        {
            yield return new ValidationResult(
                "Department head must be a valid staff identifier.",
                new[] { nameof(HeadStaffUserId) });
        }

        if (!Enum.IsDefined(DefaultPriority))
        {
            yield return new ValidationResult(
                "Invalid default priority.",
                new[] { nameof(DefaultPriority) });
        }

        if (CategoryKeys is null)
        {
            yield return new ValidationResult(
                "Category keys cannot be null.",
                new[] { nameof(CategoryKeys) });

            yield break;
        }

        if (CategoryKeys.Any(string.IsNullOrWhiteSpace))
        {
            yield return new ValidationResult(
                "Category keys cannot be blank.",
                new[] { nameof(CategoryKeys) });
        }

        var normalizedKeys = CategoryKeys
            .Where(key => !string.IsNullOrWhiteSpace(key))
            .Select(key => key.Trim());

        if (normalizedKeys.Distinct(
            StringComparer.OrdinalIgnoreCase).Count()
            != normalizedKeys.Count())
        {
            yield return new ValidationResult(
                "Duplicate category keys are not allowed.",
                new[] { nameof(CategoryKeys) });
        }
    }
}
