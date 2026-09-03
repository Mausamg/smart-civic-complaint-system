using System.ComponentModel.DataAnnotations;

namespace CivicComplaintSystem.Api.Features.Users.Staff.Requests;

public sealed class CreateStaffRequest
{
    [Required]
    [StringLength(50)]
    [RegularExpression(
        @".*\S.*",
        ErrorMessage = "First name cannot contain only whitespace.")]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(50)]
    [RegularExpression(
        @".*\S.*",
        ErrorMessage = "Last name cannot contain only whitespace.")]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;
}
