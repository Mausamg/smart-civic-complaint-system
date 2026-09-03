using System.ComponentModel.DataAnnotations;

namespace CivicComplaintSystem.Api.Features.Auth;

public sealed class RegisterRequest
{
    [Required]
    [MaxLength(100)]
    [RegularExpression(
        @".*\S.*",
        ErrorMessage = "First name cannot contain only whitespace.")]
    public string FirstName { get; init; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [RegularExpression(
        @".*\S.*",
        ErrorMessage = "Last name cannot contain only whitespace.")]
    public string LastName { get; init; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; init; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string Password { get; init; } = string.Empty;
}
